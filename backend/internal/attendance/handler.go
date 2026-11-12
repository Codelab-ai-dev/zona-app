package attendance

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/authz"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// Handler translates HTTP to service calls for attendance.
type Handler struct {
	svc      *Service
	authz    authz.Checker
	streams  map[uuid.UUID]int // user_id -> count of active streams
	streamMu sync.Mutex
}

// NewHandler builds the attendance HTTP handler.
func NewHandler(svc *Service, authz authz.Checker) *Handler {
	return &Handler{
		svc:     svc,
		authz:   authz,
		streams: make(map[uuid.UUID]int),
	}
}

// Routes registers all attendance endpoints.
func (h *Handler) Routes(r chi.Router) {
	r.With(auth.RequireAuth).Post("/matches/{matchID}/attendance/qr", h.recordQRAttendance)
	r.With(auth.RequireAuth).Post("/matches/{matchID}/attendance/facial", h.recordFacialAttendance)
	r.With(auth.RequireAuth).Get("/matches/{matchID}/attendance", h.listAttendance)
	r.With(auth.RequireAuth).Get("/matches/{matchID}/attendance/stream", h.streamAttendance)
	r.With(auth.RequireAuth).Get("/players/{playerID}/today-matches", h.playerMatchesOn)
}

// playerMatchesOn handles GET /players/{playerID}/today-matches?date=YYYY-MM-DD
// (the device's local date; defaults to today in UTC).
func (h *Handler) playerMatchesOn(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())
	playerID, err := httpx.UUIDParam(r, "playerID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	date := time.Now().UTC()
	if v := r.URL.Query().Get("date"); v != "" {
		d, err := time.Parse("2006-01-02", v)
		if err != nil {
			httpx.WriteError(w, r, httpx.Validation(map[string]string{"date": "formato YYYY-MM-DD"}))
			return
		}
		date = d
	}
	list, err := h.svc.PlayerMatchesOn(r.Context(), caller, playerID, date)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	httpx.List(w, list, httpx.Page{Limit: len(list)}.WithTotal(len(list)))
}

// recordQRAttendance handles POST /matches/{matchID}/attendance/qr.
func (h *Handler) recordQRAttendance(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())

	matchID, err := httpx.UUIDParam(r, "matchID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	var req RecordQRAttendanceRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	att, err := h.svc.RecordQRAttendance(r.Context(), caller, matchID, &req)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.JSON(w, http.StatusCreated, att)
}

// recordFacialAttendance handles POST /matches/{matchID}/attendance/facial.
func (h *Handler) recordFacialAttendance(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())

	matchID, err := httpx.UUIDParam(r, "matchID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	var req RecordFacialAttendanceRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	att, err := h.svc.RecordFacialAttendance(r.Context(), caller, matchID, &req)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.JSON(w, http.StatusCreated, att)
}

// listAttendance handles GET /matches/{matchID}/attendance.
func (h *Handler) listAttendance(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())

	matchID, err := httpx.UUIDParam(r, "matchID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	// Authorization: league admin or super admin can see all attendance.
	// Team owners and others get 403 (could be enhanced to show only their team's players).
	if err := h.authz.CanManageMatch(r.Context(), caller, matchID); err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	page, err := httpx.ParsePage(r)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	records, err := h.svc.ListAttendance(r.Context(), matchID, page.Limit, page.Offset)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.List(w, records, page)
}

// streamAttendance handles GET /matches/{matchID}/attendance/stream (SSE).
func (h *Handler) streamAttendance(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())

	matchID, err := httpx.UUIDParam(r, "matchID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	// Authorization: league admin or super admin can stream all attendance.
	if err := h.authz.CanManageMatch(r.Context(), caller, matchID); err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	// Check concurrent stream limit (max 3 per user)
	h.streamMu.Lock()
	if h.streams[caller.UserID] >= 3 {
		h.streamMu.Unlock()
		httpx.WriteError(w, r, &httpx.Error{
			Status:  http.StatusTooManyRequests,
			Code:    "too_many_streams",
			Message: "Maximum 3 concurrent streams per user",
		})
		return
	}
	h.streams[caller.UserID]++
	h.streamMu.Unlock()

	defer func() {
		h.streamMu.Lock()
		h.streams[caller.UserID]--
		if h.streams[caller.UserID] == 0 {
			delete(h.streams, caller.UserID)
		}
		h.streamMu.Unlock()
	}()

	// Set SSE headers
	w.Header().Set("Content-Type", "text/event-stream; charset=utf-8")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("X-Accel-Buffering", "no")

	// Create context with 30 min timeout
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Minute)
	defer cancel()

	ch := make(chan AttendanceRecord, 10)

	// Start streaming in a goroutine
	streamDone := make(chan error, 1)
	go func() {
		streamDone <- h.svc.StreamAttendance(ctx, matchID, ch)
	}()

	heartbeatTicker := time.NewTicker(15 * time.Second)
	defer heartbeatTicker.Stop()

	// Send records and heartbeats to client
	for {
		select {
		case record := <-ch:
			// Write SSE format: data: <json>\n\n
			data, err := json.Marshal(record)
			if err != nil {
				slog.ErrorContext(ctx, "marshal attendance record", "err", err)
				return
			}
			if _, err := w.Write([]byte("data: ")); err != nil {
				return
			}
			if _, err := w.Write(data); err != nil {
				return
			}
			if _, err := w.Write([]byte("\n\n")); err != nil {
				return
			}
			if f, ok := w.(http.Flusher); ok {
				f.Flush()
			}

		case <-heartbeatTicker.C:
			// Send heartbeat comment every 15s
			if _, err := w.Write([]byte(": heartbeat\n\n")); err != nil {
				return
			}
			if f, ok := w.(http.Flusher); ok {
				f.Flush()
			}

		case <-ctx.Done():
			return

		case err := <-streamDone:
			if err != nil {
				slog.DebugContext(ctx, "stream ended", "err", err)
			}
			return
		}
	}
}
