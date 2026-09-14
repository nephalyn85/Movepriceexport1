/*
  # Remove overly broad anon SELECT policy on moving_leads

  The lead lookup will be handled server-side via a dedicated edge function
  using the service role key, so no public RLS SELECT policy is needed.
*/

DROP POLICY IF EXISTS "Public can read own lead by id" ON moving_leads;
