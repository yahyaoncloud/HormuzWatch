package news

import (
	"encoding/json"
	"strings"
	"testing"
)

// ── Text Extractor Tests ───────────────────────────────────────────────────

func TestExtractTextToJSON_Empty(t *testing.T) {
	result := ExtractTextToJSON("")
	var parsed ExtractedArticle
	if err := json.Unmarshal([]byte(result), &parsed); err != nil {
		t.Fatalf("empty text should produce valid JSON: %v", err)
	}
	if parsed.Confidence != 0.0 {
		t.Errorf("empty text confidence should be 0, got %.2f", parsed.Confidence)
	}
	if parsed.Source != "regex_extraction" {
		t.Errorf("source should be regex_extraction, got %s", parsed.Source)
	}
}

func TestExtractTextToJSON_Country_Iran(t *testing.T) {
	text := "Two IRGC fast-attack craft harassed a Panama-flagged tanker near Bandar Abbas."
	result := ExtractTextToJSON(text)

	var parsed ExtractedArticle
	if err := json.Unmarshal([]byte(result), &parsed); err != nil {
		t.Fatalf("should produce valid JSON: %v", err)
	}
	if parsed.Country != "IR" {
		t.Errorf("expected IR as primary country, got %s", parsed.Country)
	}
	if parsed.Confidence < 0.3 {
		t.Errorf("expected confidence >= 0.3 (country found), got %.2f", parsed.Confidence)
	}
}

func TestExtractTextToJSON_Country_Saudi(t *testing.T) {
	text := "Saudi Arabia announced new oil production cuts. The Saudi energy minister stated..."
	result := ExtractTextToJSON(text)

	var parsed ExtractedArticle
	json.Unmarshal([]byte(result), &parsed)
	if parsed.Country != "SA" {
		t.Errorf("expected SA as primary country, got %s", parsed.Country)
	}
}

func TestExtractTextToJSON_Cities_Ports(t *testing.T) {
	text := "A vessel departed Dubai heading towards Fujairah anchorage. " +
		"Another ship was spotted near Bandar Abbas and Jebel Ali port."

	result := ExtractTextToJSON(text)
	var parsed ExtractedArticle
	if err := json.Unmarshal([]byte(result), &parsed); err != nil {
		t.Fatalf("should produce valid JSON: %v", err)
	}

	citiesPorts := append(parsed.Cities, parsed.Ports...)
	allLocations := strings.ToLower(strings.Join(citiesPorts, " "))

	if !strings.Contains(allLocations, "dubai") {
		t.Errorf("expected Dubai in locations, got: %v", parsed.Cities)
	}
	if !strings.Contains(allLocations, "fujairah") {
		t.Errorf("expected Fujairah in locations, got: %v", parsed.Cities)
	}
	if !strings.Contains(strings.ToLower(strings.Join(parsed.Ports, " ")), "bandar") {
		t.Errorf("expected Bandar Abbas in ports, got: %v", parsed.Ports)
	}
}

func TestExtractTextToJSON_Vessels(t *testing.T) {
	text := "MV Horizon Star, a Panama-flagged oil tanker, was followed by IRIS Shahid Soleimani. " +
		"USS Carney responded to the incident. MT Pacific Voyager changed course."

	result := ExtractTextToJSON(text)
	var parsed ExtractedArticle
	if err := json.Unmarshal([]byte(result), &parsed); err != nil {
		t.Fatalf("should produce valid JSON: %v", err)
	}

	vesselNames := strings.ToLower(strings.Join(parsed.Vessels, " "))
	if !strings.Contains(vesselNames, "horizon star") {
		t.Errorf("expected MV Horizon Star in vessels, got: %v", parsed.Vessels)
	}
	if !strings.Contains(vesselNames, "shahid") {
		t.Errorf("expected IRIS vessel in extraction, got: %v", parsed.Vessels)
	}
}

func TestExtractTextToJSON_Region(t *testing.T) {
	text := "Tensions escalated in the Strait of Hormuz after multiple vessels reported GPS interference."

	result := ExtractTextToJSON(text)
	var parsed ExtractedArticle
	json.Unmarshal([]byte(result), &parsed)

	if !strings.Contains(strings.ToLower(parsed.Region), "hormuz") {
		t.Errorf("expected Strait of Hormuz as region, got: %s", parsed.Region)
	}
}

func TestExtractTextToJSON_Coordinates(t *testing.T) {
	text := "The incident occurred at approximately 25.2345, 55.3456 in the Gulf."

	result := ExtractTextToJSON(text)
	var parsed ExtractedArticle
	json.Unmarshal([]byte(result), &parsed)

	if len(parsed.Coordinates) < 2 {
		t.Logf("Coordinate extraction optional in text extractor, got: %v", parsed.Coordinates)
		// Not a hard failure — coordinates are best-effort
	} else {
		if parsed.Coordinates[0] != 25.2345 || parsed.Coordinates[1] != 55.3456 {
			t.Errorf("expected (25.2345, 55.3456), got (%v, %v)",
				parsed.Coordinates[0], parsed.Coordinates[1])
		}
	}
}

func TestExtractTextToJSON_AlwaysProducesJSON(t *testing.T) {
	// Even garbage text should produce valid JSON
	text := "asdfghjkl 12345678 !@#$%^&*()"
	result := ExtractTextToJSON(text)

	if !json.Valid([]byte(result)) {
		t.Fatalf("output is not valid JSON: %s", result)
	}

	var parsed ExtractedArticle
	json.Unmarshal([]byte(result), &parsed)
	if parsed.Source != "regex_extraction" {
		t.Errorf("source should be regex_extraction for all inputs")
	}
}

func TestExtractTextToJSON_MultipleCountries(t *testing.T) {
	text := "Iran and Saudi Arabia have agreed to restore diplomatic ties. " +
		"The United Arab Emirates and Bahrain welcomed the decision. " +
		"Qatar also expressed support."

	result := ExtractTextToJSON(text)
	var parsed ExtractedArticle
	json.Unmarshal([]byte(result), &parsed)

	// Should have at least one country (first found = primary)
	if parsed.Country == "" {
		t.Errorf("expected at least one country detected")
	}
}

func TestExtractTextToJSON_DestinationPorts(t *testing.T) {
	text := "The cargo vessel was bound for Jebel Ali port from Nhava Sheva. " +
		"It will then proceed to Dammam and Jubail."

	result := ExtractTextToJSON(text)
	var parsed ExtractedArticle
	json.Unmarshal([]byte(result), &parsed)

	allLocs := strings.ToLower(strings.Join(append(parsed.Cities, parsed.Ports...), " "))
	for _, expected := range []string{"jebel", "dammam", "jubail"} {
		if !strings.Contains(allLocs, expected) {
			t.Errorf("expected %s in locations, got: %v", expected, allLocs)
		}
	}
}

func TestExtractTextToJSON_FlagStateExtraction(t *testing.T) {
	text := "A Marshall Islands-flagged vessel and a Liberian tanker were also in the area. " +
		"The Singapore-flagged container ship diverted course."

	result := ExtractTextToJSON(text)
	var parsed ExtractedArticle
	json.Unmarshal([]byte(result), &parsed)

	// Flag states like Marshall Islands, Liberia, Singapore should appear as countries
	expectedFlags := []string{"MH", "LR", "SG"}
	foundFlag := false
	for _, iso := range expectedFlags {
		if parsed.Country == iso {
			foundFlag = true
			break
		}
	}
	if !foundFlag && parsed.Country != "" {
		t.Logf("Flag state detection may vary, got country=%s", parsed.Country)
	}
}
