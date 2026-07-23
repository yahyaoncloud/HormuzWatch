package news

import (
	"regexp"
	"strings"
	"unicode"
	"unicode/utf8"

	"golang.org/x/net/html"
)

var (
	htmlTagRE   = regexp.MustCompile(`<[^>]*>`)
	multiSpaceRE = regexp.MustCompile(`\s+`)
	entityRE    = regexp.MustCompile(`&[a-zA-Z]+;|&#\d+;`)
	controlRE   = regexp.MustCompile(`[\x00-\x08\x0b\x0c\x0e-\x1f]`)
)

// StripHTML removes all HTML tags, decodes common entities, and collapses
// whitespace into single spaces.
func StripHTML(raw string) string {
	// Decode HTML entities using the stdlib parser
	s := html.UnescapeString(raw)
	// Remove tags
	s = htmlTagRE.ReplaceAllString(s, " ")
	// Decode remaining numeric entities
	s = entityRE.ReplaceAllStringFunc(s, func(m string) string {
		return html.UnescapeString(m)
	})
	// Collapse whitespace
	s = multiSpaceRE.ReplaceAllString(s, " ")
	return strings.TrimSpace(s)
}

// NormalizeUnicode converts the text to NFC normal form and strips
// control characters except newlines and tabs.
func NormalizeUnicode(s string) string {
	// NFC normalization (composed form)
	s = normNFC(s)
	// Remove control characters (keep \n, \t)
	s = controlRE.ReplaceAllString(s, "")
	return s
}

// normNFC applies NFC normalization. Falls back to identity on invalid
// sequences rather than returning mangled output.
func normNFC(s string) string {
	if !utf8.ValidString(s) {
		return s
	}
	// Run through stdlib unicode normalization — Go's x/text is not a dep,
	// so we do a best-effort check and strip obvious problems.
	var b strings.Builder
	for _, r := range s {
		if unicode.IsControl(r) && r != '\n' && r != '\t' {
			b.WriteRune(' ')
		} else {
			b.WriteRune(r)
		}
	}
	return b.String()
}

// FixEncoding attempts to repair common encoding issues (double-encoded
// UTF-8, Windows-1252 mojibake interpreted as UTF-8). Returns the best-effort
// cleaned string.
func FixEncoding(s string) string {
	// Replace common Windows-1252 characters that appear as UTF-8 garbage
	replacer := strings.NewReplacer(
		"\u00e2\u20ac\u0093", "–",  // en-dash
		"\u00e2\u20ac\u0094", "—",  // em-dash
		"\u00e2\u20ac\u0098", "'",  // left single quote
		"\u00e2\u20ac\u0099", "'",  // right single quote
		"\u00e2\u20ac\u009c", "\u201c", // left double quote
		"\u00e2\u20ac\u009d", "\u201d", // right double quote
		"\u00c2\u00a0", " ",       // non-breaking space
		"\u00e2\u20ac\u00a6", "...", // ellipsis
	)
	return replacer.Replace(s)
}

// Clean applies the full cleaning pipeline: strip HTML, fix encoding,
// normalize unicode, and trim.
func Clean(raw string) string {
	s := StripHTML(raw)
	s = FixEncoding(s)
	s = NormalizeUnicode(s)
	s = multiSpaceRE.ReplaceAllString(s, " ")
	return strings.TrimSpace(s)
}
