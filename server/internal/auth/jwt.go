package auth

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"

	"Geospatial-harmuz-watch/server/internal/config"
	"Geospatial-harmuz-watch/server/internal/db"
)

type AuthenticatedUser struct {
	Username  string `json:"username"`
	Email     string `json:"email"`
	Role      string `json:"role"`
	Status    string `json:"status"`
	SessionID string `json:"sessionId"`
	SupabaseUID string `json:"supabaseUid,omitempty"`
}

// JWTMiddleware validates JWT tokens from Authorization header.
// Supports both Supabase-issued JWTs and legacy custom tokens.
func JWTMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		if os.Getenv("AUTH_DISABLED") == "true" {
			c.Set("authUser", AuthenticatedUser{
				Username:  config.PrimaryAdminUsername,
				Email:     config.PrimaryAdminEmail,
				Role:      "admin",
				Status:    "approved",
				SessionID: "auth-disabled-session",
			})
			c.Set("user", jwt.MapClaims{
				"username": config.PrimaryAdminUsername,
				"email":    config.PrimaryAdminEmail,
				"role":     "admin",
				"sid":      "auth-disabled-session",
			})
			c.Next()
			return
		}

		authHeader := c.GetHeader("Authorization")
		var token string

		if authHeader != "" {
			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || parts[0] != "Bearer" {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid authorization header format"})
				c.Abort()
				return
			}
			token = parts[1]
		} else {
			token = c.Query("token")
		}

		if token == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "missing authorization token"})
			c.Abort()
			return
		}

		// Try Supabase JWT first, fall back to legacy token
		claims, isSupabase, err := ValidateToken(token)
		if err != nil {
			log.Printf("Token validation failed: %v", err)
			c.JSON(http.StatusForbidden, gin.H{"error": "invalid token"})
			c.Abort()
			return
		}

		var authUser AuthenticatedUser
		if isSupabase {
			authUser, err = validateSupabaseSession(claims)
		} else {
			authUser, err = ValidateSessionClaims(claims)
		}

		if err != nil {
			log.Printf("Session validation failed: %v", err)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired session"})
			c.Abort()
			return
		}

		c.Set("user", claims)
		c.Set("authUser", authUser)
		c.Next()
	}
}

// AdminOnlyMiddleware allows only the configured administrator account through.
func AdminOnlyMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		if os.Getenv("AUTH_DISABLED") == "true" {
			c.Next()
			return
		}

		claimsValue, exists := c.Get("user")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "missing authenticated user"})
			c.Abort()
			return
		}

		claims, ok := claimsValue.(jwt.MapClaims)
		if !ok {
			c.JSON(http.StatusForbidden, gin.H{"error": "invalid token claims"})
			c.Abort()
			return
		}

		username, ok := claims["username"].(string)
		if !ok || username == "" {
			c.JSON(http.StatusForbidden, gin.H{"error": "invalid token subject"})
			c.Abort()
			return
		}

		authUser, ok := c.Get("authUser")
		if !ok {
			c.JSON(http.StatusForbidden, gin.H{"error": "admin access required"})
			c.Abort()
			return
		}

		user, ok := authUser.(AuthenticatedUser)
		if !ok || user.Username != username || !strings.EqualFold(user.Email, config.PrimaryAdminEmail) || user.Role != "admin" || user.Status != "approved" {
			c.JSON(http.StatusForbidden, gin.H{"error": "admin access required"})
			c.Abort()
			return
		}

		c.Next()
	}
}

// ValidateToken validates a JWT token, returning whether it's a Supabase token.
func ValidateToken(tokenString string) (jwt.MapClaims, bool, error) {
	// Try Supabase JWT secret first
	supabaseJWTSecret := os.Getenv("SUPABASE_JWT_SECRET")
	if supabaseJWTSecret == "" {
		supabaseJWTSecret = os.Getenv("JWT_SECRET") // fallback
	}

	// Try parsing with Supabase secret
	if supabaseJWTSecret != "" {
		token, err := jwt.ParseWithClaims(tokenString, jwt.MapClaims{}, func(token *jwt.Token) (interface{}, error) {
			return []byte(supabaseJWTSecret), nil
		})
		if err == nil && token.Valid {
			claims, ok := token.Claims.(jwt.MapClaims)
			if ok {
				// Supabase tokens have "sub", "aud", "email" claims
				if _, hasSub := claims["sub"]; hasSub {
					// Enrich claims with user info from our DB
					sub, _ := claims["sub"].(string)
					email, _ := claims["email"].(string)
					var dbUsername, dbRole, dbStatus string
					err := db.QueryRow(
						"SELECT username, role, status FROM users WHERE supabase_uid = ? OR email = ?",
						sub, email,
					).Scan(&dbUsername, &dbRole, &dbStatus)
					if err == nil {
						if strings.EqualFold(email, config.PrimaryAdminEmail) {
							dbRole = "admin"
							dbStatus = "approved"
						}
						claims["username"] = dbUsername
						claims["role"] = dbRole
						claims["status"] = dbStatus
						claims["supabase_uid"] = sub
					} else {
						// User not in our DB yet — use email prefix as username
						claims["username"] = strings.Split(email, "@")[0]
						if strings.EqualFold(email, config.PrimaryAdminEmail) {
							claims["role"] = "admin"
							claims["status"] = "approved"
						} else {
							claims["role"] = "user"
							claims["status"] = "pending"
						}
						claims["supabase_uid"] = sub
					}
					return claims, true, nil
				}
			}
		} else {
			log.Printf("[JWT] Supabase token signature verification failed: %v", err)
		}
	}

	// Fall back to legacy JWT secret
	legacySecret := os.Getenv("JWT_SECRET")
	if legacySecret == "" {
		legacySecret = "default_unsafe_secret_for_dev_only"
	}

	token, err := jwt.ParseWithClaims(tokenString, jwt.MapClaims{}, func(token *jwt.Token) (interface{}, error) {
		return []byte(legacySecret), nil
	})
	if err != nil {
		return nil, false, fmt.Errorf("failed to parse token: %w", err)
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || !token.Valid {
		return nil, false, fmt.Errorf("invalid token claims")
	}

	return claims, false, nil
}

// validateSupabaseSession validates a Supabase-authenticated user against our DB.
func validateSupabaseSession(claims jwt.MapClaims) (AuthenticatedUser, error) {
	sub, _ := claims["sub"].(string)
	email, _ := claims["email"].(string)
	username, _ := claims["username"].(string)
	role, _ := claims["role"].(string)
	status, _ := claims["status"].(string)

	if sub == "" {
		return AuthenticatedUser{}, fmt.Errorf("missing sub claim in Supabase token")
	}

	// Ensure user exists in our DB
	var dbUsername, dbEmail, dbRole, dbStatus string
	err := db.QueryRow(
		"SELECT username, email, role, status FROM users WHERE supabase_uid = ? OR email = ?",
		sub, email,
	).Scan(&dbUsername, &dbEmail, &dbRole, &dbStatus)

	if err == sql.ErrNoRows {
		// Auto-create user record for Supabase-authenticated users
		userID := fmt.Sprintf("sb-%s", sub[:12])
		if username == "" {
			username = strings.Split(email, "@")[0]
		}
		if strings.EqualFold(email, config.PrimaryAdminEmail) {
			dbRole = "admin"
			dbStatus = "approved"
		} else {
			dbRole = "user"
			dbStatus = "pending"
		}
		_, _ = db.Exec(
			`INSERT INTO users (id, username, email, role, status, supabase_uid)
			 VALUES (?, ?, ?, ?, ?, ?)
			 ON CONFLICT (id) DO NOTHING`,
			userID, username, email, dbRole, dbStatus, sub,
		)
		dbUsername = username
		dbEmail = email
	} else if err != nil {
		return AuthenticatedUser{}, fmt.Errorf("database lookup failed: %w", err)
	} else {
		if strings.EqualFold(email, config.PrimaryAdminEmail) && (dbRole != "admin" || dbStatus != "approved") {
			dbRole = "admin"
			dbStatus = "approved"
			_, _ = db.Exec("UPDATE users SET role = 'admin', status = 'approved', supabase_uid = ? WHERE email = ?", sub, email)
		}
		username = dbUsername
		email = dbEmail
		role = dbRole
		status = dbStatus
	}

	if status == "blacklisted" {
		return AuthenticatedUser{}, fmt.Errorf("user is blacklisted")
	}

	return AuthenticatedUser{
		Username:    username,
		Email:       email,
		Role:        role,
		Status:      status,
		SessionID:   sub, // Use Supabase UID as session identifier
		SupabaseUID: sub,
	}, nil
}

// ValidateSessionClaims validates a legacy session.
func ValidateSessionClaims(claims jwt.MapClaims) (AuthenticatedUser, error) {
	username, ok := claims["username"].(string)
	if !ok || username == "" {
		return AuthenticatedUser{}, fmt.Errorf("missing username claim")
	}

	sessionID, ok := claims["sid"].(string)
	if !ok || sessionID == "" {
		return AuthenticatedUser{}, fmt.Errorf("missing session claim")
	}

	now := time.Now().UTC().Format(time.RFC3339)
	var user AuthenticatedUser
	var revokedAt sql.NullString
	err := db.QueryRow(`
		SELECT u.username, u.email, u.role, u.status, s.id, s.revoked_at
		FROM sessions s
		JOIN users u ON u.username = s.username
		WHERE s.id = ? AND s.username = ? AND s.expires_at > ?;
	`, sessionID, username, now).Scan(&user.Username, &user.Email, &user.Role, &user.Status, &user.SessionID, &revokedAt)
	if err != nil {
		return AuthenticatedUser{}, err
	}

	if revokedAt.Valid {
		return AuthenticatedUser{}, fmt.Errorf("session revoked")
	}

	if user.Status != "approved" {
		return AuthenticatedUser{}, fmt.Errorf("user is not approved")
	}

	_, _ = db.Exec("UPDATE sessions SET last_seen_at = ? WHERE id = ?;", now, sessionID)
	return user, nil
}

// GenerateToken creates a new JWT for the specified user (legacy, for API compatibility).
func GenerateToken(username, email, role, sessionID string, duration time.Duration) (string, error) {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "default_unsafe_secret_for_dev_only"
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"username": username,
		"email":    email,
		"role":     role,
		"sid":      sessionID,
		"exp":      time.Now().Add(duration).Unix(),
	})

	return token.SignedString([]byte(secret))
}

// GetManagedIdentityToken acquires a token using Azure managed identity.
func GetManagedIdentityToken(ctx context.Context) (string, error) {
	return "", fmt.Errorf("managed identity not yet configured for Phase 2")
}
