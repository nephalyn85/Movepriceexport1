/*
  # Recalculate All 50 States Using New Calculator Formula

  ## Summary
  Updates avg_movers_local_low, avg_movers_local_high, avg_movers_ld_low, avg_movers_ld_high
  for all 50 states using the exact same pricing logic as MovePriceCalculator.tsx.

  ## Local Move Formula (uses state-specific derived_2br_cubic_feet + avg_intrastate_miles)
  - Tier ≤50 mi:   low = cf × 1.00 + miles × 2.00,  high = cf × 1.30 + miles × 2.00
  - Tier 51-300:   low = cf × 1.00 + miles × 2.50,  high = cf × 1.30 + miles × 2.50
  - Tier 301-500:  low = cf × 1.00 + miles × 3.00,  high = cf × 1.30 + miles × 3.00

  ## Long-Distance Formula (uses avg_interstate_miles)
  - If interstate_miles ≤ 300: low = cf × 1.00 + miles × 2.50, high = cf × 1.30 + miles × 2.50
  - If interstate_miles 301-500: low = cf × 1.00 + miles × 3.00, high = cf × 1.30 + miles × 3.00
  - If interstate_miles > 500 (consolidated, uses fixed 800/1200 cf range):
    - East Coast states (ME,NH,VT,MA,RI,CT,NY,NJ,PA,DE,MD,VA,WV,NC,SC,GA,FL,DC): 800×5.50 / 1200×5.50
    - Midwest states (OH,IN,IL,MI,WI,MN,IA,MO,ND,SD,NE,KS): 800×6.00 / 1200×6.00
    - West states (TX,OK,NM,AZ,CO,UT,NV,CA): 800×6.00 / 1200×6.00
    - Northwest states (WA,OR,ID,MT,WY,AK,HI): 800×7.00 / 1200×7.00
    - Default fallback: 800×6.00 / 1200×6.00

  ## Special Cases
  - Hawaii and Alaska keep consolidated pricing (interstate_miles > 500)
  - All values rounded to nearest whole dollar
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
      WHEN avg_intrastate_miles <= 50  THEN derived_2br_cubic_feet * 1.30 + avg_intrastate_miles * 2.00
      WHEN avg_intrastate_miles <= 300 THEN derived_2br_cubic_feet * 1.30 + avg_intrastate_miles * 2.50
      ELSE                                  derived_2br_cubic_feet * 1.30 + avg_intrastate_miles * 3.00
    END
  ),
  avg_movers_ld_low = ROUND(
    CASE
      -- Consolidated >500 miles: fixed volume range 800–1200 cf, region rate
      WHEN avg_interstate_miles > 500 AND abbr IN ('ME','NH','VT','MA','RI','CT','NY','NJ','PA','DE','MD','VA','WV','NC','SC','GA','FL','DC') THEN 800 * 5.50
      WHEN avg_interstate_miles > 500 AND abbr IN ('OH','IN','IL','MI','WI','MN','IA','MO','ND','SD','NE','KS') THEN 800 * 6.00
      WHEN avg_interstate_miles > 500 AND abbr IN ('TX','OK','NM','AZ','CO','UT','NV','CA') THEN 800 * 6.00
      WHEN avg_interstate_miles > 500 AND abbr IN ('WA','OR','ID','MT','WY','AK','HI') THEN 800 * 7.00
      WHEN avg_interstate_miles > 500 THEN 800 * 6.00
      -- Mileage-based ≤500 miles
      WHEN avg_interstate_miles <= 300 THEN derived_2br_cubic_feet * 1.00 + avg_interstate_miles * 2.50
      ELSE                                  derived_2br_cubic_feet * 1.00 + avg_interstate_miles * 3.00
    END
  ),
  avg_movers_ld_high = ROUND(
    CASE
      -- Consolidated >500 miles: fixed volume range 800–1200 cf, region rate
      WHEN avg_interstate_miles > 500 AND abbr IN ('ME','NH','VT','MA','RI','CT','NY','NJ','PA','DE','MD','VA','WV','NC','SC','GA','FL','DC') THEN 1200 * 5.50
      WHEN avg_interstate_miles > 500 AND abbr IN ('OH','IN','IL','MI','WI','MN','IA','MO','ND','SD','NE','KS') THEN 1200 * 6.00
      WHEN avg_interstate_miles > 500 AND abbr IN ('TX','OK','NM','AZ','CO','UT','NV','CA') THEN 1200 * 6.00
      WHEN avg_interstate_miles > 500 AND abbr IN ('WA','OR','ID','MT','WY','AK','HI') THEN 1200 * 7.00
      WHEN avg_interstate_miles > 500 THEN 1200 * 6.00
      -- Mileage-based ≤500 miles
      WHEN avg_interstate_miles <= 300 THEN derived_2br_cubic_feet * 1.30 + avg_interstate_miles * 2.50
      ELSE                                  derived_2br_cubic_feet * 1.30 + avg_interstate_miles * 3.00
    END
  );
