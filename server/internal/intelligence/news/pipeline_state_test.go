package news

import (
	"testing"
)

func TestPipelineStateTransitions(t *testing.T) {
	tracker := NewTracker()
	articleID := "test-article-001"
	sourceName := "test-source"

	// 1. Queued -> Processing -> Duplicate
	if err := tracker.TransitionArticle(articleID, sourceName, StateProcessing, "start"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	rec, ok := tracker.GetArticleRecord(articleID)
	if !ok || rec.State != StateProcessing {
		t.Fatalf("expected state PROCESSING, got %v", rec.State)
	}

	// Processing -> Duplicate
	if err := tracker.TransitionArticle(articleID, sourceName, StateDuplicate, "duplicate hash"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	rec, ok = tracker.GetArticleRecord(articleID)
	if !ok || rec.State != StateDuplicate {
		t.Fatalf("expected state DUPLICATE, got %v", rec.State)
	}

	if !rec.State.IsTerminal() {
		t.Errorf("expected DUPLICATE to be terminal")
	}

	// 2. Direct Queued -> Duplicate
	articleID2 := "test-article-002"
	if err := tracker.TransitionArticle(articleID2, sourceName, StateDuplicate, "early hash match"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	rec2, ok := tracker.GetArticleRecord(articleID2)
	if !ok || rec2.State != StateDuplicate {
		t.Fatalf("expected state DUPLICATE, got %v", rec2.State)
	}

	// 3. Normal path: Queued -> Processing -> Scored -> Geocoded -> Stored -> Done
	articleID3 := "test-article-003"
	steps := []ArticleState{
		StateProcessing,
		StateScored,
		StateGeocoded,
		StateStored,
		StateDone,
	}

	for _, step := range steps {
		if err := tracker.TransitionArticle(articleID3, sourceName, step, "step"); err != nil {
			t.Fatalf("failed transition to %s: %v", step, err)
		}
	}

	rec3, ok := tracker.GetArticleRecord(articleID3)
	if !ok || rec3.State != StateDone {
		t.Fatalf("expected state DONE, got %v", rec3.State)
	}

	if !rec3.State.IsTerminal() {
		t.Errorf("expected DONE to be terminal")
	}
}
