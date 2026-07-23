package auth

import (
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"Geospatial-harmuz-watch/server/internal/config"
	"Geospatial-harmuz-watch/server/internal/db"
)

type RegisterReq struct {
	Username string `json:"username" binding:"required,min=3"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password"`
}

type LoginReq struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password" binding:"required"`
}

// Register creates a user record for a Supabase-authenticated user.
// Supabase handles the actual password/auth; we just sync to our users table.
func Register(c *gin.Context) {
	var req RegisterReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request. Username (min 3), valid email required."})
		return
	}

	// Check if this is a Supabase-authenticated request
	authHeader := c.GetHeader("Authorization")
	isSupabaseUser := false
	var supabaseUID string

	if authHeader != "" && strings.HasPrefix(authHeader, "Bearer ") {
		token := strings.TrimPrefix(authHeader, "Bearer ")
		claims, isSB, err := ValidateToken(token)
		if err == nil && isSB {
			isSupabaseUser = true
			if sub, ok := claims["sub"].(string); ok {
				supabaseUID = sub
			}
		}
	}

	// For legacy (non-Supabase) registration, hash the password
	var passwordHash string
	if !isSupabaseUser && req.Password != "" {
		hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			log.Printf("[Auth] Failed to hash password: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
			return
		}
		passwordHash = string(hash)
	}

	// Single secure admin workaround: the only account ever granted the
	// "admin" role is the one whose email matches the configured
	// PRIMARY_ADMIN_EMAIL (env-driven, see config). Every other registration is
	// a pending, non-admin account. This guarantees exactly one secure user and
	// avoids a random "first registrant" becoming admin.
	role := "user"
	status := "pending"
	if strings.EqualFold(req.Email, config.PrimaryAdminEmail) {
		role = "admin"
		status = "approved"
	}

	id := uuid.New().String()
	if isSupabaseUser {
		id = "sb-" + supabaseUID[:12]
	}

	_, err := db.Exec(
		`INSERT INTO users (id, username, email, password_hash, role, status, supabase_uid)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`,
		id, req.Username, req.Email, passwordHash, role, status, supabaseUID,
	)
	if err != nil {
		// If already exists, try updating
		if strings.Contains(err.Error(), "UNIQUE") || strings.Contains(err.Error(), "duplicate") {
			_, err = db.Exec(
				`UPDATE users SET supabase_uid = ?, role = CASE WHEN status = 'approved' THEN role ELSE ? END, status = CASE WHEN status = 'approved' THEN 'approved' ELSE ? END
				 WHERE email = ? OR username = ?`,
				supabaseUID, role, status, req.Email, req.Username,
			)
			if err != nil {
				c.JSON(http.StatusConflict, gin.H{"error": "Username or email already exists"})
				return
			}
		} else {
			c.JSON(http.StatusConflict, gin.H{"error": "Username or email already exists"})
			return
		}
	}

	// Trigger async email notification to admin (skip for first admin)
	if status == "pending" {
		go SendAdminNotification(req.Username, req.Email)
		c.JSON(http.StatusOK, gin.H{"status": "success", "message": "Registration successful. Pending admin approval."})
	} else {
		c.JSON(http.StatusOK, gin.H{"status": "success", "message": "Registration successful. You are the initial admin."})
	}
}

// Login authenticates a user and returns a JWT (legacy, for backward compatibility).
// Supabase Auth users should use Supabase's signInWithPassword directly from the frontend.
func Login(c *gin.Context) {
	var req LoginReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// Try login by email if username is empty (Supabase-style)
	var storedHash, email, role, status, dbUsername string
	var err error
	if req.Email != "" {
		err = db.QueryRow("SELECT password_hash, email, role, status, username FROM users WHERE email = ?", req.Email).
			Scan(&storedHash, &email, &role, &status, &dbUsername)
	} else {
		err = db.QueryRow("SELECT password_hash, email, role, status, username FROM users WHERE username = ?", req.Username).
			Scan(&storedHash, &email, &role, &status, &dbUsername)
	}

	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	if status == "pending" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Your account is pending admin approval."})
		return
	}

	if status == "blacklisted" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Your account has been blacklisted by an administrator."})
		return
	}

	if status != "approved" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Your account access has been revoked or denied."})
		return
	}

	// Skip password check for Supabase-linked accounts (no password_hash stored)
	if storedHash != "" {
		if err := bcrypt.CompareHashAndPassword([]byte(storedHash), []byte(req.Password)); err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
			return
		}
	}

	sessionID := uuid.New().String()
	now := time.Now().UTC()
	expiresAt := now.Add(24 * time.Hour)
	_, err = db.Exec(
		"INSERT INTO sessions (id, username, created_at, expires_at, last_seen_at) VALUES (?, ?, ?, ?, ?)",
		sessionID, dbUsername, now.Format(time.RFC3339), expiresAt.Format(time.RFC3339), now.Format(time.RFC3339),
	)
	if err != nil {
		log.Printf("[Auth] Failed to create session: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}

	token, err := GenerateToken(dbUsername, email, role, sessionID, 24*time.Hour)
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
			"username": dbUsername,
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

	// When auth is disabled or using Supabase auth, return virtual session
	if user.SessionID == "auth-disabled-session" || user.SupabaseUID != "" {
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

	// Supabase auth or disabled auth — no DB session to revoke
	if user.SessionID == "auth-disabled-session" || user.SupabaseUID != "" {
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

// Refresh re-issues a JWT for an already-authenticated session without
// requiring the user to re-enter credentials. The JWTMiddleware validates the
// incoming token and populates the authUser context before this runs.
func Refresh(c *gin.Context) {
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

	token, err := GenerateToken(user.Username, user.Email, user.Role, user.SessionID, 24*time.Hour)
	if err != nil {
		log.Printf("[Auth] Failed to refresh token: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to refresh token"})
		return
	}

	expiresAt := time.Now().UTC().Add(24 * time.Hour)
	c.JSON(http.StatusOK, gin.H{
		"status":    "success",
		"token":     token,
		"expiresAt": expiresAt.Format(time.RFC3339),
		"user": gin.H{
			"username": user.Username,
			"email":    user.Email,
			"role":     user.Role,
		},
	})
}

// ApproveUser sets a user's status to approved (Admin only)
func ApproveUser(c *gin.Context) {
	username := c.Param("username")
	if username == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "username parameter required"})
		return
	}

	var email string
	err := db.QueryRow("SELECT email FROM users WHERE username = ?", username).Scan(&email)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	_, err = db.Exec("UPDATE users SET status = 'approved' WHERE username = ?", username)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to approve user"})
		return
	}

	// If this matches the primary admin email, also set role to admin
	if strings.EqualFold(email, config.PrimaryAdminEmail) {
		_, _ = db.Exec("UPDATE users SET role = 'admin' WHERE username = ?", username)
	}

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

	_, err := db.Exec("DELETE FROM users WHERE username = ?", username)
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

	_, err := db.Exec("UPDATE users SET status = ?, email = ?, role = ? WHERE username = ?", req.Status, req.Email, req.Role, username)
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

func BlacklistUser(c *gin.Context) {
	username := c.Param("username")
	if username == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "username parameter required"})
		return
	}

	authUserValue, _ := c.Get("authUser")
	if authUser, ok := authUserValue.(AuthenticatedUser); ok && authUser.Username == username {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cannot blacklist yourself"})
		return
	}

	var email string
	err := db.DB.QueryRow("SELECT email FROM users WHERE username = ?", username).Scan(&email)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	_, err = db.DB.Exec("UPDATE users SET status = 'blacklisted' WHERE username = ?", username)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to blacklist user"})
		return
	}

	_, _ = db.DB.Exec("UPDATE sessions SET revoked_at = ? WHERE username = ? AND revoked_at IS NULL", time.Now().UTC().Format(time.RFC3339), username)

	if email != "" {
		go SendBlacklistNotification(email)
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "User blacklisted successfully"})
}

func UnblacklistUser(c *gin.Context) {
	username := c.Param("username")
	if username == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "username parameter required"})
		return
	}

	var status, email string
	err := db.DB.QueryRow("SELECT status, email FROM users WHERE username = ?", username).Scan(&status, &email)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	if status != "blacklisted" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "user is not blacklisted"})
		return
	}

	_, err = db.DB.Exec("UPDATE users SET status = 'approved' WHERE username = ?", username)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to unblacklist user"})
		return
	}

	if email != "" {
		go SendUserApprovalNotification(email)
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "User unblacklisted successfully"})
}
