package matches

import (
	"strings"
	"testing"
	"time"
)

func baseSchedule() FixtureSchedule {
	return FixtureSchedule{
		StartDate: "2026-03-04", // a Wednesday
		MatchDays: []string{"saturday", "sunday"},
		StartTime: "08:00", FieldsAvailable: 2,
		HalfMinutes: 20, HalftimeBreakMinutes: 10, BreakBetweenMatches: 15, // 65-minute slots
	}
}

func TestScheduleRoundsAssignsDaysFieldsAndTimes(t *testing.T) {
	got, err := ScheduleRounds(baseSchedule(), []int{3, 3, 3})
	if err != nil {
		t.Fatal(err)
	}
	wantDays := []string{"2026-03-07", "2026-03-08", "2026-03-14"} // Sat, Sun, next Sat
	for r, day := range wantDays {
		if d := got[r][0].Date.Format(time.DateOnly); d != day {
			t.Errorf("round %d date = %s, want %s", r+1, d, day)
		}
	}
	// 2 fields: matches 1-2 at 08:00 on fields 1 and 2, match 3 at 09:05 on field 1.
	r1 := got[0]
	if r1[0].Time != "08:00" || r1[0].Field != 1 || r1[1].Time != "08:00" || r1[1].Field != 2 || r1[2].Time != "09:05" || r1[2].Field != 1 {
		t.Fatalf("round 1 slots = %+v", r1)
	}
}

func TestScheduleRoundsRespectsLimits(t *testing.T) {
	end := "2026-03-08"
	late := "09:00"
	tests := []struct {
		name    string
		mutate  func(*FixtureSchedule)
		rounds  []int
		wantErr string
	}{
		{"past end date", func(s *FixtureSchedule) { s.EndDate = &end }, []int{2, 2, 2}, "fecha límite"},
		{"does not fit daily window", func(s *FixtureSchedule) { s.EndTime = &late }, []int{3}, "no caben"},
		{"fits exactly", func(s *FixtureSchedule) { s.EndTime = &late; s.FieldsAvailable = 3 }, []int{3}, ""},
		{"past midnight", func(s *FixtureSchedule) { s.StartTime = "22:00"; s.FieldsAvailable = 1 }, []int{3}, "medianoche"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s := baseSchedule()
			tt.mutate(&s)
			_, err := ScheduleRounds(s, tt.rounds)
			if tt.wantErr == "" {
				if err != nil {
					t.Fatalf("unexpected error: %v", err)
				}
				return
			}
			if err == nil || !strings.Contains(err.Error(), tt.wantErr) {
				t.Fatalf("err = %v, want containing %q", err, tt.wantErr)
			}
		})
	}
}

func TestFixtureScheduleValidate(t *testing.T) {
	bad := FixtureSchedule{StartDate: "07/03/2026", MatchDays: []string{"sabado"}, StartTime: "8am", FieldsAvailable: 0, HalfMinutes: 5, HalftimeBreakMinutes: -1, BreakBetweenMatches: 500}
	errs := bad.Validate()
	for _, f := range []string{"schedule.start_date", "schedule.match_days", "schedule.start_time", "schedule.fields_available", "schedule.half_minutes", "schedule.halftime_break_minutes", "schedule.break_between_matches"} {
		if errs[f] == "" {
			t.Errorf("missing validation error for %s", f)
		}
	}
	if errs := baseSchedule().Validate(); len(errs) != 0 {
		t.Fatalf("valid schedule rejected: %v", errs)
	}
}
