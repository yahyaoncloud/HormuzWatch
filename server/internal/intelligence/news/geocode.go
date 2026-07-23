package news

// GeoPoint represents a latitude/longitude coordinate pair.
type GeoPoint struct {
	Lat float64 `json:"lat"`
	Lon float64 `json:"lon"`
}

// IsValid returns true when both coordinates are non-zero.
func (g GeoPoint) IsValid() bool {
	return g.Lat != 0 || g.Lon != 0
}

// ── Gazetteer with precise coordinates ─────────────────────────────

// PortGazetteer maps port names (lowercase) to their exact coordinates.
var PortGazetteer = map[string]GeoPoint{
	// UAE
	"jebel ali":            {25.0124, 55.0611},
	"port rashid":          {25.2720, 55.2810},
	"khalifa port":         {24.8275, 54.6628},
	"fujairah":             {25.1216, 56.3512},
	// Saudi Arabia
	"jubail":               {27.0118, 49.6573},
	"dammam":               {26.4490, 50.1000},
	"ras tanura":           {26.6400, 50.1600},
	"yanbu":                {23.9990, 38.2000},
	"jeddah islamic port":  {21.4833, 39.1500},
	"king abdullah port":   {22.4500, 39.1000},
	// Kuwait
	"shuwaikh":             {29.3572, 47.9353},
	"shuaiba":              {29.0361, 48.1572},
	// Qatar
	"doha port":            {25.2900, 51.5400},
	"hamad port":           {25.0200, 51.6100},
	// Bahrain
	"khalifa bin salman":   {26.1900, 50.6750},
	// Oman
	"salalah":              {16.9400, 54.0100},
	"sohar":                {24.3594, 56.7512},
	"duqm":                 {19.6600, 57.7100},
	"muscat":               {23.6200, 58.5600},
	// Iran
	"bandar abbas":         {27.1833, 56.2667},
	"bushehr":              {28.9667, 50.8333},
	"chabahar":             {25.2919, 60.6431},
	"khorramshahr":         {30.4333, 48.1667},
	// Iraq
	"umm qasr":             {30.0400, 47.9300},
	// Jordan
	"aqaba":                {29.5319, 35.0056},
	// Israel
	"eilat":                {29.5578, 34.9514},
	// Africa
	"mombasa":              {-4.0500, 39.6667},
	"port sudan":           {19.6167, 37.2167},
	"djibouti":             {11.5950, 43.1481},
}

// AirportGazetteer maps airport names (lowercase) to coordinates.
var AirportGazetteer = map[string]GeoPoint{
	"dubai international":            {25.2532, 55.3657},
	"abu dhabi international":        {24.4330, 54.6511},
	"sharjah":                        {25.3286, 55.5172},
	"king khalid international":      {24.9576, 46.6988},
	"king abdulaziz international":   {21.6811, 39.1556},
	"king fahd international":        {26.4712, 49.7979},
	"hamad international":            {25.2731, 51.6081},
	"kuwait international":           {29.2266, 47.9794},
	"bahrain international":          {26.2708, 50.6336},
	"muscat international":           {23.6010, 58.2844},
	"salalah airport":                {17.0387, 54.0913},
	"imam khomeini international":    {35.4161, 51.1522},
	"mehrabad":                       {35.6892, 51.3134},
	"baghdad international":          {33.2625, 44.2346},
	"basra international":            {30.5489, 47.6621},
	"queen alia international":       {31.7226, 35.9932},
	"ben gurion":                     {32.0114, 34.8867},
	"doha international":             {25.2611, 51.5651},
}

// CityGazetteer maps city names (lowercase) to coordinates.
var CityGazetteer = map[string]GeoPoint{
	"riyadh":     {24.7136, 46.6753},
	"jeddah":     {21.5433, 39.1728},
	"mecca":      {21.3891, 39.8579},
	"medina":     {24.5247, 39.5692},
	"dubai":      {25.2048, 55.2708},
	"abu dhabi":  {24.4539, 54.3773},
	"sharjah":    {25.3573, 55.3909},
	"doha":       {25.2854, 51.5310},
	"muscat":     {23.5880, 58.3829},
	"kuwait city": {29.3759, 47.9774},
	"manama":     {26.2285, 50.5860},
	"tehran":     {35.6892, 51.3890},
	"baghdad":    {33.3152, 44.3661},
	"basra":      {30.5080, 47.7835},
	"sanaa":      {15.3694, 44.1910},
	"aden":       {12.7855, 45.0187},
	"amman":      {31.9454, 35.9284},
	"tel aviv":   {32.0853, 34.7818},
	"jerusalem":  {31.7683, 35.2137},
	"beirut":     {33.8938, 35.5018},
	"damascus":   {33.5138, 36.2765},
	"cairo":      {30.0444, 31.2357},
	"istanbul":   {41.0082, 28.9784},
	"ankara":     {39.9334, 32.8597},
	"bandar abbas": {27.1833, 56.2667},
	"bushehr":    {28.9667, 50.8333},
	"chabahar":   {25.2919, 60.6431},
}

// CountryCentroids maps ISO 3166-1 alpha-2 codes to approximate centroids.
var CountryCentroids = map[string]GeoPoint{
	"SA": {23.8859, 45.0792},
	"AE": {23.4241, 53.8478},
	"QA": {25.3548, 51.1839},
	"KW": {29.3117, 47.4818},
	"BH": {26.0275, 50.5500},
	"OM": {21.4735, 55.9754},
	"IR": {32.4279, 53.6880},
	"IQ": {33.2232, 43.6793},
	"YE": {15.5527, 48.5164},
	"JO": {30.5852, 36.2384},
	"IL": {31.0461, 34.8516},
	"SY": {34.8021, 38.9968},
	"LB": {33.8547, 35.8623},
	"PS": {31.9522, 35.2332},
	"EG": {26.8206, 30.8025},
	"TR": {38.9637, 35.2433},
	"PK": {30.3753, 69.3451},
	"IN": {20.5937, 78.9629},
	"US": {37.0902, -95.7129},
	"GB": {55.3781, -3.4360},
	"FR": {46.6034, 1.8883},
	"RU": {61.5240, 105.3188},
	"CN": {35.8617, 104.1954},
}

// ── Geocode lookup ─────────────────────────────────────────────────

// GeocodeLocation resolves a named location string to a GeoPoint.
// Checks ports first (most specific), then airports, then cities, then countries.
func GeocodeLocation(name string) (GeoPoint, bool) {
	if name == "" {
		return GeoPoint{}, false
	}

	if p, ok := PortGazetteer[name]; ok {
		return p, true
	}
	if p, ok := AirportGazetteer[name]; ok {
		return p, true
	}
	if p, ok := CityGazetteer[name]; ok {
		return p, true
	}
	return GeoPoint{}, false
}

// GeocodeCountry resolves an ISO country code to its centroid.
func GeocodeCountry(code string) (GeoPoint, bool) {
	p, ok := CountryCentroids[code]
	return p, ok
}

// GeocodeEntity extracts all geocodable points from entity results.
func GeocodeEntity(entities EntityResult) []GeoPoint {
	var points []GeoPoint
	seen := make(map[GeoPoint]bool)

	for _, port := range entities.Ports {
		if p, ok := PortGazetteer[port]; ok {
			if !seen[p] {
				seen[p] = true
				points = append(points, p)
			}
		}
	}
	for _, airport := range entities.Airports {
		if p, ok := AirportGazetteer[airport]; ok {
			if !seen[p] {
				seen[p] = true
				points = append(points, p)
			}
		}
	}
	for _, city := range entities.Cities {
		if p, ok := CityGazetteer[city]; ok {
			if !seen[p] {
				seen[p] = true
				points = append(points, p)
			}
		}
	}
	for _, country := range entities.Countries {
		if p, ok := CountryCentroids[country]; ok {
			if !seen[p] {
				seen[p] = true
				points = append(points, p)
			}
		}
	}

	return points
}
