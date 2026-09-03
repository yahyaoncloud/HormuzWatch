package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"Geospatial-harmuz-watch/server/internal/integrations/ais"

	"github.com/gin-gonic/gin"
)

func TestGetActiveVesselsResponse(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Populate GlobalVesselCache with a test vessel
	ais.GlobalVesselCache.UpdatePosition(
		"408123456", "AL DAFNA", "A7CD",
		26.5, 56.4, 14.5, 90.0, 90.0,
		0, 0.0, "PositionReport", time.Now().UTC(),
	)

	r := gin.New()
	r.GET("/public/vessels", GetActiveVessels)

	req, _ := http.NewRequest(http.MethodGet, "/public/vessels", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected HTTP 200, got %d", w.Code)
	}

	var resp map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("Failed to parse response JSON: %v", err)
	}

	count, ok := resp["count"].(float64)
	if !ok || count == 0 {
		t.Errorf("Expected count > 0, got %v", resp["count"])
	}

	data, ok := resp["data"].([]interface{})
	if !ok || len(data) == 0 {
		t.Errorf("Expected non-empty data array, got %v", resp["data"])
	}
}
