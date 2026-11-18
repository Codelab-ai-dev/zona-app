package play

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"testing"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

const (
	playbackID = "pb-secret-123"
	muxThumb   = "https://image.mux.com/" + playbackID + "/thumbnail.jpg"
)

var (
	accessLeague = uuid.New()
	manager      = &auth.Principal{UserID: uuid.New(), Role: auth.RoleLeagueAdmin, IsActive: true}
	stranger     = &auth.Principal{UserID: uuid.New(), Role: auth.RoleTeamOwner, IsActive: true}
)

func accessService(repo *FakeRepository) *Service {
	authz := &FakeAuthzChecker{CanManageLeagueFunc: func(_ context.Context, p auth.Principal, l uuid.UUID) error {
		if p.UserID == manager.UserID && l == accessLeague {
			return nil
		}
		return httpx.ErrForbidden
	}}
	return NewService(repo, &FakeMuxClient{}, authz)
}

func video(visibility string, premium bool) Recording {
	pb, url, thumb := playbackID, "https://stream.mux.com/"+playbackID+".m3u8", muxThumb
	return Recording{ID: uuid.New(), LeagueID: &accessLeague, Status: "ready", Visibility: visibility, IsPremium: premium,
		MuxPlaybackID: &pb, VideoURL: &url, ThumbnailURL: &thumb, Title: "Final"}
}

func leaks(t *testing.T, v any) bool {
	t.Helper()
	b, err := json.Marshal(v)
	if err != nil {
		t.Fatal(err)
	}
	return strings.Contains(string(b), playbackID)
}

// Premium videos keep their metadata public but not their playback (#39).
func TestRecordingPlaybackPolicy(t *testing.T) {
	cases := []struct {
		name       string
		rec        Recording
		caller     *auth.Principal
		hidden     bool
		restricted bool
	}{
		{"public, anonymous", video("public", false), nil, false, false},
		{"unlisted, anonymous (link)", video("unlisted", false), nil, false, false},
		{"premium visibility, anonymous", video("premium", false), nil, false, true},
		{"is_premium public, other user", video("public", true), stranger, false, true},
		{"premium, league manager", video("premium", true), manager, false, false},
		{"private, other user", video("private", false), stranger, true, false},
		{"private, league manager", video("private", false), manager, false, false},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			rec := c.rec
			svc := accessService(&FakeRepository{GetRecordingFunc: func(context.Context, uuid.UUID) (*Recording, error) { r := rec; return &r, nil }})
			got, err := svc.GetRecording(context.Background(), c.caller, rec.ID)
			if c.hidden {
				if !errors.Is(err, httpx.ErrNotFound) {
					t.Fatalf("err = %v, want 404", err)
				}
				return
			}
			if err != nil {
				t.Fatal(err)
			}
			if got.Title != "Final" {
				t.Fatalf("metadata missing: %+v", got)
			}
			if leaked := leaks(t, got); leaked == c.restricted || got.PlaybackRestricted != c.restricted {
				t.Fatalf("leaks playback = %v, playback_restricted = %v, want restricted %v", leaked, got.PlaybackRestricted, c.restricted)
			}
		})
	}
}

func TestListRecordingsRedactsPremiumForNonManagers(t *testing.T) {
	free, paid := video("public", false), video("public", true)
	repo := &FakeRepository{ListRecordingsFunc: func(context.Context, *ListRecordingsOpts) ([]*Recording, int64, error) {
		a, b := free, paid
		return []*Recording{&a, &b}, 2, nil
	}}
	recs, _, err := accessService(repo).ListRecordings(context.Background(), nil, &ListRecordingsOpts{})
	if err != nil {
		t.Fatal(err)
	}
	if recs[0].MuxPlaybackID == nil || recs[1].MuxPlaybackID != nil || !recs[1].PlaybackRestricted {
		t.Fatalf("free playback %v, premium playback %v", recs[0].MuxPlaybackID, recs[1].MuxPlaybackID)
	}
	recs, _, _ = accessService(repo).ListRecordings(context.Background(), manager, &ListRecordingsOpts{LeagueID: &accessLeague})
	if recs[1].MuxPlaybackID == nil {
		t.Fatal("manager lost premium playback")
	}
}

// Clips follow their recording's rules.
func TestClipPlaybackPolicy(t *testing.T) {
	clipOf := func(rec *Recording) *Clip {
		pb, thumb := playbackID, muxThumb
		c := &Clip{ID: uuid.New(), LeagueID: &accessLeague, MuxPlaybackID: &pb, ThumbnailURL: &thumb, Title: "Gol"}
		if rec != nil {
			c.RecordingID = &rec.ID
		}
		return c
	}
	private, premium, public := video("private", false), video("premium", false), video("public", false)
	recs := map[uuid.UUID]Recording{private.ID: private, premium.ID: premium, public.ID: public}

	cases := []struct {
		name       string
		rec        *Recording
		caller     *auth.Principal
		hidden     bool
		restricted bool
	}{
		{"clip of a public video", &public, nil, false, false},
		{"clip without a video", nil, nil, false, false},
		{"clip of a premium video, anonymous", &premium, nil, false, true},
		{"clip of a premium video, manager", &premium, manager, false, false},
		{"clip of a private video, other user", &private, stranger, true, false},
		{"clip of a private video, manager", &private, manager, false, false},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			clip := clipOf(c.rec)
			svc := accessService(&FakeRepository{
				GetClipFunc:      func(context.Context, uuid.UUID) (*Clip, error) { cp := *clip; return &cp, nil },
				GetRecordingFunc: func(_ context.Context, id uuid.UUID) (*Recording, error) { r := recs[id]; return &r, nil },
			})
			got, err := svc.GetClip(context.Background(), c.caller, clip.ID)
			if c.hidden {
				if !errors.Is(err, httpx.ErrNotFound) {
					t.Fatalf("err = %v, want 404", err)
				}
				return
			}
			if err != nil {
				t.Fatal(err)
			}
			if leaked := leaks(t, got); leaked == c.restricted || got.PlaybackRestricted != c.restricted {
				t.Fatalf("leaks playback = %v, restricted = %v, want restricted %v", leaked, got.PlaybackRestricted, c.restricted)
			}
		})
	}

	t.Run("lists: playable only for non-managers", func(t *testing.T) {
		var playable []bool
		svc := accessService(&FakeRepository{ListClipsFunc: func(_ context.Context, o *ListClipsOpts) ([]*Clip, int64, error) {
			playable = append(playable, o.PlayableOnly)
			return nil, 0, nil
		}})
		_, _, _ = svc.ListClips(context.Background(), nil, &ListClipsOpts{})
		_, _, _ = svc.ListClips(context.Background(), stranger, &ListClipsOpts{LeagueID: &accessLeague})
		_, _, _ = svc.ListClips(context.Background(), manager, &ListClipsOpts{LeagueID: &accessLeague})
		if len(playable) != 3 || !playable[0] || !playable[1] || playable[2] {
			t.Fatalf("PlayableOnly per call = %v, want [true true false]", playable)
		}
	})
}

// Pay-per-view streams keep their metadata public but not their playback.
func TestStreamPlaybackPolicy(t *testing.T) {
	stream := func(ppv bool) *Stream {
		pb, rpb := playbackID, playbackID+"-replay"
		return &Stream{ID: uuid.New(), LeagueID: &accessLeague, Title: "En vivo", IsPayPerView: ppv, MuxPlaybackID: &pb, RecordingPlaybackID: &rpb}
	}
	for _, c := range []struct {
		name       string
		ppv        bool
		caller     *auth.Principal
		restricted bool
	}{
		{"free stream, anonymous", false, nil, false},
		{"pay-per-view, anonymous", true, nil, true},
		{"pay-per-view, other user", true, stranger, true},
		{"pay-per-view, league manager", true, manager, false},
	} {
		t.Run(c.name, func(t *testing.T) {
			st := stream(c.ppv)
			svc := accessService(&FakeRepository{
				GetStreamFunc: func(context.Context, uuid.UUID) (*Stream, error) { cp := *st; return &cp, nil },
				ListStreamsFunc: func(context.Context, *ListStreamsOpts) ([]*Stream, int64, error) {
					cp := *st
					return []*Stream{&cp}, 1, nil
				},
			})
			got, err := svc.GetStream(context.Background(), c.caller, st.ID)
			if err != nil {
				t.Fatal(err)
			}
			list, _, err := svc.ListStreams(context.Background(), c.caller, nil)
			if err != nil {
				t.Fatal(err)
			}
			for where, v := range map[string]*Stream{"detail": got, "list": list[0]} {
				if leaked := leaks(t, v); leaked == c.restricted || v.PlaybackRestricted != c.restricted {
					t.Errorf("%s: leaks %v, restricted %v, want restricted %v", where, leaked, v.PlaybackRestricted, c.restricted)
				}
			}
		})
	}
}

func TestRedactKeepsOwnThumbnails(t *testing.T) {
	own := "https://cdn.zona.example/thumbs/final.jpg"
	r := Recording{ThumbnailURL: &own}
	redactRecording(&r)
	if r.ThumbnailURL == nil || *r.ThumbnailURL != own {
		t.Fatal("a non-Mux thumbnail does not reveal playback and should stay")
	}
}
