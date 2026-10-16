CREATE TABLE share_links (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    token_hash text NOT NULL UNIQUE CHECK (char_length(token_hash) = 64),
    created_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX share_links_trip_idx ON share_links(trip_id);

CREATE TABLE stop_completions (
    trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stop_id uuid NOT NULL REFERENCES stops(id) ON DELETE CASCADE,
    completed_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (trip_id, user_id, stop_id)
);

-- Retain a tombstone after stop deletion so a delayed offline retry cannot recreate it.
CREATE TABLE stop_create_mutations (
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day_id uuid NOT NULL REFERENCES trip_days(id) ON DELETE CASCADE,
    client_mutation_id uuid NOT NULL,
    stop_id uuid REFERENCES stops(id) ON DELETE SET NULL,
    PRIMARY KEY (user_id, day_id, client_mutation_id)
);
