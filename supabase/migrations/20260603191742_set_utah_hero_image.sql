/*
  # Set Utah hero image

  Updates the hero_image for Utah to a Pixabay photo URL.
*/

UPDATE state_census_data
SET hero_image = 'https://cdn.pixabay.com/photo/2026/06/03/19/15/19-15-14-190_1280.jpg'
WHERE abbr = 'UT';