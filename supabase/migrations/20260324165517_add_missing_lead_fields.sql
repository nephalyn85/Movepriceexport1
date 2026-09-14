/*
  # Add Missing Lead Fields

  1. Changes
    - Add `move_date` (date) - The customer's preferred move date
    - Add `from_stairs` (integer) - Number of flight of stairs at origin location
    - Add `to_stairs` (integer) - Number of flight of stairs at destination
    - Add `is_busy_day` (boolean) - Whether the move date falls on a busy/peak pricing day

  2. Notes
    - All new columns have default values to maintain compatibility with existing records
    - Existing rows will have NULL for move_date and 0 for stairs, false for is_busy_day
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'moving_leads' AND column_name = 'move_date'
  ) THEN
    ALTER TABLE moving_leads ADD COLUMN move_date date;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'moving_leads' AND column_name = 'from_stairs'
  ) THEN
    ALTER TABLE moving_leads ADD COLUMN from_stairs integer DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'moving_leads' AND column_name = 'to_stairs'
  ) THEN
    ALTER TABLE moving_leads ADD COLUMN to_stairs integer DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'moving_leads' AND column_name = 'is_busy_day'
  ) THEN
    ALTER TABLE moving_leads ADD COLUMN is_busy_day boolean DEFAULT false;
  END IF;
END $$;