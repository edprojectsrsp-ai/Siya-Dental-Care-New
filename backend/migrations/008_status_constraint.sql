-- Migration 008: allow the new workflow states in appointments.status
-- (mark/close/collect endpoints write workflow values into status too).
BEGIN;
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
ALTER TABLE appointments ADD CONSTRAINT appointments_status_check
    CHECK (status::text = ANY (ARRAY[
        'pending','confirmed','arrived','in_progress','done','rescheduled','rejected','no_show','cancelled',
        'scheduled','ready','in_treatment','payment_pending','completed'
    ]::text[]));
COMMIT;
