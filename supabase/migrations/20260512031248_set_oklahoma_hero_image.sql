/*
  # Set Oklahoma Hero Image

  Updates the hero_image field for Oklahoma to use the new tornado/oil rig
  branded image added to the public folder.
*/

UPDATE state_census_data
SET hero_image = '/Move-Price__Oklahoma.PNG'
WHERE name = 'Oklahoma';
