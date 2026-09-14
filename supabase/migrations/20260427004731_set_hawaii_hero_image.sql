/*
  # Set Hawaii hero image

  Updates the hero_image column for Hawaii to use the new MovepriceHawaii.PNG asset.
*/

UPDATE state_census_data
SET hero_image = '/MovepriceHawaii.PNG'
WHERE abbr = 'HI';
