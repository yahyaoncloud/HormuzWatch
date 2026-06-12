package auth

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/MicahParks/keyfunc/v3"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"

	"Geospatial-harmuz-watch/server/internal/config"
	"Geospatial-harmuz-watch/server/internal/db"
)

var (
	jwks     keyfunc.Keyfunc
	jwksOnce sync.Once
)

func getJWKS() (keyfunc.Keyfunc, error) {
	var err error
	jwksOnce.Do(func() {
		url := os.Getenv("SUPABASE_URL")
		if url == "" {
			url = "https://dipuwvlnauqkjrqcfeqw.supabase.co"
		}
		url = strings.TrimSuffix(url, "/")
		jwksURL := fmt.Sprintf("%s/auth/v1/.well-known/jwks.json", url)
		jwks, err = keyfunc.NewDefault([]string{jwksURL})
	})
	if err != nil {
		jwksOnce = sync.Once{}
	}
	return jwks, err
}

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
		
		// Extract custom username if available
		username := sub
		if meta, ok := claims["user_metadata"].(map[string]interface{}); ok {
			if uname, ok := meta["username"].(string); ok && uname != "" {
				username = uname
			}
		}
		if username == "" {
			username, _ = claims["username"].(string) // fallback
		}

		// Check local database for status
		var localStatus string
		var localRole string
		err = db.QueryRow("SELECT status, role FROM users WHERE email = $1", email).Scan(&localStatus, &localRole)
		if err != nil {
			if err == sql.ErrNoRows {
				// Auto-insert user as pending
				_, insertErr := db.Exec("INSERT INTO users (id, username, email, role, status) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING", sub, username, email, "user", "pending")
				if insertErr != nil {
					log.Printf("Failed to insert new user into local DB: %v", insertErr)
				}
				localStatus = "pending"
				localRole = "user"
			} else {
				log.Printf("Error querying local user: %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
				c.Abort()
				return
			}
		}

		if strings.EqualFold(email, config.PrimaryAdminEmail) {
			localRole = "admin"
			localStatus = "approved"
		}

		// Enforce approval
		if localStatus != "approved" {
			c.JSON(http.StatusForbidden, gin.H{"error": "account pending admin approval or blacklisted"})
			c.Abort()
			return
		}

		sessionID, _ := claims["session_id"].(string)
		if sessionID == "" {
			sessionID, _ = claims["sid"].(string)
		}

		c.Set("user_id", sub)

		authUser := AuthenticatedUser{
			Username:  username,
			Email:     email,
			Role:      localRole,
			SessionID: sessionID,
			Status:    localStatus,
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



// ValidateToken validates a JWT token using either HMAC or JWKS
func ValidateToken(tokenString string) (jwt.MapClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, jwt.MapClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); ok {
			secret := os.Getenv("JWT_SECRET")
			if secret == "" {
				secret = "default_unsafe_secret_for_dev_only"
			}
			return []byte(secret), nil
		}

		kf, err := getJWKS()
		if err != nil {
			return nil, fmt.Errorf("failed to fetch JWKS: %w", err)
		}
		return kf.Keyfunc(token)
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
