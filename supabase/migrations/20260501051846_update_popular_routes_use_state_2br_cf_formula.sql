/*
  # Update popular_routes moversLow/moversHigh Using State 2BR CF Formula

  ## Summary
  Recalculates moversLow and moversHigh for every route in every state's popular_routes
  JSONB array using the same formula as the interactive calculator, with the origin state's
  derived_2br_cubic_feet as the volume input.

  ## Key Change
  Consolidated routes (>500 miles) previously used fixed 800/1200 CF constants.
  Now uses origin state's derived_2br_cubic_feet × 1.00 (low) / × 1.25 (high) × destination region rate.
  This matches exactly what the calculator produces for a 2BR average-furnished move.

  ## Formula (per route miles, using origin state's derived_2br_cubic_feet)
  - ≤300 miles:   low = cf × 1.00 + miles × 2.50,  high = cf × 1.25 + miles × 2.50
  - 301–500 miles: low = cf × 1.00 + miles × 3.00, high = cf × 1.25 + miles × 3.00
  - >500 miles (consolidated): low = cf × 1.00 × dest_rate, high = cf × 1.25 × dest_rate
    - East Coast destination: rate = 5.50
    - Midwest destination: rate = 6.00
    - West destination: rate = 6.00
    - Northwest destination: rate = 7.00
*/

UPDATE state_census_data s
SET popular_routes = (
  SELECT jsonb_agg(
    route || jsonb_build_object(
      'moversLow',
      ROUND(CASE
        WHEN (route->>'miles')::int > 500 AND (route->>'toState') IN ('ME','NH','VT','MA','RI','CT','NY','NJ','PA','DE','MD','VA','WV','NC','SC','GA','FL','DC') THEN s.derived_2br_cubic_feet * 1.00 * 5.50
        WHEN (route->>'miles')::int > 500 AND (route->>'toState') IN ('OH','IN','IL','MI','WI','MN','IA','MO','ND','SD','NE','KS') THEN s.derived_2br_cubic_feet * 1.00 * 6.00
        WHEN (route->>'miles')::int > 500 AND (route->>'toState') IN ('TX','OK','NM','AZ','CO','UT','NV','CA') THEN s.derived_2br_cubic_feet * 1.00 * 6.00
        WHEN (route->>'miles')::int > 500 AND (route->>'toState') IN ('WA','OR','ID','MT','WY','AK','HI') THEN s.derived_2br_cubic_feet * 1.00 * 7.00
        WHEN (route->>'miles')::int > 500 THEN s.derived_2br_cubic_feet * 1.00 * 6.00
        WHEN (route->>'miles')::int <= 300 THEN s.derived_2br_cubic_feet * 1.00 + (route->>'miles')::int * 2.50
        ELSE s.derived_2br_cubic_feet * 1.00 + (route->>'miles')::int * 3.00
      END),
      'moversHigh',
      ROUND(CASE
        WHEN (route->>'miles')::int > 500 AND (route->>'toState') IN ('ME','NH','VT','MA','RI','CT','NY','NJ','PA','DE','MD','VA','WV','NC','SC','GA','FL','DC') THEN s.derived_2br_cubic_feet * 1.25 * 5.50
        WHEN (route->>'miles')::int > 500 AND (route->>'toState') IN ('OH','IN','IL','MI','WI','MN','IA','MO','ND','SD','NE','KS') THEN s.derived_2br_cubic_feet * 1.25 * 6.00
        WHEN (route->>'miles')::int > 500 AND (route->>'toState') IN ('TX','OK','NM','AZ','CO','UT','NV','CA') THEN s.derived_2br_cubic_feet * 1.25 * 6.00
        WHEN (route->>'miles')::int > 500 AND (route->>'toState') IN ('WA','OR','ID','MT','WY','AK','HI') THEN s.derived_2br_cubic_feet * 1.25 * 7.00
        WHEN (route->>'miles')::int > 500 THEN s.derived_2br_cubic_feet * 1.25 * 6.00
        WHEN (route->>'miles')::int <= 300 THEN s.derived_2br_cubic_feet * 1.25 + (route->>'miles')::int * 2.50
        ELSE s.derived_2br_cubic_feet * 1.25 + (route->>'miles')::int * 3.00
      END)
    )
  )
  FROM jsonb_array_elements(s.popular_routes) AS route
)
WHERE popular_routes IS NOT NULL AND jsonb_array_length(popular_routes) > 0;
