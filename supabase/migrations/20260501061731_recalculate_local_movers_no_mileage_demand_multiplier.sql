/*
  # Recalculate Local Mover Prices — Remove Mileage, Use Demand Multiplier

  ## Summary
  Local movers charge by the hour, not by the mile. The previous formula incorrectly
  added a per-mile cost to local moves (e.g., avg_intrastate_miles × $2.00–$3.00).
  This migration removes mileage entirely from local pricing and replaces it with a
  demand-level multiplier based on each state's moving market competitiveness.

  ## New Local Move Formula
  Local move cost = derived_2br_cubic_feet × base_rate × demand_multiplier

  ### Base rates (AMSA-anchored, per cubic foot)
    Low end:  $1.00/ft³
    High end: $1.25/ft³

  ### Demand multipliers by demand_level
  | demand_level | low multiplier | high multiplier | Rationale                          |
  |-------------|---------------|----------------|-------------------------------------|
  | low         | ×1.00         | ×1.25          | Competitive market, lower labor cost|
  | medium      | ×1.10         | ×1.38          | Average market conditions           |
  | high        | ×1.20         | ×1.50          | Busy market, higher labor rates     |
  | very_high   | ×1.35         | ×1.70          | NYC/NJ/CA — premium labor markets   |

  ## Long-Distance Pricing — Unchanged
  Long-distance (LD) prices retain mileage because trucking/transport costs genuinely
  scale with distance for interstate moves.

  ## Columns Updated
  - avg_movers_local_low
  - avg_movers_local_high

  ## All 50 States Affected
*/

UPDATE state_census_data
SET
  avg_movers_local_low = ROUND(
    derived_2br_cubic_feet * 1.00 *
    CASE demand_level
      WHEN 'low'       THEN 1.00
      WHEN 'medium'    THEN 1.10
      WHEN 'high'      THEN 1.20
      WHEN 'very_high' THEN 1.35
      ELSE 1.10
    END
  ),
  avg_movers_local_high = ROUND(
    derived_2br_cubic_feet * 1.25 *
    CASE demand_level
      WHEN 'low'       THEN 1.00
      WHEN 'medium'    THEN 1.10
      WHEN 'high'      THEN 1.20
      WHEN 'very_high' THEN 1.35
      ELSE 1.10
    END
  ),
  updated_at = now();
