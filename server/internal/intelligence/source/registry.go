package source

import (
	"fmt"
	"sync"
)

// Registry is a thread-safe store of named sources.
type Registry struct {
	mu      sync.RWMutex
	sources map[string]Source
}

// NewRegistry returns an empty source registry.
func NewRegistry() *Registry {
	return &Registry{sources: make(map[string]Source)}
}

// Register adds or replaces a source by its name.
func (r *Registry) Register(s Source) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.sources[s.Name()] = s
}

// Get looks up a source by name. Returns nil when not found.
func (r *Registry) Get(name string) Source {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.sources[name]
}

// Remove deletes a source by name.
func (r *Registry) Remove(name string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.sources, name)
}

// List returns all registered source names.
func (r *Registry) List() []string {
	r.mu.RLock()
	defer r.mu.RUnlock()
	names := make([]string, 0, len(r.sources))
	for name := range r.sources {
		names = append(names, name)
	}
	return names
}

// All returns every registered source.
func (r *Registry) All() []Source {
	r.mu.RLock()
	defer r.mu.RUnlock()
	out := make([]Source, 0, len(r.sources))
	for _, s := range r.sources {
		out = append(out, s)
	}
	return out
}

// Count returns the number of registered sources.
func (r *Registry) Count() int {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return len(r.sources)
}

// ValidateRequired returns an error if any required field is missing.
func ValidateRequired(a RawArticle) error {
	if a.URL == "" {
		return fmt.Errorf("url is required")
	}
	if a.Title == "" {
		return fmt.Errorf("title is required")
	}
	if a.Content == "" {
		return fmt.Errorf("content is required")
	}
	if a.SourceName == "" {
		return fmt.Errorf("source_name is required")
	}
	return nil
}
