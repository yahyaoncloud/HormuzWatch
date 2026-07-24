package intelligence

import (
	"regexp"
	"strings"
)

// ── MMSI → Flag State (MID lookup) ────────────────────────────────────────
//
// The first 3 digits of a 9-digit MMSI are the Maritime Identification Digits,
// which encode the vessel's flag state. This map covers flags commonly seen in
// the Persian Gulf plus major open registries.
//
// Source: hormuz-ship-tracker/src/country_codes.py (MIT-licensed)

type FlagInfo struct {
	Code string // ISO 3166-1 alpha-2 country code
	Name string // English country name
}

var midToFlag = map[int]FlagInfo{
	// Persian Gulf / Middle East
	403: {"SA", "Saudi Arabia"},
	408: {"BH", "Bahrain"},
	412: {"CN", "China"},
	413: {"CN", "China"},
	414: {"CN", "China"},
	416: {"SA", "Saudi Arabia"},
	419: {"IN", "India"},
	422: {"IR", "Iran"},
	431: {"JP", "Japan"},
	432: {"JP", "Japan"},
	440: {"KR", "South Korea"},
	441: {"KR", "South Korea"},
	445: {"KR", "South Korea"},
	447: {"KW", "Kuwait"},
	450: {"OM", "Oman"},
	457: {"MN", "Mongolia"},
	461: {"KW", "Kuwait"},
	466: {"QA", "Qatar"},
	470: {"AE", "UAE"},
	471: {"AE", "UAE"},
	472: {"TJ", "Tajikistan"},
	473: {"AE", "UAE"},
	477: {"HK", "Hong Kong"},
	478: {"BA", "Bosnia"},

	// Open registries
	209: {"BS", "Bahamas"},
	210: {"BS", "Bahamas"},
	211: {"BS", "Bahamas"},
	256: {"MT", "Malta"},
	319: {"KY", "Cayman Islands"},
	325: {"AG", "Antigua & Barbuda"},
	341: {"KN", "St Kitts"},
	351: {"PA", "Panama"},
	352: {"PA", "Panama"},
	353: {"PA", "Panama"},
	354: {"PA", "Panama"},
	355: {"PA", "Panama"},
	356: {"PA", "Panama"},
	357: {"PA", "Panama"},
	370: {"PA", "Panama"},
	371: {"PA", "Panama"},
	372: {"PA", "Panama"},
	373: {"PA", "Panama"},
	374: {"PA", "Panama"},
	375: {"VC", "St Vincent"},
	376: {"VC", "St Vincent"},
	377: {"VC", "St Vincent"},
	378: {"VG", "British Virgin Is."},
	525: {"ID", "Indonesia"},
	533: {"MY", "Malaysia"},
	538: {"MH", "Marshall Islands"},
	548: {"PH", "Philippines"},
	563: {"SG", "Singapore"},
	564: {"SG", "Singapore"},
	565: {"SG", "Singapore"},
	566: {"SG", "Singapore"},
	620: {"KM", "Comoros"},
	621: {"KM", "Comoros"},
	636: {"LR", "Liberia"},
	637: {"LR", "Liberia"},
	667: {"TZ", "Tanzania"},

	// European maritime
	219: {"DK", "Denmark"},
	220: {"DK", "Denmark"},
	224: {"ES", "Spain"},
	225: {"ES", "Spain"},
	226: {"FR", "France"},
	227: {"FR", "France"},
	228: {"FR", "France"},
	229: {"MT", "Malta"},
	230: {"FI", "Finland"},
	231: {"FI", "Finland"},
	235: {"GB", "United Kingdom"},
	236: {"GB", "United Kingdom"},
	237: {"GR", "Greece"},
	238: {"HR", "Croatia"},
	239: {"GR", "Greece"},
	240: {"GR", "Greece"},
	241: {"GR", "Greece"},
	244: {"NL", "Netherlands"},
	245: {"NL", "Netherlands"},
	246: {"NL", "Netherlands"},
	247: {"IT", "Italy"},
	248: {"MT", "Malta"},
	249: {"MT", "Malta"},
	255: {"PT", "Portugal"},
	261: {"PL", "Poland"},
	271: {"TR", "Turkey"},
	272: {"TR", "Turkey"},
	273: {"RU", "Russia"},

	// Americas
	303: {"US", "United States"},
	316: {"CA", "Canada"},
	338: {"US", "United States"},
	366: {"US", "United States"},
	367: {"US", "United States"},
	368: {"US", "United States"},
	369: {"US", "United States"},

	// Other Asian
	501: {"FR", "French Southern"},
	503: {"AU", "Australia"},
	508: {"PW", "Palau"},
	510: {"MQ", "Micronesia"},
	512: {"NZ", "New Zealand"},
	514: {"KH", "Cambodia"},
	515: {"KH", "Cambodia"},
	516: {"AU", "Christmas Is."},
	572: {"TH", "Thailand"},
	574: {"VN", "Vietnam"},

	// Africa
	601: {"ZA", "South Africa"},
	618: {"EG", "Egypt"},
	619: {"EG", "Egypt"},
	622: {"MR", "Mauritania"},
	624: {"DJ", "Djibouti"},
	625: {"ER", "Eritrea"},
	627: {"GM", "Gambia"},
	649: {"CD", "Congo"},
	650: {"SO", "Somalia"},
	657: {"MG", "Madagascar"},
	669: {"IQ", "Iraq"},
	671: {"TG", "Togo"},
	672: {"SY", "Syria"},
	677: {"YE", "Yemen"},
}

// MMSIToFlag extracts country code and name from MMSI via MID lookup.
// Returns empty strings if the MMSI is invalid or unknown.
func MMSIToFlag(mmsi int64) FlagInfo {
	if mmsi < 200000000 || mmsi > 799999999 {
		return FlagInfo{}
	}
	mid := int(mmsi / 1000000) // first 3 of 9 digits
	if info, ok := midToFlag[mid]; ok {
		return info
	}
	return FlagInfo{}
}

// ── Destination Normalization ─────────────────────────────────────────────

// destinationVariants maps canonical destination names to known AIS text variants.
var destinationVariants = map[string][]string{
	"Dubai":               {"DUBAI", "AE DXB", "AEDXB", "DXB", "AE DUBAI", "DUBAI PORT", "PORT OF DUBAI"},
	"Dubai Maritime City": {"DMC", "DMC DUBAI", "DMC-DUBAI", "DMC UAE", "DUBAI MARITIME CITY", "DUBAI MARITIME"},
	"Jebel Ali":           {"JEBEL ALI", "AE JEA", "AEJEA", "JEA", "JEBEL ALI PORT", "JEBELALI", "JEBEL ALI UAE", "AE JEBEL ALI"},
	"Port Rashid":         {"PORT RASHID", "RASHID", "AE RSH"},
	"Sharjah":             {"SHARJAH", "SHARJAH OPL", "SHARJAH ANCHORAGE", "AE SHJ", "AESHJ", "SHJ"},
	"Hamriyah":            {"HAMRIYAH", "HAMRIYAH OPL", "HAMRIYAH FZ", "HAMRIYAH FREE ZONE"},
	"Fujairah":            {"FUJAIRAH", "AE FJR", "AEFJR", "FJR", "FUJAIRAH OPL", "FUJAIRAH ANCHORAGE", "FUJAIRAH ANH", "FUJAIRAH ANCH", "FUJAIRAH PORT", "FUJAIRAH ANK"},
	"Khor Fakkan":         {"KHOR FAKKAN", "KHORFAKKAN", "KHOR FAKKAN PORT", "AE KFK", "KFK"},
	"Abu Dhabi":           {"ABU DHABI", "AE AUH", "AEAUH", "AUH", "ABU DHABI PORT"},
	"Muscat":              {"MUSCAT", "OM MSH", "MUSCAT PORT", "SULTAN QABOOS PORT"},
	"Sohar":               {"SOHAR", "OM SOH", "SOHAR PORT"},
	"Bandar Abbas":        {"BANDAR ABBAS", "BND ABBAS", "IR BND", "SHAHID RAJAEE", "RAJAEE", "BANDARABBAS", "BANDARE ABBAS"},
	"Ras Al Khaimah":      {"RAS AL KHAIMAH", "RAK", "AE RAK", "SAQR PORT", "SAQR"},
	"Kuwait":              {"KUWAIT", "KW KWI", "KWI", "SHUWAIKH", "SHUAIBA", "AHMADI", "MINA AL AHMADI"},
	"Dammam":              {"DAMMAM", "SA DMM", "DMM", "KING ABDULAZIZ PORT"},
	"Jubail":              {"JUBAIL", "AL JUBAIL", "SA JUB", "JUBAIL COMMERCIAL", "JUBAIL INDUSTRIAL"},
	"Ras Tanura":          {"RAS TANURA", "RASTANURA", "RAS TANNURA"},
	"Yanbu":               {"YANBU", "YANBU AL BAHR"},
	"Doha":                {"DOHA", "QA DOH", "HAMAD PORT", "MESAIEED"},
	"Bahrain":             {"BAHRAIN", "BH BAH", "KHALIFA BIN SALMAN", "MINA SALMAN"},
	"Basra":               {"BASRA", "UMM QASR", "IQ BSR", "KHOR AL ZUBAIR", "AL FAO", "FAO"},
	"Mumbai":              {"MUMBAI", "IN BOM", "NHAVA SHEVA", "JNPT", "JAWAHARLAL NEHRU"},
	"Karachi":             {"KARACHI", "PK KHI"},
	"Singapore":           {"SINGAPORE", "SG SIN", "SIN"},
	"For Orders":          {"FOR ORDERS", "FOR ORDER", "F/O", "F.O.", "AWAITING ORDERS", "TBA", "TBN", "T.B.A."},
}

// destinationRegion maps canonical destinations to geographic regions.
var destinationRegion = map[string]string{
	"Dubai": "UAE", "Dubai Maritime City": "UAE", "Jebel Ali": "UAE", "Port Rashid": "UAE",
	"Sharjah": "UAE", "Hamriyah": "UAE", "Fujairah": "UAE", "Khor Fakkan": "UAE",
	"Abu Dhabi": "UAE", "Ras Al Khaimah": "UAE",
	"Muscat": "Oman", "Sohar": "Oman",
	"Bandar Abbas": "Iran",
	"Kuwait":       "Kuwait",
	"Dammam":       "Saudi Arabia", "Jubail": "Saudi Arabia", "Ras Tanura": "Saudi Arabia", "Yanbu": "Saudi Arabia",
	"Doha":       "Qatar",
	"Bahrain":    "Bahrain",
	"Basra":      "Iraq",
	"Mumbai":     "India",
	"Karachi":    "Pakistan",
	"Singapore":  "Singapore",
	"For Orders": "Unspecified",
}

var (
	variantMap     map[string]string
	variantMapInit bool
	whitespaceRe   = regexp.MustCompile(`\s+`)
)

func initVariantMap() {
	if variantMapInit {
		return
	}
	variantMap = make(map[string]string)
	for canonical, variants := range destinationVariants {
		for _, v := range variants {
			variantMap[strings.ToUpper(strings.TrimSpace(v))] = canonical
		}
	}
	variantMapInit = true
}

// NormalizeDestination maps a raw AIS destination string to a canonical port name.
// Returns the original string (cleaned) if no match is found.
func NormalizeDestination(raw string) string {
	initVariantMap()

	if raw == "" {
		return ""
	}

	cleaned := whitespaceRe.ReplaceAllString(strings.TrimSpace(strings.ToUpper(raw)), " ")
	if cleaned == "" {
		return ""
	}

	// Exact match
	if canonical, ok := variantMap[cleaned]; ok {
		return canonical
	}

	// Substring match (longest variant first)
	for variant, canonical := range variantMap {
		if strings.Contains(cleaned, variant) {
			return canonical
		}
	}

	return strings.TrimSpace(raw)
}

// GetDestinationRegion returns the geographic region for a canonical destination.
func GetDestinationRegion(canonicalDest string) string {
	if region, ok := destinationRegion[canonicalDest]; ok {
		return region
	}
	return "Other"
}

// FlagName converts a 2-letter ISO code to a display name.
func FlagName(code string) string {
	names := map[string]string{
		"PA": "Panama", "AE": "UAE", "MH": "Marshall Islands", "LR": "Liberia",
		"KN": "St Kitts", "SG": "Singapore", "HK": "Hong Kong", "KM": "Comoros",
		"VC": "St Vincent", "NL": "Netherlands", "GR": "Greece",
		"KY": "Cayman Islands", "KR": "South Korea", "SA": "Saudi Arabia", "CN": "China",
		"IN": "India", "KW": "Kuwait", "PK": "Pakistan", "IR": "Iran",
		"GB": "United Kingdom", "US": "United States", "FR": "France", "DE": "Germany",
		"IT": "Italy", "ES": "Spain", "TR": "Turkey", "RU": "Russia",
		"QA": "Qatar", "BH": "Bahrain", "OM": "Oman", "IQ": "Iraq",
		"YE": "Yemen", "EG": "Egypt", "SO": "Somalia", "SY": "Syria",
		"JO": "Jordan", "LB": "Lebanon", "MT": "Malta", "DK": "Denmark",
		"FI": "Finland", "PT": "Portugal", "PL": "Poland", "HR": "Croatia",
		"BS": "Bahamas", "AG": "Antigua & Barbuda", "JM": "Jamaica",
		"ID": "Indonesia", "MY": "Malaysia", "PH": "Philippines",
		"VN": "Vietnam", "KH": "Cambodia", "TH": "Thailand",
		"AU": "Australia", "NZ": "New Zealand",
		"ZA": "South Africa", "MR": "Mauritania", "DJ": "Djibouti",
		"ER": "Eritrea", "GM": "Gambia", "CD": "Congo", "TZ": "Tanzania",
		"TG": "Togo", "MG": "Madagascar", "MN": "Mongolia",
		"CA": "Canada", "PW": "Palau", "MQ": "Micronesia",
		"VG": "British Virgin Is.",
	}
	if name, ok := names[code]; ok {
		return name
	}
	return code
}
