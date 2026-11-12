//go:build integration

package teams

import (
	"context"
	"testing"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/testdb"
)

func TestPlayerVerification_Integration(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	repo := NewPGRepository(pool)
	ctx := context.Background()
	key := "player_document/" + f.HomePlayerID.String() + "/" + uuid.NewString() + ".pdf"

	v, err := repo.SetPlayerVerification(ctx, f.HomePlayerID, VerifyPlayerRequest{Verified: true, DocumentKey: &key}, f.LeagueAdminID)
	if err != nil {
		t.Fatalf("verify: %v", err)
	}
	if !v.Verified || v.VerifiedAt == nil || v.VerifiedBy == nil || *v.VerifiedBy != f.LeagueAdminID || v.Method == nil || *v.Method != "manual" || v.DocumentKey == nil || *v.DocumentKey != key {
		t.Fatalf("unexpected verification %+v", v)
	}

	v, err = repo.SetPlayerVerification(ctx, f.HomePlayerID, VerifyPlayerRequest{Verified: false}, f.LeagueAdminID)
	if err != nil {
		t.Fatalf("unverify: %v", err)
	}
	if v.Verified || v.VerifiedAt != nil || v.Method != nil || v.DocumentKey == nil {
		t.Fatalf("unverify should clear who/when/how but keep the document: %+v", v)
	}

	got, err := repo.GetPlayerVerification(ctx, f.HomePlayerID)
	if err != nil || got.Verified {
		t.Fatalf("get = %+v, %v", got, err)
	}
}
