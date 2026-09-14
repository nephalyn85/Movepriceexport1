/*
  # Fix Consolidated Pricing: Use derived_2br_cubic_feet Not derived_cubic_feet

  ## Problem
  The previous migration used derived_cubic_feet (full-home volume) instead of
  derived_2br_cubic_feet (2-bedroom volume) when calculating consolidated LD prices.
  This caused prices to be ~61% too high (e.g. California showed $11,226 instead of ~$6,960).

  ## Fix
  Re-run the same consolidated pricing formula using derived_2br_cubic_feet for all
  500+ mile states.
*/

UPDATE state_census_data
SET
  avg_movers_ld_low = ROUND(derived_2br_cubic_feet * CASE
    WHEN abbr IN ('ME','NH','VT','MA','RI','CT','NY','NJ','PA','DE','MD','VA','WV','NC','SC','GA','FL') THEN 5.50
    WHEN abbr IN ('OH','IN','IL','MI','WI','MN','IA','MO','ND','SD','NE','KS') THEN 6.00
    WHEN abbr IN ('TX','OK','NM','AZ','CO','UT','NV','CA') THEN 6.00
    WHEN abbr IN ('WA','OR','ID','MT','WY','AK') THEN 7.00
    ELSE 6.00
  END),
  avg_movers_ld_high = ROUND(derived_2br_cubic_feet * CASE
    WHEN abbr IN ('ME','NH','VT','MA','RI','CT','NY','NJ','PA','DE','MD','VA','WV','NC','SC','GA','FL') THEN 7.15
    WHEN abbr IN ('OH','IN','IL','MI','WI','MN','IA','MO','ND','SD','NE','KS') THEN 7.80
    WHEN abbr IN ('TX','OK','NM','AZ','CO','UT','NV','CA') THEN 7.80
    WHEN abbr IN ('WA','OR','ID','MT','WY','AK') THEN 9.10
    ELSE 7.80
  END),
  updated_at = now()
WHERE avg_interstate_miles > 500
  AND abbr != 'HI';
