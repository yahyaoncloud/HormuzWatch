package api

import (
	"net/http"
	"strconv"

	"Geospatial-harmuz-watch/server/internal/db"

	"github.com/gin-gonic/gin"
)

type SettingsData struct {
	RetentionDays          int  `json:"retention_days"`
	OpenSkyEnabled         bool `json:"opensky_enabled"`
	AISStreamEnabled       bool `json:"aisstream_enabled"`
	KystverketEnabled      bool `json:"kystverket_enabled"`
	AutoWatchlistThreshold int  `json:"auto_watchlist_threshold"`
	HeatmapEnabled         bool `json:"heatmap_enabled"`
	NewsEnabled            bool `json:"news_enabled"`
	CacheTelemetryFindings bool `json:"cache_telemetry_findings"`

	// LLM Engine & Provider Settings
	LlmProvider                   string  `json:"llm_provider"` // "openrouter" | "deepseek" | "gemini" | "openai" | "ollama"
	OpenRouterAPIKey              string  `json:"openrouter_api_key"`
	OpenRouterModel               string  `json:"openrouter_model"`
	OpenRouterFallbackModel       string  `json:"openrouter_fallback_model"`
	DeepSeekAPIKey                string  `json:"deepseek_api_key"`
	DeepSeekModel                 string  `json:"deepseek_model"`
	GeminiAPIKey                  string  `json:"gemini_api_key"`
	GeminiModel                   string  `json:"gemini_model"`
	OpenAIAPIKey                  string  `json:"openai_api_key"`
	OpenAIModel                   string  `json:"openai_model"`
	OllamaBaseURL                 string  `json:"ollama_base_url"`
	OllamaModel                   string  `json:"ollama_model"`
	LlmThreatAnalysisEnabled      bool    `json:"llm_threat_analysis_enabled"`
	LlmNewsSummarizationEnabled   bool    `json:"llm_news_summarization_enabled"`
	LlmAnomalyExplanationEnabled bool    `json:"llm_anomaly_explanation_enabled"`
	LlmTemperature                float64 `json:"llm_temperature"`
	LlmMaxTokens                  int     `json:"llm_max_tokens"`
}

// GetSettingValue returns a settings value by key, falling back to default.
func GetSettingValue(key, fallback string) string {
	return getSetting(key, fallback)
}

func getSetting(key, fallback string) string {
	var val string
	err := db.QueryRow("SELECT value FROM settings WHERE key = ?", key).Scan(&val)
	if err != nil {
		return fallback
	}
	return val
}

func GetSettings(c *gin.Context) {
	retDays, _ := strconv.Atoi(getSetting("retention_days", "72"))
	autoThresh, _ := strconv.Atoi(getSetting("auto_watchlist_threshold", "80"))
	temp, _ := strconv.ParseFloat(getSetting("llm_temperature", "0.2"), 64)
	tokens, _ := strconv.Atoi(getSetting("llm_max_tokens", "1024"))

	c.JSON(http.StatusOK, SettingsData{
		RetentionDays:          retDays,
		OpenSkyEnabled:         getSetting("opensky_enabled", "true") == "true",
		AISStreamEnabled:       getSetting("aisstream_enabled", "true") == "true",
		KystverketEnabled:      getSetting("kystverket_enabled", "true") == "true",
		AutoWatchlistThreshold: autoThresh,
		HeatmapEnabled:         getSetting("heatmap_enabled", "true") == "true",
		NewsEnabled:            getSetting("news_enabled", "true") == "true",
		CacheTelemetryFindings: getSetting("cache_telemetry_findings", "true") == "true",

		LlmProvider:                   getSetting("llm_provider", "openrouter"),
		OpenRouterAPIKey:              getSetting("openrouter_api_key", ""),
		OpenRouterModel:               getSetting("openrouter_model", "google/gemini-2.5-flash"),
		OpenRouterFallbackModel:       getSetting("openrouter_fallback_model", "openai/gpt-4o-mini"),
		DeepSeekAPIKey:                getSetting("deepseek_api_key", ""),
		DeepSeekModel:                 getSetting("deepseek_model", "deepseek-chat"),
		GeminiAPIKey:                  getSetting("gemini_api_key", ""),
		GeminiModel:                   getSetting("gemini_model", "gemini-2.5-flash"),
		OpenAIAPIKey:                  getSetting("openai_api_key", ""),
		OpenAIModel:                   getSetting("openai_model", "gpt-4o-mini"),
		OllamaBaseURL:                 getSetting("ollama_base_url", "http://localhost:11434"),
		OllamaModel:                   getSetting("ollama_model", "llama3.2"),
		LlmThreatAnalysisEnabled:      getSetting("llm_threat_analysis_enabled", "true") == "true",
		LlmNewsSummarizationEnabled:   getSetting("llm_news_summarization_enabled", "true") == "true",
		LlmAnomalyExplanationEnabled: getSetting("llm_anomaly_explanation_enabled", "true") == "true",
		LlmTemperature:                temp,
		LlmMaxTokens:                  tokens,
	})
}

func UpdateSettings(c *gin.Context) {
	var req SettingsData
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid settings payload"})
		return
	}

	if req.LlmProvider == "" {
		req.LlmProvider = "openrouter"
	}
	if req.LlmTemperature == 0 {
		req.LlmTemperature = 0.2
	}
	if req.LlmMaxTokens == 0 {
		req.LlmMaxTokens = 1024
	}

	updates := map[string]string{
		"retention_days":                  strconv.Itoa(req.RetentionDays),
		"opensky_enabled":                 strconv.FormatBool(req.OpenSkyEnabled),
		"aisstream_enabled":               strconv.FormatBool(req.AISStreamEnabled),
		"kystverket_enabled":              strconv.FormatBool(req.KystverketEnabled),
		"auto_watchlist_threshold":        strconv.Itoa(req.AutoWatchlistThreshold),
		"heatmap_enabled":                 strconv.FormatBool(req.HeatmapEnabled),
		"news_enabled":                    strconv.FormatBool(req.NewsEnabled),
		"cache_telemetry_findings":        strconv.FormatBool(req.CacheTelemetryFindings),
		"llm_provider":                    req.LlmProvider,
		"openrouter_api_key":              req.OpenRouterAPIKey,
		"openrouter_model":                req.OpenRouterModel,
		"openrouter_fallback_model":      req.OpenRouterFallbackModel,
		"deepseek_api_key":               req.DeepSeekAPIKey,
		"deepseek_model":                 req.DeepSeekModel,
		"gemini_api_key":                 req.GeminiAPIKey,
		"gemini_model":                   req.GeminiModel,
		"openai_api_key":                 req.OpenAIAPIKey,
		"openai_model":                   req.OpenAIModel,
		"ollama_base_url":                req.OllamaBaseURL,
		"ollama_model":                   req.OllamaModel,
		"llm_threat_analysis_enabled":     strconv.FormatBool(req.LlmThreatAnalysisEnabled),
		"llm_news_summarization_enabled":  strconv.FormatBool(req.LlmNewsSummarizationEnabled),
		"llm_anomaly_explanation_enabled": strconv.FormatBool(req.LlmAnomalyExplanationEnabled),
		"llm_temperature":                 strconv.FormatFloat(req.LlmTemperature, 'f', 2, 64),
		"llm_max_tokens":                 strconv.Itoa(req.LlmMaxTokens),
	}

	for key, val := range updates {
		_, err := db.Exec("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", key, val)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update setting: " + key})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"status": "success"})
}
