package knowledge

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestOpenAIEmbedder_Embed(t *testing.T) {
	tests := []struct {
		name       string
		texts      []string
		serverResp func() (status int, body []byte)
		wantErr    bool
		wantLen    int
	}{
		{
			name:  "empty input",
			texts: []string{},
			serverResp: func() (int, []byte) {
				return http.StatusOK, []byte(`{"data":[]}`)
			},
			wantErr: false,
			wantLen: 0,
		},
		{
			name:  "single text",
			texts: []string{"Hello world"},
			serverResp: func() (int, []byte) {
				resp := map[string]interface{}{
					"data": []map[string]interface{}{
						{
							"embedding": makeTestEmbedding(1536),
							"index":     0,
						},
					},
				}
				b, _ := json.Marshal(resp)
				return http.StatusOK, b
			},
			wantErr: false,
			wantLen: 1,
		},
		{
			name:  "multiple texts",
			texts: []string{"Hello", "World"},
			serverResp: func() (int, []byte) {
				resp := map[string]interface{}{
					"data": []map[string]interface{}{
						{
							"embedding": makeTestEmbedding(1536),
							"index":     0,
						},
						{
							"embedding": makeTestEmbedding(1536),
							"index":     1,
						},
					},
				}
				b, _ := json.Marshal(resp)
				return http.StatusOK, b
			},
			wantErr: false,
			wantLen: 2,
		},
		{
			name:  "api error",
			texts: []string{"Hello"},
			serverResp: func() (int, []byte) {
				return http.StatusUnauthorized, []byte(`{"error":{"message":"Invalid API key"}}`)
			},
			wantErr: true,
		},
		{
			name:  "wrong dimension",
			texts: []string{"Hello"},
			serverResp: func() (int, []byte) {
				resp := map[string]interface{}{
					"data": []map[string]interface{}{
						{
							"embedding": makeTestEmbedding(512), // Wrong dimension
							"index":     0,
						},
					},
				}
				b, _ := json.Marshal(resp)
				return http.StatusOK, b
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			status, body := tt.serverResp()
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(status)
				w.Write(body)
			}))
			defer server.Close()

			emb := NewOpenAIEmbedder(Config{
				OpenAIBaseURL:  server.URL,
				OpenAIAPIKey:   "test-key",
				EmbeddingModel: "text-embedding-3-small",
				Dimensions:     1536,
			})

			result, err := emb.Embed(context.Background(), tt.texts)

			if (err != nil) != tt.wantErr {
				t.Errorf("Embed() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if err == nil && len(result) != tt.wantLen {
				t.Errorf("Embed() got %d embeddings, want %d", len(result), tt.wantLen)
			}
		})
	}
}

func TestOpenAIEmbedder_BatchLimit(t *testing.T) {
	emb := NewOpenAIEmbedder(Config{
		OpenAIBaseURL:  "http://localhost",
		OpenAIAPIKey:   "test-key",
		EmbeddingModel: "text-embedding-3-small",
		Dimensions:     1536,
	})

	texts := make([]string, 101) // Exceeds batch limit
	for i := range texts {
		texts[i] = "text"
	}

	_, err := emb.Embed(context.Background(), texts)
	if err == nil {
		t.Errorf("Embed() expected error for oversized batch, got nil")
	}
}

func makeTestEmbedding(dims int) []float32 {
	embedding := make([]float32, dims)
	for i := range embedding {
		embedding[i] = 0.1
	}
	return embedding
}

func TestEmbeddingToVector(t *testing.T) {
	tests := []struct {
		name      string
		embedding []float32
		want      string
	}{
		{
			name:      "empty",
			embedding: []float32{},
			want:      "[]",
		},
		{
			name:      "single value",
			embedding: []float32{0.5},
			want:      "[0.5]",
		},
		{
			name:      "multiple values",
			embedding: []float32{0.1, 0.2, 0.3},
			want:      "[0.1,0.2,0.3]",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := embeddingToVector(tt.embedding)
			if got != tt.want {
				t.Errorf("embeddingToVector() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestParseVectorEmbedding(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		wantErr bool
		wantLen int
	}{
		{
			name:    "empty brackets",
			input:   "[]",
			wantErr: false,
			wantLen: 0,
		},
		{
			name:    "single value",
			input:   "[0.5]",
			wantErr: false,
			wantLen: 1,
		},
		{
			name:    "multiple values",
			input:   "[0.1,0.2,0.3]",
			wantErr: false,
			wantLen: 3,
		},
		{
			name:    "with spaces",
			input:   "[ 0.1 , 0.2 , 0.3 ]",
			wantErr: false,
			wantLen: 3,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := parseVectorEmbedding(tt.input)
			if (err != nil) != tt.wantErr {
				t.Errorf("parseVectorEmbedding() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if len(got) != tt.wantLen {
				t.Errorf("parseVectorEmbedding() got %d elements, want %d", len(got), tt.wantLen)
			}
		})
	}
}
