/*
  # Set Texas hero image

  Updates the hero_image for Texas to a Pixabay photo URL.
*/

UPDATE state_census_data
SET hero_image = 'https://cdn.pixabay.com/photo/2026/06/03/18/15/18-15-49-496_1280.jpg'
WHERE abbr = 'TX';