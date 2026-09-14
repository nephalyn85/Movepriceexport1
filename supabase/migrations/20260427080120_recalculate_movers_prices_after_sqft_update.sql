/*
  # Recalculate Movers Prices After Realtor.com sq ft Update

  ## Summary
  Recalculates avg_movers_local_low/high and avg_movers_ld_low/high for all states
  using the same cubic ft formula established in the previous pricing migration,
  now applied to the freshly updated derived_cubic_feet values from Realtor.com data.

  ## Formula (unchanged from prior migration)
  - Local low:  ROUND(derived_cubic_feet × 1.00 + avg_intrastate_miles × 2.00)
  - Local high: ROUND(derived_cubic_feet × 1.30 + avg_intrastate_miles × 2.00)
  - LD low:     ROUND(derived_cubic_feet × 1.00 + avg_interstate_miles × rate_tier)
  - LD high:    ROUND(derived_cubic_feet × 1.30 + avg_interstate_miles × rate_tier)

  ## LD Mileage Rate Tiers (unchanged)
  - avg_interstate_miles <= 300 → $2.50/mi
  - avg_interstate_miles <= 500 → $3.00/mi
  - avg_interstate_miles >  500 → $3.50/mi

  ## Notes
  - Hawaii (HI) is intentionally excluded — prices kept as-is
  - Applies to all 50 states + DC except HI
*/

UPDATE state_census_data
SET
  avg_movers_local_low  = ROUND(derived_cubic_feet * 1.00 + avg_intrastate_miles * 2.00),
  avg_movers_local_high = ROUND(derived_cubic_feet * 1.30 + avg_intrastate_miles * 2.00),
  avg_movers_ld_low  = ROUND(
    derived_cubic_feet * 1.00 +
    avg_interstate_miles * CASE
      WHEN avg_interstate_miles <= 300 THEN 2.50
      WHEN avg_interstate_miles <= 500 THEN 3.00
      ELSE 3.50
    END
  ),
  avg_movers_ld_high = ROUND(
    derived_cubic_feet * 1.30 +
    avg_interstate_miles * CASE
      WHEN avg_interstate_miles <= 300 THEN 2.50
      WHEN avg_interstate_miles <= 500 THEN 3.00
      ELSE 3.50
    END
  ),
  updated_at = now()
WHERE abbr != 'HI';
