/*
  # Recalculate 500+ Mile State Prices Using Consolidated Pricing

  ## Summary
  For states where avg_interstate_miles > 500, long-distance moves use consolidated
  (cubic-foot-based) pricing instead of a mileage rate. This matches the main
  MovePriceCalculator logic which switches to per-region flat rates at 500+ miles.

  ## Consolidated Rates by Region
  - East Coast states: $5.50/ft³ low, $7.15/ft³ high (× 1.30)
  - Midwest states:    $6.00/ft³ low, $7.80/ft³ high (× 1.30)
  - West states:       $6.00/ft³ low, $7.80/ft³ high (× 1.30)
  - Northwest states:  $7.00/ft³ low, $9.10/ft³ high (× 1.30)

  ## Affected States (avg_interstate_miles > 500)
  East Coast: DE, NC, PA, VA, VT, NH, MA, ME, MD, CT, RI, NJ, NY, FL, GA
  Midwest: OH, MI, WI, IL, MN
  West: AZ, NV, CO, CA, TX, UT
  Northwest: MT, OR, WA, AK

  ## States ≤ 500 miles (unchanged)
  Keep existing mileage-based formula for AL, AR, ID, IN, IA, KS, KY, LA,
  MO, MS, ND, NE, NM, OK, SC, SD, TN, WV, WY, KS, and HI (special case).

  ## Notes
  - Hawaii (HI) excluded — uses custom pricing including ocean freight
  - Formula: low = ROUND(derived_cubic_feet × region_rate), high = ROUND(derived_cubic_feet × region_rate × 1.30)
*/

UPDATE state_census_data
SET
  avg_movers_ld_low = ROUND(derived_cubic_feet * CASE
    -- East Coast: $5.50/ft³
    WHEN abbr IN ('ME','NH','VT','MA','RI','CT','NY','NJ','PA','DE','MD','VA','WV','NC','SC','GA','FL') THEN 5.50
    -- Midwest: $6.00/ft³
    WHEN abbr IN ('OH','IN','IL','MI','WI','MN','IA','MO','ND','SD','NE','KS') THEN 6.00
    -- West: $6.00/ft³
    WHEN abbr IN ('TX','OK','NM','AZ','CO','UT','NV','CA') THEN 6.00
    -- Northwest: $7.00/ft³
    WHEN abbr IN ('WA','OR','ID','MT','WY','AK') THEN 7.00
    ELSE 6.00
  END),
  avg_movers_ld_high = ROUND(derived_cubic_feet * CASE
    -- East Coast: $5.50 × 1.30
    WHEN abbr IN ('ME','NH','VT','MA','RI','CT','NY','NJ','PA','DE','MD','VA','WV','NC','SC','GA','FL') THEN 7.15
    -- Midwest: $6.00 × 1.30
    WHEN abbr IN ('OH','IN','IL','MI','WI','MN','IA','MO','ND','SD','NE','KS') THEN 7.80
    -- West: $6.00 × 1.30
    WHEN abbr IN ('TX','OK','NM','AZ','CO','UT','NV','CA') THEN 7.80
    -- Northwest: $7.00 × 1.30
    WHEN abbr IN ('WA','OR','ID','MT','WY','AK') THEN 9.10
    ELSE 7.80
  END),
  updated_at = now()
WHERE avg_interstate_miles > 500
  AND abbr != 'HI';
