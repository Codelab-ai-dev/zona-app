package matches

import (
	"fmt"
	"strings"
	"time"
)

// FixtureSchedule tells the generator when and where rounds are played.
// It mirrors the legacy fixture-generator form: one round per match day,
// matches spread over the available fields in consecutive time slots.
type FixtureSchedule struct {
	StartDate            string   `json:"start_date"`         // YYYY-MM-DD, first possible match day
	EndDate              *string  `json:"end_date,omitempty"` // YYYY-MM-DD, last allowed day
	MatchDays            []string `json:"match_days"`         // monday..sunday
	StartTime            string   `json:"start_time"`         // HH:MM, first kick-off
	EndTime              *string  `json:"end_time,omitempty"` // HH:MM, last match must end by then
	FieldsAvailable      int      `json:"fields_available"`
	HalfMinutes          int      `json:"half_minutes"`
	HalftimeBreakMinutes int      `json:"halftime_break_minutes"`
	BreakBetweenMatches  int      `json:"break_between_matches"`
}

var weekdays = map[string]time.Weekday{
	"sunday": time.Sunday, "monday": time.Monday, "tuesday": time.Tuesday, "wednesday": time.Wednesday,
	"thursday": time.Thursday, "friday": time.Friday, "saturday": time.Saturday,
}

// Validate implements the field checks of the schedule.
func (s FixtureSchedule) Validate() map[string]string {
	errs := map[string]string{}
	if _, err := time.Parse(time.DateOnly, s.StartDate); err != nil {
		errs["schedule.start_date"] = "debe tener formato AAAA-MM-DD"
	}
	if s.EndDate != nil {
		end, err := time.Parse(time.DateOnly, *s.EndDate)
		start, startErr := time.Parse(time.DateOnly, s.StartDate)
		if err != nil {
			errs["schedule.end_date"] = "debe tener formato AAAA-MM-DD"
		} else if startErr == nil && end.Before(start) {
			errs["schedule.end_date"] = "debe ser posterior a la fecha de inicio"
		}
	}
	if len(s.MatchDays) == 0 {
		errs["schedule.match_days"] = "elige al menos un día de juego"
	}
	for _, d := range s.MatchDays {
		if _, ok := weekdays[strings.ToLower(d)]; !ok {
			errs["schedule.match_days"] = "día no válido: " + d
		}
	}
	if _, err := parseClock(s.StartTime); err != nil {
		errs["schedule.start_time"] = "debe tener formato HH:MM"
	}
	if s.EndTime != nil {
		if _, err := parseClock(*s.EndTime); err != nil {
			errs["schedule.end_time"] = "debe tener formato HH:MM"
		}
	}
	if s.FieldsAvailable < 1 || s.FieldsAvailable > 20 {
		errs["schedule.fields_available"] = "debe estar entre 1 y 20"
	}
	if s.HalfMinutes < 10 || s.HalfMinutes > 60 {
		errs["schedule.half_minutes"] = "debe estar entre 10 y 60"
	}
	if s.HalftimeBreakMinutes < 0 || s.HalftimeBreakMinutes > 30 {
		errs["schedule.halftime_break_minutes"] = "debe estar entre 0 y 30"
	}
	if s.BreakBetweenMatches < 0 || s.BreakBetweenMatches > 120 {
		errs["schedule.break_between_matches"] = "debe estar entre 0 y 120"
	}
	return errs
}

// slotMinutes is the time one match occupies a field, including the gap
// before the next kick-off on that field.
func (s FixtureSchedule) slotMinutes() int {
	return 2*s.HalfMinutes + s.HalftimeBreakMinutes + s.BreakBetweenMatches
}

// ScheduledSlot is where and when one match of a round is played.
type ScheduledSlot struct {
	Date  time.Time // midnight UTC of the match day
	Time  string    // HH:MM kick-off
	Field int       // 1-based
}

// ScheduleRounds assigns a date to every round (one round per eligible
// match day, in order) and a field/time slot to every match of the round.
// matchesPerRound[i] is the number of matches in round i. It fails with a
// user-facing message when a round does not fit in the daily window or the
// last round falls after EndDate.
func ScheduleRounds(s FixtureSchedule, matchesPerRound []int) ([][]ScheduledSlot, error) {
	start, err := time.Parse(time.DateOnly, s.StartDate)
	if err != nil {
		return nil, err
	}
	first, err := parseClock(s.StartTime)
	if err != nil {
		return nil, err
	}
	allowed := map[time.Weekday]bool{}
	for _, d := range s.MatchDays {
		allowed[weekdays[strings.ToLower(d)]] = true
	}

	day := start
	out := make([][]ScheduledSlot, len(matchesPerRound))
	for round, n := range matchesPerRound {
		for !allowed[day.Weekday()] {
			day = day.AddDate(0, 0, 1)
		}
		if s.EndDate != nil {
			end, _ := time.Parse(time.DateOnly, *s.EndDate)
			if day.After(end) {
				return nil, fmt.Errorf("la jornada %d caería el %s, después de la fecha límite; agrega días de juego o amplía la fecha", round+1, day.Format(time.DateOnly))
			}
		}

		slots := make([]ScheduledSlot, n)
		for i := range n {
			wave := i / s.FieldsAvailable
			kickoff := first + wave*s.slotMinutes()
			if s.EndTime != nil {
				last, _ := parseClock(*s.EndTime)
				if kickoff+2*s.HalfMinutes+s.HalftimeBreakMinutes > last {
					return nil, fmt.Errorf("los %d partidos de la jornada %d no caben antes de las %s; agrega canchas o amplía el horario", n, round+1, *s.EndTime)
				}
			}
			if kickoff >= 24*60 {
				return nil, fmt.Errorf("los partidos de la jornada %d terminarían después de medianoche; agrega canchas", round+1)
			}
			slots[i] = ScheduledSlot{Date: day, Time: formatClock(kickoff), Field: i%s.FieldsAvailable + 1}
		}
		out[round] = slots
		day = day.AddDate(0, 0, 1)
	}
	return out, nil
}

func parseClock(v string) (int, error) {
	t, err := time.Parse("15:04", v)
	if err != nil {
		return 0, err
	}
	return t.Hour()*60 + t.Minute(), nil
}

func formatClock(minutes int) string {
	return fmt.Sprintf("%02d:%02d", minutes/60, minutes%60)
}
