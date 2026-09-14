/*
  # Replace local hero image paths with Pexels URLs

  All state hero images were stored as local file paths (e.g. /Moveprice-arizona.PNG)
  pointing to files in the old repo's public/ folder. Those files are gone.
  This migration replaces every hero_image with a permanent Pexels photo URL
  so images work on any deployment without needing local files.
*/

UPDATE state_census_data SET hero_image = 'https://images.pexels.com/photos/2563681/pexels-photo-2563681.jpeg?auto=compress&cs=tinysrgb&w=1200' WHERE name = 'Alabama';
UPDATE state_census_data SET hero_image = 'https://images.pexels.com/photos/1433052/pexels-photo-1433052.jpeg?auto=compress&cs=tinysrgb&w=1200' WHERE name = 'Alaska';
UPDATE state_census_data SET hero_image = 'https://images.pexels.com/photos/1366919/pexels-photo-1366919.jpeg?auto=compress&cs=tinysrgb&w=1200' WHERE name = 'Arizona';
UPDATE state_census_data SET hero_image = 'https://images.pexels.com/photos/259950/pexels-photo-259950.jpeg?auto=compress&cs=tinysrgb&w=1200' WHERE name = 'Arkansas';
UPDATE state_census_data SET hero_image = 'https://images.pexels.com/photos/1586298/pexels-photo-1586298.jpeg?auto=compress&cs=tinysrgb&w=1200' WHERE name = 'California';
UPDATE state_census_data SET hero_image = 'https://images.pexels.com/photos/1464183/pexels-photo-1464183.jpeg?auto=compress&cs=tinysrgb&w=1200' WHERE name = 'Colorado';
UPDATE state_census_data SET hero_image = 'https://images.pexels.com/photos/2850287/pexels-photo-2850287.jpeg?auto=compress&cs=tinysrgb&w=1200' WHERE name = 'Connecticut';
UPDATE state_census_data SET hero_image = 'https://images.pexels.com/photos/1559699/pexels-photo-1559699.jpeg?auto=compress&cs=tinysrgb&w=1200' WHERE name = 'Delaware';
UPDATE state_census_data SET hero_image = 'https://images.pexels.com/photos/1268855/pexels-photo-1268855.jpeg?auto=compress&cs=tinysrgb&w=1200' WHERE name = 'Florida';
UPDATE state_census_data SET hero_image = 'https://images.pexels.com/photos/1486222/pexels-photo-1486222.jpeg?auto=compress&cs=tinysrgb&w=1200' WHERE name = 'Georgia';
UPDATE state_census_data SET hero_image = 'https://images.pexels.com/photos/1032650/pexels-photo-1032650.jpeg?auto=compress&cs=tinysrgb&w=1200' WHERE name = 'Hawaii';
UPDATE state_census_data SET hero_image = 'https://images.pexels.com/photos/1578484/pexels-photo-1578484.jpeg?auto=compress&cs=tinysrgb&w=1200' WHERE name = 'Idaho';
UPDATE state_census_data SET hero_image = 'https://images.pexels.com/photos/1823681/pexels-photo-1823681.jpeg?auto=compress&cs=tinysrgb&w=1200' WHERE name = 'Illinois';
UPDATE state_census_data SET hero_image = 'https://images.pexels.com/photos/2611692/pexels-photo-2611692.jpeg?auto=compress&cs=tinysrgb&w=1200' WHERE name = 'Indiana';
UPDATE state_census_data SET hero_image = 'https://images.pexels.com/photos/325185/pexels-photo-325185.jpeg?auto=compress&cs=tinysrgb&w=1200' WHERE name = 'Iowa';
UPDATE state_census_data SET hero_image = 'https://images.pexels.com/photos/440731/pexels-photo-440731.jpeg?auto=compress&cs=tinysrgb&w=1200' WHERE name = 'Kansas';
UPDATE state_census_data SET hero_image = 'https://images.pexels.com/photos/2382681/pexels-photo-2382681.jpeg?auto=compress&cs=tinysrgb&w=1200' WHERE name = 'Kentucky';
UPDATE state_census_data SET hero_image = 'https://images.pexels.com/photos/1631677/pexels-photo-1631677.jpeg?auto=compress&cs=tinysrgb&w=1200' WHERE name = 'Louisiana';
UPDATE state_census_data SET hero_image = 'https://images.pexels.com/photos/1562004/pexels-photo-1562004.jpeg?auto=compress&cs=tinysrgb&w=1200' WHERE name = 'Maine';
UPDATE state_census_data SET hero_image = 'https://images.pexels.com/photos/1170831/pexels-photo-1170831.jpeg?auto=compress&cs=tinysrgb&w=1200' WHERE name = 'Maryland';
UPDATE state_census_data SET hero_image = 'https://images.pexels.com/photos/1486785/pexels-photo-1486785.jpeg?auto=compress&cs=tinysrgb&w=1200' WHERE name = 'Massachusetts';
UPDATE state_census_data SET hero_image = 'https://images.pexels.com/photos/1287145/pexels-photo-1287145.jpeg?auto=compress&cs=tinysrgb&w=1200' WHERE name = 'Michigan';
UPDATE state_census_data SET hero_image = 'https://images.pexels.com/photos/1005417/pexels-photo-1005417.jpeg?auto=compress&cs=tinysrgb&w=1200' WHERE name = 'Minnesota';
UPDATE state_census_data SET hero_image = 'https://images.pexels.com/photos/2827374/pexels-photo-2827374.jpeg?auto=compress&cs=tinysrgb&w=1200' WHERE name = 'Mississippi';
UPDATE state_census_data SET hero_image = 'https://images.pexels.com/photos/1796730/pexels-photo-1796730.jpeg?auto=compress&cs=tinysrgb&w=1200' WHERE name = 'Missouri';
UPDATE state_census_data SET hero_image = 'https://images.pexels.com/photos/1647962/pexels-photo-1647962.jpeg?auto=compress&cs=tinysrgb&w=1200' WHERE name = 'Montana';
UPDATE state_census_data SET hero_image = 'https://images.pexels.com/photos/2249293/pexels-photo-2249293.jpeg?auto=compress&cs=tinysrgb&w=1200' WHERE name = 'Nebraska';
UPDATE state_census_data SET hero_image = 'https://images.pexels.com/photos/2837863/pexels-photo-2837863.jpeg?auto=compress&cs=tinysrgb&w=1200' WHERE name = 'Nevada';
UPDATE state_census_data SET hero_image = 'https://images.pexels.com/photos/1660995/pexels-photo-1660995.jpeg?auto=compress&cs=tinysrgb&w=1200' WHERE name = 'New Hampshire';
UPDATE state_census_data SET hero_image = 'https://images.pexels.com/photos/凌/pexels-photo-凌.jpeg?auto=compress&cs=tinysrgb&w=1200' WHERE name = 'New Jersey';
UPDATE state_census_data SET hero_image = 'https://images.pexels.com/photos/2440061/pexels-photo-2440061.jpeg?auto=compress&cs=tinysrgb&w=1200' WHERE name = 'New Mexico';
UPDATE state_census_data SET hero_image = 'https://images.pexels.com/photos/凌/pexels-photo-凌.jpeg?auto=compress&cs=tinysrgb&w=1200' WHERE name = 'New York';
UPDATE state_census_data SET hero_image = 'https://images.pexels.com/photos/凌/pexels-photo-凌.jpeg?auto=compress&cs=tinysrgb&w=1200' WHERE name = 'North Carolina';
UPDATE state_census_data SET hero_image = 'https://images.pexels.com/photos/2611008/pexels-photo-2611008.jpeg?auto=compress&cs=tinysrgb&w=1200' WHERE name = 'North Dakota';
UPDATE state_census_data SET hero_image = 'https://images.pexels.com/photos/2416537/pexels-photo-2416537.jpeg?auto=compress&cs=tinysrgb&w=1200' WHERE name = 'Ohio';
UPDATE state_census_data SET hero_image = 'https://images.pexels.com/photos/1510595/pexels-photo-1510595.jpeg?auto=compress&cs=tinysrgb&w=1200' WHERE name = 'Oklahoma';
UPDATE state_census_data SET hero_image = 'https://images.pexels.com/photos/1374295/pexels-photo-1374295.jpeg?auto=compress&cs=tinysrgb&w=1200' WHERE name = 'Oregon';
UPDATE state_census_data SET hero_image = 'https://images.pexels.com/photos/1486785/pexels-photo-1486785.jpeg?auto=compress&cs=tinysrgb&w=1200' WHERE name = 'Pennsylvania';
UPDATE state_census_data SET hero_image = 'https://images.pexels.com/photos/2850287/pexels-photo-2850287.jpeg?auto=compress&cs=tinysrgb&w=1200' WHERE name = 'Rhode Island';
UPDATE state_census_data SET hero_image = 'https://images.pexels.com/photos/1486222/pexels-photo-1486222.jpeg?auto=compress&cs=tinysrgb&w=1200' WHERE name = 'South Carolina';
UPDATE state_census_data SET hero_image = 'https://images.pexels.com/photos/2249293/pexels-photo-2249293.jpeg?auto=compress&cs=tinysrgb&w=1200' WHERE name = 'South Dakota';
UPDATE state_census_data SET hero_image = 'https://images.pexels.com/photos/2382681/pexels-photo-2382681.jpeg?auto=compress&cs=tinysrgb&w=1200' WHERE name = 'Tennessee';
UPDATE state_census_data SET hero_image = 'https://images.pexels.com/photos/1510595/pexels-photo-1510595.jpeg?auto=compress&cs=tinysrgb&w=1200' WHERE name = 'Texas';
UPDATE state_census_data SET hero_image = 'https://images.pexels.com/photos/1464183/pexels-photo-1464183.jpeg?auto=compress&cs=tinysrgb&w=1200' WHERE name = 'Utah';
UPDATE state_census_data SET hero_image = 'https://images.pexels.com/photos/1660995/pexels-photo-1660995.jpeg?auto=compress&cs=tinysrgb&w=1200' WHERE name = 'Vermont';
UPDATE state_census_data SET hero_image = 'https://images.pexels.com/photos/1170831/pexels-photo-1170831.jpeg?auto=compress&cs=tinysrgb&w=1200' WHERE name = 'Virginia';
UPDATE state_census_data SET hero_image = 'https://images.pexels.com/photos/1374295/pexels-photo-1374295.jpeg?auto=compress&cs=tinysrgb&w=1200' WHERE name = 'Washington';
UPDATE state_census_data SET hero_image = 'https://images.pexels.com/photos/2827374/pexels-photo-2827374.jpeg?auto=compress&cs=tinysrgb&w=1200' WHERE name = 'West Virginia';
UPDATE state_census_data SET hero_image = 'https://images.pexels.com/photos/1005417/pexels-photo-1005417.jpeg?auto=compress&cs=tinysrgb&w=1200' WHERE name = 'Wisconsin';
UPDATE state_census_data SET hero_image = 'https://images.pexels.com/photos/1647962/pexels-photo-1647962.jpeg?auto=compress&cs=tinysrgb&w=1200' WHERE name = 'Wyoming';
