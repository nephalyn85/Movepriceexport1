/*
  # Set North Carolina hero image

  Updates the hero_image field for North Carolina in the state_census_data table.
*/

UPDATE state_census_data
SET hero_image = '/MovePrice-North_Carolina.PNG'
WHERE abbr = 'NC';
