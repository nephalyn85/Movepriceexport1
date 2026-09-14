/*
  # Update median_home_sqft from Realtor.com Data (March 2026)

  ## Summary
  Replaces the previous median_home_sqft values (which were Census ACS all-home
  estimates from earlier years) with real, current listing data from Realtor.com's
  publicly available state-level inventory CSV, filtered to March 2026 — the most
  recent complete month available.

  ## Source
  - Realtor.com Research Data: RDC_Inventory_Core_Metrics_State_History.csv
  - Month: 202603 (March 2026)
  - Field used: median_square_feet (all property types listed for sale)
  - All 51 state/DC entries matched exactly; no gaps.

  ## Changes
  1. All 51 rows in state_census_data updated with real sq ft values
  2. derived_cubic_feet recalculated as ROUND(median_home_sqft * 1.08)
     (same multiplier as previously established)

  ## Notable State Values
  - Smallest: HI 1,039 sqft (dense urban/condo market), DC 1,200 sqft
  - Largest:  UT 2,329 sqft, WY 2,173 sqft, NE 2,086 sqft
  - National range confirms expected geographic patterns

  ## Impact
  - derived_cubic_feet changes will flow through to mover price recalculation
    in the subsequent migration
*/

UPDATE state_census_data
SET
  median_home_sqft = CASE abbr
    WHEN 'AK' THEN 1627
    WHEN 'AL' THEN 1907
    WHEN 'AR' THEN 1862
    WHEN 'AZ' THEN 1876
    WHEN 'CA' THEN 1732
    WHEN 'CO' THEN 1965
    WHEN 'CT' THEN 1830
    WHEN 'DC' THEN 1200
    WHEN 'DE' THEN 2068
    WHEN 'FL' THEN 1625
    WHEN 'GA' THEN 2061
    WHEN 'HI' THEN 1039
    WHEN 'IA' THEN 1587
    WHEN 'ID' THEN 2118
    WHEN 'IL' THEN 1639
    WHEN 'IN' THEN 1796
    WHEN 'KS' THEN 1926
    WHEN 'KY' THEN 1752
    WHEN 'LA' THEN 1823
    WHEN 'MA' THEN 1752
    WHEN 'MD' THEN 1785
    WHEN 'ME' THEN 1636
    WHEN 'MI' THEN 1508
    WHEN 'MN' THEN 1937
    WHEN 'MO' THEN 1703
    WHEN 'MS' THEN 1944
    WHEN 'MT' THEN 2067
    WHEN 'NC' THEN 1902
    WHEN 'ND' THEN 2024
    WHEN 'NE' THEN 2086
    WHEN 'NH' THEN 1870
    WHEN 'NJ' THEN 1616
    WHEN 'NM' THEN 1902
    WHEN 'NV' THEN 1793
    WHEN 'NY' THEN 1495
    WHEN 'OH' THEN 1678
    WHEN 'OK' THEN 1835
    WHEN 'OR' THEN 1824
    WHEN 'PA' THEN 1643
    WHEN 'RI' THEN 1568
    WHEN 'SC' THEN 1810
    WHEN 'SD' THEN 1829
    WHEN 'TN' THEN 1937
    WHEN 'TX' THEN 1965
    WHEN 'UT' THEN 2329
    WHEN 'VA' THEN 1938
    WHEN 'VT' THEN 1971
    WHEN 'WA' THEN 1909
    WHEN 'WI' THEN 1753
    WHEN 'WV' THEN 1725
    WHEN 'WY' THEN 2173
    ELSE median_home_sqft
  END,
  derived_cubic_feet = CASE abbr
    WHEN 'AK' THEN 1757
    WHEN 'AL' THEN 2060
    WHEN 'AR' THEN 2011
    WHEN 'AZ' THEN 2026
    WHEN 'CA' THEN 1871
    WHEN 'CO' THEN 2122
    WHEN 'CT' THEN 1976
    WHEN 'DC' THEN 1296
    WHEN 'DE' THEN 2233
    WHEN 'FL' THEN 1755
    WHEN 'GA' THEN 2226
    WHEN 'HI' THEN 1122
    WHEN 'IA' THEN 1714
    WHEN 'ID' THEN 2287
    WHEN 'IL' THEN 1770
    WHEN 'IN' THEN 1940
    WHEN 'KS' THEN 2080
    WHEN 'KY' THEN 1892
    WHEN 'LA' THEN 1969
    WHEN 'MA' THEN 1892
    WHEN 'MD' THEN 1928
    WHEN 'ME' THEN 1767
    WHEN 'MI' THEN 1629
    WHEN 'MN' THEN 2092
    WHEN 'MO' THEN 1839
    WHEN 'MS' THEN 2100
    WHEN 'MT' THEN 2232
    WHEN 'NC' THEN 2054
    WHEN 'ND' THEN 2186
    WHEN 'NE' THEN 2253
    WHEN 'NH' THEN 2020
    WHEN 'NJ' THEN 1745
    WHEN 'NM' THEN 2054
    WHEN 'NV' THEN 1936
    WHEN 'NY' THEN 1615
    WHEN 'OH' THEN 1812
    WHEN 'OK' THEN 1982
    WHEN 'OR' THEN 1970
    WHEN 'PA' THEN 1774
    WHEN 'RI' THEN 1693
    WHEN 'SC' THEN 1955
    WHEN 'SD' THEN 1975
    WHEN 'TN' THEN 2092
    WHEN 'TX' THEN 2122
    WHEN 'UT' THEN 2515
    WHEN 'VA' THEN 2093
    WHEN 'VT' THEN 2129
    WHEN 'WA' THEN 2062
    WHEN 'WI' THEN 1893
    WHEN 'WV' THEN 1863
    WHEN 'WY' THEN 2347
    ELSE derived_cubic_feet
  END,
  updated_at = now();
