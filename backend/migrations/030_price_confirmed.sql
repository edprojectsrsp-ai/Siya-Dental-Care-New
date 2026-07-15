-- Doctor must explicitly confirm non-zero treatment rates before billing / close visit
ALTER TABLE treatment_plan_items
  ADD COLUMN IF NOT EXISTS price_confirmed boolean NOT NULL DEFAULT false;

-- Existing priced items are treated as already confirmed
UPDATE treatment_plan_items
SET price_confirmed = true
WHERE COALESCE(final_amount, 0) > 0 AND price_confirmed = false;