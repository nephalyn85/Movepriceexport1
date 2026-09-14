/*
  # Set West Virginia hero image

  Updates the hero_image for West Virginia to a Pixabay photo URL.
*/

UPDATE state_census_data
SET hero_image = 'https://cdn.pixabay.com/photo/2026/06/03/19/58/19-58-01-837_1280.jpg'
WHERE abbr = 'WV';