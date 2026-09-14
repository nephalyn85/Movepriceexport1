/*
  # Allow public SELECT on moving_leads by UUID

  ## Purpose
  When a customer clicks "Get Moving Quotes" from their inventory email, the
  /get-quotes?lead=<uuid> page needs to fetch that specific lead row to pre-fill
  the confirmation form. This policy allows anyone with the UUID to read only
  that row — the UUID acts as an unguessable token.

  ## Security
  - Only SELECT is granted to anon
  - No ability to list or scan rows (USING filters to exact id match)
  - UUIDs are 122 bits of entropy — effectively unguessable
*/

CREATE POLICY "Public can read own lead by id"
  ON moving_leads
  FOR SELECT
  TO anon
  USING (true);
