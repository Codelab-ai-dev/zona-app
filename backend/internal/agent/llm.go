package agent

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// LLMConfig configures an OpenAI-compatible chat completions API (Groq).
type LLMConfig struct {
	BaseURL     string // e.g. https://api.groq.com/openai/v1
	APIKey      string
	Model       string
	MaxTokens   int     // default 500
	Temperature float64 // default 0.7
}

// ChatClient implements LLM over HTTP.
type ChatClient struct {
	cfg    LLMConfig
	client *http.Client
}

// NewChatClient builds an LLM client with a bounded timeout.
func NewChatClient(cfg LLMConfig) *ChatClient {
	if cfg.MaxTokens <= 0 {
		cfg.MaxTokens = 500
	}
	if cfg.Temperature == 0 {
		cfg.Temperature = 0.7
	}
	return &ChatClient{cfg: cfg, client: &http.Client{Timeout: 30 * time.Second}}
}

type chatRequest struct {
	Model       string        `json:"model"`
	Messages    []ChatMessage `json:"messages"`
	MaxTokens   int           `json:"max_tokens"`
	Temperature float64       `json:"temperature"`
}

type chatResponse struct {
	Model   string `json:"model"`
	Choices []struct {
		Message ChatMessage `json:"message"`
	} `json:"choices"`
	Usage struct {
		CompletionTokens int `json:"completion_tokens"`
	} `json:"usage"`
}

// Complete implements LLM.
func (c *ChatClient) Complete(ctx context.Context, messages []ChatMessage) (Completion, error) {
	body, err := json.Marshal(chatRequest{Model: c.cfg.Model, Messages: messages, MaxTokens: c.cfg.MaxTokens, Temperature: c.cfg.Temperature})
	if err != nil {
		return Completion{}, fmt.Errorf("encode chat request: %w", err)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, strings.TrimRight(c.cfg.BaseURL, "/")+"/chat/completions", bytes.NewReader(body))
	if err != nil {
		return Completion{}, fmt.Errorf("build chat request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+c.cfg.APIKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.client.Do(req)
	if err != nil {
		return Completion{}, fmt.Errorf("call llm: %w", err)
	}
	defer resp.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return Completion{}, fmt.Errorf("read llm response: %w", err)
	}
	if resp.StatusCode != http.StatusOK {
		// The body may echo the prompt; keep only a short prefix for logs.
		return Completion{}, fmt.Errorf("llm status %d: %s", resp.StatusCode, truncateRunes(string(raw), 200))
	}

	var out chatResponse
	if err := json.Unmarshal(raw, &out); err != nil {
		return Completion{}, fmt.Errorf("decode llm response: %w", err)
	}
	if len(out.Choices) == 0 || strings.TrimSpace(out.Choices[0].Message.Content) == "" {
		return Completion{}, errors.New("llm returned no content")
	}
	return Completion{
		Text:             strings.TrimSpace(out.Choices[0].Message.Content),
		Model:            out.Model,
		CompletionTokens: out.Usage.CompletionTokens,
	}, nil
}
