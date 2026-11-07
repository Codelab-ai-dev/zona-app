package play

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// MuxConfig holds Mux API credentials.
type MuxConfig struct {
	TokenID     string
	TokenSecret string
}

// MuxClient implements VideoProvider using Mux HTTP API.
type MuxClient struct {
	client *http.Client
	config MuxConfig
	apiURL string
}

// NewMuxClient builds a Mux HTTP client.
func NewMuxClient(config MuxConfig) *MuxClient {
	return &MuxClient{
		client: &http.Client{
			Timeout: 15 * time.Second,
		},
		config: config,
		apiURL: "https://api.mux.com",
	}
}

// CreateDirectUpload creates a Mux direct upload URL.
func (m *MuxClient) CreateDirectUpload(ctx context.Context) (uploadID, uploadURL string, err error) {
	reqBody := map[string]interface{}{
		"cors_origin": "https://zona.app",
	}

	body, err := json.Marshal(reqBody)
	if err != nil {
		return "", "", err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", m.apiURL+"/video/v1/uploads", bytes.NewReader(body))
	if err != nil {
		return "", "", err
	}

	m.setAuth(req)
	req.Header.Set("Content-Type", "application/json")

	resp, err := m.client.Do(req)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", "", err
	}

	if resp.StatusCode != http.StatusCreated {
		return "", "", fmt.Errorf("mux upload creation failed: %d", resp.StatusCode)
	}

	data, ok := result["data"].(map[string]interface{})
	if !ok {
		return "", "", fmt.Errorf("invalid mux response")
	}

	id, _ := data["id"].(string)
	url, _ := data["url"].(string)

	return id, url, nil
}

// GetAsset retrieves asset info from Mux.
func (m *MuxClient) GetAsset(ctx context.Context, assetID string) (playbackID string, duration int, resolution string, err error) {
	req, err := http.NewRequestWithContext(ctx, "GET", m.apiURL+"/video/v1/assets/"+assetID, nil)
	if err != nil {
		return "", 0, "", err
	}

	m.setAuth(req)

	resp, err := m.client.Do(req)
	if err != nil {
		return "", 0, "", err
	}
	defer resp.Body.Close()

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", 0, "", err
	}

	if resp.StatusCode != http.StatusOK {
		return "", 0, "", fmt.Errorf("mux get asset failed: %d", resp.StatusCode)
	}

	data, ok := result["data"].(map[string]interface{})
	if !ok {
		return "", 0, "", fmt.Errorf("invalid mux response")
	}

	// Extract playback ID from playback_ids array
	playbackIDs, _ := data["playback_ids"].([]interface{})
	if len(playbackIDs) > 0 {
		pbID, _ := playbackIDs[0].(map[string]interface{})
		playbackID, _ = pbID["id"].(string)
	}

	// Extract duration
	if dur, ok := data["duration"].(float64); ok {
		duration = int(dur)
	}

	// Extract resolution
	resolution, _ = data["max_stored_resolution"].(string)
	if resolution == "" {
		resolution = "1080p"
	}

	return playbackID, duration, resolution, nil
}

// DeleteAsset deletes an asset from Mux.
func (m *MuxClient) DeleteAsset(ctx context.Context, assetID string) error {
	req, err := http.NewRequestWithContext(ctx, "DELETE", m.apiURL+"/video/v1/assets/"+assetID, nil)
	if err != nil {
		return err
	}

	m.setAuth(req)

	resp, err := m.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusNoContent && resp.StatusCode != http.StatusOK {
		return fmt.Errorf("mux delete asset failed: %d", resp.StatusCode)
	}

	return nil
}

// CreateLiveStream creates a live stream on Mux.
func (m *MuxClient) CreateLiveStream(ctx context.Context, title string) (streamID, streamKey, playbackID string, err error) {
	reqBody := map[string]interface{}{
		"playback_policy": []string{"public"},
	}

	body, err := json.Marshal(reqBody)
	if err != nil {
		return "", "", "", err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", m.apiURL+"/video/v1/live-streams", bytes.NewReader(body))
	if err != nil {
		return "", "", "", err
	}

	m.setAuth(req)
	req.Header.Set("Content-Type", "application/json")

	resp, err := m.client.Do(req)
	if err != nil {
		return "", "", "", err
	}
	defer resp.Body.Close()

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", "", "", err
	}

	if resp.StatusCode != http.StatusCreated {
		return "", "", "", fmt.Errorf("mux live stream creation failed: %d", resp.StatusCode)
	}

	data, ok := result["data"].(map[string]interface{})
	if !ok {
		return "", "", "", fmt.Errorf("invalid mux response")
	}

	streamID, _ = data["id"].(string)

	// Extract stream key
	if input, ok := data["input"].([]interface{}); ok && len(input) > 0 {
		inputData, _ := input[0].(map[string]interface{})
		streamKey, _ = inputData["stream_key"].(string)
	}

	// Extract playback ID
	if playbackIDs, ok := data["playback_ids"].([]interface{}); ok && len(playbackIDs) > 0 {
		pbID, _ := playbackIDs[0].(map[string]interface{})
		playbackID, _ = pbID["id"].(string)
	}

	return streamID, streamKey, playbackID, nil
}

// GetLiveStream retrieves live stream info from Mux.
func (m *MuxClient) GetLiveStream(ctx context.Context, streamID string) (status string, err error) {
	req, err := http.NewRequestWithContext(ctx, "GET", m.apiURL+"/video/v1/live-streams/"+streamID, nil)
	if err != nil {
		return "", err
	}

	m.setAuth(req)

	resp, err := m.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("mux get live stream failed: %d", resp.StatusCode)
	}

	data, ok := result["data"].(map[string]interface{})
	if !ok {
		return "", fmt.Errorf("invalid mux response")
	}

	status, _ = data["status"].(string)
	return status, nil
}

// DeleteLiveStream deletes a live stream from Mux.
func (m *MuxClient) DeleteLiveStream(ctx context.Context, streamID string) error {
	req, err := http.NewRequestWithContext(ctx, "DELETE", m.apiURL+"/video/v1/live-streams/"+streamID, nil)
	if err != nil {
		return err
	}

	m.setAuth(req)

	resp, err := m.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusNoContent && resp.StatusCode != http.StatusOK {
		return fmt.Errorf("mux delete live stream failed: %d", resp.StatusCode)
	}

	return nil
}

// setAuth sets HTTP Basic Authentication header using Mux token ID and secret.
func (m *MuxClient) setAuth(req *http.Request) {
	auth := m.config.TokenID + ":" + m.config.TokenSecret
	encoded := base64.StdEncoding.EncodeToString([]byte(auth))
	req.Header.Set("Authorization", "Basic "+encoded)
}
