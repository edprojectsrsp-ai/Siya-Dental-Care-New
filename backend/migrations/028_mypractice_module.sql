-- Migration 028 — Add "mypractice" module to visibility defaults
-- Also ensure specialist sees only: dashboard, queue, patients, lab, mypractice
BEGIN;

DO $$
DECLARE cid UUID;
BEGIN
    FOR cid IN SELECT id FROM clinics LOOP
        -- mypractice: visible to specialist only
        INSERT INTO module_visibility (clinic_id, module_key, role, is_visible)
        VALUES
            (cid, 'mypractice', 'specialist', TRUE),
            (cid, 'mypractice', 'doctor', FALSE),
            (cid, 'mypractice', 'admin', FALSE),
            (cid, 'mypractice', 'receptionist', FALSE)
        ON CONFLICT (clinic_id, module_key, role) DO NOTHING;

        -- Specialist: hide everything except dashboard/queue/patients/lab/mypractice
        INSERT INTO module_visibility (clinic_id, module_key, role, is_visible)
        VALUES
            (cid, 'workshop', 'specialist', FALSE),
            (cid, 'revenue', 'specialist', FALSE),
            (cid, 'billing', 'specialist', FALSE),
            (cid, 'settings', 'specialist', FALSE),
            (cid, 'staff', 'specialist', FALSE),
            (cid, 'specialists', 'specialist', FALSE),
            (cid, 'counters', 'specialist', FALSE),
            (cid, 'bulkwa', 'specialist', FALSE),
            (cid, 'website', 'specialist', FALSE),
            (cid, 'consult', 'specialist', FALSE),
            (cid, 'messages', 'specialist', FALSE),
            (cid, 'gallery', 'specialist', FALSE),
            (cid, 'medicines', 'specialist', FALSE),
            (cid, 'procedures', 'specialist', FALSE),
            (cid, 'kanban', 'specialist', FALSE),
            (cid, 'archived', 'specialist', FALSE),
            (cid, 'appointments', 'specialist', FALSE)
        ON CONFLICT (clinic_id, module_key, role) DO NOTHING;

        -- Specialist CAN see:
        INSERT INTO module_visibility (clinic_id, module_key, role, is_visible)
        VALUES
            (cid, 'dashboard', 'specialist', TRUE),
            (cid, 'queue', 'specialist', TRUE),
            (cid, 'patients', 'specialist', TRUE),
            (cid, 'lab', 'specialist', TRUE)
        ON CONFLICT (clinic_id, module_key, role) DO UPDATE SET is_visible = TRUE;
    END LOOP;
END $$;

COMMIT;
