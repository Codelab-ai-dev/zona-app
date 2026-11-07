package agent

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

const (
	webhookMaxBody   = 1 << 20
	workerCount      = 4
	queueSize        = 100
	whatsappDeadline = 60 * time.Second
)

// Handler exposes the agent over HTTP and processes WhatsApp messages on a
// bounded worker pool so Kapso gets a fast 200.
type Handler struct {
	svc        *Service
	identities IdentityResolver
	sender     WhatsAppSender
	secret     string
	seen       *dedup
	queue      chan inboundMessage
}

// NewHandler builds the handler and starts the WhatsApp workers, which stop
// when ctx is cancelled. sender/secret may be empty to disable WhatsApp.
func NewHandler(ctx context.Context, svc *Service, identities IdentityResolver, sender WhatsAppSender, webhookSecret string) *Handler {
	h := &Handler{
		svc: svc, identities: identities, sender: sender, secret: webhookSecret,
		seen: newDedup(24 * time.Hour), queue: make(chan inboundMessage, queueSize),
	}
	for range workerCount {
		go h.worker(ctx)
	}
	return h
}

// Routes implements server.Module.
func (h *Handler) Routes(r chi.Router) {
	r.With(auth.RequireAuth).Post("/agent/messages", h.message)
	if h.sender != nil && h.secret != "" {
		r.Post("/agent/webhooks/kapso", h.kapsoWebhook)
	}
}

func (h *Handler) message(w http.ResponseWriter, r *http.Request) {
	var req MessageRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	caller, _ := auth.FromContext(r.Context())
	id, err := h.identities.ByUser(r.Context(), caller.UserID)
	if errors.Is(err, ErrNotLinked) {
		httpx.WriteError(w, r, notLinkedError)
		return
	}
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	id.Channel = channelFromHeader(r)

	reply, err := h.svc.Ask(r.Context(), id, req.Message)
	if errors.Is(err, ErrRateLimited) {
		httpx.WriteError(w, r, httpx.ErrRateLimited)
		return
	}
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, reply)
}

// kapsoWebhook verifies the signature over the raw body before parsing
// anything, then enqueues new inbound messages.
func (h *Handler) kapsoWebhook(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, webhookMaxBody))
	if err != nil {
		httpx.WriteError(w, r, httpx.ErrTooLarge)
		return
	}
	if !verifyKapsoSignature(body, r.Header.Get("X-Webhook-Signature"), h.secret) {
		httpx.WriteError(w, r, httpx.ErrUnauthorized)
		return
	}
	messages, err := parseKapsoWebhook(body)
	if err != nil {
		httpx.WriteError(w, r, httpx.ErrBadRequest.Wrap(err))
		return
	}
	now := time.Now()
	for _, m := range messages {
		if !h.seen.firstTime(m.ID, now) {
			continue
		}
		select {
		case h.queue <- m:
		default:
			// Saturated: ask Kapso to retry later instead of dropping silently.
			h.seen.forget(m.ID)
			slog.WarnContext(r.Context(), "agent queue full", "phone", maskPhone(m.From))
			w.Header().Set("Retry-After", "30")
			httpx.WriteError(w, r, &httpx.Error{Status: http.StatusServiceUnavailable, Code: "busy", Message: "Servicio ocupado"})
			return
		}
	}
	httpx.NoContent(w)
}

func (h *Handler) worker(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		case m := <-h.queue:
			h.handleWhatsApp(ctx, m)
		}
	}
}

func (h *Handler) handleWhatsApp(parent context.Context, m inboundMessage) {
	ctx, cancel := context.WithTimeout(parent, whatsappDeadline)
	defer cancel()

	text := notLinkedReply
	id, err := h.identities.ByWhatsApp(ctx, m.From)
	switch {
	case errors.Is(err, ErrNotLinked):
	case err != nil:
		slog.ErrorContext(ctx, "agent identity failed", "phone", maskPhone(m.From), "err", err)
		text = fallbackReply
	default:
		reply, askErr := h.svc.Ask(ctx, id, m.Text)
		switch {
		case errors.Is(askErr, ErrRateLimited):
			return // don't answer floods
		case askErr != nil:
			slog.ErrorContext(ctx, "agent ask failed", "phone", maskPhone(m.From), "err", askErr)
			text = fallbackReply
		default:
			text = reply.Text
		}
	}
	if err := h.sender.SendText(ctx, m.From, text); err != nil {
		slog.ErrorContext(ctx, "agent reply not delivered", "phone", maskPhone(m.From), "err", err)
	}
}

func channelFromHeader(r *http.Request) Channel {
	if r.Header.Get("X-Client") == "mobile" {
		return ChannelMobile
	}
	return ChannelWeb
}
