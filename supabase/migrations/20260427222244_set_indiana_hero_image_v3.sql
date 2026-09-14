/*
  # Set Indiana hero image
  Updates the hero_image field for Indiana to use the new state photo.
*/
UPDATE state_census_data
SET hero_image = '/Moveprice-indiana.PNG'
WHERE abbr = 'IN';