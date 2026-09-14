/*
  # Set Illinois hero image

  Updates the hero_image column for Illinois to use the new MovepriceIllinois.PNG asset.
*/

UPDATE state_census_data
SET hero_image = '/MovepriceIllinois.PNG'
WHERE abbr = 'IL';
