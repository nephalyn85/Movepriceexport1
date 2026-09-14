/*
  # Restore original local hero image paths

  Reverts the Pexels URL migration back to the original local file paths
  that were stored before migration 20260601221626.
*/

UPDATE state_census_data SET hero_image = '/Moveprice-alabama.PNG'       WHERE name = 'Alabama';
UPDATE state_census_data SET hero_image = '/Moveprice-alaska.PNG'         WHERE name = 'Alaska';
UPDATE state_census_data SET hero_image = '/Moveprice-arizona.PNG'        WHERE name = 'Arizona';
UPDATE state_census_data SET hero_image = '/Moveprice-arkansas.PNG'       WHERE name = 'Arkansas';
UPDATE state_census_data SET hero_image = '/Moveprice-california.PNG'     WHERE name = 'California';
UPDATE state_census_data SET hero_image = '/Moveprice-colorado.PNG'       WHERE name = 'Colorado';
UPDATE state_census_data SET hero_image = '/Moveprice-Connecticut.PNG'    WHERE name = 'Connecticut';
UPDATE state_census_data SET hero_image = '/Moveprice-delaware.PNG'       WHERE name = 'Delaware';
UPDATE state_census_data SET hero_image = '/Moveprice-florida.PNG'        WHERE name = 'Florida';
UPDATE state_census_data SET hero_image = '/Moveprice-georgia.PNG'        WHERE name = 'Georgia';
UPDATE state_census_data SET hero_image = '/MovePrice-Hawaii.png'         WHERE name = 'Hawaii';
UPDATE state_census_data SET hero_image = '/Moveprice-idaho.PNG'          WHERE name = 'Idaho';
UPDATE state_census_data SET hero_image = '/MovePrice-Illinois.png'       WHERE name = 'Illinois';
UPDATE state_census_data SET hero_image = '/MovePrice-Indiana.png'        WHERE name = 'Indiana';
UPDATE state_census_data SET hero_image = '/Moveprice-iowa.PNG'           WHERE name = 'Iowa';
UPDATE state_census_data SET hero_image = '/MovePrice-Kansas.png'         WHERE name = 'Kansas';
UPDATE state_census_data SET hero_image = '/MovePrice-Kentucky.png'       WHERE name = 'Kentucky';
UPDATE state_census_data SET hero_image = '/MovePrice-Louisiana.png'      WHERE name = 'Louisiana';
UPDATE state_census_data SET hero_image = '/MovePrice-Maine.png'          WHERE name = 'Maine';
UPDATE state_census_data SET hero_image = '/MovePrice-Maryland.png'       WHERE name = 'Maryland';
UPDATE state_census_data SET hero_image = '/MovePrice-Massachusetts.png'  WHERE name = 'Massachusetts';
UPDATE state_census_data SET hero_image = '/MovePrice-Michigan.png'       WHERE name = 'Michigan';
UPDATE state_census_data SET hero_image = '/MovePrice-Minnesota.png'      WHERE name = 'Minnesota';
UPDATE state_census_data SET hero_image = '/MovePrice-Mississippi.png'    WHERE name = 'Mississippi';
UPDATE state_census_data SET hero_image = '/MovePrice-Missouri.png'       WHERE name = 'Missouri';
UPDATE state_census_data SET hero_image = '/MovePrice-Montana.png'        WHERE name = 'Montana';
UPDATE state_census_data SET hero_image = '/MovePrice-Nebraska.png'       WHERE name = 'Nebraska';
UPDATE state_census_data SET hero_image = '/MovePrice-Nevada.png'         WHERE name = 'Nevada';
UPDATE state_census_data SET hero_image = '/MovePrice-New_Hampshire.png'  WHERE name = 'New Hampshire';
UPDATE state_census_data SET hero_image = '/MovePrice-New_Jersey.png'     WHERE name = 'New Jersey';
UPDATE state_census_data SET hero_image = '/MovePrice-New_Mexico.png'     WHERE name = 'New Mexico';
UPDATE state_census_data SET hero_image = '/MovePrice-New_York.png'       WHERE name = 'New York';
UPDATE state_census_data SET hero_image = '/MovePrice-North_Carolina.PNG' WHERE name = 'North Carolina';
UPDATE state_census_data SET hero_image = '/Move-Price_North_Dakota.PNG'  WHERE name = 'North Dakota';
UPDATE state_census_data SET hero_image = '/Move-Price_Ohio.PNG'          WHERE name = 'Ohio';
UPDATE state_census_data SET hero_image = '/Move-Price__Oklahoma.PNG'     WHERE name = 'Oklahoma';
UPDATE state_census_data SET hero_image = '/Move-Price__Oregon.PNG'       WHERE name = 'Oregon';
UPDATE state_census_data SET hero_image = NULL                            WHERE name = 'Pennsylvania';
UPDATE state_census_data SET hero_image = NULL                            WHERE name = 'Rhode Island';
UPDATE state_census_data SET hero_image = NULL                            WHERE name = 'South Carolina';
UPDATE state_census_data SET hero_image = NULL                            WHERE name = 'South Dakota';
UPDATE state_census_data SET hero_image = NULL                            WHERE name = 'Tennessee';
UPDATE state_census_data SET hero_image = NULL                            WHERE name = 'Texas';
UPDATE state_census_data SET hero_image = NULL                            WHERE name = 'Utah';
UPDATE state_census_data SET hero_image = NULL                            WHERE name = 'Vermont';
UPDATE state_census_data SET hero_image = NULL                            WHERE name = 'Virginia';
UPDATE state_census_data SET hero_image = NULL                            WHERE name = 'Washington';
UPDATE state_census_data SET hero_image = NULL                            WHERE name = 'West Virginia';
UPDATE state_census_data SET hero_image = NULL                            WHERE name = 'Wisconsin';
UPDATE state_census_data SET hero_image = NULL                            WHERE name = 'Wyoming';
