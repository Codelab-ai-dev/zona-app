package play

import (
	"context"
)

// FakeMuxClient is a test fake for VideoProvider.
type FakeMuxClient struct {
	CreateDirectUploadFunc func(ctx context.Context) (uploadID, uploadURL string, err error)
	GetAssetFunc           func(ctx context.Context, assetID string) (playbackID string, duration int, resolution string, err error)
	DeleteAssetFunc        func(ctx context.Context, assetID string) error
	CreateLiveStreamFunc   func(ctx context.Context, title string) (streamID, streamKey, playbackID string, err error)
	GetLiveStreamFunc      func(ctx context.Context, streamID string) (status string, err error)
	DeleteLiveStreamFunc   func(ctx context.Context, streamID string) error
}

func (f *FakeMuxClient) CreateDirectUpload(ctx context.Context) (uploadID, uploadURL string, err error) {
	if f.CreateDirectUploadFunc != nil {
		return f.CreateDirectUploadFunc(ctx)
	}
	return "upload-id", "https://upload.mux.com/test", nil
}

func (f *FakeMuxClient) GetAsset(ctx context.Context, assetID string) (playbackID string, duration int, resolution string, err error) {
	if f.GetAssetFunc != nil {
		return f.GetAssetFunc(ctx, assetID)
	}
	return "playback-id", 3600, "1080p", nil
}

func (f *FakeMuxClient) DeleteAsset(ctx context.Context, assetID string) error {
	if f.DeleteAssetFunc != nil {
		return f.DeleteAssetFunc(ctx, assetID)
	}
	return nil
}

func (f *FakeMuxClient) CreateLiveStream(ctx context.Context, title string) (streamID, streamKey, playbackID string, err error) {
	if f.CreateLiveStreamFunc != nil {
		return f.CreateLiveStreamFunc(ctx, title)
	}
	return "stream-id", "stream-key", "playback-id", nil
}

func (f *FakeMuxClient) GetLiveStream(ctx context.Context, streamID string) (status string, err error) {
	if f.GetLiveStreamFunc != nil {
		return f.GetLiveStreamFunc(ctx, streamID)
	}
	return "idle", nil
}

func (f *FakeMuxClient) DeleteLiveStream(ctx context.Context, streamID string) error {
	if f.DeleteLiveStreamFunc != nil {
		return f.DeleteLiveStreamFunc(ctx, streamID)
	}
	return nil
}
