/*
  # Set South Dakota hero image

  Updates the hero_image for South Dakota to a Pixabay photo URL.
*/

UPDATE state_census_data
SET hero_image = 'https://cdn.pixabay.com/photo/2026/06/03/18/01/18-01-20-849_1280.jpg'
WHERE abbr = 'SD';