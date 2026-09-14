/*
  # Set Arizona hero image
  Updates the hero_image field for Arizona to use the new state photo.
*/
UPDATE state_census_data
SET hero_image = '/Moveprice-arizona.PNG'
WHERE abbr = 'AZ';