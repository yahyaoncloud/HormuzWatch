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
}

// JWTMiddleware validates JWT tokens from Authorization header
func JWTMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Check if auth is disabled
		if os.Getenv("AUTH_DISABLED") == "true" {
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
			// Fallback to query parameter for WebSocket connections
			token = c.Query("token")
		}

		if token == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "missing authorization token"})
			c.Abort()
			return
		}

		claims, err := ValidateToken(token)
		if err != nil {
			log.Printf("Token validation failed: %v", err)
			c.JSON(http.StatusForbidden, gin.H{"error": "invalid token"})
			c.Abort()
			return
		}

		authUser, err := ValidateSessionClaims(claims)
		if err != nil {
			log.Printf("Session validation failed: %v", err)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired session"})
			c.Abort()
			return
		}

		// Attach claims to context
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

// GenerateToken creates a new JWT for the specified user
func GenerateToken(username, email, role, sessionID string, duration time.Duration) (string, error) {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "default_unsafe_secret_for_dev_only" // Fallback if not set
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
	err := db.DB.QueryRow(`
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

	_, _ = db.DB.Exec("UPDATE sessions SET last_seen_at = ? WHERE id = ?;", now, sessionID)
	return user, nil
}

// ValidateToken validates a JWT token
func ValidateToken(tokenString string) (jwt.MapClaims, error) {
	// For Phase 2, implement basic JWT validation
	// TODO: Integrate with Azure AD JWKS endpoint for production
	token, err := jwt.ParseWithClaims(tokenString, jwt.MapClaims{}, func(token *jwt.Token) (interface{}, error) {
		secret := os.Getenv("JWT_SECRET")
		if secret == "" {
			secret = "default_unsafe_secret_for_dev_only"
		}
		return []byte(secret), nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to parse token: %w", err)
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid token claims")
	}

	return claims, nil
}

// GetManagedIdentityToken acquires a token using Azure managed identity
// This will be used in Phase 3 for production deployments
func GetManagedIdentityToken(ctx context.Context) (string, error) {
	// TODO: Implement Azure managed identity token acquisition
	// using github.com/Azure/azure-sdk-for-go/sdk/azidentity
	return "", fmt.Errorf("managed identity not yet configured for Phase 2")
}
