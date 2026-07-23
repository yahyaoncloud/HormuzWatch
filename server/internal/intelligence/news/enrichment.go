package news

import (
	"strings"
)

// Category represents the intelligence classification of an article.
type Category string

const (
	CatMilitary    Category = "military"
	CatPolitical   Category = "political"
	CatEnergy      Category = "energy"
	CatMaritime    Category = "maritime"
	CatAviation    Category = "aviation"
	CatEconomic    Category = "economic"
	CatCyber       Category = "cyber"
	CatWeather     Category = "weather"
	CatDiplomacy   Category = "diplomacy"
	CatTerrorism   Category = "terrorism"
	CatTechnology  Category = "technology"
	CatUncategorized Category = "uncategorized"
)

// categoryKeywords maps categories to weighted keyword lists.
var categoryKeywords = map[Category][]string{
	CatMilitary: {
		"military", "navy", "naval", "army", "air force", "marine",
		"warship", "destroyer", "frigate", "submarine", "aircraft carrier",
		"missile", "drone", "uav", "fighter jet", "bomber", "tank", "troops",
		"deployment", "exercise", "drill", "maneuver", "patrol", "blockade",
		"intercept", "interception", "escort", "convoy", "mine", "torpedo",
		"artillery", "rocket", "ballistic", "warhead", "war game",
	},
	CatPolitical: {
		"government", "minister", "president", "prime minister", "parliament",
		"congress", "election", "vote", "referendum", "sanctions", "embargo",
		"treaty", "accord", "agreement", "summit", "negotiation", "diplomatic",
		"embassy", "consulate", "resolution", "mandate", "boycott",
	},
	CatEnergy: {
		"oil", "gas", "lng", "petroleum", "pipeline", "refinery", "barrel",
		"crude", "opec", "production", "output", "capacity", "reserves",
		"offshore", "platform", "rig", "tanker", "shipment", "export",
		"import", "price", "brent", "wti", "renewable", "solar", "nuclear",
		"energy security", "supply chain",
	},
	CatMaritime: {
		"shipping", "vessel", "tanker", "container", "cargo", "freight",
		"port", "harbor", "strait", "canal", "waterway", "shipping lane",
		"maritime security", "piracy", "boarding", "seizure", "hijack",
		"transit", "passage", "flag state", "flag of convenience",
	},
	CatAviation: {
		"aircraft", "airplane", "helicopter", "airport", "airspace",
		"flight", "squadron", "squawk", "transponder", "ads-b",
		"intercept", "scramble", "no-fly zone", "air corridor",
	},
	CatCyber: {
		"cyber", "hack", "malware", "ransomware", "breach", "attack",
		"phishing", "ddos", "data leak", "vulnerability", "exploit",
		"zero-day", "firewall", "encryption", "spyware",
	},
	CatWeather: {
		"storm", "cyclone", "hurricane", "typhoon", "flood", "drought",
		"heatwave", "monsoon", "visibility", "wind", "wave", "tsunami",
		"earthquake", "seismic", "volcano", "sandstorm", "dust storm",
	},
}

// SourceReliability maps source names to a baseline reliability score
// (0.0 = untrusted, 1.0 = fully trusted). Sources not in this map
// default to 0.5.
var SourceReliability = map[string]float64{
	"WAM":                    0.85,
	"SPA":                    0.80,
	"KUNA":                   0.80,
	"BNA":                    0.80,
	"ONA":                    0.80,
	"QNA":                    0.80,
	"IRNA":                   0.55,
	"INA":                    0.60,
	"USNI News":              0.90,
	"DefenseNews":            0.85,
	"GDELT":                  0.75,
	"NASA FIRMS":             0.95,
	"Open-Meteo":             0.90,
}

// ClassifyCategory determines the intelligence category of an article
// based on keyword frequency analysis.
func ClassifyCategory(text string) Category {
	lower := strings.ToLower(text)
	bestCat := CatUncategorized
	bestScore := 0

	for cat, keywords := range categoryKeywords {
		score := 0
		for _, kw := range keywords {
			count := strings.Count(lower, kw)
			score += count
		}
		if score > bestScore {
			bestScore = score
			bestCat = cat
		}
	}
	return bestCat
}

// GetReliability returns the baseline reliability score for a source.
func GetReliability(sourceName string) float64 {
	if r, ok := SourceReliability[sourceName]; ok {
		return r
	}
	return 0.5
}

// CountryRisk returns a baseline geopolitical risk score for a country
// (0.0 = no risk, 1.0 = extreme risk).
func CountryRisk(countryISO string) float64 {
	riskMap := map[string]float64{
		"IR": 0.85, // Iran
		"IQ": 0.75, // Iraq
		"YE": 0.80, // Yemen
		"SY": 0.80, // Syria
		"LB": 0.65, // Lebanon
		"PS": 0.70, // Palestine
		"SA": 0.40, // Saudi Arabia
		"AE": 0.25, // UAE
		"QA": 0.30, // Qatar
		"KW": 0.35, // Kuwait
		"BH": 0.35, // Bahrain
		"OM": 0.20, // Oman
		"JO": 0.45, // Jordan
		"IL": 0.55, // Israel
		"EG": 0.50, // Egypt
		"TR": 0.45, // Turkey
		"PK": 0.60, // Pakistan
		"IN": 0.35, // India
		"US": 0.15, // United States
		"GB": 0.15, // United Kingdom
		"FR": 0.20, // France
		"RU": 0.60, // Russia
		"CN": 0.40, // China
	}
	if r, ok := riskMap[countryISO]; ok {
		return r
	}
	return 0.4
}
