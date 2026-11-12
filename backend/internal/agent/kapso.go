package agent

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"
)

// KapsoConfig configures inbound webhooks and outbound replies.
type KapsoConfig struct {
	BaseURL       string // https://api.kapso.ai
	APIKey        string
	PhoneNumberID string
	WebhookSecret string
}

// verifyKapsoSignature checks X-Webhook-Signature: hex HMAC-SHA256 of the raw
// body with the webhook secret (https://docs.kapso.ai/docs/platform/webhooks/security).
func verifyKapsoSignature(body []byte, signature, secret string) bool {
	if secret == "" || signature == "" {
		return false
	}
	got, err := hex.DecodeString(strings.TrimSpace(signature))
	if err != nil {
		return false
	}
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	return hmac.Equal(got, mac.Sum(nil))
}

// kapsoWebhook is the subset of the Kapso payload we use.
type kapsoWebhook struct {
	Data []struct {
		Message struct {
			ID   string `json:"id"`
			From string `json:"from"`
			Type string `json:"type"`
			Text *struct {
				Body string `json:"body"`
			} `json:"text"`
			Interactive *struct {
				ButtonReply *struct {
					Title string `json:"title"`
				} `json:"button_reply"`
				ListReply *struct {
					Title string `json:"title"`
				} `json:"list_reply"`
			} `json:"interactive"`
			Kapso struct {
				Direction string `json:"direction"`
			} `json:"kapso"`
		} `json:"message"`
	} `json:"data"`
}

// inboundMessage is one actionable WhatsApp message.
type inboundMessage struct {
	ID   string
	From string
	Text string
}

// parseKapsoWebhook extracts inbound text messages; outbound echoes and
// non-text messages are ignored.
func parseKapsoWebhook(body []byte) ([]inboundMessage, error) {
	var w kapsoWebhook
	if err := json.Unmarshal(body, &w); err != nil {
		return nil, fmt.Errorf("decode kapso webhook: %w", err)
	}
	var out []inboundMessage
	for _, d := range w.Data {
		m := d.Message
		if m.Kapso.Direction != "" && m.Kapso.Direction != "inbound" {
			continue
		}
		text := ""
		switch {
		case m.Text != nil:
			text = m.Text.Body
		case m.Interactive != nil && m.Interactive.ButtonReply != nil:
			text = m.Interactive.ButtonReply.Title
		case m.Interactive != nil && m.Interactive.ListReply != nil:
			text = m.Interactive.ListReply.Title
		}
		text = strings.TrimSpace(text)
		if m.ID == "" || m.From == "" || text == "" {
			continue
		}
		out = append(out, inboundMessage{ID: m.ID, From: m.From, Text: truncateRunes(text, MaxMessageRunes)})
	}
	return out, nil
}

// dedup remembers recently seen message ids. Kapso has no signed timestamp,
// so this also blunts replays of captured deliveries within the window.
type dedup struct {
	mu   sync.Mutex
	seen map[string]time.Time
	ttl  time.Duration
}

func newDedup(ttl time.Duration) *dedup { return &dedup{seen: map[string]time.Time{}, ttl: ttl} }

// firstTime reports whether id was not seen within the TTL, recording it.
func (d *dedup) firstTime(id string, now time.Time) bool {
	d.mu.Lock()
	defer d.mu.Unlock()
	for k, t := range d.seen {
		if now.Sub(t) > d.ttl {
			delete(d.seen, k)
		}
	}
	if _, ok := d.seen[id]; ok {
		return false
	}
	d.seen[id] = now
	return true
}

// forget removes id so a retried delivery is processed again.
func (d *dedup) forget(id string) {
	d.mu.Lock()
	defer d.mu.Unlock()
	delete(d.seen, id)
}

// KapsoSender sends WhatsApp text replies through Kapso.
type KapsoSender struct {
	cfg    KapsoConfig
	client *http.Client
}

// NewKapsoSender builds a sender with a bounded timeout.
func NewKapsoSender(cfg KapsoConfig) *KapsoSender {
	return &KapsoSender{cfg: cfg, client: &http.Client{Timeout: 10 * time.Second}}
}

// SendText implements WhatsAppSender.
func (k *KapsoSender) SendText(ctx context.Context, to, text string) error {
	payload, err := json.Marshal(map[string]any{
		"messaging_product": "whatsapp",
		"to":                strings.TrimPrefix(to, "+"),
		"type":              "text",
		"text":              map[string]string{"body": truncateRunes(text, 4000)},
	})
	if err != nil {
		return fmt.Errorf("encode reply: %w", err)
	}
	url := fmt.Sprintf("%s/meta/whatsapp/v21.0/%s/messages", strings.TrimRight(k.cfg.BaseURL, "/"), k.cfg.PhoneNumberID)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(payload))
	if err != nil {
		return fmt.Errorf("build reply request: %w", err)
	}
	req.Header.Set("X-API-Key", k.cfg.APIKey)
	req.Header.Set("Content-Type", "application/json")
	resp, err := k.client.Do(req)
	if err != nil {
		return fmt.Errorf("send reply: %w", err)
	}
	defer resp.Body.Close()
	_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, 4<<10))
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return errors.New("kapso reply failed with status " + resp.Status)
	}
	return nil
}
