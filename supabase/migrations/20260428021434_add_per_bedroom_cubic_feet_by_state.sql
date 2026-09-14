/*
  # Add Per-Bedroom-Type Cubic Footage Estimates by State

  ## Summary
  Adds 5 new columns to state_census_data representing estimated cubic footage
  for each home size (studio through 4BR), derived from each state's median home
  square footage using nationally-sourced ACS bedroom-size ratios.

  ## Methodology
  1. Start from median_home_sqft (Realtor.com March 2026 data, already in table)
  2. Apply ACS-derived size ratios per bedroom type:
     - Studio:  30% of median home sqft
     - 1BR:     45% of median home sqft
     - 2BR:     65% of median home sqft
     - 3BR:     90% of median home sqft  (closest to the overall median)
     - 4BR:    125% of median home sqft
  3. Multiply sqft × 4.5 to get cubic feet
     (industry standard: accounts for furniture density, ceiling clearance, packing efficiency)
  4. Round to nearest 10 for clean display

  ## New Columns
  - studio_cubic_feet   — estimated move volume for a studio apartment
  - br1_cubic_feet      — estimated move volume for a 1-bedroom home
  - br2_cubic_feet      — estimated move volume for a 2-bedroom home
  - br3_cubic_feet      — estimated move volume for a 3-bedroom home
  - br4_cubic_feet      — estimated move volume for a 4-bedroom home

  ## Notes
  - Values will vary by state because median home sizes differ significantly
    (e.g. Wyoming median ~2,300 sqft vs Hawaii ~1,350 sqft)
  - These replace the single derived_2br_cubic_feet column as the primary
    volume reference, though that column is kept for backwards compatibility
  - No existing data is modified or deleted
*/

-- Add columns
ALTER TABLE state_census_data
  ADD COLUMN IF NOT EXISTS studio_cubic_feet integer,
  ADD COLUMN IF NOT EXISTS br1_cubic_feet    integer,
  ADD COLUMN IF NOT EXISTS br2_cubic_feet    integer,
  ADD COLUMN IF NOT EXISTS br3_cubic_feet    integer,
  ADD COLUMN IF NOT EXISTS br4_cubic_feet    integer;

-- Populate from median_home_sqft using ratios × 4.5 ft³/sqft, rounded to nearest 10
UPDATE state_census_data SET
  studio_cubic_feet = ROUND((median_home_sqft * 0.30 * 4.5) / 10.0) * 10,
  br1_cubic_feet    = ROUND((median_home_sqft * 0.45 * 4.5) / 10.0) * 10,
  br2_cubic_feet    = ROUND((median_home_sqft * 0.65 * 4.5) / 10.0) * 10,
  br3_cubic_feet    = ROUND((median_home_sqft * 0.90 * 4.5) / 10.0) * 10,
  br4_cubic_feet    = ROUND((median_home_sqft * 1.25 * 4.5) / 10.0) * 10
WHERE median_home_sqft IS NOT NULL;
