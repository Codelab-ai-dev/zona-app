package knowledge

import (
	"context"
	"testing"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

func TestService_CreateEmbedding(t *testing.T) {
	leagueID := uuid.New()
	userID := uuid.New()
	defaultEmbedding := makeTestEmbedding(1536)

	tests := []struct {
		name      string
		principal auth.Principal
		req       CreateEmbeddingRequest
		embedder  *fakeEmbedder
		wantErr   bool
	}{
		{
			name: "super_admin can create direct embedding",
			principal: auth.Principal{
				UserID: userID,
				Role:   auth.RoleSuperAdmin,
			},
			req: CreateEmbeddingRequest{
				LeagueID:    leagueID,
				ContentType: "tabla_posiciones",
				ContentText: "Position table content",
			},
			embedder: &fakeEmbedder{
				embeddings: [][]float32{defaultEmbedding},
			},
			wantErr: false,
		},
		{
			name: "non-super_admin rejected",
			principal: auth.Principal{
				UserID: userID,
				Role:   auth.RoleLeagueAdmin,
			},
			req: CreateEmbeddingRequest{
				LeagueID:    leagueID,
				ContentType: "tabla_posiciones",
				ContentText: "Content",
			},
			embedder: &fakeEmbedder{
				embeddings: [][]float32{defaultEmbedding},
			},
			wantErr: true,
		},
		{
			name: "embedder error",
			principal: auth.Principal{
				UserID: userID,
				Role:   auth.RoleSuperAdmin,
			},
			req: CreateEmbeddingRequest{
				LeagueID:    leagueID,
				ContentType: "tabla_posiciones",
				ContentText: "Content",
			},
			embedder: &fakeEmbedder{
				err: httpx.ErrInternal,
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := &fakeRepository{entries: make(map[uuid.UUID]KnowledgeBase)}
			svc := NewService(repo, tt.embedder, &fakeAuthz{canManage: true})

			_, err := svc.CreateEmbedding(context.Background(), tt.principal, tt.req)

			if (err != nil) != tt.wantErr {
				t.Errorf("CreateEmbedding() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
		})
	}
}
