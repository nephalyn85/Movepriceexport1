/*
  # Set Delaware hero image
  Updates the hero_image field for Delaware to use the new state photo.
*/
UPDATE state_census_data
SET hero_image = '/Moveprice-delaware.PNG'
WHERE abbr = 'DE';