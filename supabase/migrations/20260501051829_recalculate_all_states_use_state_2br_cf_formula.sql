/*
  # Recalculate All State Prices Using Our Calculator Formula With State-Specific 2BR Cubic Feet

  ## Summary
  Updates avg_movers_local_low, avg_movers_local_high, avg_movers_ld_low, avg_movers_ld_high
  for all 50 states using the exact calculator formula (MovePriceCalculator.tsx) but substituting
  each state's own derived_2br_cubic_feet instead of the previous fixed 800/1200 CF constants
  for consolidated long-distance moves (>500 miles).

  ## Volume Multipliers (matching calculator furnish-level bracket for "average" 2BR)
  - Low end:  derived_2br_cubic_feet × 1.00  (average furnish level)
  - High end: derived_2br_cubic_feet × 1.25  (well-furnished, one tier up — matches calculator cfHigh logic)

  ## Local Move Formula (uses avg_intrastate_miles)
  - ≤50 mi:    low = cf × 1.00 + miles × 2.00,  high = cf × 1.25 + miles × 2.00
  - 51–300 mi: low = cf × 1.00 + miles × 2.50,  high = cf × 1.25 + miles × 2.50
  - 301–500 mi: low = cf × 1.00 + miles × 3.00, high = cf × 1.25 + miles × 3.00

  ## Long-Distance Formula (uses avg_interstate_miles)
  - ≤300 mi:    low = cf × 1.00 + miles × 2.50,  high = cf × 1.25 + miles × 2.50
  - 301–500 mi: low = cf × 1.00 + miles × 3.00,  high = cf × 1.25 + miles × 3.00
  - >500 mi (consolidated): low = cf × 1.00 × region_rate, high = cf × 1.25 × region_rate
    - East Coast (ME,NH,VT,MA,RI,CT,NY,NJ,PA,DE,MD,VA,WV,NC,SC,GA,FL,DC): rate = 5.50
    - Midwest (OH,IN,IL,MI,WI,MN,IA,MO,ND,SD,NE,KS): rate = 6.00
    - West (TX,OK,NM,AZ,CO,UT,NV,CA): rate = 6.00
    - Northwest (WA,OR,ID,MT,WY,AK,HI): rate = 7.00
    - Fallback: rate = 6.00

  ## Key Change vs Previous Migration
  Consolidated moves previously used fixed 800 cf (low) / 1200 cf (high) regardless of state.
  Now uses each state's actual derived_2br_cubic_feet × 1.00 / × 1.25, matching how the
  interactive calculator handles a real user with a 2BR home.
*/

UPDATE state_census_data
SET
  avg_movers_local_low = ROUND(
    CASE
      WHEN avg_intrastate_miles <= 50  THEN derived_2br_cubic_feet * 1.00 + avg_intrastate_miles * 2.00
      WHEN avg_intrastate_miles <= 300 THEN derived_2br_cubic_feet * 1.00 + avg_intrastate_miles * 2.50
      ELSE                                  derived_2br_cubic_feet * 1.00 + avg_intrastate_miles * 3.00
    END
  ),
  avg_movers_local_high = ROUND(
    CASE
      WHEN avg_intrastate_miles <= 50  THEN derived_2br_cubic_feet * 1.25 + avg_intrastate_miles * 2.00
      WHEN avg_intrastate_miles <= 300 THEN derived_2br_cubic_feet * 1.25 + avg_intrastate_miles * 2.50
      ELSE                                  derived_2br_cubic_feet * 1.25 + avg_intrastate_miles * 3.00
    END
  ),
  avg_movers_ld_low = ROUND(
    CASE
      -- Consolidated >500 miles: use state's own 2BR CF × 1.00 × region rate
      WHEN avg_interstate_miles > 500 AND abbr IN ('ME','NH','VT','MA','RI','CT','NY','NJ','PA','DE','MD','VA','WV','NC','SC','GA','FL','DC') THEN derived_2br_cubic_feet * 1.00 * 5.50
      WHEN avg_interstate_miles > 500 AND abbr IN ('OH','IN','IL','MI','WI','MN','IA','MO','ND','SD','NE','KS') THEN derived_2br_cubic_feet * 1.00 * 6.00
      WHEN avg_interstate_miles > 500 AND abbr IN ('TX','OK','NM','AZ','CO','UT','NV','CA') THEN derived_2br_cubic_feet * 1.00 * 6.00
      WHEN avg_interstate_miles > 500 AND abbr IN ('WA','OR','ID','MT','WY','AK','HI') THEN derived_2br_cubic_feet * 1.00 * 7.00
      WHEN avg_interstate_miles > 500 THEN derived_2br_cubic_feet * 1.00 * 6.00
      -- Mileage-based ≤500 miles
      WHEN avg_interstate_miles <= 300 THEN derived_2br_cubic_feet * 1.00 + avg_interstate_miles * 2.50
      ELSE                                  derived_2br_cubic_feet * 1.00 + avg_interstate_miles * 3.00
    END
  ),
  avg_movers_ld_high = ROUND(
    CASE
      -- Consolidated >500 miles: use state's own 2BR CF × 1.25 × region rate
      WHEN avg_interstate_miles > 500 AND abbr IN ('ME','NH','VT','MA','RI','CT','NY','NJ','PA','DE','MD','VA','WV','NC','SC','GA','FL','DC') THEN derived_2br_cubic_feet * 1.25 * 5.50
      WHEN avg_interstate_miles > 500 AND abbr IN ('OH','IN','IL','MI','WI','MN','IA','MO','ND','SD','NE','KS') THEN derived_2br_cubic_feet * 1.25 * 6.00
      WHEN avg_interstate_miles > 500 AND abbr IN ('TX','OK','NM','AZ','CO','UT','NV','CA') THEN derived_2br_cubic_feet * 1.25 * 6.00
      WHEN avg_interstate_miles > 500 AND abbr IN ('WA','OR','ID','MT','WY','AK','HI') THEN derived_2br_cubic_feet * 1.25 * 7.00
      WHEN avg_interstate_miles > 500 THEN derived_2br_cubic_feet * 1.25 * 6.00
      -- Mileage-based ≤500 miles
      WHEN avg_interstate_miles <= 300 THEN derived_2br_cubic_feet * 1.25 + avg_interstate_miles * 2.50
      ELSE                                  derived_2br_cubic_feet * 1.25 + avg_interstate_miles * 3.00
    END
  );
