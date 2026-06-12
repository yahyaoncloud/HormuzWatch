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
	_, err = db.Exec("INSERT INTO users (id, username, email, password_hash, status) VALUES (?, ?, ?, ?, 'pending')", id, req.Username, req.Email, string(hash))
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
	err := db.QueryRow("SELECT password_hash, email, role, status FROM users WHERE username = ?", req.Username).Scan(&storedHash, &email, &role, &status)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	if status == "pending" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Your account is pending admin approval."})
		return
	}

	if status == "blacklisted" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Your account has been blacklisted by an administrator. Contact administrator for assistance."})
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
	_, err = db.Exec(
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

	// When auth is disabled, the JWT middleware injects a virtual session — skip DB lookup
	if user.SessionID == "auth-disabled-session" {
		expiresAt := time.Now().UTC().Add(24 * time.Hour).Format(time.RFC3339)
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
		return
	}

	var expiresAt string
	err := db.QueryRow("SELECT expires_at FROM sessions WHERE id = ?", user.SessionID).Scan(&expiresAt)
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

	// When auth is disabled, the JWT middleware uses a virtual session — no DB row to revoke
	if user.SessionID == "auth-disabled-session" {
		c.JSON(http.StatusOK, gin.H{"status": "success", "message": "Logged out successfully"})
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
	err := db.QueryRow("SELECT email FROM users WHERE username = $1", username).Scan(&email)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	_, err = db.Exec("UPDATE users SET status = 'approved' WHERE username = $1", username)
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
	rows, err := db.Query("SELECT username, email, created_at FROM users WHERE status = 'pending'")
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


func DeleteUser(c *gin.Context) {
	username := c.Param("username")
	if username == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "username parameter required"})
		return
	}

	_, err := db.Exec("DELETE FROM users WHERE username = $1", username)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "User deleted successfully"})
}

func UpdateUser(c *gin.Context) {
	username := c.Param("username")
	if username == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "username parameter required"})
		return
	}

	var req struct {
		Status string `json:"status"`
		Email  string `json:"email"`
		Role   string `json:"role"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	_, err := db.Exec("UPDATE users SET status = $1, email = $2, role = $3 WHERE username = $4", req.Status, req.Email, req.Role, username)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "User updated successfully"})
}

// GetAllUsers returns a list of all registered users (Admin only)
func GetAllUsers(c *gin.Context) {
	rows, err := db.DB.Query("SELECT id, username, email, role, status, created_at FROM users ORDER BY created_at DESC")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to query users"})
		return
	}
	defer rows.Close()

	type UserInfo struct {
		ID        string `json:"id"`
		Username  string `json:"username"`
		Email     string `json:"email"`
		Role      string `json:"role"`
		Status    string `json:"status"`
		CreatedAt string `json:"createdAt"`
	}

	var users []UserInfo
	for rows.Next() {
		var u UserInfo
		if err := rows.Scan(&u.ID, &u.Username, &u.Email, &u.Role, &u.Status, &u.CreatedAt); err == nil {
			users = append(users, u)
		}
	}

	if users == nil {
		users = []UserInfo{}
	}

	c.JSON(http.StatusOK, users)
}

// BlacklistUser sets a user's status to 'blacklisted', revokes all sessions, and notifies them (Admin only)
func BlacklistUser(c *gin.Context) {
	username := c.Param("username")
	if username == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "username parameter required"})
		return
	}

	// Prevent admin from blacklisting themselves
	authUserValue, _ := c.Get("authUser")
	if authUser, ok := authUserValue.(AuthenticatedUser); ok && authUser.Username == username {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cannot blacklist yourself"})
		return
	}

	// Fetch user email before updating
	var email string
	err := db.DB.QueryRow("SELECT email FROM users WHERE username = $1", username).Scan(&email)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	// Set status to blacklisted
	_, err = db.DB.Exec("UPDATE users SET status = 'blacklisted' WHERE username = $1", username)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to blacklist user"})
		return
	}

	// Revoke all active sessions for this user
	_, _ = db.DB.Exec("UPDATE sessions SET revoked_at = $1 WHERE username = $2 AND revoked_at IS NULL", time.Now().UTC().Format(time.RFC3339), username)

	// Notify the blacklisted user
	if email != "" {
		go SendBlacklistNotification(email)
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "User blacklisted successfully"})
}

// UnblacklistUser restores a blacklisted user to 'approved' status (Admin only)
func UnblacklistUser(c *gin.Context) {
	username := c.Param("username")
	if username == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "username parameter required"})
		return
	}

	// Fetch current status and email
	var status, email string
	err := db.DB.QueryRow("SELECT status, email FROM users WHERE username = $1", username).Scan(&status, &email)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	if status != "blacklisted" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "user is not blacklisted"})
		return
	}

	_, err = db.DB.Exec("UPDATE users SET status = 'approved' WHERE username = $1", username)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to unblacklist user"})
		return
	}

	// Notify the user that access has been restored
	if email != "" {
		go SendUserApprovalNotification(email)
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "User unblacklisted successfully"})
}

