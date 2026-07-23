package api

import (
	"net/http"
	"strings"
	"time"

	"Geospatial-harmuz-watch/server/internal/datasets"

	"github.com/gin-gonic/gin"
)

// datasetHandlers exposes the dataset pipeline over HTTP.
type datasetHandlers struct {
	svc *datasets.Service
}

// DatasetHandlers builds the dataset HTTP handlers bound to a pipeline service.
func DatasetHandlers(svc *datasets.Service) *datasetHandlers {
	return &datasetHandlers{svc: svc}
}

// snapshotRequest is the body for POST /datasets/snapshot.
type snapshotRequest struct {
	Domain string `json:"domain"`
}

// Snapshot builds a dataset for a domain and enqueues it for async GDrive upload.
//
//	POST /datasets/snapshot  { "domain": "vessel|aircraft|heatmap" }
func (h *datasetHandlers) Snapshot(c *gin.Context) {
	var req snapshotRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.Domain == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "domain is required (vessel|aircraft|heatmap)"})
		return
	}
	req.Domain = strings.ToLower(strings.TrimSpace(req.Domain))
	snapshotID, err := h.svc.Snapshot(req.Domain)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusAccepted, gin.H{
		"status":      "queued",
		"domain":      req.Domain,
		"snapshot_id": snapshotID,
		"note":        "upload runs asynchronously; check GET /datasets/status",
	})
}

// Flush forces the queue to drain now.
//
//	POST /datasets/flush
func (h *datasetHandlers) Flush(c *gin.Context) {
	if err := h.svc.Flush(c.Request.Context(), 30*time.Second); err != nil {
		c.JSON(http.StatusGatewayTimeout, gin.H{"error": "flush timed out: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "flushed"})
}

// List returns dataset files currently in the Drive folder.
//
//	GET /datasets
func (h *datasetHandlers) List(c *gin.Context) {
	files, err := h.svc.List()
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"datasets": files, "count": len(files)})
}

// Status reports pipeline runtime state.
//
//	GET /datasets/status
func (h *datasetHandlers) Status(c *gin.Context) {
	c.JSON(http.StatusOK, h.svc.Status())
}
