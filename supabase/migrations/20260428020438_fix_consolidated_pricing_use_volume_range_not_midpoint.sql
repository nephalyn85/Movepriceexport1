/*
  # Fix Consolidated Pricing: Use 2BR Volume Range (800–1200 ft³) Not Midpoint

  ## Problem
  Previous migrations used derived_2br_cubic_feet (a single midpoint value per state)
  to compute LD low and high prices. But the actual calculator uses a fixed volume
  RANGE for each home size:
    - 2BR low = 800 ft³, 2BR high = 1200 ft³

  For 500+ mile moves, the formula is:
    baseLow  = volume.low  × regionRate × 1  (normal day)
    baseHigh = volume.high × regionRate × 1

  ## Correct Values by Region
  - East Coast ($5.50/ft³): low = 800×5.50 = 4400, high = 1200×5.50 = 6600
  - Midwest ($6.00/ft³):    low = 800×6.00 = 4800, high = 1200×6.00 = 7200
  - West ($6.00/ft³):       low = 800×6.00 = 4800, high = 1200×6.00 = 7200
  - Northwest ($7.00/ft³):  low = 800×7.00 = 5600, high = 1200×7.00 = 8400
*/

UPDATE state_census_data
SET
  avg_movers_ld_low = CASE
    WHEN abbr IN ('ME','NH','VT','MA','RI','CT','NY','NJ','PA','DE','MD','VA','WV','NC','SC','GA','FL') THEN ROUND(800 * 5.50)
    WHEN abbr IN ('OH','IN','IL','MI','WI','MN','IA','MO','ND','SD','NE','KS') THEN ROUND(800 * 6.00)
    WHEN abbr IN ('TX','OK','NM','AZ','CO','UT','NV','CA') THEN ROUND(800 * 6.00)
    WHEN abbr IN ('WA','OR','ID','MT','WY','AK') THEN ROUND(800 * 7.00)
    ELSE ROUND(800 * 6.00)
  END,
  avg_movers_ld_high = CASE
    WHEN abbr IN ('ME','NH','VT','MA','RI','CT','NY','NJ','PA','DE','MD','VA','WV','NC','SC','GA','FL') THEN ROUND(1200 * 5.50)
    WHEN abbr IN ('OH','IN','IL','MI','WI','MN','IA','MO','ND','SD','NE','KS') THEN ROUND(1200 * 6.00)
    WHEN abbr IN ('TX','OK','NM','AZ','CO','UT','NV','CA') THEN ROUND(1200 * 6.00)
    WHEN abbr IN ('WA','OR','ID','MT','WY','AK') THEN ROUND(1200 * 7.00)
    ELSE ROUND(1200 * 6.00)
  END,
  updated_at = now()
WHERE avg_interstate_miles > 500
  AND abbr != 'HI';
