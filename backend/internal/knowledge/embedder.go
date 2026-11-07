package knowledge

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// Config holds the OpenAI embeddings API configuration.
type Config struct {
	OpenAIBaseURL  string
	OpenAIAPIKey   string
	EmbeddingModel string
	Dimensions     int
}

// OpenAIEmbedder implements Embedder using the OpenAI API.
type OpenAIEmbedder struct {
	client     *http.Client
	baseURL    string
	apiKey     string
	model      string
	dimensions int
}

// NewOpenAIEmbedder builds an embedder that calls the OpenAI embeddings endpoint.
func NewOpenAIEmbedder(cfg Config) *OpenAIEmbedder {
	return &OpenAIEmbedder{
		client: &http.Client{
			Timeout: 20 * time.Second,
		},
		baseURL:    cfg.OpenAIBaseURL,
		apiKey:     cfg.OpenAIAPIKey,
		model:      cfg.EmbeddingModel,
		dimensions: cfg.Dimensions,
	}
}

// Embed implements Embedder.
func (e *OpenAIEmbedder) Embed(ctx context.Context, texts []string) ([][]float32, error) {
	if len(texts) == 0 {
		return [][]float32{}, nil
	}

	// Limit batch size to avoid oversized requests.
	const maxBatchSize = 100
	if len(texts) > maxBatchSize {
		return nil, fmt.Errorf("batch size %d exceeds limit of %d", len(texts), maxBatchSize)
	}

	reqBody := map[string]interface{}{
		"model":           e.model,
		"input":           texts,
		"encoding_format": "float",
	}

	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", e.baseURL+"/v1/embeddings", bytes.NewReader(jsonBody))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+e.apiKey)

	resp, err := e.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("do request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read body: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("openai api error: status %d, body: %s", resp.StatusCode, body)
	}

	var result struct {
		Data []struct {
			Embedding []float32 `json:"embedding"`
			Index     int       `json:"index"`
		} `json:"data"`
		Error *struct {
			Message string `json:"message"`
		} `json:"error"`
	}

	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("unmarshal response: %w", err)
	}

	if result.Error != nil {
		return nil, fmt.Errorf("openai error: %s", result.Error.Message)
	}

	if len(result.Data) == 0 {
		return nil, fmt.Errorf("no embeddings in response")
	}

	// Validate dimensions for the first embedding
	if len(result.Data[0].Embedding) != e.dimensions {
		return nil, fmt.Errorf("expected %d dimensions, got %d", e.dimensions, len(result.Data[0].Embedding))
	}

	embeddings := make([][]float32, len(result.Data))
	for i, item := range result.Data {
		embeddings[i] = item.Embedding
	}

	return embeddings, nil
}
