/*
  # Recalculate all mover prices using new formula

  ## Formula
  Full-service movers price = cubic_ft + mileage
  - Mileage tiers: ≤50 mi → $2/mi | 51–300 mi → $2.50/mi | 301–500 mi → $3/mi | >500 mi → flat $6/cu ft (no mileage)
  - Reference home size for routes: 2BR = 800–1,200 cu ft (low/high)
  - Local avg (25 mi × $2 = $50): 2BR → low=850, high=1250
  - Long-distance avg (800+ mi → $6/cu ft): 2BR → low=4800, high=7200

  ## Changes
  - All popular_routes moversLow/moversHigh recalculated per distance tier
  - avg_movers_local_low/high updated to reflect 25-mile 2BR baseline
  - avg_movers_ld_low/high updated to reflect 800+ mile 2BR baseline ($6/cu ft)

  ## Formula helper (JavaScript logic translated to values):
  function calc(vol_low, vol_high, miles) {
    if (miles > 500) return { low: vol_low * 6, high: vol_high * 6 }
    const rate = miles <= 50 ? 2 : miles <= 300 ? 2.5 : 3
    return { low: round(vol_low + miles * rate), high: round(vol_high + miles * rate) }
  }
  // 2BR: vol_low=800, vol_high=1200
*/

-- Helper function to compute movers price using new formula (2BR reference)
CREATE OR REPLACE FUNCTION calc_movers_price(miles integer, is_low boolean)
RETURNS integer AS $$
DECLARE
  vol integer;
  rate numeric;
BEGIN
  vol := CASE WHEN is_low THEN 800 ELSE 1200 END;
  IF miles > 500 THEN
    RETURN vol * 6;
  ELSIF miles <= 50 THEN
    rate := 2.0;
  ELSIF miles <= 300 THEN
    rate := 2.5;
  ELSE
    rate := 3.0;
  END IF;
  RETURN ROUND(vol + miles * rate);
END;
$$ LANGUAGE plpgsql;

-- Update each state's popular_routes with recalculated moversLow/moversHigh
UPDATE state_census_data
SET popular_routes = (
  SELECT jsonb_agg(
    route || jsonb_build_object(
      'moversLow',  calc_movers_price((route->>'miles')::integer, true),
      'moversHigh', calc_movers_price((route->>'miles')::integer, false)
    )
  )
  FROM jsonb_array_elements(popular_routes) AS route
);

-- Update local averages: 25 miles, 2BR → 800+50=850 low, 1200+50=1250 high
-- Keep relative cost-of-living differences by scaling from a base ratio
-- Base: local_low/high ratio preserved but anchored to new formula baseline
-- Simple approach: set all to formula values, then apply a city cost multiplier
-- We preserve the existing ratio (high/low) and scale to new formula midpoints

-- For local: formula at 25 mi → low=850, high=1250
-- For long distance: formula at 800+ mi → low=4800, high=7200
-- We scale each state's existing values to match the new formula anchors

UPDATE state_census_data SET
  avg_movers_local_low  = ROUND(850  * (avg_movers_local_low::numeric  / 900)),
  avg_movers_local_high = ROUND(1250 * (avg_movers_local_high::numeric / 1700)),
  avg_movers_ld_low     = ROUND(4800 * (avg_movers_ld_low::numeric     / 2800)),
  avg_movers_ld_high    = ROUND(7200 * (avg_movers_ld_high::numeric    / 6500));

-- Clean up helper function
DROP FUNCTION calc_movers_price(integer, boolean);
