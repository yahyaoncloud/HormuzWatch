package auth

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

// JWTMiddleware validates JWT tokens from Authorization header
func JWTMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Check if auth is disabled
		if os.Getenv("AUTH_DISABLED") == "true" {
			c.Next()
			return
		}

		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "missing authorization header"})
			c.Abort()
			return
		}

		// Extract token from "Bearer <token>" format
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid authorization header format"})
			c.Abort()
			return
		}

		token := parts[1]
		claims, err := ValidateToken(token)
		if err != nil {
			log.Printf("Token validation failed: %v", err)
			c.JSON(http.StatusForbidden, gin.H{"error": "invalid token"})
			c.Abort()
			return
		}

		// Attach claims to context
		c.Set("user", claims)
		c.Next()
	}
}

// ValidateToken validates a JWT token
func ValidateToken(tokenString string) (jwt.MapClaims, error) {
	// For Phase 2, implement basic JWT validation
	// TODO: Integrate with Azure AD JWKS endpoint for production
	token, err := jwt.ParseWithClaims(tokenString, jwt.MapClaims{}, func(token *jwt.Token) (interface{}, error) {
		// TODO: Fetch public key from Azure AD JWKS
		return []byte(os.Getenv("JWT_SECRET")), nil
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
