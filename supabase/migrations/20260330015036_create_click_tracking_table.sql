/*
  # Create click tracking table

  1. New Tables
    - `click_tracking`
      - `id` (uuid, primary key) - Unique identifier for each click
      - `company_slug` (text) - URL slug of the company (e.g., "bin-it")
      - `company_name` (text) - Display name of the company
      - `clicked_at` (timestamptz) - When the click occurred
      - `user_agent` (text, nullable) - Browser user agent for analytics
      - `referrer` (text, nullable) - Where the click came from

  2. Security
    - Enable RLS on `click_tracking` table
    - Add policy for anonymous users to insert clicks (public tracking)
    - No read access for regular users (admin only via service role)

  3. Indexes
    - Index on company_slug for fast aggregation queries
    - Index on clicked_at for time-based queries
*/

CREATE TABLE IF NOT EXISTS click_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_slug text NOT NULL,
  company_name text NOT NULL,
  clicked_at timestamptz DEFAULT now(),
  user_agent text,
  referrer text
);

CREATE INDEX IF NOT EXISTS idx_click_tracking_company_slug ON click_tracking(company_slug);
CREATE INDEX IF NOT EXISTS idx_click_tracking_clicked_at ON click_tracking(clicked_at);

ALTER TABLE click_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert clicks"
  ON click_tracking
  FOR INSERT
  TO anon
  WITH CHECK (true);
