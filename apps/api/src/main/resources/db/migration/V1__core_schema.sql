CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE users (
    id                uuid PRIMARY KEY DEFAULT uuidv7(),
    email             citext NOT NULL UNIQUE,
    email_verified_at timestamptz,
    nickname          text NOT NULL CHECK (char_length(nickname) BETWEEN 1 AND 30),
    avatar_url        text,
    status            text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'system')),
    created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE user_identities (
    id               uuid PRIMARY KEY DEFAULT uuidv7(),
    user_id          uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    provider         text NOT NULL CHECK (provider IN ('password', 'google', 'kakao', 'naver', 'apple')),
    provider_subject text NOT NULL,
    created_at       timestamptz NOT NULL DEFAULT now(),
    UNIQUE (provider, provider_subject)
);
CREATE INDEX user_identities_user_idx ON user_identities (user_id);

CREATE TABLE password_credentials (
    user_id       uuid PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    password_hash text NOT NULL,
    updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE email_tokens (
    id         uuid PRIMARY KEY DEFAULT uuidv7(),
    user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    purpose    text NOT NULL CHECK (purpose IN ('verify', 'reset')),
    token_hash text NOT NULL UNIQUE,
    expires_at timestamptz NOT NULL,
    used_at    timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE trips (
    id             uuid PRIMARY KEY DEFAULT uuidv7(),
    slug           text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]{3,64}$'),
    owner_id       uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    title          text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 60),
    subtitle       text,
    start_date     date NOT NULL,
    end_date       date NOT NULL,
    timezone       text NOT NULL DEFAULT 'Asia/Seoul',
    visibility     text NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'link', 'public')),
    is_sample      boolean NOT NULL DEFAULT false,
    source_trip_id uuid REFERENCES trips (id) ON DELETE SET NULL,
    content        jsonb NOT NULL DEFAULT '{}'::jsonb,
    version        integer NOT NULL DEFAULT 0,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now(),
    CHECK (end_date >= start_date)
);
CREATE INDEX trips_public_samples_idx ON trips (start_date) WHERE visibility = 'public' AND is_sample;

CREATE TABLE trip_members (
    trip_id   uuid NOT NULL REFERENCES trips (id) ON DELETE CASCADE,
    user_id   uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role      text NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
    joined_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (trip_id, user_id)
);
CREATE INDEX trip_members_user_idx ON trip_members (user_id);

CREATE TABLE trip_days (
    id      uuid PRIMARY KEY DEFAULT uuidv7(),
    trip_id uuid NOT NULL REFERENCES trips (id) ON DELETE CASCADE,
    number  integer NOT NULL CHECK (number >= 1),
    date    date NOT NULL,
    city    text NOT NULL DEFAULT '',
    theme   text NOT NULL DEFAULT '',
    note    text,
    color   text,
    tour    jsonb,
    UNIQUE (trip_id, number)
);

CREATE TABLE places (
    id       uuid PRIMARY KEY DEFAULT uuidv7(),
    trip_id  uuid NOT NULL REFERENCES trips (id) ON DELETE CASCADE,
    key      text NOT NULL,
    kind     text NOT NULL CHECK (kind IN ('dining', 'shopping', 'hotel', 'sight')),
    name     text NOT NULL,
    area     text NOT NULL,
    details  jsonb NOT NULL DEFAULT '{}'::jsonb,
    position integer NOT NULL,
    UNIQUE (trip_id, key)
);

CREATE TABLE stops (
    id             uuid PRIMARY KEY DEFAULT uuidv7(),
    trip_id        uuid NOT NULL REFERENCES trips (id) ON DELETE CASCADE,
    day_id         uuid NOT NULL REFERENCES trip_days (id) ON DELETE CASCADE,
    key            text NOT NULL,
    position       text COLLATE "C" NOT NULL,
    start_time     time NOT NULL,
    title          text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 80),
    type           text NOT NULL CHECK (type IN ('airport', 'flight', 'transport', 'hotel', 'meal', 'sight', 'shopping', 'free', 'breakfast', 'bath', 'tour')),
    details        text NOT NULL DEFAULT '',
    duration       text,
    buffer         text,
    timing         text,
    transport_icon text,
    lat            double precision CHECK (lat BETWEEN -90 AND 90),
    lng            double precision CHECK (lng BETWEEN -180 AND 180),
    approximate    boolean NOT NULL DEFAULT false,
    location       geography(Point, 4326) GENERATED ALWAYS AS (
                       CASE WHEN lat IS NULL OR lng IS NULL THEN NULL
                            ELSE ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography END
                   ) STORED,
    transit        jsonb,
    photo          jsonb,
    hotel_photo    jsonb,
    links          jsonb,
    place_key      text,
    guide          jsonb,
    optional       boolean NOT NULL DEFAULT false,
    version        integer NOT NULL DEFAULT 0,
    UNIQUE (trip_id, key),
    CONSTRAINT stops_day_position_key UNIQUE (day_id, position) DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX stops_day_order_idx ON stops (day_id, position);
CREATE INDEX stops_location_idx ON stops USING gist (location);
