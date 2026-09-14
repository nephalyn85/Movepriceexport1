/*
  # Set Colorado hero image
  Updates the hero_image field for Colorado to use the new state photo.
*/
UPDATE state_census_data
SET hero_image = '/Moveprice-colorado.PNG'
WHERE abbr = 'CO';