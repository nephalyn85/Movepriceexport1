/*
  # Set Idaho hero image

  Updates the hero_image column for Idaho to use the new MovepriceIdaho.PNG asset.
*/

UPDATE state_census_data
SET hero_image = '/MovepriceIdaho.PNG'
WHERE abbr = 'ID';
