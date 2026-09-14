/*
  # Create diesel price cache table

  ## Purpose
  Cache EIA diesel price API responses to avoid hitting the DEMO_KEY rate limit
  (30 requests/hour). Prices are only fetched if cache is older than 6 hours.

  ## New Tables
  - `diesel_price_cache`
    - `region_key` (text, primary key) — EIA region identifier
    - `region_name` (text) — Human-readable region name
    - `price` (numeric) — Diesel price in USD per gallon
    - `period` (text) — EIA reporting period (e.g. "2025-04-07")
    - `lat` (numeric) — Region center latitude
    - `lng` (numeric) — Region center longitude
    - `fetched_at` (timestamptz) — When this cache entry was last updated

  ## Security
  - RLS enabled
  - Edge functions (service role) can read and upsert
  - Public (anon) can only read
*/

CREATE TABLE IF NOT EXISTS diesel_price_cache (
  region_key text PRIMARY KEY,
  region_name text NOT NULL DEFAULT '',
  price numeric,
  period text,
  lat numeric NOT NULL DEFAULT 0,
  lng numeric NOT NULL DEFAULT 0,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE diesel_price_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read diesel price cache"
  ON diesel_price_cache
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role can upsert diesel price cache"
  ON diesel_price_cache
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update diesel price cache"
  ON diesel_price_cache
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);
