/*
  # Set Connecticut hero image
  Updates the hero_image field for Connecticut to use the new state photo.
*/
UPDATE state_census_data
SET hero_image = '/Moveprice-Connecticut.PNG'
WHERE abbr = 'CT';