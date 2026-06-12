package auth

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"

	"Geospatial-harmuz-watch/server/internal/config"
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
		// Check if auth is disabled — inject a default admin session
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

		email, _ := claims["email"].(string)
		sub, _ := claims["sub"].(string)
		if sub == "" {
			sub, _ = claims["username"].(string) // fallback for legacy custom JWTs
		}
		
		role, _ := claims["role"].(string)
		if strings.EqualFold(email, config.PrimaryAdminEmail) {
			role = "admin"
		}

		sessionID, _ := claims["session_id"].(string)
		if sessionID == "" {
			sessionID, _ = claims["sid"].(string)
		}

		authUser := AuthenticatedUser{
			Username:  sub,
			Email:     email,
			Role:      role,
			SessionID: sessionID,
			Status:    "approved",
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
			// When auth is disabled, the JWT middleware already set a default admin user
			c.Next()
			return
		}

		authUser, ok := c.Get("authUser")
		if !ok {
			c.JSON(http.StatusForbidden, gin.H{"error": "admin access required"})
			c.Abort()
			return
		}

		user, ok := authUser.(AuthenticatedUser)
		if !ok || !strings.EqualFold(user.Email, config.PrimaryAdminEmail) {
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
