-- +goose Up
-- Knockout ties get decided and advance (#83), with FIFA's current rules: a
-- single match level after full time, or a two-legged tie level on
-- aggregate, is decided on penalties (no away goals rule).

-- Penalty shoot-out of a match: both or neither, and someone wins it.
ALTER TABLE public.matches
    ADD COLUMN home_penalties smallint CHECK (home_penalties >= 0),
    ADD COLUMN away_penalties smallint CHECK (away_penalties >= 0),
    ADD CONSTRAINT matches_penalties_check CHECK (
        (home_penalties IS NULL) = (away_penalties IS NULL)
        AND (home_penalties IS NULL OR home_penalties <> away_penalties));

-- Later knockout matches used to be created up front with placeholder
-- teams (seeds 1 and 2 everywhere). They are now planned here and created
-- with the real teams once the ties that feed them are decided.
CREATE TABLE public.playoff_slots (
    tournament_id    uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    playoff_round    text NOT NULL CHECK (playoff_round IN ('semifinals', 'final', 'third_place')),
    playoff_position integer NOT NULL CHECK (playoff_position > 0),
    leg              text NOT NULL DEFAULT 'single' CHECK (leg IN ('single', 'first', 'second')),
    match_date       timestamptz NOT NULL,
    match_time       time,
    field_number     integer CHECK (field_number > 0),
    PRIMARY KEY (tournament_id, playoff_round, playoff_position, leg)
);

-- +goose Down
DROP TABLE IF EXISTS public.playoff_slots;
ALTER TABLE public.matches
    DROP CONSTRAINT IF EXISTS matches_penalties_check,
    DROP COLUMN IF EXISTS away_penalties,
    DROP COLUMN IF EXISTS home_penalties;
