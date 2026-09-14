/*
  # Set Washington hero image

  Updates the hero_image for Washington to a Pixabay photo URL.
*/

UPDATE state_census_data
SET hero_image = 'https://cdn.pixabay.com/photo/2026/06/03/19/48/19-48-22-520_1280.jpg'
WHERE abbr = 'WA';