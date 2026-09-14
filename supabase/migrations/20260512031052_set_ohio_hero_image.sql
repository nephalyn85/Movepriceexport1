/*
  # Set Ohio Hero Image

  Updates the hero_image field for Ohio to use the astronaut helmet branded image.
*/

UPDATE state_census_data
SET hero_image = '/Move-Price_Ohio.PNG'
WHERE name = 'Ohio';
