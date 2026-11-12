package play

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"strconv"
	"testing"
	"time"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

const testWebhookSecret = "whsec-test"

// signMux builds a header exactly as Mux does: t=<unix seconds>,v1=<hex>.
func signMux(secret, body string, at time.Time) string {
	ts := strconv.FormatInt(at.Unix(), 10)
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(ts + "." + body))
	return "t=" + ts + ",v1=" + hex.EncodeToString(mac.Sum(nil))
}

func TestVerifyMuxSignature(t *testing.T) {
	now := time.Unix(1_800_000_000, 0)
	body := `{"type":"video.asset.ready","data":{"id":"asset-1"}}`
	valid := signMux(testWebhookSecret, body, now)

	tests := []struct {
		name    string
		header  string
		body    string
		secret  string
		wantErr *httpx.Error
	}{
		{name: "valid", header: valid, body: body, secret: testWebhookSecret},
		{name: "rotated secret: second v1 matches", header: signMux("old", body, now) + ",v1=" + valid[len("t=1800000000,v1="):], body: body, secret: testWebhookSecret},
		{name: "tampered body", header: valid, body: body + " ", secret: testWebhookSecret, wantErr: httpx.ErrUnauthorized},
		{name: "wrong secret", header: signMux("other", body, now), body: body, secret: testWebhookSecret, wantErr: httpx.ErrUnauthorized},
		{name: "stale timestamp", header: signMux(testWebhookSecret, body, now.Add(-6*time.Minute)), body: body, secret: testWebhookSecret, wantErr: httpx.ErrUnauthorized},
		{name: "future timestamp", header: signMux(testWebhookSecret, body, now.Add(6*time.Minute)), body: body, secret: testWebhookSecret, wantErr: httpx.ErrUnauthorized},
		{name: "RFC3339 timestamp rejected", header: "t=2026-01-01T00:00:00Z,v1=abc", body: body, secret: testWebhookSecret, wantErr: httpx.ErrUnauthorized},
		{name: "missing v1", header: "t=1800000000", body: body, secret: testWebhookSecret, wantErr: httpx.ErrUnauthorized},
		{name: "garbage header", header: "nonsense", body: body, secret: testWebhookSecret, wantErr: httpx.ErrUnauthorized},
		{name: "empty secret never verifies", header: signMux("", body, now), body: body, secret: "", wantErr: httpx.ErrInternal},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := verifyMuxSignatureAt(tt.header, tt.body, tt.secret, now)
			if tt.wantErr == nil {
				if err != nil {
					t.Fatalf("unexpected error: %v", err)
				}
				return
			}
			if !errors.Is(err, tt.wantErr) {
				t.Fatalf("err = %v, want %v", err, tt.wantErr)
			}
		})
	}
}
