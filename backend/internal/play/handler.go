package play

import (
	"io"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// Handler translates HTTP to service calls.
type Handler struct {
	svc *Service
	cfg *Config
}

// Config holds configuration for the play handler.
type Config struct {
	MuxWebhookSecret string
	MuxThumbnailHost string // default "https://image.mux.com"
}

// NewHandler builds the play HTTP handler.
func NewHandler(svc *Service, cfg *Config) *Handler {
	if cfg.MuxThumbnailHost == "" {
		cfg.MuxThumbnailHost = "https://image.mux.com"
	}
	return &Handler{svc: svc, cfg: cfg}
}

// Routes implements server.Module.
func (h *Handler) Routes(r chi.Router) {
	r = r.Route("/play", func(r chi.Router) {
		// Recordings - public read, auth write
		r.Get("/videos", h.listRecordings)
		r.With(auth.RequireAuth).Post("/videos", h.createRecording)

		r.Get("/videos/{videoId}", h.getRecording)
		r.With(auth.RequireAuth).Patch("/videos/{videoId}", h.updateRecording)
		r.With(auth.RequireAuth).Delete("/videos/{videoId}", h.deleteRecording)
		r.With(auth.RequireAuth).Post("/videos/{videoId}/refresh", h.refreshRecordingStatus)

		// Direct upload
		r.With(auth.RequireAuth).Post("/upload", h.createDirectUpload)

		// Clips - public read, auth write
		r.Get("/clips", h.listClips)
		r.With(auth.RequireAuth).Post("/clips", h.createClip)

		r.Get("/clips/{clipId}", h.getClip)
		r.With(auth.RequireAuth).Delete("/clips/{clipId}", h.deleteClip)

		// Streams - public read, auth write
		r.Get("/streams", h.listStreams)
		r.With(auth.RequireAuth).Post("/streams", h.createStream)

		r.Get("/streams/{streamId}", h.getStream)
		r.With(auth.RequireAuth).Patch("/streams/{streamId}", h.updateStream)
		r.With(auth.RequireAuth).Delete("/streams/{streamId}", h.deleteStream)

		// Webhooks - no auth required, signature verified
		r.Post("/webhooks/mux", h.webhookMux)
	})
}

// listRecordings handles GET /play/videos
func (h *Handler) listRecordings(w http.ResponseWriter, r *http.Request) {
	page, err := httpx.ParsePage(r)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	leagueID := r.URL.Query().Get("league_id")
	status := r.URL.Query().Get("status")
	visibility := r.URL.Query().Get("visibility")

	opts := &ListRecordingsOpts{
		Status:     status,
		Visibility: visibility,
		Limit:      page.Limit,
		Offset:     page.Offset,
	}

	// Anonymous callers only see public/ready
	if _, ok := auth.FromContext(r.Context()); !ok {
		if opts.Visibility == "" {
			opts.Visibility = "public"
		}
		if opts.Status == "" {
			opts.Status = "ready"
		}
	}

	if leagueID != "" {
		if id, err := uuid.Parse(leagueID); err == nil {
			opts.LeagueID = &id
		}
	}

	recordings, count, err := h.svc.ListRecordings(r.Context(), opts)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.List(w, recordings, page.WithTotal(int(count)))
}

// createRecording handles POST /play/videos
func (h *Handler) createRecording(w http.ResponseWriter, r *http.Request) {
	var req RecordingRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	caller, _ := auth.FromContext(r.Context())
	rec, err := h.svc.CreateRecording(r.Context(), caller, &req)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.JSON(w, http.StatusCreated, rec)
}

// getRecording handles GET /play/videos/{videoId}
func (h *Handler) getRecording(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "videoId")
	videoID, err := uuid.Parse(id)
	if err != nil {
		httpx.WriteError(w, r, httpx.ErrBadRequest.Wrap(err))
		return
	}

	rec, err := h.svc.GetRecording(r.Context(), videoID)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.JSON(w, http.StatusOK, rec)
}

// updateRecording handles PATCH /play/videos/{videoId}
func (h *Handler) updateRecording(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "videoId")
	videoID, err := uuid.Parse(id)
	if err != nil {
		httpx.WriteError(w, r, httpx.ErrBadRequest.Wrap(err))
		return
	}

	var req UpdateRecordingRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	caller, _ := auth.FromContext(r.Context())
	rec, err := h.svc.UpdateRecording(r.Context(), caller, videoID, &req)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.JSON(w, http.StatusOK, rec)
}

// deleteRecording handles DELETE /play/videos/{videoId}
func (h *Handler) deleteRecording(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "videoId")
	videoID, err := uuid.Parse(id)
	if err != nil {
		httpx.WriteError(w, r, httpx.ErrBadRequest.Wrap(err))
		return
	}

	caller, _ := auth.FromContext(r.Context())
	err = h.svc.DeleteRecording(r.Context(), caller, videoID)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.NoContent(w)
}

// refreshRecordingStatus handles POST /play/videos/{videoId}/refresh
func (h *Handler) refreshRecordingStatus(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "videoId")
	videoID, err := uuid.Parse(id)
	if err != nil {
		httpx.WriteError(w, r, httpx.ErrBadRequest.Wrap(err))
		return
	}

	caller, _ := auth.FromContext(r.Context())
	rec, err := h.svc.RefreshRecordingStatus(r.Context(), caller, videoID)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.JSON(w, http.StatusOK, rec)
}

// createDirectUpload handles POST /play/upload
func (h *Handler) createDirectUpload(w http.ResponseWriter, r *http.Request) {
	var req RecordingRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	caller, _ := auth.FromContext(r.Context())
	resp, err := h.svc.CreateDirectUpload(r.Context(), caller, &req)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.JSON(w, http.StatusCreated, resp)
}

// listClips handles GET /play/clips
func (h *Handler) listClips(w http.ResponseWriter, r *http.Request) {
	page, err := httpx.ParsePage(r)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	recordingID := r.URL.Query().Get("recording_id")
	matchID := r.URL.Query().Get("match_id")
	leagueID := r.URL.Query().Get("league_id")
	teamID := r.URL.Query().Get("team_id")
	clipType := r.URL.Query().Get("clip_type")
	featured := r.URL.Query().Get("featured")
	sortBy := r.URL.Query().Get("sort_by")
	sortOrder := r.URL.Query().Get("sort_order")

	if sortBy == "" {
		sortBy = "created_at"
	}
	if sortOrder == "" {
		sortOrder = "desc"
	}

	opts := &ListClipsOpts{
		Limit:      page.Limit,
		Offset:     page.Offset,
		SortBy:     sortBy,
		SortOrder:  sortOrder,
		IsFeatured: featured == "true",
	}

	if recordingID != "" {
		if id, err := uuid.Parse(recordingID); err == nil {
			opts.RecordingID = &id
		}
	}
	if matchID != "" {
		if id, err := uuid.Parse(matchID); err == nil {
			opts.MatchID = &id
		}
	}
	if leagueID != "" {
		if id, err := uuid.Parse(leagueID); err == nil {
			opts.LeagueID = &id
		}
	}
	if teamID != "" {
		if id, err := uuid.Parse(teamID); err == nil {
			opts.TeamID = &id
		}
	}
	if clipType != "" {
		opts.ClipType = &clipType
	}

	clips, count, err := h.svc.ListClips(r.Context(), opts)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.List(w, clips, page.WithTotal(int(count)))
}

// createClip handles POST /play/clips
func (h *Handler) createClip(w http.ResponseWriter, r *http.Request) {
	var req ClipRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	caller, _ := auth.FromContext(r.Context())
	clip, err := h.svc.CreateClip(r.Context(), caller, &req)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.JSON(w, http.StatusCreated, clip)
}

// getClip handles GET /play/clips/{clipId}
func (h *Handler) getClip(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "clipId")
	clipID, err := uuid.Parse(id)
	if err != nil {
		httpx.WriteError(w, r, httpx.ErrBadRequest.Wrap(err))
		return
	}

	clip, err := h.svc.GetClip(r.Context(), clipID)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.JSON(w, http.StatusOK, clip)
}

// deleteClip handles DELETE /play/clips/{clipId}
func (h *Handler) deleteClip(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "clipId")
	clipID, err := uuid.Parse(id)
	if err != nil {
		httpx.WriteError(w, r, httpx.ErrBadRequest.Wrap(err))
		return
	}

	caller, _ := auth.FromContext(r.Context())
	err = h.svc.DeleteClip(r.Context(), caller, clipID)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.NoContent(w)
}

// listStreams handles GET /play/streams
func (h *Handler) listStreams(w http.ResponseWriter, r *http.Request) {
	page, err := httpx.ParsePage(r)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	leagueID := r.URL.Query().Get("league_id")
	status := r.URL.Query().Get("status")
	upcoming := r.URL.Query().Get("upcoming")

	opts := &ListStreamsOpts{
		Status:   status,
		Upcoming: upcoming == "true",
		Limit:    page.Limit,
		Offset:   page.Offset,
	}

	if leagueID != "" {
		if id, err := uuid.Parse(leagueID); err == nil {
			opts.LeagueID = &id
		}
	}

	streams, count, err := h.svc.ListStreams(r.Context(), opts)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.List(w, streams, page.WithTotal(int(count)))
}

// createStream handles POST /play/streams
func (h *Handler) createStream(w http.ResponseWriter, r *http.Request) {
	var req StreamRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	caller, _ := auth.FromContext(r.Context())
	stream, err := h.svc.CreateStream(r.Context(), caller, &req)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.JSON(w, http.StatusCreated, stream)
}

// getStream handles GET /play/streams/{streamId}
func (h *Handler) getStream(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "streamId")
	streamID, err := uuid.Parse(id)
	if err != nil {
		httpx.WriteError(w, r, httpx.ErrBadRequest.Wrap(err))
		return
	}

	stream, err := h.svc.GetStream(r.Context(), streamID)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.JSON(w, http.StatusOK, stream)
}

// updateStream handles PATCH /play/streams/{streamId}
func (h *Handler) updateStream(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "streamId")
	streamID, err := uuid.Parse(id)
	if err != nil {
		httpx.WriteError(w, r, httpx.ErrBadRequest.Wrap(err))
		return
	}

	var req UpdateStreamRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	caller, _ := auth.FromContext(r.Context())
	stream, err := h.svc.UpdateStream(r.Context(), caller, streamID, &req)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.JSON(w, http.StatusOK, stream)
}

// deleteStream handles DELETE /play/streams/{streamId}
func (h *Handler) deleteStream(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "streamId")
	streamID, err := uuid.Parse(id)
	if err != nil {
		httpx.WriteError(w, r, httpx.ErrBadRequest.Wrap(err))
		return
	}

	caller, _ := auth.FromContext(r.Context())
	err = h.svc.DeleteStream(r.Context(), caller, streamID)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.NoContent(w)
}

// webhookMux handles POST /play/webhooks/mux
func (h *Handler) webhookMux(w http.ResponseWriter, r *http.Request) {
	// Read body with 1 MiB limit for signature verification
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	bodyBytes, err := io.ReadAll(r.Body)
	if err != nil {
		httpx.WriteError(w, r, httpx.ErrBadRequest.Wrap(err))
		return
	}

	// Verify signature
	signature := r.Header.Get("Mux-Signature")
	if signature == "" {
		httpx.WriteError(w, r, httpx.ErrBadRequest.Wrap(err))
		return
	}

	err = h.svc.ProcessMuxWebhook(r.Context(), signature, string(bodyBytes), h.cfg.MuxWebhookSecret)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.NoContent(w)
}
