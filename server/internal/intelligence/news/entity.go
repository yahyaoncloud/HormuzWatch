package news

import (
	"regexp"
	"strings"
)

// EntityResult holds all extracted named entities from an article.
type EntityResult struct {
	Organizations []string `json:"organizations"`
	People        []string `json:"people"`
	Ships         []string `json:"ships"`
	Aircraft      []string `json:"aircraft"`
	Ports         []string `json:"ports"`
	Airports      []string `json:"airports"`
	Countries     []string `json:"countries"`
	Cities        []string `json:"cities"`
	Companies     []string `json:"companies"`
}

// ExtractEntities runs the full NER pipeline on cleaned article text.
// Uses gazetteer-based matching with regex pattern recognition.
func ExtractEntities(text string) EntityResult {
	if text == "" {
		return EntityResult{}
	}
	lower := strings.ToLower(text)

	return EntityResult{
		Organizations: extractOrganizations(text),
		Ships:         extractShips(text),
		Aircraft:      extractAircraft(text),
		Ports:         matchGazetteer(lower, gulfPorts),
		Airports:      matchGazetteer(lower, gulfAirports),
		Countries:     matchGazetteer(lower, gulfCountries),
		Cities:        matchGazetteer(lower, gulfCities),
		Companies:     extractCompanies(text),
	}
}

// ── Gazetteers ────────────────────────────────────────────────────────

var gulfPorts = []string{
	"jebel ali", "port rashid", "khalifa port", "fujairah", "jubail",
	"dammam", "ras tanura", "yanbu", "jeddah islamic port", "king abdullah port",
	"shuwaikh", "shuaiba", "doha port", "hamad port", "khalifa bin salman",
	"salalah", "sohar", "duqm", "muscat", "bandar abbas", "bushehr",
	"chabahar", "khorramshahr", "umm qasr", "aqaba", "eilat", "mombasa",
	"port sudan", "djibouti",
}

var gulfAirports = []string{
	"dubai international", "abu dhabi international", "sharjah",
	"king khalid international", "king abdulaziz international",
	"king fahd international", "hamad international", "kuwait international",
	"bahrain international", "muscat international", "salalah",
	"imam khomeini international", "mehrabad", "baghdad international",
	"basra international", "queen alia international", "ben gurion",
	"doha international",
}

var gulfCountries = []string{
	"saudi arabia", "united arab emirates", "uae", "qatar", "kuwait",
	"bahrain", "oman", "iran", "iraq", "yemen", "jordan", "israel",
	"syria", "lebanon", "egypt", "turkey", "pakistan", "india",
	"united states", "russia", "china", "united kingdom", "france",
}

var gulfCities = []string{
	"riyadh", "jeddah", "mecca", "medina", "dubai", "abu dhabi",
	"sharjah", "doha", "muscat", "kuwait city", "manama", "tehran",
	"baghdad", "basra", "sanaa", "aden", "amman", "tel aviv",
	"jerusalem", "beirut", "damascus", "cairo", "istanbul", "ankara",
	"bandar abbas", "bushehr", "chabahar",
}

// ── Pattern extractors ────────────────────────────────────────────────

var (
	shipMMSIRE = regexp.MustCompile(`\b(MMSI[:\s]*\d{9})\b`)
	shipIMORE  = regexp.MustCompile(`\b(IMO[:\s]*\d{7})\b`)
	shipNameRE = regexp.MustCompile(`\b(MT|MV|SS|HMS|USS|INS|IRIS)\s+([A-Z][a-zA-Z\s]+)`)
	icao24RE    = regexp.MustCompile(`\b(ICAO24[:\s]*[A-Fa-f0-9]{6})\b`)
	aircraftRE  = regexp.MustCompile(`\b(Boeing|Airbus|Lockheed|Dassault|MiG|Sukhoi|Chengdu|F-|C-|KC-)\s*[\w-]+\b`)
	orgSuffixRE = regexp.MustCompile(`\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(Corps?|Command|Force|Navy|Army|Ministry|Authority|Corporation|Guard|Council|Organization|Agency|Department|Bureau|Directorate)\b`)
)

func extractOrganizations(text string) []string {
	matches := orgSuffixRE.FindAllStringSubmatch(text, -1)
	seen := make(map[string]bool)
	var result []string
	for _, m := range matches {
		if len(m) >= 2 {
			name := strings.TrimSpace(m[1] + " " + m[2])
			nameLower := strings.ToLower(name)
			if !seen[nameLower] {
				seen[nameLower] = true
				result = append(result, name)
			}
		}
	}
	return dedupStrings(result)
}

func extractShips(text string) []string {
	var names []string
	for _, m := range shipMMSIRE.FindAllString(text, -1) {
		names = append(names, m)
	}
	for _, m := range shipIMORE.FindAllString(text, -1) {
		names = append(names, m)
	}
	for _, m := range shipNameRE.FindAllStringSubmatch(text, -1) {
		if len(m) >= 3 {
			names = append(names, strings.TrimSpace(m[1]+" "+m[2]))
		}
	}
	return dedupStrings(names)
}

func extractAircraft(text string) []string {
	var names []string
	for _, m := range icao24RE.FindAllString(text, -1) {
		names = append(names, m)
	}
	for _, m := range aircraftRE.FindAllString(text, -1) {
		names = append(names, m)
	}
	return dedupStrings(names)
}

func extractCompanies(text string) []string {
	companyRE := regexp.MustCompile(`\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(Inc\.?|LLC|Ltd\.?|Corp\.?|PLC|Group|Holdings|Energy|Petroleum|Shipping|Marine|Aviation|Defense|Technologies)\b`)
	matches := companyRE.FindAllStringSubmatch(text, -1)
	seen := make(map[string]bool)
	var result []string
	for _, m := range matches {
		if len(m) >= 2 {
			name := strings.TrimSpace(m[1] + " " + m[2])
			nameLower := strings.ToLower(name)
			if !seen[nameLower] {
				seen[nameLower] = true
				result = append(result, name)
			}
		}
	}
	return result
}

func matchGazetteer(lower string, entries []string) []string {
	var matched []string
	seen := make(map[string]bool)
	for _, e := range entries {
		if strings.Contains(lower, e) && !seen[e] {
			seen[e] = true
			matched = append(matched, e)
		}
	}
	return matched
}

func dedupStrings(in []string) []string {
	seen := make(map[string]bool)
	var out []string
	for _, s := range in {
		sl := strings.ToLower(strings.TrimSpace(s))
		if !seen[sl] && sl != "" {
			seen[sl] = true
			out = append(out, s)
		}
	}
	return out
}

// CountEntities returns the total number of extracted entity references.
func CountEntities(r EntityResult) int {
	return len(r.Organizations) + len(r.People) + len(r.Ships) +
		len(r.Aircraft) + len(r.Ports) + len(r.Airports) +
		len(r.Countries) + len(r.Cities) + len(r.Companies)
}
