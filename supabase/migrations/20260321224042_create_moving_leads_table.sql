/*
  # Create Moving Leads Table

  1. New Tables
    - `moving_leads`
      - `id` (uuid, primary key) - Unique identifier for each lead
      - `name` (text) - Full name of the customer
      - `email` (text) - Customer's email address
      - `phone` (text) - Customer's telephone number
      - `from_zip` (text) - Origin zip code
      - `to_zip` (text) - Destination zip code
      - `home_size` (text) - Size of home being moved
      - `packing` (boolean) - Whether packing service is requested
      - `storage` (boolean) - Whether storage service is requested
      - `assembly` (boolean) - Whether assembly service is requested
      - `estimated_low` (integer) - Low end of price estimate
      - `estimated_high` (integer) - High end of price estimate
      - `distance_miles` (integer) - Distance between zip codes in miles
      - `from_city` (text) - Origin city name
      - `from_state` (text) - Origin state
      - `to_city` (text) - Destination city name
      - `to_state` (text) - Destination state
      - `created_at` (timestamptz) - When the lead was submitted

  2. Security
    - Enable RLS on `moving_leads` table
    - Add policy for inserting leads (public access for form submissions)
    - No select/update/delete policies (admin only via service role)
*/

CREATE TABLE IF NOT EXISTS moving_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  from_zip text NOT NULL,
  to_zip text NOT NULL,
  home_size text NOT NULL,
  packing boolean DEFAULT false,
  storage boolean DEFAULT false,
  assembly boolean DEFAULT false,
  estimated_low integer NOT NULL,
  estimated_high integer NOT NULL,
  distance_miles integer NOT NULL,
  from_city text NOT NULL,
  from_state text NOT NULL,
  to_city text NOT NULL,
  to_state text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE moving_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a lead"
  ON moving_leads
  FOR INSERT
  TO anon
  WITH CHECK (true);
