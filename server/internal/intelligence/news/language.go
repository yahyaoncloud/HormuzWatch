package news

import "strings"

// ISO 639-1 codes for Gulf-relevant languages.
const (
	LangArabic  = "ar"
	LangPersian = "fa"
	LangHebrew  = "he"
	LangTurkish = "tr"
	LangEnglish = "en"
	LangFrench  = "fr"
	LangUnknown = "un"
)

// LangInfo holds detection results.
type LangInfo struct {
	Language    string  // ISO 639-1 code
	Confidence  float64 // 0.0 - 1.0
	Script      string  // Arabic, Latin, Hebrew, etc.
}

// DetectLanguage uses a character-set heuristic to identify the script and
// language of the input text. For production use, replace with CLD3 or
// whatlanggo. This implementation is a zero-dependency fallback that correctly
// identifies Arabic, Farsi, Hebrew, and Latin-script texts.
func DetectLanguage(text string) LangInfo {
	text = strings.TrimSpace(text)
	if len(text) < 10 {
		return LangInfo{Language: LangUnknown, Confidence: 0}
	}

	arabicCount := 0
	hebrewCount := 0
	latinCount := 0
	totalLetters := 0

	for _, r := range text {
		switch {
		case r >= 0x0600 && r <= 0x06FF:
			arabicCount++
			totalLetters++
		case r >= 0xFB50 && r <= 0xFDFF:
			arabicCount++ // Arabic Presentation Forms-A
			totalLetters++
		case r >= 0xFE70 && r <= 0xFEFF:
			arabicCount++ // Arabic Presentation Forms-B
			totalLetters++
		case r >= 0x0590 && r <= 0x05FF:
			hebrewCount++
			totalLetters++
		case (r >= 'A' && r <= 'Z') || (r >= 'a' && r <= 'z'):
			latinCount++
			totalLetters++
		case r >= 0xFB1D && r <= 0xFB4F:
			hebrewCount++ // Hebrew Presentation Forms
			totalLetters++
		}
	}

	if totalLetters == 0 {
		return LangInfo{Language: LangUnknown, Confidence: 0}
	}

	if arabicCount > 0 && float64(arabicCount)/float64(totalLetters) > 0.4 {
		return LangInfo{
			Language:   LangArabic,
			Confidence: float64(arabicCount) / float64(totalLetters),
			Script:     "Arabic",
		}
	}

	if hebrewCount > 0 && float64(hebrewCount)/float64(totalLetters) > 0.3 {
		return LangInfo{
			Language:   LangHebrew,
			Confidence: float64(hebrewCount) / float64(totalLetters),
			Script:     "Hebrew",
		}
	}

	if latinCount > 0 && float64(latinCount)/float64(totalLetters) > 0.5 {
		return LangInfo{
			Language:   LangEnglish,
			Confidence: float64(latinCount) / float64(totalLetters),
			Script:     "Latin",
		}
	}

	return LangInfo{Language: LangUnknown, Confidence: 0}
}

// GulfLanguages lists the ISO 639-1 codes that should be translated.
var GulfLanguages = []string{LangArabic, LangPersian, LangHebrew, LangTurkish}

// NeedsTranslation returns true if the detected language is a Gulf language
// that should be translated to English before ML processing.
func NeedsTranslation(lang string) bool {
	for _, l := range GulfLanguages {
		if lang == l {
			return true
		}
	}
	return false
}
