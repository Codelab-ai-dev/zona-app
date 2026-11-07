package play

import (
	"context"
	"testing"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// FakeRepository is a test fake for Repository.
type FakeRepository struct {
	UpdateRecordingFromMuxAssetFunc func(ctx context.Context, assetID, playbackID string, duration int, resolution string) error
	GetRecordingFunc                func(ctx context.Context, id uuid.UUID) (*Recording, error)
	CreateRecordingFunc             func(ctx context.Context, req *RecordingRequest, uploadedBy uuid.UUID) (*Recording, error)
	UpdateRecordingFunc             func(ctx context.Context, id uuid.UUID, req *UpdateRecordingRequest) (*Recording, error)
	DeleteRecordingFunc             func(ctx context.Context, id uuid.UUID) error
	ListRecordingsFunc              func(ctx context.Context, opts *ListRecordingsOpts) ([]*Recording, int64, error)
	GetClipFunc                     func(ctx context.Context, id uuid.UUID) (*Clip, error)
	CreateClipFunc                  func(ctx context.Context, req *ClipRequest, createdBy uuid.UUID) (*Clip, error)
	ListClipsFunc                   func(ctx context.Context, opts *ListClipsOpts) ([]*Clip, int64, error)
	DeleteClipFunc                  func(ctx context.Context, id uuid.UUID) error
	GetStreamFunc                   func(ctx context.Context, id uuid.UUID) (*Stream, error)
	CreateStreamFunc                func(ctx context.Context, req *StreamRequest, broadcasterID uuid.UUID) (*Stream, error)
	ListStreamsFunc                 func(ctx context.Context, opts *ListStreamsOpts) ([]*Stream, int64, error)
	UpdateStreamFunc                func(ctx context.Context, id uuid.UUID, req *UpdateStreamRequest) (*Stream, error)
	DeleteStreamFunc                func(ctx context.Context, id uuid.UUID) error
	UpdateRecordingErrorFunc        func(ctx context.Context, assetID string, errMsg string) error
}

func (f *FakeRepository) GetRecording(ctx context.Context, id uuid.UUID) (*Recording, error) {
	if f.GetRecordingFunc != nil {
		return f.GetRecordingFunc(ctx, id)
	}
	return nil, nil
}

func (f *FakeRepository) CreateRecording(ctx context.Context, req *RecordingRequest, uploadedBy uuid.UUID) (*Recording, error) {
	if f.CreateRecordingFunc != nil {
		return f.CreateRecordingFunc(ctx, req, uploadedBy)
	}
	return &Recording{ID: uuid.New(), Title: req.Title, UploadedBy: uploadedBy}, nil
}

func (f *FakeRepository) UpdateRecording(ctx context.Context, id uuid.UUID, req *UpdateRecordingRequest) (*Recording, error) {
	if f.UpdateRecordingFunc != nil {
		return f.UpdateRecordingFunc(ctx, id, req)
	}
	return &Recording{ID: id}, nil
}

func (f *FakeRepository) DeleteRecording(ctx context.Context, id uuid.UUID) error {
	if f.DeleteRecordingFunc != nil {
		return f.DeleteRecordingFunc(ctx, id)
	}
	return nil
}

func (f *FakeRepository) ListRecordings(ctx context.Context, opts *ListRecordingsOpts) ([]*Recording, int64, error) {
	if f.ListRecordingsFunc != nil {
		return f.ListRecordingsFunc(ctx, opts)
	}
	return []*Recording{}, 0, nil
}

func (f *FakeRepository) GetClip(ctx context.Context, id uuid.UUID) (*Clip, error) {
	if f.GetClipFunc != nil {
		return f.GetClipFunc(ctx, id)
	}
	return nil, nil
}

func (f *FakeRepository) CreateClip(ctx context.Context, req *ClipRequest, createdBy uuid.UUID) (*Clip, error) {
	if f.CreateClipFunc != nil {
		return f.CreateClipFunc(ctx, req, createdBy)
	}
	return &Clip{ID: uuid.New(), Title: req.Title, CreatedBy: createdBy}, nil
}

func (f *FakeRepository) ListClips(ctx context.Context, opts *ListClipsOpts) ([]*Clip, int64, error) {
	if f.ListClipsFunc != nil {
		return f.ListClipsFunc(ctx, opts)
	}
	return []*Clip{}, 0, nil
}

func (f *FakeRepository) DeleteClip(ctx context.Context, id uuid.UUID) error {
	if f.DeleteClipFunc != nil {
		return f.DeleteClipFunc(ctx, id)
	}
	return nil
}

func (f *FakeRepository) GetStream(ctx context.Context, id uuid.UUID) (*Stream, error) {
	if f.GetStreamFunc != nil {
		return f.GetStreamFunc(ctx, id)
	}
	return nil, nil
}

func (f *FakeRepository) CreateStream(ctx context.Context, req *StreamRequest, broadcasterID uuid.UUID) (*Stream, error) {
	if f.CreateStreamFunc != nil {
		return f.CreateStreamFunc(ctx, req, broadcasterID)
	}
	return &Stream{ID: uuid.New(), Title: req.Title, BroadcasterID: broadcasterID}, nil
}

func (f *FakeRepository) ListStreams(ctx context.Context, opts *ListStreamsOpts) ([]*Stream, int64, error) {
	if f.ListStreamsFunc != nil {
		return f.ListStreamsFunc(ctx, opts)
	}
	return []*Stream{}, 0, nil
}

func (f *FakeRepository) UpdateStream(ctx context.Context, id uuid.UUID, req *UpdateStreamRequest) (*Stream, error) {
	if f.UpdateStreamFunc != nil {
		return f.UpdateStreamFunc(ctx, id, req)
	}
	return &Stream{ID: id}, nil
}

func (f *FakeRepository) DeleteStream(ctx context.Context, id uuid.UUID) error {
	if f.DeleteStreamFunc != nil {
		return f.DeleteStreamFunc(ctx, id)
	}
	return nil
}

func (f *FakeRepository) UpdateRecordingFromMuxUpload(ctx context.Context, uploadID string, muxAssetID string) error {
	return nil
}

func (f *FakeRepository) UpdateRecordingFromMuxAsset(ctx context.Context, assetID, playbackID string, duration int, resolution string) error {
	if f.UpdateRecordingFromMuxAssetFunc != nil {
		return f.UpdateRecordingFromMuxAssetFunc(ctx, assetID, playbackID, duration, resolution)
	}
	return nil
}

func (f *FakeRepository) UpdateRecordingError(ctx context.Context, assetID string, errMsg string) error {
	if f.UpdateRecordingErrorFunc != nil {
		return f.UpdateRecordingErrorFunc(ctx, assetID, errMsg)
	}
	return nil
}

func (f *FakeRepository) UpdateStreamFromMuxLive(ctx context.Context, streamID, newStatus string) error {
	return nil
}

// FakeAuthzChecker is a test fake for Checker.
type FakeAuthzChecker struct {
	CanManageLeagueFunc func(ctx context.Context, p auth.Principal, leagueID uuid.UUID) error
	CanManageMatchFunc  func(ctx context.Context, p auth.Principal, matchID uuid.UUID) error
}

func (f *FakeAuthzChecker) CanManageLeague(ctx context.Context, p auth.Principal, leagueID uuid.UUID) error {
	if f.CanManageLeagueFunc != nil {
		return f.CanManageLeagueFunc(ctx, p, leagueID)
	}
	return nil
}

func (f *FakeAuthzChecker) CanManageTournament(ctx context.Context, p auth.Principal, tournamentID uuid.UUID) error {
	return nil
}

func (f *FakeAuthzChecker) CanManageMatch(ctx context.Context, p auth.Principal, matchID uuid.UUID) error {
	if f.CanManageMatchFunc != nil {
		return f.CanManageMatchFunc(ctx, p, matchID)
	}
	return nil
}

func (f *FakeAuthzChecker) CanManageTeam(ctx context.Context, p auth.Principal, teamID uuid.UUID) error {
	return nil
}

func (f *FakeAuthzChecker) CanManagePlayer(ctx context.Context, p auth.Principal, playerID uuid.UUID) error {
	return nil
}

func TestCreateRecording_Happy(t *testing.T) {
	repo := &FakeRepository{
		CreateRecordingFunc: func(ctx context.Context, req *RecordingRequest, uploadedBy uuid.UUID) (*Recording, error) {
			return &Recording{
				ID:         uuid.New(),
				Title:      req.Title,
				UploadedBy: uploadedBy,
				Status:     "pending",
			}, nil
		},
	}
	authz := &FakeAuthzChecker{}
	provider := &FakeMuxClient{}
	svc := NewService(repo, provider, authz)

	ctx := context.Background()
	caller := auth.Principal{UserID: uuid.New(), Role: auth.RoleSuperAdmin}
	leagueID := uuid.New()
	req := &RecordingRequest{Title: "Test Recording", LeagueID: &leagueID}

	rec, err := svc.CreateRecording(ctx, caller, req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if rec == nil {
		t.Fatal("expected recording, got nil")
	}
	if rec.Title != "Test Recording" {
		t.Errorf("expected title 'Test Recording', got %q", rec.Title)
	}
}

func TestCreateRecording_NoAuth(t *testing.T) {
	repo := &FakeRepository{}
	authz := &FakeAuthzChecker{
		CanManageLeagueFunc: func(ctx context.Context, p auth.Principal, leagueID uuid.UUID) error {
			return httpx.ErrForbidden
		},
	}
	provider := &FakeMuxClient{}
	svc := NewService(repo, provider, authz)

	ctx := context.Background()
	caller := auth.Principal{UserID: uuid.New(), Role: auth.RolePublic}
	leagueID := uuid.New()
	req := &RecordingRequest{
		Title:    "Test Recording",
		LeagueID: &leagueID,
	}

	_, err := svc.CreateRecording(ctx, caller, req)
	if err != httpx.ErrForbidden {
		t.Errorf("expected ErrForbidden, got %v", err)
	}
}

func TestGetRecording_NotFound(t *testing.T) {
	repo := &FakeRepository{
		GetRecordingFunc: func(ctx context.Context, id uuid.UUID) (*Recording, error) {
			return nil, nil
		},
	}
	authz := &FakeAuthzChecker{}
	provider := &FakeMuxClient{}
	svc := NewService(repo, provider, authz)

	ctx := context.Background()
	_, err := svc.GetRecording(ctx, uuid.New())
	if err != httpx.ErrNotFound {
		t.Errorf("expected ErrNotFound, got %v", err)
	}
}

func TestDeleteRecording_Happy(t *testing.T) {
	leagueID := uuid.New()
	repo := &FakeRepository{
		GetRecordingFunc: func(ctx context.Context, id uuid.UUID) (*Recording, error) {
			return &Recording{
				ID:       id,
				LeagueID: &leagueID,
			}, nil
		},
		DeleteRecordingFunc: func(ctx context.Context, id uuid.UUID) error {
			return nil
		},
	}
	authz := &FakeAuthzChecker{
		CanManageLeagueFunc: func(ctx context.Context, p auth.Principal, id uuid.UUID) error {
			return nil // Authorized
		},
	}
	provider := &FakeMuxClient{
		DeleteAssetFunc: func(ctx context.Context, assetID string) error {
			return nil
		},
	}
	svc := NewService(repo, provider, authz)

	ctx := context.Background()
	caller := auth.Principal{UserID: uuid.New(), Role: auth.RoleSuperAdmin}
	err := svc.DeleteRecording(ctx, caller, uuid.New())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestCreateClip_Happy(t *testing.T) {
	repo := &FakeRepository{
		CreateClipFunc: func(ctx context.Context, req *ClipRequest, createdBy uuid.UUID) (*Clip, error) {
			return &Clip{
				ID:        uuid.New(),
				Title:     req.Title,
				CreatedBy: createdBy,
			}, nil
		},
	}
	authz := &FakeAuthzChecker{}
	provider := &FakeMuxClient{}
	svc := NewService(repo, provider, authz)

	ctx := context.Background()
	caller := auth.Principal{UserID: uuid.New()}
	req := &ClipRequest{
		Title:        "Test Clip",
		StartSeconds: 0,
		EndSeconds:   30,
	}

	clip, err := svc.CreateClip(ctx, caller, req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if clip.Title != "Test Clip" {
		t.Errorf("expected title 'Test Clip', got %q", clip.Title)
	}
}

func TestListRecordings_Happy(t *testing.T) {
	recordings := []*Recording{
		{ID: uuid.New(), Title: "Video 1"},
		{ID: uuid.New(), Title: "Video 2"},
	}
	repo := &FakeRepository{
		ListRecordingsFunc: func(ctx context.Context, opts *ListRecordingsOpts) ([]*Recording, int64, error) {
			return recordings, 2, nil
		},
	}
	authz := &FakeAuthzChecker{}
	provider := &FakeMuxClient{}
	svc := NewService(repo, provider, authz)

	ctx := context.Background()
	recs, count, err := svc.ListRecordings(ctx, nil, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if count != 2 {
		t.Errorf("expected count 2, got %d", count)
	}
	if len(recs) != 2 {
		t.Errorf("expected 2 recordings, got %d", len(recs))
	}
}

// TestListRecordingsForcesPublicForNonManagers guards the visibility leak where
// ?visibility=private was honoured for anonymous callers.
func TestListRecordingsForcesPublicForNonManagers(t *testing.T) {
	var seen *ListRecordingsOpts
	repo := &FakeRepository{ListRecordingsFunc: func(_ context.Context, opts *ListRecordingsOpts) ([]*Recording, int64, error) {
		seen = opts
		return nil, 0, nil
	}}
	league := uuid.New()
	tests := []struct {
		name       string
		caller     *auth.Principal
		canManage  bool
		wantForced bool
	}{
		{"anonymous", nil, false, true},
		{"authenticated non-manager", &auth.Principal{UserID: uuid.New(), Role: auth.RoleTeamOwner}, false, true},
		{"league manager", &auth.Principal{UserID: uuid.New(), Role: auth.RoleLeagueAdmin}, true, false},
		{"super admin", &auth.Principal{UserID: uuid.New(), Role: auth.RoleSuperAdmin}, false, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			authz := &FakeAuthzChecker{}
			if !tt.canManage {
				authz.CanManageLeagueFunc = func(context.Context, auth.Principal, uuid.UUID) error { return httpx.ErrForbidden }
			}
			svc := NewService(repo, &FakeMuxClient{}, authz)
			_, _, _ = svc.ListRecordings(context.Background(), tt.caller, &ListRecordingsOpts{LeagueID: &league, Visibility: "private", Status: "processing"})
			forced := seen.Visibility == "public" && seen.Status == "ready"
			if forced != tt.wantForced {
				t.Fatalf("visibility=%s status=%s, forced=%v want %v", seen.Visibility, seen.Status, forced, tt.wantForced)
			}
		})
	}
}

func TestEscapeLike(t *testing.T) {
	if got := escapeLike(`50%_off\`); got != `50\%\_off\\` {
		t.Fatalf("escapeLike = %q", got)
	}
}
