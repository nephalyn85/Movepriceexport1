/*
  # Recalculate All 50 State Prices — New CF and Mile Rates

  ## Summary
  Updates avg_movers_local_low, avg_movers_local_high, avg_movers_ld_low, avg_movers_ld_high
  for all 50 states to match the updated calculator formula introduced in May 2026.

  ## New Formula (matches MovePriceCalculator.tsx and InventoryCalculator.tsx)

  ### CF Rates (normal-day baseline for state page estimates)
  - All states (normal): $1.20/CF (low) → $1.60/CF (high, busy-day proxy)
  - California (normal): $1.75/CF (low) → $2.00/CF (high, busy-day proxy)

  ### Mile Rates
  - ≤50 miles:   $2.50/mile
  - 51–499 miles: $3.00/mile

  ### Long-Distance (500+ miles) — Unchanged
  Uses region rate × CF (no change to this tier):
  - East Coast states:   ×5.50
  - Midwest states:      ×6.00
  - West states:         ×6.00
  - Northwest states:    ×7.00

  ## Columns Updated
  - avg_movers_local_low
  - avg_movers_local_high
  - avg_movers_ld_low
  - avg_movers_ld_high

  ## Notes
  - State pages display pre-computed estimates; this migration brings them in sync
    with the live calculator formula.
  - California uses elevated CF rates reflecting its premium labor market.
  - High column uses $1.60/CF (all states) or $2.00/CF (CA) as the upper bound,
    mirroring the busy-day rate as a reasonable high estimate for the range shown.
*/

UPDATE state_census_data
SET
  -- Local move low: CF × 1.20 (or 1.75 for CA) + miles × rate
  avg_movers_local_low = ROUND(
    CASE
      WHEN abbr = 'CA' THEN
        CASE
          WHEN avg_intrastate_miles <= 50 THEN derived_2br_cubic_feet * 1.75 + avg_intrastate_miles * 2.50
          ELSE                                 derived_2br_cubic_feet * 1.75 + avg_intrastate_miles * 3.00
        END
      ELSE
        CASE
          WHEN avg_intrastate_miles <= 50 THEN derived_2br_cubic_feet * 1.20 + avg_intrastate_miles * 2.50
          ELSE                                 derived_2br_cubic_feet * 1.20 + avg_intrastate_miles * 3.00
        END
    END
  ),

  -- Local move high: CF × 1.60 (or 2.00 for CA) + miles × rate
  avg_movers_local_high = ROUND(
    CASE
      WHEN abbr = 'CA' THEN
        CASE
          WHEN avg_intrastate_miles <= 50 THEN derived_2br_cubic_feet * 2.00 + avg_intrastate_miles * 2.50
          ELSE                                 derived_2br_cubic_feet * 2.00 + avg_intrastate_miles * 3.00
        END
      ELSE
        CASE
          WHEN avg_intrastate_miles <= 50 THEN derived_2br_cubic_feet * 1.60 + avg_intrastate_miles * 2.50
          ELSE                                 derived_2br_cubic_feet * 1.60 + avg_intrastate_miles * 3.00
        END
    END
  ),

  -- Long-distance low
  avg_movers_ld_low = ROUND(
    CASE
      -- Consolidated >500 miles: region rate × CF × 1.20 (or 1.75 for CA)
      WHEN avg_interstate_miles > 500 AND abbr IN ('ME','NH','VT','MA','RI','CT','NY','NJ','PA','DE','MD','VA','WV','NC','SC','GA','FL','DC')
        THEN derived_2br_cubic_feet * 1.20 * 5.50
      WHEN avg_interstate_miles > 500 AND abbr IN ('OH','IN','IL','MI','WI','MN','IA','MO','ND','SD','NE','KS')
        THEN derived_2br_cubic_feet * 1.20 * 6.00
      WHEN avg_interstate_miles > 500 AND abbr = 'CA'
        THEN derived_2br_cubic_feet * 1.75 * 6.00
      WHEN avg_interstate_miles > 500 AND abbr IN ('TX','OK','NM','AZ','CO','UT','NV')
        THEN derived_2br_cubic_feet * 1.20 * 6.00
      WHEN avg_interstate_miles > 500 AND abbr IN ('WA','OR','ID','MT','WY','AK','HI')
        THEN derived_2br_cubic_feet * 1.20 * 7.00
      WHEN avg_interstate_miles > 500
        THEN derived_2br_cubic_feet * 1.20 * 6.00
      -- Mileage-based ≤500 miles
      WHEN abbr = 'CA' THEN derived_2br_cubic_feet * 1.75 + avg_interstate_miles * 3.00
      ELSE                  derived_2br_cubic_feet * 1.20 + avg_interstate_miles * 3.00
    END
  ),

  -- Long-distance high
  avg_movers_ld_high = ROUND(
    CASE
      -- Consolidated >500 miles: region rate × CF × 1.60 (or 2.00 for CA)
      WHEN avg_interstate_miles > 500 AND abbr IN ('ME','NH','VT','MA','RI','CT','NY','NJ','PA','DE','MD','VA','WV','NC','SC','GA','FL','DC')
        THEN derived_2br_cubic_feet * 1.60 * 5.50
      WHEN avg_interstate_miles > 500 AND abbr IN ('OH','IN','IL','MI','WI','MN','IA','MO','ND','SD','NE','KS')
        THEN derived_2br_cubic_feet * 1.60 * 6.00
      WHEN avg_interstate_miles > 500 AND abbr = 'CA'
        THEN derived_2br_cubic_feet * 2.00 * 6.00
      WHEN avg_interstate_miles > 500 AND abbr IN ('TX','OK','NM','AZ','CO','UT','NV')
        THEN derived_2br_cubic_feet * 1.60 * 6.00
      WHEN avg_interstate_miles > 500 AND abbr IN ('WA','OR','ID','MT','WY','AK','HI')
        THEN derived_2br_cubic_feet * 1.60 * 7.00
      WHEN avg_interstate_miles > 500
        THEN derived_2br_cubic_feet * 1.60 * 6.00
      -- Mileage-based ≤500 miles
      WHEN abbr = 'CA' THEN derived_2br_cubic_feet * 2.00 + avg_interstate_miles * 3.00
      ELSE                  derived_2br_cubic_feet * 1.60 + avg_interstate_miles * 3.00
    END
  ),

  updated_at = now();
