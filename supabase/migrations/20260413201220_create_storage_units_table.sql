/*
  # Create Storage Units Table

  ## Summary
  Creates a `storage_units` table to store storage unit pricing data that the moving calculator
  uses to show storage add-on costs. Previously this was hardcoded in the frontend.

  ## New Tables
  - `storage_units`
    - `id` (uuid, primary key)
    - `size` (text) - Size label: Small, Medium, Large, XL, XXL
    - `dimensions` (text) - Physical dimensions e.g. "5' x 10'"
    - `max_cu_ft` (integer) - Maximum cubic feet capacity
    - `usable_cu_ft` (integer) - Usable cubic feet (accounts for stacking, access)
    - `price` (numeric) - Monthly price in USD
    - `sort_order` (integer) - Display/selection order
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## Security
  - RLS enabled
  - Public SELECT policy (pricing is public info)
  - No insert/update/delete for anon users (admin only via service role)

  ## Seed Data
  Inserts the 6 standard storage unit sizes matching the previous hardcoded values.
*/

CREATE TABLE IF NOT EXISTS storage_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  size text NOT NULL,
  dimensions text NOT NULL,
  max_cu_ft integer NOT NULL DEFAULT 0,
  usable_cu_ft integer NOT NULL DEFAULT 0,
  price numeric(10, 2) NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE storage_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view storage unit pricing"
  ON storage_units
  FOR SELECT
  TO anon, authenticated
  USING (true);

INSERT INTO storage_units (size, dimensions, max_cu_ft, usable_cu_ft, price, sort_order) VALUES
  ('Small',  '5'' x 10''',  400,  250,  119.25, 1),
  ('Medium', '5'' x 15''',  600,  375,  187.80, 2),
  ('Medium', '10'' x 10''', 800,  500,  251.25, 3),
  ('Large',  '10'' x 15''', 1200, 750,  432.00, 4),
  ('XL',     '10'' x 20''', 1600, 1000, 572.40, 5),
  ('XXL',    '10'' x 30''', 2400, 1500, 849.60, 6)
ON CONFLICT DO NOTHING;
