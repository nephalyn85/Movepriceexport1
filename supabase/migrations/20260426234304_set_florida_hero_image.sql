/*
  # Set Florida hero image
  Updates the hero_image column for Florida to use the new MovepriceFlorida.PNG asset.
*/
UPDATE state_census_data
SET hero_image = '/MovepriceFlorida.PNG'
WHERE abbr = 'FL';
