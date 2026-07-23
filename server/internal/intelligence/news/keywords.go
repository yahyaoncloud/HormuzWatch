package news

import (
	"sort"
	"strings"
)

// KeywordResult holds a single keyword with its frequency score.
type KeywordResult struct {
	Word  string
	Score int
}

// stopWords is a minimal English stop-word list for keyword filtering.
var stopWords = map[string]bool{
	"the": true, "and": true, "for": true, "that": true, "this": true,
	"with": true, "from": true, "have": true, "are": true, "was": true,
	"but": true, "not": true, "they": true, "will": true, "has": true,
	"been": true, "can": true, "more": true, "its": true, "also": true,
	"said": true, "which": true, "their": true, "were": true, "after": true,
	"over": true, "into": true, "other": true, "some": true, "about": true,
	"than": true, "just": true, "like": true, "would": true, "could": true,
	"should": true, "there": true, "when": true, "what": true, "where": true,
	"who": true, "how": true, "all": true, "each": true, "every": true,
	"both": true, "few": true, "most": true, "only": true, "very": true,
	"still": true, "while": true, "between": true,
}

// ExtractKeywords tokenizes the text, removes stop words, and returns the
// top N keywords by frequency.
func ExtractKeywords(text string, topN int) []KeywordResult {
	if topN <= 0 {
		topN = 15
	}

	lower := strings.ToLower(text)
	words := strings.Fields(lower)

	freq := make(map[string]int)
	for _, w := range words {
		w = strings.Trim(w, ".,;:!?\"'()[]{}#@&*+-/\\|=<>`~")
		if len(w) < 3 {
			continue
		}
		if stopWords[w] {
			continue
		}
		freq[w]++
	}

	results := make([]KeywordResult, 0, len(freq))
	for w, c := range freq {
		results = append(results, KeywordResult{Word: w, Score: c})
	}

	sort.Slice(results, func(i, j int) bool {
		return results[i].Score > results[j].Score
	})

	if len(results) > topN {
		results = results[:topN]
	}
	return results
}

// CountTermCategory counts occurrences of terms from a specific category.
func CountTermCategory(text string, terms []string) int {
	lower := strings.ToLower(text)
	count := 0
	for _, term := range terms {
		count += strings.Count(lower, term)
	}
	return count
}

// MilitaryTerms are keywords associated with military activity.
var MilitaryTerms = []string{
	"missile", "drone", "uav", "jet", "fighter", "bomber", "tank", "artillery",
	"bomb", "blast", "explosion", "strike", "airstrike", "attack",
	"intercept", "scramble", "deploy", "mobilize", "troops", "soldier",
	"navy", "naval", "warship", "frigate", "destroyer", "submarine",
	"aircraft carrier", "patrol", "convoy", "blockade", "siege",
	"ceasefire", "truce", "conflict", "warfare", "hostility",
	"rocket", "mortar", "projectile", "ballistic", "warhead",
}

// EnergyTerms are keywords associated with energy/resources.
var EnergyTerms = []string{
	"oil", "gas", "lng", "petroleum", "crude", "refinery", "pipeline",
	"barrel", "production", "export", "import", "opec", "offshore",
	"platform", "rig", "tanker", "energy", "fuel", "supply",
	"reserves", "capacity", "brent", "wti", "shipment",
}

// ShippingTerms are keywords associated with maritime/shipping.
var ShippingTerms = []string{
	"vessel", "ship", "tanker", "container", "cargo", "freight",
	"shipping", "port", "harbor", "strait", "canal", "waterway",
	"maritime", "transit", "passage", "flag", "registry",
	"ballast", "dwt", "grt", "draft", "berth", "anchorage",
	"pilot", "tug", "terminal",
}

// CyberTerms are keywords associated with cyber operations.
var CyberTerms = []string{
	"cyber", "hack", "malware", "ransomware", "breach", "phishing",
	"ddos", "exploit", "vulnerability", "zero-day", "backdoor",
	"spyware", "trojan", "worm", "botnet", "apt", "threat actor",
	"data leak", "compromise", "firewall", "encryption",
}

// CountTerms is a convenience function that counts how many of the given
// terms appear (at least once) in the text.
func CountTerms(text string, terms []string) int {
	lower := strings.ToLower(text)
	count := 0
	for _, term := range terms {
		if strings.Contains(lower, strings.ToLower(term)) {
			count++
		}
	}
	return count
}
