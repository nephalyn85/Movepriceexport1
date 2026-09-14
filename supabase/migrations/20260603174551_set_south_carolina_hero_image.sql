/*
  # Set South Carolina hero image

  Updates the hero_image for South Carolina to a Pixabay photo URL.
*/

UPDATE state_census_data
SET hero_image = 'https://cdn.pixabay.com/photo/2026/06/03/17/42/17-42-37-944_1280.jpg'
WHERE abbr = 'SC';