/*
  # Set Georgia hero image
  Updates the hero_image field for Georgia to use the new state photo.
*/
UPDATE state_census_data
SET hero_image = '/Moveprice-georgia.PNG'
WHERE abbr = 'GA';