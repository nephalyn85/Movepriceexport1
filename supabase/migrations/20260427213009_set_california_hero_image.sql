/*
  # Set California hero image
  Updates the hero_image field for California to use the new state photo.
*/
UPDATE state_census_data
SET hero_image = '/Moveprice-california.PNG'
WHERE abbr = 'CA';