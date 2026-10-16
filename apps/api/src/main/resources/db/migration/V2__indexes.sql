CREATE INDEX trips_owner_idx ON trips (owner_id);
CREATE INDEX trips_source_trip_idx ON trips (source_trip_id);
CREATE INDEX email_tokens_user_idx ON email_tokens (user_id);
