package source

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// APISource fetches articles from a REST/JSON API.
type APISource struct {
	sourceName string
	endpoint   string
	apiKey     string
	language   string
	country    string
	client     *http.Client
}

// NewAPISource creates a named API source.
// If apiKey is empty, no Authorization header is sent.
func NewAPISource(name, endpoint, apiKey, language, country string) *APISource {
	return &APISource{
		sourceName: name,
		endpoint:   endpoint,
		apiKey:     apiKey,
		language:   language,
		country:    country,
		client:     &http.Client{Timeout: 15 * time.Second},
	}
}

func (s *APISource) Name() string { return s.sourceName }
func (s *APISource) Type() Type   { return TypeAPI }

// Fetch expects the API to return a JSON array of {url, title, content, published_at}.
func (s *APISource) Fetch(ctx context.Context) ([]RawArticle, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, s.endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("api %s: %w", s.sourceName, err)
	}
	req.Header.Set("Accept", "application/json")
	if s.apiKey != "" {
		req.Header.Set("Authorization", "Bearer "+s.apiKey)
	}

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("api %s fetch: %w", s.sourceName, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("api %s: HTTP %d", s.sourceName, resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("api %s read: %w", s.sourceName, err)
	}

	var items []struct {
		URL         string `json:"url"`
		Title       string `json:"title"`
		Content     string `json:"content"`
		PublishedAt string `json:"published_at"`
	}
	if err := json.Unmarshal(body, &items); err != nil {
		return nil, fmt.Errorf("api %s decode: %w", s.sourceName, err)
	}

	articles := make([]RawArticle, 0, len(items))
	for _, item := range items {
		pubDate := parseTime(item.PublishedAt)
		articles = append(articles, RawArticle{
			URL:         item.URL,
			Title:       item.Title,
			Content:     item.Content,
			PublishedAt: pubDate,
			SourceName:  s.sourceName,
			SourceType:  TypeAPI,
			Language:    s.language,
			Country:     s.country,
			Metadata: map[string]any{
				"endpoint": s.endpoint,
			},
		})
	}
	return articles, nil
}

func (s *APISource) Validate(a RawArticle) error {
	if a.URL == "" {
		return fmt.Errorf("api: url is empty for %s", s.sourceName)
	}
	return nil
}

func parseTime(s string) time.Time {
	if s == "" {
		return time.Now()
	}
	formats := []string{
		time.RFC3339,
		"2006-01-02T15:04:05Z",
		"2006-01-02 15:04:05",
		"2006-01-02",
	}
	for _, f := range formats {
		if t, err := time.Parse(f, s); err == nil {
			return t
		}
	}
	return time.Now()
}
