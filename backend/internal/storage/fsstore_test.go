package storage

import (
	"bytes"
	"context"
	"io"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
)

func newTestFSStore(t *testing.T) (*FSStore, string) {
	t.Helper()
	dir := t.TempDir()
	s, err := NewFSStore(filepath.Join(dir, "public"), filepath.Join(dir, "private"), "/api/v1/storage/download", bytes.Repeat([]byte("k"), 32))
	if err != nil {
		t.Fatal(err)
	}
	return s, dir
}

func testKey(scope Scope, ext string) string {
	return string(scope) + "/" + uuid.NewString() + "/" + uuid.NewString() + "." + ext
}

func TestFSStoreSeparatesPublicAndPrivate(t *testing.T) {
	s, dir := newTestFSStore(t)
	ctx := context.Background()
	pub, priv := testKey(ScopeTeam, "png"), testKey(ScopePlayerDocument, "pdf")
	for _, k := range []string{pub, priv} {
		if _, err := s.Put(ctx, k, strings.NewReader("data"), 4, ""); err != nil {
			t.Fatal(err)
		}
	}
	if _, err := os.Stat(filepath.Join(dir, "public", pub)); err != nil {
		t.Errorf("public file not under public/: %v", err)
	}
	if _, err := os.Stat(filepath.Join(dir, "private", priv)); err != nil {
		t.Errorf("identity document not under private/: %v", err)
	}
	if _, err := os.Stat(filepath.Join(dir, "public", priv)); err == nil {
		t.Error("identity document reachable under public/")
	}

	objs, err := s.List(ctx, strings.Join(strings.Split(pub, "/")[:2], "/")+"/")
	if err != nil || len(objs) != 1 || objs[0].Key != pub || objs[0].Size != 4 {
		t.Fatalf("list = %+v, %v", objs, err)
	}
	if err := s.Delete(ctx, pub); err != nil {
		t.Fatal(err)
	}
	if err := s.Delete(ctx, pub); err != nil {
		t.Fatalf("delete must be idempotent: %v", err)
	}
}

func TestFSStoreRejectsUnsafeKeys(t *testing.T) {
	s, _ := newTestFSStore(t)
	for _, k := range []string{
		"../../etc/passwd",
		"team/" + uuid.NewString() + "/../../../x.png",
		"/abs/" + uuid.NewString() + "/" + uuid.NewString() + ".png",
		"other/" + uuid.NewString() + "/" + uuid.NewString() + ".png",
	} {
		if _, err := s.Put(context.Background(), k, strings.NewReader("x"), 1, ""); err == nil {
			t.Errorf("accepted unsafe key %q", k)
		}
	}
	if _, err := s.List(context.Background(), "team/../../"); err == nil {
		t.Error("accepted unsafe list prefix")
	}
}

func TestFSStoreRejectsOversizedBody(t *testing.T) {
	s, dir := newTestFSStore(t)
	k := testKey(ScopePlayer, "jpg")
	if _, err := s.Put(context.Background(), k, strings.NewReader("12345"), 3, ""); err == nil {
		t.Fatal("body larger than declared size accepted")
	}
	if _, err := os.Stat(filepath.Join(dir, "public", k)); err == nil {
		t.Fatal("partial file left behind")
	}
}

func TestFSStoreSignedLinks(t *testing.T) {
	s, _ := newTestFSStore(t)
	ctx := context.Background()
	k := testKey(ScopePlayerDocument, "pdf")
	if _, err := s.Put(ctx, k, strings.NewReader("ine"), 3, ""); err != nil {
		t.Fatal(err)
	}
	raw, err := s.PresignGet(ctx, k, time.Minute)
	if err != nil {
		t.Fatal(err)
	}
	u, _ := url.Parse(raw)
	q := u.Query()

	f, err := s.Open(q.Get("key"), q.Get("exp"), q.Get("sig"))
	if err != nil {
		t.Fatalf("valid link rejected: %v", err)
	}
	body, _ := io.ReadAll(f)
	_ = f.Close()
	if string(body) != "ine" {
		t.Fatalf("body = %q", body)
	}

	other := testKey(ScopePlayerDocument, "pdf")
	if _, err := s.Open(other, q.Get("exp"), q.Get("sig")); err != ErrBadSignature {
		t.Error("signature reused for another key")
	}
	if _, err := s.Open(k, q.Get("exp")+"0", q.Get("sig")); err != ErrBadSignature {
		t.Error("tampered expiry accepted")
	}
	s.now = func() time.Time { return time.Now().Add(2 * time.Minute) }
	if _, err := s.Open(k, q.Get("exp"), q.Get("sig")); err != ErrBadSignature {
		t.Error("expired link accepted")
	}
}
