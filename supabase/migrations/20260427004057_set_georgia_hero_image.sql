/*
  # Set Georgia hero image

  Updates the hero_image column for Georgia to use the new MovepriceGeorgia.PNG asset.
*/

UPDATE state_census_data
SET hero_image = '/MovepriceGeorgia.PNG'
WHERE abbr = 'GA';
