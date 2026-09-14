/*
  # Update popular_routes moversLow/moversHigh with New Calculator Formula

  ## Summary
  Recalculates moversLow and moversHigh for every route in every state's popular_routes
  JSONB array using the same formula as MovePriceCalculator.tsx.

  ## Formula Applied (per route miles, using origin state's derived_2br_cubic_feet)
  - ≤300 miles: low = cf × 1.00 + miles × 2.50,  high = cf × 1.30 + miles × 2.50
  - 301–500 miles: low = cf × 1.00 + miles × 3.00, high = cf × 1.30 + miles × 3.00
  - >500 miles (consolidated, fixed 800/1200 cf range):
    - East Coast destination states (ME,NH,VT,MA,RI,CT,NY,NJ,PA,DE,MD,VA,WV,NC,SC,GA,FL,DC): 800×5.50 / 1200×5.50
    - Midwest (OH,IN,IL,MI,WI,MN,IA,MO,ND,SD,NE,KS): 800×6.00 / 1200×6.00
    - West (TX,OK,NM,AZ,CO,UT,NV,CA): 800×6.00 / 1200×6.00
    - Northwest (WA,OR,ID,MT,WY,AK,HI): 800×7.00 / 1200×7.00

  For consolidated routes the destination state's region rate is used (matching how the
  calculator picks a rate for the move destination).
*/

UPDATE state_census_data s
SET popular_routes = (
  SELECT jsonb_agg(
    route || jsonb_build_object(
      'moversLow',
      ROUND(CASE
        WHEN (route->>'miles')::int > 500 AND (route->>'toState') IN ('ME','NH','VT','MA','RI','CT','NY','NJ','PA','DE','MD','VA','WV','NC','SC','GA','FL','DC') THEN 800 * 5.50
        WHEN (route->>'miles')::int > 500 AND (route->>'toState') IN ('OH','IN','IL','MI','WI','MN','IA','MO','ND','SD','NE','KS') THEN 800 * 6.00
        WHEN (route->>'miles')::int > 500 AND (route->>'toState') IN ('TX','OK','NM','AZ','CO','UT','NV','CA') THEN 800 * 6.00
        WHEN (route->>'miles')::int > 500 AND (route->>'toState') IN ('WA','OR','ID','MT','WY','AK','HI') THEN 800 * 7.00
        WHEN (route->>'miles')::int > 500 THEN 800 * 6.00
        WHEN (route->>'miles')::int <= 300 THEN s.derived_2br_cubic_feet * 1.00 + (route->>'miles')::int * 2.50
        ELSE s.derived_2br_cubic_feet * 1.00 + (route->>'miles')::int * 3.00
      END),
      'moversHigh',
      ROUND(CASE
        WHEN (route->>'miles')::int > 500 AND (route->>'toState') IN ('ME','NH','VT','MA','RI','CT','NY','NJ','PA','DE','MD','VA','WV','NC','SC','GA','FL','DC') THEN 1200 * 5.50
        WHEN (route->>'miles')::int > 500 AND (route->>'toState') IN ('OH','IN','IL','MI','WI','MN','IA','MO','ND','SD','NE','KS') THEN 1200 * 6.00
        WHEN (route->>'miles')::int > 500 AND (route->>'toState') IN ('TX','OK','NM','AZ','CO','UT','NV','CA') THEN 1200 * 6.00
        WHEN (route->>'miles')::int > 500 AND (route->>'toState') IN ('WA','OR','ID','MT','WY','AK','HI') THEN 1200 * 7.00
        WHEN (route->>'miles')::int > 500 THEN 1200 * 6.00
        WHEN (route->>'miles')::int <= 300 THEN s.derived_2br_cubic_feet * 1.30 + (route->>'miles')::int * 2.50
        ELSE s.derived_2br_cubic_feet * 1.30 + (route->>'miles')::int * 3.00
      END)
    )
  )
  FROM jsonb_array_elements(s.popular_routes) AS route
)
WHERE popular_routes IS NOT NULL AND jsonb_array_length(popular_routes) > 0;
