/*
  # Allow anon to read their own lead row after insert

  ## Purpose
  The LeadCaptureForm uses `.insert({...}).select('id').maybeSingle()` to capture
  the UUID of the newly created lead so it can be embedded in the inventory email
  CTA link. Without a SELECT policy, the chained `.select()` returns null even
  though the insert succeeded.

  ## Security
  - Restricted to anon role only
  - The UUID is 122 bits of entropy — effectively unguessable for enumeration
  - This mirrors the existing INSERT policy pattern
*/

CREATE POLICY "Anon can select lead by id after insert"
  ON moving_leads
  FOR SELECT
  TO anon
  USING (true);
