package storage

import (
	"context"
	"fmt"
	"io"
	"time"
)

// FakeStore is a test double for ObjectStore.
type FakeStore struct {
	objects map[string][]byte
	etags   map[string]string
}

// NewFakeStore builds a test-friendly store.
func NewFakeStore() *FakeStore {
	return &FakeStore{
		objects: make(map[string][]byte),
		etags:   make(map[string]string),
	}
}

// Put implements ObjectStore.
func (f *FakeStore) Put(_ context.Context, key string, reader io.Reader, _ int64, _ string) (string, error) {
	data, err := io.ReadAll(reader)
	if err != nil {
		return "", err
	}
	f.objects[key] = data
	etag := fmt.Sprintf(`"%d"`, len(data))
	f.etags[key] = etag
	return etag, nil
}

// Delete implements ObjectStore.
func (f *FakeStore) Delete(_ context.Context, key string) error {
	delete(f.objects, key)
	delete(f.etags, key)
	return nil
}

// List implements ObjectStore.
func (f *FakeStore) List(_ context.Context, prefix string) ([]Object, error) {
	var objects []Object
	for key, data := range f.objects {
		if len(prefix) == 0 || (len(key) >= len(prefix) && key[:len(prefix)] == prefix) {
			objects = append(objects, Object{
				Key:       key,
				Size:      int64(len(data)),
				ETag:      f.etags[key],
				CreatedAt: time.Now(),
			})
		}
	}
	return objects, nil
}

// PresignGet implements ObjectStore.
func (f *FakeStore) PresignGet(_ context.Context, key string, _ time.Duration) (string, error) {
	if _, ok := f.objects[key]; !ok {
		return "", fmt.Errorf("key not found: %s", key)
	}
	return "https://fake.storage/fake/" + key, nil
}

// Get is a test helper to retrieve stored data.
func (f *FakeStore) Get(key string) []byte {
	return f.objects[key]
}
