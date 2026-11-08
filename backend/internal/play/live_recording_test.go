package play

import (
	"context"
	"testing"
	"time"
)

// A finished live stream's replay is stored (it was ignored before, so
// ended streams had nothing to play).
func TestLiveStreamCompletedStoresReplay(t *testing.T) {
	var gotStream, gotAsset, gotPlayback string
	var gotDuration float64
	repo := &FakeRepository{SetStreamRecordingFunc: func(_ context.Context, stream, asset, playback string, d float64) error {
		gotStream, gotAsset, gotPlayback, gotDuration = stream, asset, playback, d
		return nil
	}}
	svc := NewService(repo, &FakeMuxClient{}, &FakeAuthzChecker{})
	body := `{"type":"video.asset.live_stream_completed","data":{"id":"asset-1","live_stream_id":"ls-9","duration":5400.5,"playback_ids":[{"id":"pb-7","policy":"public"}]}}`

	if err := svc.ProcessMuxWebhook(context.Background(), signMux("whsec", body, time.Now()), body, "whsec"); err != nil {
		t.Fatal(err)
	}
	if gotStream != "ls-9" || gotAsset != "asset-1" || gotPlayback != "pb-7" || gotDuration != 5400.5 {
		t.Fatalf("stored %q %q %q %v", gotStream, gotAsset, gotPlayback, gotDuration)
	}
}
