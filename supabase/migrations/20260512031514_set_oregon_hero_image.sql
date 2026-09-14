/*
  # Set Oregon Hero Image

  Updates the hero_image field for Oregon to use the new bicycle/forest
  branded image added to the public folder.
*/

UPDATE state_census_data
SET hero_image = '/Move-Price__Oregon.PNG'
WHERE name = 'Oregon';
