/*
  # Add 2BR sq ft columns and recalculate mover prices

  ## Summary
  The previous formula used all-home median sq ft (from Realtor.com) to derive
  cubic feet, but the UI labels prices as "2BR" estimates. A 2-bedroom home is
  typically ~62% the size of the all-home median. This migration:

  1. Adds two new columns:
     - `median_2br_sqft`: all-home median × 0.62, rounded to nearest integer
     - `derived_2br_cubic_feet`: median_2br_sqft × 1.08, rounded

  2. Recalculates avg_movers_local_low/high and avg_movers_ld_low/high using
     derived_2br_cubic_feet so the displayed prices accurately reflect a 2BR move.

  ## Formula
  - median_2br_sqft        = ROUND(median_home_sqft × 0.62)
  - derived_2br_cubic_feet = ROUND(median_2br_sqft × 1.08)
  - local low              = ROUND(derived_2br_cubic_feet × 1.00 + avg_intrastate_miles × 2.00)
  - local high             = ROUND(derived_2br_cubic_feet × 1.30 + avg_intrastate_miles × 2.00)
  - LD low                 = ROUND(derived_2br_cubic_feet × 1.00 + avg_interstate_miles × rate_tier)
  - LD high                = ROUND(derived_2br_cubic_feet × 1.30 + avg_interstate_miles × rate_tier)

  ## LD Rate Tiers (unchanged)
  - avg_interstate_miles ≤ 300 → $2.50/mi
  - avg_interstate_miles ≤ 500 → $3.00/mi
  - avg_interstate_miles >  500 → $3.50/mi

  ## Notes
  - Hawaii (HI) excluded from price recalculation — container shipping model
  - derived_cubic_feet (all-home) is preserved for display/reference
  - New columns use IF NOT EXISTS to be safe on re-run
*/

-- Step 1: add new columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'state_census_data' AND column_name = 'median_2br_sqft'
  ) THEN
    ALTER TABLE state_census_data ADD COLUMN median_2br_sqft integer DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'state_census_data' AND column_name = 'derived_2br_cubic_feet'
  ) THEN
    ALTER TABLE state_census_data ADD COLUMN derived_2br_cubic_feet integer DEFAULT 0;
  END IF;
END $$;

-- Step 2: populate 2BR values for all states
UPDATE state_census_data
SET
  median_2br_sqft        = ROUND(median_home_sqft * 0.62),
  derived_2br_cubic_feet = ROUND(ROUND(median_home_sqft * 0.62) * 1.08),
  updated_at = now();

-- Step 3: recalculate mover prices using 2BR cubic feet (exclude HI)
UPDATE state_census_data
SET
  avg_movers_local_low  = ROUND(derived_2br_cubic_feet * 1.00 + avg_intrastate_miles * 2.00),
  avg_movers_local_high = ROUND(derived_2br_cubic_feet * 1.30 + avg_intrastate_miles * 2.00),
  avg_movers_ld_low  = ROUND(
    derived_2br_cubic_feet * 1.00 +
    avg_interstate_miles * CASE
      WHEN avg_interstate_miles <= 300 THEN 2.50
      WHEN avg_interstate_miles <= 500 THEN 3.00
      ELSE 3.50
    END
  ),
  avg_movers_ld_high = ROUND(
    derived_2br_cubic_feet * 1.30 +
    avg_interstate_miles * CASE
      WHEN avg_interstate_miles <= 300 THEN 2.50
      WHEN avg_interstate_miles <= 500 THEN 3.00
      ELSE 3.50
    END
  ),
  updated_at = now()
WHERE abbr != 'HI';
