/*
  # Add inventory items to moving_leads table

  ## Changes
  - Adds `inventory_items` (jsonb, nullable) to store the checked item list from the inventory calculator
  - Adds `lead_type` (text, default 'quote') to distinguish 'quote', 'email_list', or 'both'
  - Adds `total_cubic_feet` (integer, nullable) to store the raw inventory volume
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'moving_leads' AND column_name = 'inventory_items'
  ) THEN
    ALTER TABLE moving_leads ADD COLUMN inventory_items jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'moving_leads' AND column_name = 'lead_type'
  ) THEN
    ALTER TABLE moving_leads ADD COLUMN lead_type text DEFAULT 'quote';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'moving_leads' AND column_name = 'total_cubic_feet'
  ) THEN
    ALTER TABLE moving_leads ADD COLUMN total_cubic_feet integer;
  END IF;
END $$;
