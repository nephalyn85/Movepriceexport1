/*
  # Set Florida hero image
  Updates the hero_image field for Florida to use the new state photo.
*/
UPDATE state_census_data
SET hero_image = '/Moveprice-florida.PNG'
WHERE abbr = 'FL';