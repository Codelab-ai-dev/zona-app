package httpx

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"
)

// Date is a calendar date (no time of day) for `date` columns such as
// birth dates. JSON uses "YYYY-MM-DD" (the API contract); RFC 3339
// timestamps are also accepted on input for compatibility. It embeds
// time.Time (midnight UTC) so all time methods remain available.
type Date struct {
	time.Time
}

// NewDate truncates t to its UTC calendar day.
func NewDate(t time.Time) Date {
	y, m, d := t.UTC().Date()
	return Date{time.Date(y, m, d, 0, 0, 0, 0, time.UTC)}
}

// UnmarshalJSON accepts "YYYY-MM-DD" or an RFC 3339 timestamp.
func (d *Date) UnmarshalJSON(b []byte) error {
	var s string
	if err := json.Unmarshal(b, &s); err != nil {
		return fmt.Errorf("date must be a string: %w", err)
	}
	if t, err := time.Parse(time.DateOnly, s); err == nil {
		*d = Date{t}
		return nil
	}
	t, err := time.Parse(time.RFC3339, s)
	if err != nil {
		return fmt.Errorf("date must be YYYY-MM-DD: %q", s)
	}
	*d = NewDate(t)
	return nil
}

// MarshalJSON writes "YYYY-MM-DD".
func (d Date) MarshalJSON() ([]byte, error) {
	return json.Marshal(d.Format(time.DateOnly))
}

// Scan implements sql.Scanner so Date can be read from date columns.
func (d *Date) Scan(src any) error {
	switch v := src.(type) {
	case time.Time:
		*d = NewDate(v)
		return nil
	case string:
		return d.UnmarshalJSON([]byte(`"` + v + `"`))
	case nil:
		*d = Date{}
		return nil
	default:
		return fmt.Errorf("cannot scan %T into Date", src)
	}
}

// Value implements driver.Valuer so Date can be written to date columns.
func (d Date) Value() (driver.Value, error) {
	return d.Format(time.DateOnly), nil
}
