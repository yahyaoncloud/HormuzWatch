package news

import (
	"encoding/json"
	"regexp"
	"strings"
)

// ── Text-to-JSON Location Extraction (LLM Fallback) ───────────────────────
//
// When the OpenRouter LLM is unavailable or not configured, this module
// produces a JSON payload from raw news article text using regex-based
// deep inspection. It extracts:
//   - Country name(s)
//   - City name(s)
//   - Port name(s)
//   - Coordinates (if present in text)
//   - Vessel names (MMSI/IMO/MV prefix patterns)
//
// The output is always a valid JSON string — even if nothing is extracted —
// so the pipeline can proceed without blocking on LLM availability.
//
// Source: replaces LLM ClassifyThreat() output when LLM is down.

// ExtractedArticle is the canonical JSON output from text extraction.
// This mirrors the structure OpenRouter would return from ClassifyThreat().
type ExtractedArticle struct {
	Country     string    `json:"country"`
	Cities      []string  `json:"cities"`
	Ports       []string  `json:"ports"`
	Region      string    `json:"region"`                // "Persian Gulf", "Red Sea", etc.
	Vessels     []string  `json:"vessels"`               // ship names / MMSI / IMO
	Coordinates []float64 `json:"coordinates,omitempty"` // [lat, lon] if found
	Category    string    `json:"category"`              // best-guess category
	Confidence  float64   `json:"confidence"`            // 0.0-1.0
	Source      string    `json:"source"`                // "regex_extraction"
}

// ── Country Regex (Gulf region + major flags) ─────────────────────────────

var countryRegex = regexp.MustCompile(
	`(?i)\b(?:` +
		`Iran|Tehran|Islamic\s+Republic|IRGC|` +
		`Saudi\s+Arabia|Saudi|Riyadh|Jeddah|` +
		`United\s+Arab\s+Emirates|UAE|Emirati|Abu\s+Dhabi|Dubai|Sharjah|Fujairah|` +
		`Oman|Muscat|Omani|` +
		`Qatar|Doha|Qatari|` +
		`Bahrain|Manama|Bahraini|` +
		`Kuwait|Kuwaiti|` +
		`Iraq|Baghdad|Basra|Iraqi|` +
		`Yemen|Sanaa|Aden|Houthi|Houthis|` +
		`Pakistan|Karachi|Pakistani|` +
		`India|Mumbai|Delhi|Indian|` +
		`United\s+States|U\.S\.|America|American|Pentagon|CENTCOM|` +
		`United\s+Kingdom|U\.K\.|British|UK|` +
		`Israel|Israeli|IDF|Tel\s+Aviv|` +
		`Turkey|Turkish|Ankara|` +
		`Egypt|Egyptian|Cairo|Suez|` +
		`Jordan|Jordanian|Amman|` +
		`Syria|Syrian|Damascus|` +
		`Lebanon|Lebanese|Beirut|` +
		`Somalia|Somali|Mogadishu|` +
		`Djibouti|` +
		`Sudan|Sudanese|Khartoum|` +
		`Eritrea|Eritrean|Asmara|` +
		`Ethiopia|Ethiopian|` +
		`Libya|Libyan|Tripoli|` +
		`Afghanistan|Afghan|Kabul|` +
		`China|Chinese|Beijing|PLA|` +
		`Russia|Russian|Moscow|` +
		`Tanzania|` +
		`Liberia|` +
		`Panama|Panamanian|` +
		`Marshall\s+Islands|` +
		`Singapore|Singaporean|` +
		`Hong\s+Kong|` +
		`Malta|` +
		`Greece|Greek|` +
		`Comoros|` +
		`Saint\s+Kitts|St\.?\s*Kitts|` +
		`Saint\s+Vincent|St\.?\s*Vincent` +
		`)\b`,
)

// ── City / Port Regex (Gulf maritime network) ─────────────────────────────

var cityPortRegex = regexp.MustCompile(
	`(?i)\b(?:` +
		`Dubai|Jebel\s+Ali|JebelAli|Fujairah|Khor\s+Fakkan|Sharjah|Hamriyah|` +
		`Abu\s+Dhabi|Port\s+Rashid|Ras\s+al[- ]?Khaimah|RAK|` +
		`Bandar\s+Abbas|Qeshm|Jask|Chabahar|Bushehr|Kharg\s+Island|` +
		`Muscat|Sohar|Duqm|Salalah|` +
		`Doha|Mesaieed|Ras\s+Laffan|` +
		`Manama|Khalifa\s+Bin\s+Salman|Mina\s+Salman|` +
		`Kuwait\s+City|Mina\s+Al[- ]?Ahmadi|Shuwaikh|Shuaiba|` +
		`Dammam|Jubail|Ras\s+Tanura|Yanbu|Jeddah|` +
		`Basra|Umm\s+Qasr|Al[- ]?Fao|Fao|` +
		`Aden|Hodeidah|Mukalla|` +
		`Karachi|Port\s+Qasim|Gwadar|` +
		`Mumbai|Nhava\s+Sheva|JNPT|` +
		`Singapore|` +
		`Suez\s+Canal|Port\s+Said|` +
		`Djibouti\s+Port|` +
		`Salalah|` +
		`Bab\s+el[- ]?Mandeb|Strait\s+of\s+Hormuz|Hormuz|` +
		`Gulf\s+of\s+Aden|Gulf\s+of\s+Oman|` +
		`Arabian\s+Sea|Persian\s+Gulf|Red\s+Sea` +
		`)\b`,
)

// ── Vessel Regex ───────────────────────────────────────────────────────────

var vesselPrefixRegex = regexp.MustCompile(
	`(?i)\b(MV|MT|SS|HSC|M/V|M\.T\.|IRIS|IRINS|USS|HMS|RFA)\s+([A-Z][A-Za-z]{2,}(?:\s+[A-Z][A-Za-z]{2,}){0,3})\b`,
)

// ── Region keywords ───────────────────────────────────────────────────────

var regionRegex = regexp.MustCompile(
	`(?i)\b(?:` +
		`Persian\s+Gulf|Arabian\s+Gulf|Gulf|` +
		`Gulf\s+of\s+Oman|Oman\s+Sea|` +
		`Strait\s+of\s+Hormuz|Hormuz\s+Strait|Strait|` +
		`Gulf\s+of\s+Aden|` +
		`Red\s+Sea|` +
		`Arabian\s+Sea|` +
		`Bab\s+el[- ]?Mandeb|` +
		`Suez\s+Canal|Suez|` +
		`Eastern\s+Mediterranean|Eastern\s+Med|` +
		`Indian\s+Ocean` +
		`)\b`,
)

// ── Country name normalization ────────────────────────────────────────────
var nameToISO = map[string]string{
	"iran": "IR", "islamic republic": "IR", "irgc": "IR",
	"saudi arabia": "SA", "saudi": "SA",
	"united arab emirates": "AE", "uae": "AE", "emirati": "AE",
	"oman": "OM", "omani": "OM",
	"qatar": "QA", "qatari": "QA",
	"bahrain": "BH", "bahraini": "BH",
	"kuwait": "KW", "kuwaiti": "KW",
	"iraq": "IQ", "iraqi": "IQ",
	"yemen": "YE", "houthi": "YE", "houthis": "YE",
	"pakistan": "PK", "pakistani": "PK",
	"india": "IN", "indian": "IN",
	"united states": "US", "u.s.": "US", "america": "US", "american": "US", "pentagon": "US", "centcom": "US",
	"united kingdom": "GB", "u.k.": "GB", "british": "GB",
	"israel": "IL", "israeli": "IL", "idf": "IL",
	"turkey": "TR", "turkish": "TR",
	"egypt": "EG", "egyptian": "EG",
	"jordan": "JO", "jordanian": "JO",
	"syria": "SY", "syrian": "SY",
	"lebanon": "LB", "lebanese": "LB",
	"somalia": "SO", "somali": "SO",
	"djibouti": "DJ",
	"sudan":    "SD", "sudanese": "SD",
	"eritrea": "ER", "eritrean": "ER",
	"ethiopia": "ET", "ethiopian": "ET",
	"libya": "LY", "libyan": "LY",
	"afghanistan": "AF", "afghan": "AF",
	"china": "CN", "chinese": "CN", "pla": "CN",
	"russia": "RU", "russian": "RU",
	"tanzania": "TZ",
	"liberia":  "LR",
	"panama":   "PA", "panamanian": "PA",
	"marshall islands": "MH",
	"singapore":        "SG", "singaporean": "SG",
	"hong kong": "HK",
	"malta":     "MT",
	"greece":    "GR", "greek": "GR",
	"comoros":     "KM",
	"saint kitts": "KN", "st. kitts": "KN", "st kitts": "KN",
	"saint vincent": "VC", "st. vincent": "VC", "st vincent": "VC",
}

// ExtractTextToJSON scans article text and produces a structured JSON payload.
// This serves as the LLM fallback — always produces valid JSON, even with
// zero matches.
func ExtractTextToJSON(text string) string {
	result := ExtractedArticle{
		Cities:  []string{},
		Ports:   []string{},
		Vessels: []string{},
		Source:  "regex_extraction",
	}

	if text == "" {
		result.Confidence = 0.0
		b, _ := json.Marshal(result)
		return string(b)
	}

	// ── Countries ──────────────────────────────────────────────────
	countries := countryRegex.FindAllString(text, -1)
	seenCountries := make(map[string]bool)
	seenISOs := make(map[string]bool)

	for _, c := range countries {
		key := strings.ToLower(strings.TrimSpace(c))
		iso, ok := nameToISO[key]
		if !ok || seenISOs[iso] {
			continue
		}
		seenISOs[iso] = true
		if !seenCountries[c] {
			seenCountries[c] = true
		}
		// Set primary country (first found)
		if result.Country == "" {
			result.Country = iso
		}
	}

	// ── Cities & Ports ────────────────────────────────────────────
	allLocations := cityPortRegex.FindAllString(text, -1)
	seenLocs := make(map[string]bool)
	portKeywords := []string{"port", "anchorage", "terminal", "harbour", "harbor", "berth", "jebel", "mina", "bandar", "island"}

	for _, loc := range allLocations {
		loc = strings.TrimSpace(loc)
		lower := strings.ToLower(loc)
		if seenLocs[lower] {
			continue
		}
		seenLocs[lower] = true

		isPort := false
		for _, kw := range portKeywords {
			if strings.Contains(lower, kw) {
				isPort = true
				break
			}
		}

		if isPort {
			result.Ports = append(result.Ports, loc)
		} else {
			result.Cities = append(result.Cities, loc)
		}
	}

	// ── Vessels ────────────────────────────────────────────────────
	matches := vesselPrefixRegex.FindAllStringSubmatch(text, -1)
	seenVessels := make(map[string]bool)
	for _, m := range matches {
		if len(m) < 3 {
			continue
		}
		prefix := m[1]
		name := strings.TrimSpace(m[2])
		fullName := prefix + " " + name
		lower := strings.ToLower(fullName)
		if !seenVessels[lower] {
			seenVessels[lower] = true
			result.Vessels = append(result.Vessels, fullName)
		}
	}
	// Limit to 20 vessels
	if len(result.Vessels) > 20 {
		result.Vessels = result.Vessels[:20]
	}

	// ── Region ─────────────────────────────────────────────────────
	regions := regionRegex.FindAllString(text, -1)
	if len(regions) > 0 {
		result.Region = regions[0]
	}

	// ── Coordinates (reuse existing decimal regex) ─────────────────
	decMatches := decimalCoordRE.FindAllStringSubmatch(text, -1)
	if len(decMatches) > 0 {
		for _, m := range decMatches {
			if m[1] != "" && m[2] != "" {
				lat, err1 := parseFloat(m[1])
				lon, err2 := parseFloat(m[2])
				if err1 == nil && err2 == nil && isValidCoord(lat, lon) {
					result.Coordinates = []float64{lat, lon}
					break
				}
			}
			if m[3] != "" && m[4] != "" {
				lat, err1 := parseFloat(m[3])
				lon, err2 := parseFloat(m[4])
				if err1 == nil && err2 == nil && isValidCoord(lat, lon) {
					result.Coordinates = []float64{lat, lon}
					break
				}
			}
		}
	}

	// ── Confidence ─────────────────────────────────────────────────
	// Higher confidence when we have country + locations or vessels
	result.Confidence = 0.0
	if result.Country != "" {
		result.Confidence += 0.3
	}
	if len(result.Cities)+len(result.Ports) > 0 {
		result.Confidence += 0.3
	}
	if len(result.Vessels) > 0 {
		result.Confidence += 0.2
	}
	if len(result.Coordinates) > 0 {
		result.Confidence += 0.2
	}
	if result.Confidence > 0.95 {
		result.Confidence = 0.95 // cap, since it's regex not ML
	}

	// Never zero — always produce a JSON payload
	b, err := json.Marshal(result)
	if err != nil {
		return `{"country":"","cities":[],"ports":[],"region":"","vessels":[],"confidence":0.0,"source":"regex_extraction_error"}`
	}
	return string(b)
}

// ── Helpers ───────────────────────────────────────────────────────────────

func parseFloat(s string) (float64, error) {
	var f float64
	_, err := scanFloat(s, &f)
	return f, err
}

func scanFloat(s string, f *float64) (int, error) {
	n, err := 0, error(nil)
	*f = 0
	// Crude but avoids importing strconv for each call site in hot paths.
	// This is only used inside regex extraction (fallback, not hot).
	tmp := 0.0
	dec := 0.0
	div := 1.0
	neg := 1.0
	i := 0
	if i < len(s) && s[i] == '-' {
		neg = -1.0
		i++
	}
	for i < len(s) && s[i] >= '0' && s[i] <= '9' {
		tmp = tmp*10 + float64(s[i]-'0')
		i++
		n++
	}
	if i < len(s) && s[i] == '.' {
		i++
		for i < len(s) && s[i] >= '0' && s[i] <= '9' {
			div *= 10
			dec = dec*10 + float64(s[i]-'0')
			i++
			n++
		}
	}
	*f = neg * (tmp + dec/div)
	if n == 0 {
		return 0, err
	}
	return n, nil
}
