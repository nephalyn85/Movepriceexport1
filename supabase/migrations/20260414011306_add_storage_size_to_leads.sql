/*
  # Add storage_size to moving_leads

  ## Summary
  Adds a `storage_size` column to `moving_leads` to record the specific storage unit
  size and dimensions selected for leads that include storage add-on.

  ## Changes
  - `moving_leads`
    - Add `storage_size` (text, nullable) - e.g. "Medium (10' x 10')"

  ## Notes
  - Nullable; only populated when the storage add-on is selected
  - Existing rows unaffected
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'moving_leads' AND column_name = 'storage_size'
  ) THEN
    ALTER TABLE moving_leads ADD COLUMN storage_size text;
  END IF;
END $$;
