package news

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"
)

// OpenRouterClient provides LLM-based intelligence capabilities via the
// OpenRouter API. Used for translation, threat classification, and
// entity-enhanced analysis of Gulf-region news articles.
type OpenRouterClient struct {
	apiKey     string
	model      string
	baseURL    string
	httpClient *http.Client
	configured bool
}

// NewOpenRouterClient creates a client from the OPENROUTER_API_KEY env var.
// When the key is missing or set to the placeholder value, all methods
// return nil/empty without error (graceful degradation).
func NewOpenRouterClient() *OpenRouterClient {
	apiKey := os.Getenv("OPENROUTER_API_KEY")
	configured := apiKey != "" && apiKey != "your_openrouter_api_key"
	model := os.Getenv("OPENROUTER_MODEL")
	if model == "" {
		model = "google/gemini-2.5-flash"
	}
	return &OpenRouterClient{
		apiKey:     apiKey,
		model:      model,
		baseURL:    "https://openrouter.ai/api/v1/chat/completions",
		httpClient: &http.Client{Timeout: 30 * time.Second},
		configured: configured,
	}
}

func (c *OpenRouterClient) IsConfigured() bool { return c.configured }

// ── Chat infrastructure ───────────────────────────────────────────

type chatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type chatRequest struct {
	Model     string        `json:"model"`
	Messages  []chatMessage `json:"messages"`
	MaxTokens int           `json:"max_tokens,omitempty"`
}

type chatResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	Error struct {
		Message string `json:"message"`
	} `json:"error"`
}

func (c *OpenRouterClient) chat(ctx context.Context, systemPrompt, userMessage string, maxTokens int) (string, error) {
	if !c.configured {
		return "", nil
	}

	reqBody := chatRequest{
		Model:     c.model,
		MaxTokens: maxTokens,
		Messages: []chatMessage{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: userMessage},
		},
	}

	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL, bytes.NewBuffer(bodyBytes))
	if err != nil {
		return "", fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("HTTP-Referer", "https://hormuzwatch.org")
	req.Header.Set("X-Title", "HormuzWatch Intelligence")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("http do: %w", err)
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("openrouter HTTP %d: %s", resp.StatusCode, string(respBytes))
	}

	var cr chatResponse
	if err := json.Unmarshal(respBytes, &cr); err != nil {
		return "", fmt.Errorf("decode response: %w", err)
	}
	if cr.Error.Message != "" {
		return "", fmt.Errorf("openrouter error: %s", cr.Error.Message)
	}
	if len(cr.Choices) == 0 {
		return "", fmt.Errorf("openrouter returned no choices")
	}

	return strings.TrimSpace(cr.Choices[0].Message.Content), nil
}

// ── Translation ────────────────────────────────────────────────────

const translateSystemPrompt = `You are a professional military/political translator for a Gulf intelligence platform.
Translate the following text to English. Preserve military terminology, ship names, organization names, and place names.
Output ONLY the translated text. No explanations, no markdown.`

// Translate converts text from a Gulf language (Arabic, Farsi, Hebrew, Turkish)
// to English using the configured LLM.
func (c *OpenRouterClient) Translate(ctx context.Context, text, sourceLang string) (string, error) {
	if !c.configured || text == "" {
		return text, nil
	}

	langName := langName(sourceLang)
	userMessage := fmt.Sprintf("Translate this %s text to English:\n\n%s", langName, text)
	return c.chat(ctx, translateSystemPrompt, userMessage, 500)
}

func langName(code string) string {
	switch code {
	case "ar":
		return "Arabic"
	case "fa":
		return "Farsi (Persian)"
	case "he":
		return "Hebrew"
	case "tr":
		return "Turkish"
	default:
		return ""
	}
}

// ── Threat Classification ──────────────────────────────────────────

const threatSystemPrompt = `You are an intelligence analyst for HormuzWatch, a Gulf-region threat monitoring platform.

Analyze the following news article and output ONLY a JSON object with these exact keys (no markdown, no code fences):
{
  "risk_score": <0-100 float>,
  "confidence": <0-1 float>,
  "category": "<military|political|energy|maritime|aviation|cyber|weather|diplomacy|terrorism|uncategorized>",
  "entities_mentioned": ["org1", "org2"],
  "geopolitical_significance": "<1-2 sentence summary of why this matters for Gulf security>",
  "requires_escalation": <true|false>,
  "recommended_action": "<single tactical recommendation for operators>"
}`

// ThreatResult is the LLM's structured threat assessment.
type ThreatResult struct {
	RiskScore                float64  `json:"risk_score"`
	Confidence               float64  `json:"confidence"`
	Category                 string   `json:"category"`
	EntitiesMentioned        []string `json:"entities_mentioned"`
	GeopoliticalSignificance string   `json:"geopolitical_significance"`
	RequiresEscalation       bool     `json:"requires_escalation"`
	RecommendedAction        string   `json:"recommended_action"`
}

// ClassifyThreat sends an article to the LLM for deep threat analysis.
func (c *OpenRouterClient) ClassifyThreat(ctx context.Context, title, content string) (*ThreatResult, error) {
	if !c.configured {
		return nil, nil
	}

	userMessage := fmt.Sprintf(
		"Title: %s\n\nContent (first 3000 chars):\n%s",
		title, truncateForLLM(content, 3000),
	)

	resp, err := c.chat(ctx, threatSystemPrompt, userMessage, 800)
	if err != nil || resp == "" {
		return nil, err
	}

	var result ThreatResult
	if err := json.Unmarshal([]byte(resp), &result); err != nil {
		slog.Warn("openrouter threat classification returned non-JSON, retrying",
			"response", truncateForLLM(resp, 200))
		// Try stripping markdown fences
		cleaned := strings.TrimPrefix(resp, "```json")
		cleaned = strings.TrimPrefix(cleaned, "```")
		cleaned = strings.TrimSuffix(cleaned, "```")
		cleaned = strings.TrimSpace(cleaned)
		if err2 := json.Unmarshal([]byte(cleaned), &result); err2 != nil {
			return nil, fmt.Errorf("parse threat result: %w", err)
		}
	}

	result.RiskScore = clamp(result.RiskScore, 0, 100)
	result.Confidence = clamp(result.Confidence, 0, 1)
	return &result, nil
}

// ── Summarization ──────────────────────────────────────────────────

const summarySystemPrompt = `You are an intelligence editor for a Gulf security platform.
Summarize the following article in 2-3 concise sentences. Focus on military, political, and security implications.
Output ONLY the summary text. No markdown, no prefixes.`

// Summarize produces a concise intelligence summary.
func (c *OpenRouterClient) Summarize(ctx context.Context, title, content string) (string, error) {
	if !c.configured {
		return "", nil
	}
	userMessage := fmt.Sprintf("Title: %s\n\nContent:\n%s", title, truncateForLLM(content, 2500))
	return c.chat(ctx, summarySystemPrompt, userMessage, 300)
}

// ── Helpers ────────────────────────────────────────────────────────

func truncateForLLM(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	cut := maxLen - 3
	// Try to break at a word boundary
	for cut > maxLen/2 && s[cut] != ' ' {
		cut--
	}
	if cut <= maxLen/2 {
		cut = maxLen - 3
	}
	return s[:cut] + "..."
}

func clamp(v, min, max float64) float64 {
	if v < min {
		return min
	}
	if v > max {
		return max
	}
	return v
}
