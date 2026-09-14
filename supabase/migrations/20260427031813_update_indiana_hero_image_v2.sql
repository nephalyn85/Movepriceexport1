/*
  # Update Indiana hero image to v2

  Replaces the Indiana hero image with MovepriceIndiana2.PNG.
*/

UPDATE state_census_data
SET hero_image = '/MovepriceIndiana2.PNG'
WHERE abbr = 'IN';
