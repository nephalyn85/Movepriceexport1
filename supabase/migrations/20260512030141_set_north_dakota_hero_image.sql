/*
  # Set North Dakota Hero Image

  Updates the hero_image field for North Dakota to use the new bison/prairie
  branded image added to the public folder.
*/

UPDATE state_census_data
SET hero_image = '/Move-Price_North_Dakota.PNG'
WHERE name = 'North Dakota';
