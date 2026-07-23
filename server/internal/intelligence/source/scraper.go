package source

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/PuerkitoBio/goquery"
)

// ScraperSource fetches articles by scraping an HTML page and extracting
// links or article bodies based on CSS selectors.
type ScraperSource struct {
	sourceName    string
	baseURL       string
	language      string
	country       string
	linkSelector  string // CSS selector for article links
	titleSelector string // CSS selector for article title on detail page
	bodySelector  string // CSS selector for article body on detail page
	client        *http.Client
}

// NewScraperSource creates a named HTML scraping source.
func NewScraperSource(name, baseURL, linkSel, titleSel, bodySel, language, country string) *ScraperSource {
	return &ScraperSource{
		sourceName:    name,
		baseURL:       baseURL,
		language:      language,
		country:       country,
		linkSelector:  linkSel,
		titleSelector: titleSel,
		bodySelector:  bodySel,
		client:        &http.Client{Timeout: 15 * time.Second},
	}
}

func (s *ScraperSource) Name() string { return s.sourceName }
func (s *ScraperSource) Type() Type   { return TypeScraper }

func (s *ScraperSource) Fetch(ctx context.Context) ([]RawArticle, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, s.baseURL, nil)
	if err != nil {
		return nil, fmt.Errorf("scraper %s: %w", s.sourceName, err)
	}
	req.Header.Set("User-Agent", "HormuzWatch/2.0")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("scraper %s fetch: %w", s.sourceName, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("scraper %s: HTTP %d", s.sourceName, resp.StatusCode)
	}

	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("scraper %s parse: %w", s.sourceName, err)
	}

	var articles []RawArticle
	doc.Find(s.linkSelector).Each(func(_ int, sel *goquery.Selection) {
		href, ok := sel.Attr("href")
		if !ok || href == "" {
			return
		}
		fullURL := resolveURL(s.baseURL, href)
		title := sel.Text()

		articles = append(articles, RawArticle{
			URL:         fullURL,
			Title:       title,
			Content:     "", // Detail page not fetched — caller can enrich
			PublishedAt: time.Now(),
			SourceName:  s.sourceName,
			SourceType:  TypeScraper,
			Language:    s.language,
			Country:     s.country,
			Metadata: map[string]any{
				"base_url": s.baseURL,
			},
		})
	})
	return articles, nil
}

// FetchDetail fetches and extracts the content of a single article page.
func (s *ScraperSource) FetchDetail(ctx context.Context, url string) (title, body string, err error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return "", "", err
	}
	req.Header.Set("User-Agent", "HormuzWatch/2.0")

	resp, err := s.client.Do(req)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()

	// Read body into a buffer so we can parse it twice (title + body)
	buf, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", "", err
	}

	doc, err := goquery.NewDocumentFromReader(io.NopCloser(io.NopCloser(
		// goquery wants a Reader; use the buffer
		&byteReader{buf: buf},
	)))
	if err != nil {
		return "", "", err
	}

	if s.titleSelector != "" {
		title = doc.Find(s.titleSelector).First().Text()
	}
	if s.bodySelector != "" {
		body = doc.Find(s.bodySelector).Text()
	}
	return title, body, nil
}

func (s *ScraperSource) Validate(a RawArticle) error {
	if a.URL == "" {
		return fmt.Errorf("scraper: url is empty for %s", s.sourceName)
	}
	return nil
}

// resolveURL resolves a potentially relative href against a base URL.
func resolveURL(base, href string) string {
	if len(href) > 0 && (href[0] == '/' || (len(href) > 7 && href[:7] != "http://" && href[:8] != "https://")) {
		// Simple relative URL resolution
		if href[0] == '/' {
			// Strip trailing path from base, append href
			protoEnd := 0
			if len(base) > 8 && base[:7] == "http://" {
				protoEnd = 7
			} else if len(base) > 9 && base[:8] == "https://" {
				protoEnd = 8
			}
			hostStart := protoEnd
			hostEnd := len(base)
			for i := hostStart; i < len(base); i++ {
				if base[i] == '/' {
					hostEnd = i
					break
				}
			}
			return base[:hostEnd] + href
		}
	}
	if len(href) > 0 && href[:4] != "http" {
		baseDir := base
		// Strip last path component
		for i := len(baseDir) - 1; i >= 0; i-- {
			if baseDir[i] == '/' {
				baseDir = baseDir[:i]
				break
			}
		}
		return baseDir + "/" + href
	}
	return href
}

type byteReader struct {
	buf []byte
	pos int
}

func (r *byteReader) Read(p []byte) (int, error) {
	if r.pos >= len(r.buf) {
		return 0, io.EOF
	}
	n := copy(p, r.buf[r.pos:])
	r.pos += n
	return n, nil
}
