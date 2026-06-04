package auth

import (
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"Geospatial-harmuz-watch/server/internal/db"
)

type RegisterReq struct {
	Username string `json:"username" binding:"required,min=3"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

type LoginReq struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// Register registers a new user
func Register(c *gin.Context) {
	var req RegisterReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request. Username (min 3), valid email, and password (min 6) required."})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("[Auth] Failed to hash password: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}

	id := uuid.New().String()
	_, err = db.DB.Exec("INSERT INTO users (id, username, email, password_hash, status) VALUES (?, ?, ?, ?, 'pending')", id, req.Username, req.Email, string(hash))
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Username or email already exists"})
		return
	}

	// Trigger async email notification to admin
	go SendAdminNotification(req.Username, req.Email)

	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "Registration successful. Pending admin approval."})
}

// Login authenticates a user and returns a JWT
func Login(c *gin.Context) {
	var req LoginReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	var storedHash, email, role, status string
	err := db.DB.QueryRow("SELECT password_hash, email, role, status FROM users WHERE username = ?", req.Username).Scan(&storedHash, &email, &role, &status)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	if status == "pending" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Your account is pending admin approval."})
		return
	}

	if status != "approved" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Your account access has been revoked or denied."})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(storedHash), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	sessionID := uuid.New().String()
	now := time.Now().UTC()
	expiresAt := now.Add(24 * time.Hour)
	_, err = db.DB.Exec(
		"INSERT INTO sessions (id, username, created_at, expires_at, last_seen_at) VALUES (?, ?, ?, ?, ?)",
		sessionID,
		req.Username,
		now.Format(time.RFC3339),
		expiresAt.Format(time.RFC3339),
		now.Format(time.RFC3339),
	)
	if err != nil {
		log.Printf("[Auth] Failed to create session: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}

	token, err := GenerateToken(req.Username, email, role, sessionID, 24*time.Hour)
	if err != nil {
		log.Printf("[Auth] Failed to generate token: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":    "success",
		"token":     token,
		"expiresAt": expiresAt.Format(time.RFC3339),
		"sessionId": sessionID,
		"user": gin.H{
			"username": req.Username,
			"email":    email,
			"role":     role,
		},
	})
}

// GetSession returns the active authenticated session.
func GetSession(c *gin.Context) {
	authUserValue, exists := c.Get("authUser")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "missing authenticated session"})
		return
	}

	user, ok := authUserValue.(AuthenticatedUser)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid authenticated session"})
		return
	}

	var expiresAt string
	err := db.DB.QueryRow("SELECT expires_at FROM sessions WHERE id = ?", user.SessionID).Scan(&expiresAt)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid authenticated session"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":    "success",
		"sessionId": user.SessionID,
		"expiresAt": expiresAt,
		"user": gin.H{
			"username": user.Username,
			"email":    user.Email,
			"role":     user.Role,
		},
	})
}

// Logout revokes the current session.
func Logout(c *gin.Context) {
	authUserValue, exists := c.Get("authUser")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "missing authenticated session"})
		return
	}

	user, ok := authUserValue.(AuthenticatedUser)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid authenticated session"})
		return
	}

	_, err := db.DB.Exec("UPDATE sessions SET revoked_at = ? WHERE id = ?", time.Now().UTC().Format(time.RFC3339), user.SessionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to revoke session"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "Logged out successfully"})
}

// ApproveUser sets a user's status to approved and notifies them (Admin only)
func ApproveUser(c *gin.Context) {
	username := c.Param("username")
	if username == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "username parameter required"})
		return
	}

	var email string
	err := db.DB.QueryRow("SELECT email FROM users WHERE username = ?", username).Scan(&email)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	_, err = db.DB.Exec("UPDATE users SET status = 'approved' WHERE username = ?", username)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to approve user"})
		return
	}

	// Notify user that they have been granted access
	go SendUserApprovalNotification(email)

	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "User approved successfully"})
}

// GetPendingUsers returns a list of all users with 'pending' status
func GetPendingUsers(c *gin.Context) {
	rows, err := db.DB.Query("SELECT username, email, created_at FROM users WHERE status = 'pending'")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to query pending users"})
		return
	}
	defer rows.Close()

	type PendingUser struct {
		Username  string `json:"username"`
		Email     string `json:"email"`
		CreatedAt string `json:"createdAt"`
	}

	var users []PendingUser
	for rows.Next() {
		var u PendingUser
		if err := rows.Scan(&u.Username, &u.Email, &u.CreatedAt); err == nil {
			users = append(users, u)
		}
	}

	c.JSON(http.StatusOK, users)
}
