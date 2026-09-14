/*
  # Set Indiana hero image

  Updates the hero_image column for Indiana to use the new MovepriceIndiana.PNG asset.
*/

UPDATE state_census_data
SET hero_image = '/MovepriceIndiana.PNG'
WHERE abbr = 'IN';
