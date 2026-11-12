package httpx

import (
	"encoding/json"
	"testing"
	"time"
)

func TestDateJSON(t *testing.T) {
	tests := map[string]string{
		`"2000-01-31"`:                "2000-01-31",
		`"2000-01-31T00:00:00Z"`:      "2000-01-31",
		`"2000-01-31T23:30:00-06:00"`: "2000-02-01", // normalised to the UTC day
	}
	for in, want := range tests {
		var d Date
		if err := json.Unmarshal([]byte(in), &d); err != nil {
			t.Fatalf("%s: %v", in, err)
		}
		out, _ := json.Marshal(d)
		if string(out) != `"`+want+`"` {
			t.Errorf("%s → %s, want %q", in, out, want)
		}
	}
	for _, bad := range []string{`"31/01/2000"`, `20000131`, `""`} {
		var d Date
		if err := json.Unmarshal([]byte(bad), &d); err == nil {
			t.Errorf("%s should be rejected", bad)
		}
	}
}

func TestDateScanValue(t *testing.T) {
	var d Date
	if err := d.Scan(time.Date(1999, 12, 31, 0, 0, 0, 0, time.UTC)); err != nil {
		t.Fatal(err)
	}
	v, _ := d.Value()
	if v != "1999-12-31" {
		t.Fatalf("Value = %v", v)
	}
}
