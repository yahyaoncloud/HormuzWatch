package news

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"math/bits"
	"strings"
)

// URLHash generates a deterministic SHA-256 hash from a normalized URL.
// This is the primary dedup key — identical URLs produce identical hashes.
func URLHash(url string) string {
	normalized := normalizeURL(url)
	h := sha256.Sum256([]byte(normalized))
	return hex.EncodeToString(h[:])
}

// normalizeURL strips protocol, trailing slash, and common tracking params
// to make URLs from different sources comparable.
func normalizeURL(url string) string {
	url = strings.TrimPrefix(url, "https://")
	url = strings.TrimPrefix(url, "http://")
	url = strings.TrimSuffix(url, "/")
	// Strip common tracking parameters
	url = stripParam(url, "utm_source")
	url = stripParam(url, "utm_medium")
	url = stripParam(url, "utm_campaign")
	url = stripParam(url, "utm_content")
	url = stripParam(url, "fbclid")
	url = stripParam(url, "ref")
	return strings.ToLower(strings.TrimSpace(url))
}

func stripParam(url, param string) string {
	// Simple removal of ?param=... or &param=...
	for {
		idx := strings.Index(strings.ToLower(url), "?"+param+"=")
		if idx < 0 {
			idx = strings.Index(strings.ToLower(url), "&"+param+"=")
		}
		if idx < 0 {
			break
		}
		end := strings.Index(url[idx+1:], "&")
		if end < 0 {
			url = url[:idx]
		} else {
			url = url[:idx] + url[idx+1+end:]
		}
	}
	return url
}

// SimHash computes a 64-bit similarity hash for the given text.
// Two documents with a small Hamming distance between their simhashes
// are likely near-duplicates.
func SimHash(text string) uint64 {
	if len(text) == 0 {
		return 0
	}
	words := tokenize(text)
	if len(words) == 0 {
		return 0
	}

	var counts [64]int
	for _, w := range words {
		h := hashWord(w)
		for i := 0; i < 64; i++ {
			if h&(1<<uint(i)) != 0 {
				counts[i]++
			} else {
				counts[i]--
			}
		}
	}

	var fingerprint uint64
	for i := 0; i < 64; i++ {
		if counts[i] > 0 {
			fingerprint |= 1 << uint(i)
		}
	}
	return fingerprint
}

func hashWord(w string) uint64 {
	h := sha256.Sum256([]byte(w))
	// Take first 8 bytes as uint64
	var v uint64
	for i := 0; i < 8; i++ {
		v = (v << 8) | uint64(h[i])
	}
	return v
}

func tokenize(text string) []string {
	words := strings.Fields(strings.ToLower(text))
	// Filter very short words and dedup
	seen := make(map[string]bool)
	var result []string
	for _, w := range words {
		if len(w) < 3 {
			continue
		}
		if seen[w] {
			continue
		}
		seen[w] = true
		result = append(result, w)
	}
	return result
}

// HammingDistance returns the number of differing bits between two simhashes.
func HammingDistance(a, b uint64) int {
	return bits.OnesCount64(a ^ b)
}

// IsNearDuplicate returns true when the Hamming distance is below the
// threshold. Typical threshold: 3-6 for near-duplicate detection.
func IsNearDuplicate(a, b uint64, threshold int) bool {
	return HammingDistance(a, b) <= threshold
}

// ContentHash generates a stable content fingerprint for exact dedup.
func ContentHash(text string) string {
	normalized := strings.TrimSpace(strings.ToLower(text))
	h := sha256.Sum256([]byte(normalized))
	return hex.EncodeToString(h[:])
}

// DedupArticle is a processed article ready for dedup checking.
type DedupArticle struct {
	URL        string
	Title      string
	Content    string
	SourceName string
}

// DedupResult summarizes the dedup check outcome.
type DedupResult struct {
	IsDuplicate bool
	Reason      string
	URLHash     string
	SimHash     uint64
	ContentHash string
}

// CheckDuplicate runs the full dedup pipeline on an article.
func CheckDuplicate(article DedupArticle) DedupResult {
	r := DedupResult{
		URLHash:     URLHash(article.URL),
		SimHash:     SimHash(article.Content),
		ContentHash: ContentHash(article.Content),
	}

	// Title + content for simhash yields better results
	combined := article.Title + " " + article.Content
	r.SimHash = SimHash(combined)

	return r
}

// String returns a compact representation for logging.
func (r DedupResult) String() string {
	return fmt.Sprintf("url=%s... sim=0x%x content=%s...",
		r.URLHash[:12], r.SimHash, r.ContentHash[:12])
}
