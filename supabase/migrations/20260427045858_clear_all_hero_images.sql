/*
  # Clear all state hero images

  Sets hero_image to NULL for all states, removing all existing photo references.
*/

UPDATE state_census_data SET hero_image = NULL;
