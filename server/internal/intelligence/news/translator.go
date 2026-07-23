package news

import (
	"context"
	"log/slog"
)

// Translator is the interface for translating text. Implementations may use
// Google Cloud Translation, Azure Translator, OpenRouter LLM, or a no-op stub.
type Translator interface {
	Translate(ctx context.Context, text, sourceLang, targetLang string) (string, error)
	IsConfigured() bool
}

// NoopTranslator returns text unchanged. Used when no translation service
// is configured or when the text is already in the target language.
type NoopTranslator struct{}

func (n NoopTranslator) Translate(_ context.Context, text, _, _ string) (string, error) {
	return text, nil
}
func (n NoopTranslator) IsConfigured() bool { return false }

// OpenRouterTranslator implements the Translator interface using OpenRouter's
// LLM API for high-quality translation of Gulf languages to English.
type OpenRouterTranslator struct {
	client *OpenRouterClient
}

// NewOpenRouterTranslator creates a translator backed by OpenRouter.
func NewOpenRouterTranslator() *OpenRouterTranslator {
	client := NewOpenRouterClient()
	return &OpenRouterTranslator{client: client}
}

func (t *OpenRouterTranslator) Translate(ctx context.Context, text, sourceLang, targetLang string) (string, error) {
	if targetLang != LangEnglish {
		return text, nil // Only EN translation is supported currently
	}
	if !t.client.configured {
		return text, nil
	}
	if sourceLang == LangEnglish || sourceLang == LangUnknown {
		return text, nil
	}

	result, err := t.client.Translate(ctx, text, sourceLang)
	if err != nil {
		slog.Warn("openrouter translation failed, falling back to original",
			"source_lang", sourceLang, "error", err)
		return text, nil // Graceful degradation — use untranslated text
	}
	if result == "" {
		return text, nil
	}
	return result, nil
}

func (t *OpenRouterTranslator) IsConfigured() bool {
	return t.client.configured
}

// AugmentWithLLM runs OpenRouter-powered threat classification on an already
// processed article and enriches the assessment.
func AugmentWithLLM(ctx context.Context, title, content string) *ThreatResult {
	client := NewOpenRouterClient()
	if !client.configured {
		return nil
	}
	result, err := client.ClassifyThreat(ctx, title, content)
	if err != nil {
		slog.Warn("openrouter threat classification failed", "error", err)
		return nil
	}
	return result
}

// NewTranslator now returns the OpenRouter-based translator when
// OPENROUTER_API_KEY is configured; falls back to NoopTranslator.
func NewTranslator() Translator {
	or := NewOpenRouterClient()
	if or.configured {
		slog.Info("news translator using OpenRouter", "model", or.model)
		return NewOpenRouterTranslator()
	}
	return NoopTranslator{}
}
