-- Siya Dental - FULL database (schema + data), sanitized for PostgreSQL 16.
-- Auto-loaded by Docker on a FRESH db volume (docker-entrypoint-initdb.d).
-- Source: Siya_Dental_Database_Plain_20260622_234404.sql (pg18 dump).

--
-- PostgreSQL database dump
--


-- Dumped from database version 18.4 (Homebrew)
-- Dumped by pg_dump version 18.4 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.walk_in_patients DROP CONSTRAINT IF EXISTS walk_in_patients_registered_by_staff_id_fkey;
ALTER TABLE IF EXISTS ONLY public.walk_in_patients DROP CONSTRAINT IF EXISTS walk_in_patients_patient_id_fkey;
ALTER TABLE IF EXISTS ONLY public.walk_in_patients DROP CONSTRAINT IF EXISTS walk_in_patients_doctor_id_fkey;
ALTER TABLE IF EXISTS ONLY public.walk_in_patients DROP CONSTRAINT IF EXISTS walk_in_patients_clinic_id_fkey;
ALTER TABLE IF EXISTS ONLY public.treatment_sittings DROP CONSTRAINT IF EXISTS treatment_sittings_plan_id_fkey;
ALTER TABLE IF EXISTS ONLY public.treatment_sittings DROP CONSTRAINT IF EXISTS treatment_sittings_doctor_id_fkey;
ALTER TABLE IF EXISTS ONLY public.treatment_sittings DROP CONSTRAINT IF EXISTS treatment_sittings_appointment_id_fkey;
ALTER TABLE IF EXISTS ONLY public.treatment_sessions DROP CONSTRAINT IF EXISTS treatment_sessions_walk_in_id_fkey;
ALTER TABLE IF EXISTS ONLY public.treatment_sessions DROP CONSTRAINT IF EXISTS treatment_sessions_sitting_id_fkey;
ALTER TABLE IF EXISTS ONLY public.treatment_sessions DROP CONSTRAINT IF EXISTS treatment_sessions_prescription_id_fkey;
ALTER TABLE IF EXISTS ONLY public.treatment_sessions DROP CONSTRAINT IF EXISTS treatment_sessions_plan_id_fkey;
ALTER TABLE IF EXISTS ONLY public.treatment_sessions DROP CONSTRAINT IF EXISTS treatment_sessions_payment_collected_by_fkey;
ALTER TABLE IF EXISTS ONLY public.treatment_sessions DROP CONSTRAINT IF EXISTS treatment_sessions_patient_id_fkey;
ALTER TABLE IF EXISTS ONLY public.treatment_sessions DROP CONSTRAINT IF EXISTS treatment_sessions_doctor_id_fkey;
ALTER TABLE IF EXISTS ONLY public.treatment_sessions DROP CONSTRAINT IF EXISTS treatment_sessions_clinic_id_fkey;
ALTER TABLE IF EXISTS ONLY public.treatment_sessions DROP CONSTRAINT IF EXISTS treatment_sessions_appointment_id_fkey;
ALTER TABLE IF EXISTS ONLY public.treatment_plans DROP CONSTRAINT IF EXISTS treatment_plans_patient_id_fkey;
ALTER TABLE IF EXISTS ONLY public.treatment_plans DROP CONSTRAINT IF EXISTS treatment_plans_doctor_id_fkey;
ALTER TABLE IF EXISTS ONLY public.treatment_plans DROP CONSTRAINT IF EXISTS treatment_plans_clinic_id_fkey;
ALTER TABLE IF EXISTS ONLY public.treatment_plan_items DROP CONSTRAINT IF EXISTS treatment_plan_items_procedure_catalog_id_fkey;
ALTER TABLE IF EXISTS ONLY public.treatment_plan_items DROP CONSTRAINT IF EXISTS treatment_plan_items_plan_id_fkey;
ALTER TABLE IF EXISTS ONLY public.tooth_treatments DROP CONSTRAINT IF EXISTS tooth_treatments_treatment_plan_id_fkey;
ALTER TABLE IF EXISTS ONLY public.tooth_treatments DROP CONSTRAINT IF EXISTS tooth_treatments_sitting_id_fkey;
ALTER TABLE IF EXISTS ONLY public.tooth_treatments DROP CONSTRAINT IF EXISTS tooth_treatments_patient_id_fkey;
ALTER TABLE IF EXISTS ONLY public.tooth_treatments DROP CONSTRAINT IF EXISTS tooth_treatments_completed_by_fkey;
ALTER TABLE IF EXISTS ONLY public.tooth_observations DROP CONSTRAINT IF EXISTS tooth_observations_patient_id_fkey;
ALTER TABLE IF EXISTS ONLY public.tooth_examinations DROP CONSTRAINT IF EXISTS tooth_examinations_patient_id_fkey;
ALTER TABLE IF EXISTS ONLY public.tooth_diagnoses DROP CONSTRAINT IF EXISTS tooth_diagnoses_patient_id_fkey;
ALTER TABLE IF EXISTS ONLY public.tooth_conditions DROP CONSTRAINT IF EXISTS tooth_conditions_recorded_by_fkey;
ALTER TABLE IF EXISTS ONLY public.tooth_conditions DROP CONSTRAINT IF EXISTS tooth_conditions_patient_id_fkey;
ALTER TABLE IF EXISTS ONLY public.tooth_clinical_records DROP CONSTRAINT IF EXISTS tooth_clinical_records_patient_id_fkey;
ALTER TABLE IF EXISTS ONLY public.to_be_appointed DROP CONSTRAINT IF EXISTS to_be_appointed_resolved_appointment_id_fkey;
ALTER TABLE IF EXISTS ONLY public.to_be_appointed DROP CONSTRAINT IF EXISTS to_be_appointed_patient_id_fkey;
ALTER TABLE IF EXISTS ONLY public.to_be_appointed DROP CONSTRAINT IF EXISTS to_be_appointed_original_appointment_id_fkey;
ALTER TABLE IF EXISTS ONLY public.to_be_appointed DROP CONSTRAINT IF EXISTS to_be_appointed_clinic_id_fkey;
ALTER TABLE IF EXISTS ONLY public.to_be_appointed DROP CONSTRAINT IF EXISTS to_be_appointed_added_by_staff_id_fkey;
ALTER TABLE IF EXISTS ONLY public.staff DROP CONSTRAINT IF EXISTS staff_clinic_id_fkey;
ALTER TABLE IF EXISTS ONLY public.specialist_notifications DROP CONSTRAINT IF EXISTS specialist_notifications_specialist_id_fkey;
ALTER TABLE IF EXISTS ONLY public.specialist_notifications DROP CONSTRAINT IF EXISTS specialist_notifications_sent_by_fkey;
ALTER TABLE IF EXISTS ONLY public.specialist_notifications DROP CONSTRAINT IF EXISTS specialist_notifications_appointment_id_fkey;
ALTER TABLE IF EXISTS ONLY public.specialist_earnings DROP CONSTRAINT IF EXISTS specialist_earnings_specialist_id_fkey;
ALTER TABLE IF EXISTS ONLY public.specialist_earnings DROP CONSTRAINT IF EXISTS specialist_earnings_settled_by_fkey;
ALTER TABLE IF EXISTS ONLY public.specialist_earnings DROP CONSTRAINT IF EXISTS specialist_earnings_recorded_by_fkey;
ALTER TABLE IF EXISTS ONLY public.specialist_earnings DROP CONSTRAINT IF EXISTS specialist_earnings_patient_id_fkey;
ALTER TABLE IF EXISTS ONLY public.specialist_earnings DROP CONSTRAINT IF EXISTS specialist_earnings_clinic_id_fkey;
ALTER TABLE IF EXISTS ONLY public.specialist_earnings DROP CONSTRAINT IF EXISTS specialist_earnings_appointment_id_fkey;
ALTER TABLE IF EXISTS ONLY public.smile_sessions DROP CONSTRAINT IF EXISTS smile_sessions_patient_id_fkey;
ALTER TABLE IF EXISTS ONLY public.smile_sessions DROP CONSTRAINT IF EXISTS smile_sessions_clinic_id_fkey;
ALTER TABLE IF EXISTS ONLY public.site_videos DROP CONSTRAINT IF EXISTS site_videos_clinic_id_fkey;
ALTER TABLE IF EXISTS ONLY public.site_doctors DROP CONSTRAINT IF EXISTS site_doctors_staff_id_fkey;
ALTER TABLE IF EXISTS ONLY public.service_catalog DROP CONSTRAINT IF EXISTS service_catalog_clinic_id_fkey;
ALTER TABLE IF EXISTS ONLY public.reschedule_requests DROP CONSTRAINT IF EXISTS reschedule_requests_resolved_by_fkey;
ALTER TABLE IF EXISTS ONLY public.reschedule_requests DROP CONSTRAINT IF EXISTS reschedule_requests_patient_id_fkey;
ALTER TABLE IF EXISTS ONLY public.reschedule_requests DROP CONSTRAINT IF EXISTS reschedule_requests_clinic_id_fkey;
ALTER TABLE IF EXISTS ONLY public.reschedule_requests DROP CONSTRAINT IF EXISTS reschedule_requests_appointment_id_fkey;
ALTER TABLE IF EXISTS ONLY public.reminder_settings DROP CONSTRAINT IF EXISTS reminder_settings_clinic_id_fkey;
ALTER TABLE IF EXISTS ONLY public.reminder_log DROP CONSTRAINT IF EXISTS reminder_log_patient_id_fkey;
ALTER TABLE IF EXISTS ONLY public.reminder_log DROP CONSTRAINT IF EXISTS reminder_log_clinic_id_fkey;
ALTER TABLE IF EXISTS ONLY public.reminder_log DROP CONSTRAINT IF EXISTS reminder_log_appointment_id_fkey;
ALTER TABLE IF EXISTS ONLY public.qr_codes DROP CONSTRAINT IF EXISTS qr_codes_clinic_id_fkey;
ALTER TABLE IF EXISTS ONLY public.procedure_medicine_map DROP CONSTRAINT IF EXISTS procedure_medicine_map_procedure_id_fkey;
ALTER TABLE IF EXISTS ONLY public.procedure_medicine_map DROP CONSTRAINT IF EXISTS procedure_medicine_map_medicine_id_fkey;
ALTER TABLE IF EXISTS ONLY public.prescriptions DROP CONSTRAINT IF EXISTS prescriptions_qr_code_id_fkey;
ALTER TABLE IF EXISTS ONLY public.prescriptions DROP CONSTRAINT IF EXISTS prescriptions_plan_id_fkey;
ALTER TABLE IF EXISTS ONLY public.prescriptions DROP CONSTRAINT IF EXISTS prescriptions_patient_id_fkey;
ALTER TABLE IF EXISTS ONLY public.prescriptions DROP CONSTRAINT IF EXISTS prescriptions_doctor_id_fkey;
ALTER TABLE IF EXISTS ONLY public.prescriptions DROP CONSTRAINT IF EXISTS prescriptions_clinic_id_fkey;
ALTER TABLE IF EXISTS ONLY public.prescriptions DROP CONSTRAINT IF EXISTS prescriptions_appointment_id_fkey;
ALTER TABLE IF EXISTS ONLY public.payment_transactions DROP CONSTRAINT IF EXISTS payment_transactions_plan_id_fkey;
ALTER TABLE IF EXISTS ONLY public.payment_transactions DROP CONSTRAINT IF EXISTS payment_transactions_patient_id_fkey;
ALTER TABLE IF EXISTS ONLY public.payment_transactions DROP CONSTRAINT IF EXISTS payment_transactions_clinic_id_fkey;
ALTER TABLE IF EXISTS ONLY public.payment_transactions DROP CONSTRAINT IF EXISTS payment_transactions_appointment_id_fkey;
ALTER TABLE IF EXISTS ONLY public.patients DROP CONSTRAINT IF EXISTS patients_preferred_clinic_id_fkey;
ALTER TABLE IF EXISTS ONLY public.patient_uploads DROP CONSTRAINT IF EXISTS patient_uploads_uploaded_by_fkey;
ALTER TABLE IF EXISTS ONLY public.patient_uploads DROP CONSTRAINT IF EXISTS patient_uploads_patient_id_fkey;
ALTER TABLE IF EXISTS ONLY public.patient_uploads DROP CONSTRAINT IF EXISTS patient_uploads_appointment_id_fkey;
ALTER TABLE IF EXISTS ONLY public.patient_ratings DROP CONSTRAINT IF EXISTS patient_ratings_patient_id_fkey;
ALTER TABLE IF EXISTS ONLY public.patient_portal_tokens DROP CONSTRAINT IF EXISTS patient_portal_tokens_patient_id_fkey;
ALTER TABLE IF EXISTS ONLY public.patient_images DROP CONSTRAINT IF EXISTS patient_images_uploaded_by_fkey;
ALTER TABLE IF EXISTS ONLY public.patient_images DROP CONSTRAINT IF EXISTS patient_images_patient_id_fkey;
ALTER TABLE IF EXISTS ONLY public.patient_images DROP CONSTRAINT IF EXISTS patient_images_linked_sitting_id_fkey;
ALTER TABLE IF EXISTS ONLY public.patient_images DROP CONSTRAINT IF EXISTS patient_images_linked_session_id_fkey;
ALTER TABLE IF EXISTS ONLY public.patient_images DROP CONSTRAINT IF EXISTS patient_images_linked_plan_id_fkey;
ALTER TABLE IF EXISTS ONLY public.patient_images DROP CONSTRAINT IF EXISTS patient_images_clinic_id_fkey;
ALTER TABLE IF EXISTS ONLY public.patient_health DROP CONSTRAINT IF EXISTS patient_health_patient_id_fkey;
ALTER TABLE IF EXISTS ONLY public.patient_credits DROP CONSTRAINT IF EXISTS patient_credits_patient_id_fkey;
ALTER TABLE IF EXISTS ONLY public.module_visibility DROP CONSTRAINT IF EXISTS module_visibility_clinic_id_fkey;
ALTER TABLE IF EXISTS ONLY public.medicine_reminders DROP CONSTRAINT IF EXISTS medicine_reminders_prescription_id_fkey;
ALTER TABLE IF EXISTS ONLY public.medicine_reminders DROP CONSTRAINT IF EXISTS medicine_reminders_patient_id_fkey;
ALTER TABLE IF EXISTS ONLY public.medicine_catalog DROP CONSTRAINT IF EXISTS medicine_catalog_added_by_fkey;
ALTER TABLE IF EXISTS ONLY public.media DROP CONSTRAINT IF EXISTS media_uploaded_by_fkey;
ALTER TABLE IF EXISTS ONLY public.media DROP CONSTRAINT IF EXISTS media_patient_id_fkey;
ALTER TABLE IF EXISTS ONLY public.media_gallery DROP CONSTRAINT IF EXISTS media_gallery_treatment_plan_id_fkey;
ALTER TABLE IF EXISTS ONLY public.media_gallery DROP CONSTRAINT IF EXISTS media_gallery_taken_by_fkey;
ALTER TABLE IF EXISTS ONLY public.media_gallery DROP CONSTRAINT IF EXISTS media_gallery_patient_id_fkey;
ALTER TABLE IF EXISTS ONLY public.media_gallery DROP CONSTRAINT IF EXISTS media_gallery_clinic_id_fkey;
ALTER TABLE IF EXISTS ONLY public.media DROP CONSTRAINT IF EXISTS media_clinic_id_fkey;
ALTER TABLE IF EXISTS ONLY public.lab_vendors DROP CONSTRAINT IF EXISTS lab_vendors_clinic_id_fkey;
ALTER TABLE IF EXISTS ONLY public.lab_orders DROP CONSTRAINT IF EXISTS lab_orders_vendor_id_fkey;
ALTER TABLE IF EXISTS ONLY public.lab_orders DROP CONSTRAINT IF EXISTS lab_orders_treatment_plan_item_id_fkey;
ALTER TABLE IF EXISTS ONLY public.lab_orders DROP CONSTRAINT IF EXISTS lab_orders_received_by_fkey;
ALTER TABLE IF EXISTS ONLY public.lab_orders DROP CONSTRAINT IF EXISTS lab_orders_qr_code_id_fkey;
ALTER TABLE IF EXISTS ONLY public.lab_orders DROP CONSTRAINT IF EXISTS lab_orders_patient_id_fkey;
ALTER TABLE IF EXISTS ONLY public.lab_orders DROP CONSTRAINT IF EXISTS lab_orders_created_by_fkey;
ALTER TABLE IF EXISTS ONLY public.lab_orders DROP CONSTRAINT IF EXISTS lab_orders_closed_by_fkey;
ALTER TABLE IF EXISTS ONLY public.lab_orders DROP CONSTRAINT IF EXISTS lab_orders_clinic_id_fkey;
ALTER TABLE IF EXISTS ONLY public.lab_orders DROP CONSTRAINT IF EXISTS lab_orders_appointment_id_fkey;
ALTER TABLE IF EXISTS ONLY public.lab_order_payments DROP CONSTRAINT IF EXISTS lab_order_payments_recorded_by_fkey;
ALTER TABLE IF EXISTS ONLY public.lab_order_payments DROP CONSTRAINT IF EXISTS lab_order_payments_lab_order_id_fkey;
ALTER TABLE IF EXISTS ONLY public.kanban_columns DROP CONSTRAINT IF EXISTS kanban_columns_clinic_id_fkey;
ALTER TABLE IF EXISTS ONLY public.image_annotations DROP CONSTRAINT IF EXISTS image_annotations_image_id_fkey;
ALTER TABLE IF EXISTS ONLY public.image_annotations DROP CONSTRAINT IF EXISTS image_annotations_added_by_fkey;
ALTER TABLE IF EXISTS ONLY public.illness_library DROP CONSTRAINT IF EXISTS illness_library_clinic_id_fkey;
ALTER TABLE IF EXISTS ONLY public.follow_ups DROP CONSTRAINT IF EXISTS follow_ups_patient_id_fkey;
ALTER TABLE IF EXISTS ONLY public.appointments DROP CONSTRAINT IF EXISTS fk_apt_plan;
ALTER TABLE IF EXISTS ONLY public.fee_schedule_overrides DROP CONSTRAINT IF EXISTS fee_schedule_overrides_service_id_fkey;
ALTER TABLE IF EXISTS ONLY public.fee_schedule_overrides DROP CONSTRAINT IF EXISTS fee_schedule_overrides_clinic_id_fkey;
ALTER TABLE IF EXISTS ONLY public.dashboard_widget_prefs DROP CONSTRAINT IF EXISTS dashboard_widget_prefs_staff_id_fkey;
ALTER TABLE IF EXISTS ONLY public.dashboard_widget_prefs DROP CONSTRAINT IF EXISTS dashboard_widget_prefs_clinic_id_fkey;
ALTER TABLE IF EXISTS ONLY public.communication_log DROP CONSTRAINT IF EXISTS communication_log_patient_id_fkey;
ALTER TABLE IF EXISTS ONLY public.clinic_settings DROP CONSTRAINT IF EXISTS clinic_settings_clinic_id_fkey;
ALTER TABLE IF EXISTS ONLY public.clinic_pages DROP CONSTRAINT IF EXISTS clinic_pages_clinic_id_fkey;
ALTER TABLE IF EXISTS ONLY public.clinic_page_sections DROP CONSTRAINT IF EXISTS clinic_page_sections_page_id_fkey;
ALTER TABLE IF EXISTS ONLY public.clinic_notifications DROP CONSTRAINT IF EXISTS clinic_notifications_sender_staff_id_fkey;
ALTER TABLE IF EXISTS ONLY public.clinic_notifications DROP CONSTRAINT IF EXISTS clinic_notifications_recipient_staff_id_fkey;
ALTER TABLE IF EXISTS ONLY public.clinic_notifications DROP CONSTRAINT IF EXISTS clinic_notifications_clinic_id_fkey;
ALTER TABLE IF EXISTS ONLY public.clinic_info_ext DROP CONSTRAINT IF EXISTS clinic_info_ext_clinic_id_fkey;
ALTER TABLE IF EXISTS ONLY public.clinic_holidays DROP CONSTRAINT IF EXISTS clinic_holidays_clinic_id_fkey;
ALTER TABLE IF EXISTS ONLY public.clinic_content DROP CONSTRAINT IF EXISTS clinic_content_clinic_id_fkey;
ALTER TABLE IF EXISTS ONLY public.business_hours DROP CONSTRAINT IF EXISTS business_hours_clinic_id_fkey;
ALTER TABLE IF EXISTS ONLY public.bot_event_log DROP CONSTRAINT IF EXISTS bot_event_log_patient_id_fkey;
ALTER TABLE IF EXISTS ONLY public.bot_event_log DROP CONSTRAINT IF EXISTS bot_event_log_clinic_id_fkey;
ALTER TABLE IF EXISTS ONLY public.bot_config DROP CONSTRAINT IF EXISTS bot_config_clinic_id_fkey;
ALTER TABLE IF EXISTS ONLY public.appointments DROP CONSTRAINT IF EXISTS appointments_specialist_id_fkey;
ALTER TABLE IF EXISTS ONLY public.appointments DROP CONSTRAINT IF EXISTS appointments_specialist_assigned_by_fkey;
ALTER TABLE IF EXISTS ONLY public.appointments DROP CONSTRAINT IF EXISTS appointments_patient_id_fkey;
ALTER TABLE IF EXISTS ONLY public.appointments DROP CONSTRAINT IF EXISTS appointments_last_contacted_by_fkey;
ALTER TABLE IF EXISTS ONLY public.appointments DROP CONSTRAINT IF EXISTS appointments_doctor_id_fkey;
ALTER TABLE IF EXISTS ONLY public.appointments DROP CONSTRAINT IF EXISTS appointments_clinic_id_fkey;
ALTER TABLE IF EXISTS ONLY public.appointment_requests DROP CONSTRAINT IF EXISTS appointment_requests_handled_by_fkey;
ALTER TABLE IF EXISTS ONLY public.appointment_requests DROP CONSTRAINT IF EXISTS appointment_requests_converted_to_appointment_id_fkey;
ALTER TABLE IF EXISTS ONLY public.appointment_requests DROP CONSTRAINT IF EXISTS appointment_requests_clinic_id_fkey;
ALTER TABLE IF EXISTS ONLY public.appointment_message_logs DROP CONSTRAINT IF EXISTS appointment_message_logs_sent_by_staff_id_fkey;
ALTER TABLE IF EXISTS ONLY public.appointment_message_logs DROP CONSTRAINT IF EXISTS appointment_message_logs_patient_id_fkey;
ALTER TABLE IF EXISTS ONLY public.appointment_message_logs DROP CONSTRAINT IF EXISTS appointment_message_logs_appointment_id_fkey;
ALTER TABLE IF EXISTS ONLY public.appointment_history DROP CONSTRAINT IF EXISTS appointment_history_appointment_id_fkey;
ALTER TABLE IF EXISTS ONLY public.appointment_call_logs DROP CONSTRAINT IF EXISTS appointment_call_logs_called_by_staff_id_fkey;
ALTER TABLE IF EXISTS ONLY public.appointment_call_logs DROP CONSTRAINT IF EXISTS appointment_call_logs_appointment_id_fkey;
DROP INDEX IF EXISTS public.module_vis_clinic_idx;
DROP INDEX IF EXISTS public.lab_work_types_clinic_name_uniq;
DROP INDEX IF EXISTS public.idx_walkin_outcome;
DROP INDEX IF EXISTS public.idx_walkin_clinic_date;
DROP INDEX IF EXISTS public.idx_uploads_patient;
DROP INDEX IF EXISTS public.idx_uploads_appointment;
DROP INDEX IF EXISTS public.idx_treatment_templates_bundle_u;
DROP INDEX IF EXISTS public.idx_treatment_plans_patient_created;
DROP INDEX IF EXISTS public.idx_treatment_plans_patient;
DROP INDEX IF EXISTS public.idx_tooth_tx_plan;
DROP INDEX IF EXISTS public.idx_tooth_tx_patient;
DROP INDEX IF EXISTS public.idx_tooth_tx_item;
DROP INDEX IF EXISTS public.idx_tooth_treatments_kind;
DROP INDEX IF EXISTS public.idx_tooth_patient;
DROP INDEX IF EXISTS public.idx_tooth_obs_tooth;
DROP INDEX IF EXISTS public.idx_tooth_obs_patient;
DROP INDEX IF EXISTS public.idx_tooth_exam_patient;
DROP INDEX IF EXISTS public.idx_tooth_diag_patient;
DROP INDEX IF EXISTS public.idx_tooth_cond_patient;
DROP INDEX IF EXISTS public.idx_tooth_clinical_patient;
DROP INDEX IF EXISTS public.idx_templates_clinic;
DROP INDEX IF EXISTS public.idx_tba_patient;
DROP INDEX IF EXISTS public.idx_tba_clinic_resolved;
DROP INDEX IF EXISTS public.idx_staff_clinic_role;
DROP INDEX IF EXISTS public.idx_spec_tiers_specialist;
DROP INDEX IF EXISTS public.idx_spec_earn_specialist;
DROP INDEX IF EXISTS public.idx_spec_earn_settled;
DROP INDEX IF EXISTS public.idx_sittings_plan_num;
DROP INDEX IF EXISTS public.idx_sittings_plan;
DROP INDEX IF EXISTS public.idx_site_videos_active;
DROP INDEX IF EXISTS public.idx_session_status;
DROP INDEX IF EXISTS public.idx_session_patient;
DROP INDEX IF EXISTS public.idx_session_clinic_date;
DROP INDEX IF EXISTS public.idx_service_cat_clinic;
DROP INDEX IF EXISTS public.idx_rx_diagnoses_list_gin;
DROP INDEX IF EXISTS public.idx_reschedule_clinic_status;
DROP INDEX IF EXISTS public.idx_reminder_log_clinic_fired;
DROP INDEX IF EXISTS public.idx_ratings_token;
DROP INDEX IF EXISTS public.idx_ratings_patient;
DROP INDEX IF EXISTS public.idx_qr_codes_kind_target;
DROP INDEX IF EXISTS public.idx_qr_codes_clinic;
DROP INDEX IF EXISTS public.idx_proc_catalog_active;
DROP INDEX IF EXISTS public.idx_prescriptions_patient_date;
DROP INDEX IF EXISTS public.idx_prescriptions_patient_created;
DROP INDEX IF EXISTS public.idx_prescriptions_patient;
DROP INDEX IF EXISTS public.idx_portal_tokens_token;
DROP INDEX IF EXISTS public.idx_portal_tokens_patient;
DROP INDEX IF EXISTS public.idx_plans_status;
DROP INDEX IF EXISTS public.idx_plans_patient;
DROP INDEX IF EXISTS public.idx_plan_rev;
DROP INDEX IF EXISTS public.idx_plan_items;
DROP INDEX IF EXISTS public.idx_phone_consult_payment;
DROP INDEX IF EXISTS public.idx_phone_consult_clinic;
DROP INDEX IF EXISTS public.idx_payments_patient_date;
DROP INDEX IF EXISTS public.idx_payments_patient_created;
DROP INDEX IF EXISTS public.idx_pay_txn_plan;
DROP INDEX IF EXISTS public.idx_pay_txn_patient;
DROP INDEX IF EXISTS public.idx_pay_txn_date;
DROP INDEX IF EXISTS public.idx_patients_phone_trgm;
DROP INDEX IF EXISTS public.idx_patients_phone;
DROP INDEX IF EXISTS public.idx_patients_name_trgm;
DROP INDEX IF EXISTS public.idx_patients_name;
DROP INDEX IF EXISTS public.idx_patients_clinic_active;
DROP INDEX IF EXISTS public.idx_patient_auto_delete;
DROP INDEX IF EXISTS public.idx_notif_recipient;
DROP INDEX IF EXISTS public.idx_notif_created;
DROP INDEX IF EXISTS public.idx_notif_clinic_type;
DROP INDEX IF EXISTS public.idx_msg_tpl_key;
DROP INDEX IF EXISTS public.idx_msg_log_scheduled;
DROP INDEX IF EXISTS public.idx_msg_log_recipient;
DROP INDEX IF EXISTS public.idx_msg_log_lab_order;
DROP INDEX IF EXISTS public.idx_msg_log_clinic;
DROP INDEX IF EXISTS public.idx_msg_log_appointment;
DROP INDEX IF EXISTS public.idx_msg_apt;
DROP INDEX IF EXISTS public.idx_medicine_catalog_usage;
DROP INDEX IF EXISTS public.idx_medicine_catalog_name_trgm;
DROP INDEX IF EXISTS public.idx_media_gallery_patient_tooth;
DROP INDEX IF EXISTS public.idx_media_gallery_patient_taken;
DROP INDEX IF EXISTS public.idx_media_gallery_clinic_taken;
DROP INDEX IF EXISTS public.idx_med_catalog_active;
DROP INDEX IF EXISTS public.idx_lab_vendors_active;
DROP INDEX IF EXISTS public.idx_lab_orders_pending;
DROP INDEX IF EXISTS public.idx_lab_orders_patient;
DROP INDEX IF EXISTS public.idx_lab_orders_appointment;
DROP INDEX IF EXISTS public.idx_image_type;
DROP INDEX IF EXISTS public.idx_image_tooth;
DROP INDEX IF EXISTS public.idx_image_patient;
DROP INDEX IF EXISTS public.idx_health_patient;
DROP INDEX IF EXISTS public.idx_gallery_clinic_order;
DROP INDEX IF EXISTS public.idx_followups_patient;
DROP INDEX IF EXISTS public.idx_followups_clinic_date;
DROP INDEX IF EXISTS public.idx_fee_override_active;
DROP INDEX IF EXISTS public.idx_exam_catalog_name;
DROP INDEX IF EXISTS public.idx_dwp_clinic_staff;
DROP INDEX IF EXISTS public.idx_diag_catalog_name;
DROP INDEX IF EXISTS public.idx_credits_patient_unused;
DROP INDEX IF EXISTS public.idx_content_clinic_section;
DROP INDEX IF EXISTS public.idx_clinical_link_source;
DROP INDEX IF EXISTS public.idx_clinical_link_clinic;
DROP INDEX IF EXISTS public.idx_clinic_page_sections_page_order;
DROP INDEX IF EXISTS public.idx_call_status;
DROP INDEX IF EXISTS public.idx_call_apt;
DROP INDEX IF EXISTS public.idx_bot_log_channel_dir;
DROP INDEX IF EXISTS public.idx_bot_event_log_clinic_created;
DROP INDEX IF EXISTS public.idx_apt_workflow;
DROP INDEX IF EXISTS public.idx_apt_type;
DROP INDEX IF EXISTS public.idx_apt_status;
DROP INDEX IF EXISTS public.idx_apt_specialist;
DROP INDEX IF EXISTS public.idx_apt_req_clinic_status;
DROP INDEX IF EXISTS public.idx_apt_patient;
DROP INDEX IF EXISTS public.idx_apt_effective_date;
DROP INDEX IF EXISTS public.idx_apt_contact_status;
DROP INDEX IF EXISTS public.idx_apt_clinic_date;
DROP INDEX IF EXISTS public.idx_apt_arrived_at;
DROP INDEX IF EXISTS public.idx_appointments_patient_date;
DROP INDEX IF EXISTS public.idx_annot_image;
DROP INDEX IF EXISTS public.appointment_history_apt_idx;
DROP INDEX IF EXISTS public.appointment_history_action_idx;
ALTER TABLE IF EXISTS ONLY public.workspace_drafts DROP CONSTRAINT IF EXISTS workspace_drafts_pkey;
ALTER TABLE IF EXISTS ONLY public.walk_in_patients DROP CONSTRAINT IF EXISTS walk_in_patients_pkey;
ALTER TABLE IF EXISTS ONLY public.tooth_clinical_records DROP CONSTRAINT IF EXISTS uq_tooth_clinical_patient_tooth;
ALTER TABLE IF EXISTS ONLY public.treatment_templates DROP CONSTRAINT IF EXISTS treatment_templates_pkey;
ALTER TABLE IF EXISTS ONLY public.treatment_sittings DROP CONSTRAINT IF EXISTS treatment_sittings_pkey;
ALTER TABLE IF EXISTS ONLY public.treatment_sessions DROP CONSTRAINT IF EXISTS treatment_sessions_pkey;
ALTER TABLE IF EXISTS ONLY public.treatment_plans DROP CONSTRAINT IF EXISTS treatment_plans_pkey;
ALTER TABLE IF EXISTS ONLY public.treatment_plan_items DROP CONSTRAINT IF EXISTS treatment_plan_items_pkey;
ALTER TABLE IF EXISTS ONLY public.tooth_treatments DROP CONSTRAINT IF EXISTS tooth_treatments_pkey;
ALTER TABLE IF EXISTS ONLY public.tooth_observations DROP CONSTRAINT IF EXISTS tooth_observations_pkey;
ALTER TABLE IF EXISTS ONLY public.tooth_issue_catalog DROP CONSTRAINT IF EXISTS tooth_issue_catalog_pkey;
ALTER TABLE IF EXISTS ONLY public.tooth_issue_catalog DROP CONSTRAINT IF EXISTS tooth_issue_catalog_issue_name_key;
ALTER TABLE IF EXISTS ONLY public.tooth_examinations DROP CONSTRAINT IF EXISTS tooth_examinations_pkey;
ALTER TABLE IF EXISTS ONLY public.tooth_diagnoses DROP CONSTRAINT IF EXISTS tooth_diagnoses_pkey;
ALTER TABLE IF EXISTS ONLY public.tooth_conditions DROP CONSTRAINT IF EXISTS tooth_conditions_pkey;
ALTER TABLE IF EXISTS ONLY public.tooth_conditions DROP CONSTRAINT IF EXISTS tooth_conditions_patient_id_tooth_number_is_active_key;
ALTER TABLE IF EXISTS ONLY public.tooth_clinical_records DROP CONSTRAINT IF EXISTS tooth_clinical_records_pkey;
ALTER TABLE IF EXISTS ONLY public.to_be_appointed DROP CONSTRAINT IF EXISTS to_be_appointed_pkey;
ALTER TABLE IF EXISTS ONLY public.staff DROP CONSTRAINT IF EXISTS staff_pkey;
ALTER TABLE IF EXISTS ONLY public.specialist_rate_tiers DROP CONSTRAINT IF EXISTS specialist_rate_tiers_specialist_id_tier_name_treatment_key_key;
ALTER TABLE IF EXISTS ONLY public.specialist_rate_tiers DROP CONSTRAINT IF EXISTS specialist_rate_tiers_pkey;
ALTER TABLE IF EXISTS ONLY public.specialist_notifications DROP CONSTRAINT IF EXISTS specialist_notifications_pkey;
ALTER TABLE IF EXISTS ONLY public.specialist_earnings DROP CONSTRAINT IF EXISTS specialist_earnings_pkey;
ALTER TABLE IF EXISTS ONLY public.smile_sessions DROP CONSTRAINT IF EXISTS smile_sessions_pkey;
ALTER TABLE IF EXISTS ONLY public.site_videos DROP CONSTRAINT IF EXISTS site_videos_pkey;
ALTER TABLE IF EXISTS ONLY public.site_theme DROP CONSTRAINT IF EXISTS site_theme_pkey;
ALTER TABLE IF EXISTS ONLY public.site_testimonials DROP CONSTRAINT IF EXISTS site_testimonials_pkey;
ALTER TABLE IF EXISTS ONLY public.site_services DROP CONSTRAINT IF EXISTS site_services_pkey;
ALTER TABLE IF EXISTS ONLY public.site_doctors DROP CONSTRAINT IF EXISTS site_doctors_pkey;
ALTER TABLE IF EXISTS ONLY public.service_catalog DROP CONSTRAINT IF EXISTS service_catalog_pkey;
ALTER TABLE IF EXISTS ONLY public.service_catalog DROP CONSTRAINT IF EXISTS service_catalog_clinic_id_name_key;
ALTER TABLE IF EXISTS ONLY public.reschedule_requests DROP CONSTRAINT IF EXISTS reschedule_requests_pkey;
ALTER TABLE IF EXISTS ONLY public.reminder_settings DROP CONSTRAINT IF EXISTS reminder_settings_pkey;
ALTER TABLE IF EXISTS ONLY public.reminder_settings DROP CONSTRAINT IF EXISTS reminder_settings_clinic_id_key;
ALTER TABLE IF EXISTS ONLY public.reminder_log DROP CONSTRAINT IF EXISTS reminder_log_reminder_key_key;
ALTER TABLE IF EXISTS ONLY public.reminder_log DROP CONSTRAINT IF EXISTS reminder_log_pkey;
ALTER TABLE IF EXISTS ONLY public.qr_codes DROP CONSTRAINT IF EXISTS qr_codes_short_code_uq;
ALTER TABLE IF EXISTS ONLY public.qr_codes DROP CONSTRAINT IF EXISTS qr_codes_pkey;
ALTER TABLE IF EXISTS ONLY public.procedure_medicine_map DROP CONSTRAINT IF EXISTS procedure_medicine_map_procedure_id_medicine_id_key;
ALTER TABLE IF EXISTS ONLY public.procedure_medicine_map DROP CONSTRAINT IF EXISTS procedure_medicine_map_pkey;
ALTER TABLE IF EXISTS ONLY public.procedure_catalog DROP CONSTRAINT IF EXISTS procedure_catalog_pkey;
ALTER TABLE IF EXISTS ONLY public.prescriptions DROP CONSTRAINT IF EXISTS prescriptions_pkey;
ALTER TABLE IF EXISTS ONLY public.plan_revisions DROP CONSTRAINT IF EXISTS plan_revisions_pkey;
ALTER TABLE IF EXISTS ONLY public.phone_consultations DROP CONSTRAINT IF EXISTS phone_consultations_pkey;
ALTER TABLE IF EXISTS ONLY public.payment_transactions DROP CONSTRAINT IF EXISTS payment_transactions_pkey;
ALTER TABLE IF EXISTS ONLY public.patients DROP CONSTRAINT IF EXISTS patients_pkey;
ALTER TABLE IF EXISTS ONLY public.patient_uploads DROP CONSTRAINT IF EXISTS patient_uploads_pkey;
ALTER TABLE IF EXISTS ONLY public.patient_ratings DROP CONSTRAINT IF EXISTS patient_ratings_token_key;
ALTER TABLE IF EXISTS ONLY public.patient_ratings DROP CONSTRAINT IF EXISTS patient_ratings_pkey;
ALTER TABLE IF EXISTS ONLY public.patient_portal_tokens DROP CONSTRAINT IF EXISTS patient_portal_tokens_token_key;
ALTER TABLE IF EXISTS ONLY public.patient_portal_tokens DROP CONSTRAINT IF EXISTS patient_portal_tokens_pkey;
ALTER TABLE IF EXISTS ONLY public.patient_images DROP CONSTRAINT IF EXISTS patient_images_pkey;
ALTER TABLE IF EXISTS ONLY public.patient_health DROP CONSTRAINT IF EXISTS patient_health_pkey;
ALTER TABLE IF EXISTS ONLY public.patient_health DROP CONSTRAINT IF EXISTS patient_health_patient_id_key;
ALTER TABLE IF EXISTS ONLY public.patient_credits DROP CONSTRAINT IF EXISTS patient_credits_pkey;
ALTER TABLE IF EXISTS ONLY public.module_visibility DROP CONSTRAINT IF EXISTS module_visibility_pkey;
ALTER TABLE IF EXISTS ONLY public.module_visibility DROP CONSTRAINT IF EXISTS module_visibility_clinic_id_module_key_role_key;
ALTER TABLE IF EXISTS ONLY public.message_templates DROP CONSTRAINT IF EXISTS message_templates_pkey;
ALTER TABLE IF EXISTS ONLY public.message_templates DROP CONSTRAINT IF EXISTS message_templates_clinic_id_template_key_key;
ALTER TABLE IF EXISTS ONLY public.message_log DROP CONSTRAINT IF EXISTS message_log_pkey;
ALTER TABLE IF EXISTS ONLY public.medicine_reminders DROP CONSTRAINT IF EXISTS medicine_reminders_pkey;
ALTER TABLE IF EXISTS ONLY public.medicine_catalog DROP CONSTRAINT IF EXISTS medicine_catalog_pkey;
ALTER TABLE IF EXISTS ONLY public.media DROP CONSTRAINT IF EXISTS media_pkey;
ALTER TABLE IF EXISTS ONLY public.media_gallery DROP CONSTRAINT IF EXISTS media_gallery_pkey;
ALTER TABLE IF EXISTS ONLY public.lab_work_types DROP CONSTRAINT IF EXISTS lab_work_types_pkey;
ALTER TABLE IF EXISTS ONLY public.lab_work_types DROP CONSTRAINT IF EXISTS lab_work_types_name_key;
ALTER TABLE IF EXISTS ONLY public.lab_vendors DROP CONSTRAINT IF EXISTS lab_vendors_pkey;
ALTER TABLE IF EXISTS ONLY public.lab_orders DROP CONSTRAINT IF EXISTS lab_orders_pkey;
ALTER TABLE IF EXISTS ONLY public.lab_order_payments DROP CONSTRAINT IF EXISTS lab_order_payments_pkey;
ALTER TABLE IF EXISTS ONLY public.kanban_columns DROP CONSTRAINT IF EXISTS kanban_columns_pkey;
ALTER TABLE IF EXISTS ONLY public.kanban_columns DROP CONSTRAINT IF EXISTS kanban_columns_clinic_id_plan_status_key;
ALTER TABLE IF EXISTS ONLY public.image_annotations DROP CONSTRAINT IF EXISTS image_annotations_pkey;
ALTER TABLE IF EXISTS ONLY public.illness_library DROP CONSTRAINT IF EXISTS illness_library_pkey;
ALTER TABLE IF EXISTS ONLY public.illness_library DROP CONSTRAINT IF EXISTS illness_library_clinic_id_name_key;
ALTER TABLE IF EXISTS ONLY public.gallery_images DROP CONSTRAINT IF EXISTS gallery_images_pkey;
ALTER TABLE IF EXISTS ONLY public.follow_ups DROP CONSTRAINT IF EXISTS follow_ups_pkey;
ALTER TABLE IF EXISTS ONLY public.fee_schedule_overrides DROP CONSTRAINT IF EXISTS fee_schedule_overrides_pkey;
ALTER TABLE IF EXISTS ONLY public.examination_finding_catalog DROP CONSTRAINT IF EXISTS examination_finding_catalog_pkey;
ALTER TABLE IF EXISTS ONLY public.examination_finding_catalog DROP CONSTRAINT IF EXISTS examination_finding_catalog_finding_name_key;
ALTER TABLE IF EXISTS ONLY public.examination_catalog DROP CONSTRAINT IF EXISTS examination_catalog_pkey;
ALTER TABLE IF EXISTS ONLY public.diagnosis_catalog DROP CONSTRAINT IF EXISTS diagnosis_catalog_pkey;
ALTER TABLE IF EXISTS ONLY public.diagnosis_catalog DROP CONSTRAINT IF EXISTS diagnosis_catalog_diagnosis_name_key;
ALTER TABLE IF EXISTS ONLY public.dashboard_widget_prefs DROP CONSTRAINT IF EXISTS dashboard_widget_prefs_pkey;
ALTER TABLE IF EXISTS ONLY public.dashboard_widget_prefs DROP CONSTRAINT IF EXISTS dashboard_widget_prefs_clinic_id_staff_id_widget_key_key;
ALTER TABLE IF EXISTS ONLY public.communication_log DROP CONSTRAINT IF EXISTS communication_log_pkey;
ALTER TABLE IF EXISTS ONLY public.common_conditions DROP CONSTRAINT IF EXISTS common_conditions_pkey;
ALTER TABLE IF EXISTS ONLY public.common_conditions DROP CONSTRAINT IF EXISTS common_conditions_condition_name_key;
ALTER TABLE IF EXISTS ONLY public.common_complaints DROP CONSTRAINT IF EXISTS common_complaints_pkey;
ALTER TABLE IF EXISTS ONLY public.common_complaints DROP CONSTRAINT IF EXISTS common_complaints_complaint_name_key;
ALTER TABLE IF EXISTS ONLY public.clinics DROP CONSTRAINT IF EXISTS clinics_pkey;
ALTER TABLE IF EXISTS ONLY public.clinical_link_scores DROP CONSTRAINT IF EXISTS clinical_link_scores_pkey;
ALTER TABLE IF EXISTS ONLY public.clinical_link_scores DROP CONSTRAINT IF EXISTS clinical_link_scores_link_type_source_key_target_key_clinic_key;
ALTER TABLE IF EXISTS ONLY public.clinic_settings DROP CONSTRAINT IF EXISTS clinic_settings_pkey;
ALTER TABLE IF EXISTS ONLY public.clinic_pages DROP CONSTRAINT IF EXISTS clinic_pages_pkey;
ALTER TABLE IF EXISTS ONLY public.clinic_pages DROP CONSTRAINT IF EXISTS clinic_pages_clinic_id_slug_key;
ALTER TABLE IF EXISTS ONLY public.clinic_page_sections DROP CONSTRAINT IF EXISTS clinic_page_sections_pkey;
ALTER TABLE IF EXISTS ONLY public.clinic_notifications DROP CONSTRAINT IF EXISTS clinic_notifications_pkey;
ALTER TABLE IF EXISTS ONLY public.clinic_info DROP CONSTRAINT IF EXISTS clinic_info_pkey;
ALTER TABLE IF EXISTS ONLY public.clinic_info DROP CONSTRAINT IF EXISTS clinic_info_key_key;
ALTER TABLE IF EXISTS ONLY public.clinic_info_ext DROP CONSTRAINT IF EXISTS clinic_info_ext_pkey;
ALTER TABLE IF EXISTS ONLY public.clinic_holidays DROP CONSTRAINT IF EXISTS clinic_holidays_pkey;
ALTER TABLE IF EXISTS ONLY public.clinic_holidays DROP CONSTRAINT IF EXISTS clinic_holidays_clinic_id_holiday_date_key;
ALTER TABLE IF EXISTS ONLY public.clinic_content DROP CONSTRAINT IF EXISTS clinic_content_pkey;
ALTER TABLE IF EXISTS ONLY public.business_hours DROP CONSTRAINT IF EXISTS business_hours_pkey;
ALTER TABLE IF EXISTS ONLY public.business_hours DROP CONSTRAINT IF EXISTS business_hours_clinic_id_weekday_key;
ALTER TABLE IF EXISTS ONLY public.bot_event_log DROP CONSTRAINT IF EXISTS bot_event_log_pkey;
ALTER TABLE IF EXISTS ONLY public.bot_config DROP CONSTRAINT IF EXISTS bot_config_pkey;
ALTER TABLE IF EXISTS ONLY public.bot_config DROP CONSTRAINT IF EXISTS bot_config_clinic_id_key;
ALTER TABLE IF EXISTS ONLY public.ar_preview_settings DROP CONSTRAINT IF EXISTS ar_preview_settings_pkey;
ALTER TABLE IF EXISTS ONLY public.appointments DROP CONSTRAINT IF EXISTS appointments_pkey;
ALTER TABLE IF EXISTS ONLY public.appointment_types DROP CONSTRAINT IF EXISTS appointment_types_type_name_key;
ALTER TABLE IF EXISTS ONLY public.appointment_types DROP CONSTRAINT IF EXISTS appointment_types_pkey;
ALTER TABLE IF EXISTS ONLY public.appointment_requests DROP CONSTRAINT IF EXISTS appointment_requests_pkey;
ALTER TABLE IF EXISTS ONLY public.appointment_message_logs DROP CONSTRAINT IF EXISTS appointment_message_logs_pkey;
ALTER TABLE IF EXISTS ONLY public.appointment_history DROP CONSTRAINT IF EXISTS appointment_history_pkey;
ALTER TABLE IF EXISTS ONLY public.appointment_call_logs DROP CONSTRAINT IF EXISTS appointment_call_logs_pkey;
ALTER TABLE IF EXISTS public.patient_uploads ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.lab_orders ALTER COLUMN serial_no DROP DEFAULT;
ALTER TABLE IF EXISTS public.clinic_info ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.appointment_requests ALTER COLUMN id DROP DEFAULT;
DROP TABLE IF EXISTS public.workspace_drafts;
DROP TABLE IF EXISTS public.walk_in_patients;
DROP VIEW IF EXISTS public.v_workshop_specialist_work;
DROP VIEW IF EXISTS public.v_specialist_payables;
DROP VIEW IF EXISTS public.v_specialist_outstanding;
DROP VIEW IF EXISTS public.v_procedure_revenue;
DROP VIEW IF EXISTS public.v_pending_lab_orders_by_patient;
DROP VIEW IF EXISTS public.v_patient_summary;
DROP VIEW IF EXISTS public.v_outstanding_balances;
DROP VIEW IF EXISTS public.v_monthly_revenue;
DROP VIEW IF EXISTS public.v_lab_payables;
DROP VIEW IF EXISTS public.v_doctor_performance;
DROP VIEW IF EXISTS public.v_daily_revenue_by_mode;
DROP VIEW IF EXISTS public.v_daily_revenue;
DROP VIEW IF EXISTS public.v_appointments_bucketed;
DROP TABLE IF EXISTS public.treatment_templates;
DROP TABLE IF EXISTS public.treatment_sittings;
DROP TABLE IF EXISTS public.treatment_sessions;
DROP TABLE IF EXISTS public.treatment_plan_items;
DROP TABLE IF EXISTS public.tooth_treatments;
DROP TABLE IF EXISTS public.tooth_issue_catalog;
DROP TABLE IF EXISTS public.tooth_examinations;
DROP TABLE IF EXISTS public.tooth_diagnoses;
DROP TABLE IF EXISTS public.tooth_conditions;
DROP TABLE IF EXISTS public.tooth_clinical_records;
DROP TABLE IF EXISTS public.to_be_appointed;
DROP TABLE IF EXISTS public.staff;
DROP TABLE IF EXISTS public.specialist_rate_tiers;
DROP TABLE IF EXISTS public.specialist_notifications;
DROP TABLE IF EXISTS public.specialist_earnings;
DROP TABLE IF EXISTS public.smile_sessions;
DROP TABLE IF EXISTS public.site_videos;
DROP TABLE IF EXISTS public.site_theme;
DROP TABLE IF EXISTS public.site_testimonials;
DROP TABLE IF EXISTS public.site_services;
DROP TABLE IF EXISTS public.site_doctors;
DROP TABLE IF EXISTS public.service_catalog;
DROP VIEW IF EXISTS public.rewards_redeemed_v;
DROP TABLE IF EXISTS public.reschedule_requests;
DROP TABLE IF EXISTS public.reminder_settings;
DROP TABLE IF EXISTS public.reminder_log;
DROP TABLE IF EXISTS public.qr_codes;
DROP TABLE IF EXISTS public.procedure_medicine_map;
DROP TABLE IF EXISTS public.procedure_catalog;
DROP TABLE IF EXISTS public.plan_revisions;
DROP TABLE IF EXISTS public.phone_consultations;
DROP SEQUENCE IF EXISTS public.patient_uploads_id_seq;
DROP TABLE IF EXISTS public.patient_uploads;
DROP VIEW IF EXISTS public.patient_summary_v;
DROP TABLE IF EXISTS public.prescriptions;
DROP TABLE IF EXISTS public.payment_transactions;
DROP TABLE IF EXISTS public.patient_ratings;
DROP TABLE IF EXISTS public.patient_portal_tokens;
DROP TABLE IF EXISTS public.patient_images;
DROP TABLE IF EXISTS public.patient_health;
DROP TABLE IF EXISTS public.patient_credits;
DROP VIEW IF EXISTS public.patient_booking_constraints_v;
DROP TABLE IF EXISTS public.treatment_plans;
DROP TABLE IF EXISTS public.tooth_observations;
DROP TABLE IF EXISTS public.patients;
DROP TABLE IF EXISTS public.module_visibility;
DROP TABLE IF EXISTS public.message_templates;
DROP VIEW IF EXISTS public.message_log_stats_v;
DROP TABLE IF EXISTS public.medicine_reminders;
DROP TABLE IF EXISTS public.medicine_catalog;
DROP TABLE IF EXISTS public.media_gallery;
DROP TABLE IF EXISTS public.media;
DROP TABLE IF EXISTS public.lab_work_types;
DROP TABLE IF EXISTS public.lab_vendors;
DROP SEQUENCE IF EXISTS public.lab_orders_serial_no_seq;
DROP TABLE IF EXISTS public.lab_orders;
DROP TABLE IF EXISTS public.lab_order_payments;
DROP TABLE IF EXISTS public.kanban_columns;
DROP TABLE IF EXISTS public.image_annotations;
DROP TABLE IF EXISTS public.illness_library;
DROP TABLE IF EXISTS public.gallery_images;
DROP TABLE IF EXISTS public.follow_ups;
DROP TABLE IF EXISTS public.fee_schedule_overrides;
DROP TABLE IF EXISTS public.examination_finding_catalog;
DROP TABLE IF EXISTS public.examination_catalog;
DROP TABLE IF EXISTS public.diagnosis_catalog;
DROP TABLE IF EXISTS public.dashboard_widget_prefs;
DROP TABLE IF EXISTS public.communication_log;
DROP VIEW IF EXISTS public.communication_counter_v;
DROP TABLE IF EXISTS public.message_log;
DROP TABLE IF EXISTS public.common_conditions;
DROP TABLE IF EXISTS public.common_complaints;
DROP TABLE IF EXISTS public.clinics;
DROP TABLE IF EXISTS public.clinical_link_scores;
DROP TABLE IF EXISTS public.clinic_settings;
DROP TABLE IF EXISTS public.clinic_pages;
DROP TABLE IF EXISTS public.clinic_page_sections;
DROP TABLE IF EXISTS public.clinic_notifications;
DROP SEQUENCE IF EXISTS public.clinic_info_id_seq;
DROP TABLE IF EXISTS public.clinic_info_ext;
DROP TABLE IF EXISTS public.clinic_info;
DROP TABLE IF EXISTS public.clinic_holidays;
DROP TABLE IF EXISTS public.clinic_content;
DROP TABLE IF EXISTS public.business_hours;
DROP TABLE IF EXISTS public.bot_event_log;
DROP TABLE IF EXISTS public.bot_config;
DROP TABLE IF EXISTS public.ar_preview_settings;
DROP TABLE IF EXISTS public.appointments;
DROP TABLE IF EXISTS public.appointment_types;
DROP SEQUENCE IF EXISTS public.appointment_requests_id_seq;
DROP TABLE IF EXISTS public.appointment_requests;
DROP TABLE IF EXISTS public.appointment_message_logs;
DROP TABLE IF EXISTS public.appointment_history;
DROP TABLE IF EXISTS public.appointment_call_logs;
DROP EXTENSION IF EXISTS "uuid-ossp";
DROP EXTENSION IF EXISTS pgcrypto;
DROP EXTENSION IF EXISTS pg_trgm;
--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: appointment_call_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.appointment_call_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    appointment_id uuid,
    called_by_staff_id uuid,
    call_status character varying(30) NOT NULL,
    call_time timestamp without time zone DEFAULT now(),
    notes text,
    callback_scheduled_for timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: appointment_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.appointment_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    appointment_id uuid NOT NULL,
    action_type character varying(40) NOT NULL,
    old_value jsonb,
    new_value jsonb,
    changed_by_staff_id uuid,
    changed_at timestamp with time zone DEFAULT now(),
    notes text
);


--
-- Name: appointment_message_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.appointment_message_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    appointment_id uuid,
    patient_id uuid,
    sent_by_staff_id uuid,
    channel character varying(20) NOT NULL,
    template_used character varying(50),
    message_body text,
    sent_at timestamp without time zone DEFAULT now(),
    delivery_status character varying(20) DEFAULT 'manually_sent'::character varying,
    patient_reply text
);


--
-- Name: appointment_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.appointment_requests (
    id integer NOT NULL,
    patient_name text NOT NULL,
    phone text NOT NULL,
    preferred_date date,
    preferred_time text,
    branch text,
    message text,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now(),
    clinic_id uuid,
    email character varying(120),
    source character varying(30) DEFAULT 'public_site'::character varying,
    converted_to_appointment_id uuid,
    handled_by uuid,
    notes text,
    service character varying(100)
);


--
-- Name: appointment_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.appointment_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: appointment_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.appointment_requests_id_seq OWNED BY public.appointment_requests.id;


--
-- Name: appointment_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.appointment_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type_name character varying(60) NOT NULL,
    sort_order integer DEFAULT 100,
    is_default boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: appointments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.appointments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    clinic_id uuid NOT NULL,
    doctor_id uuid,
    treatment_plan_id uuid,
    sitting_number integer,
    requested_date date,
    requested_time time without time zone,
    confirmed_date date,
    confirmed_time time without time zone,
    source character varying(20) DEFAULT 'whatsapp'::character varying,
    reason text,
    status character varying(20) DEFAULT 'pending'::character varying,
    queue_position integer,
    arrived_at timestamp with time zone,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    staff_notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    scheduled_date date,
    scheduled_time time without time zone,
    duration_minutes integer DEFAULT 30,
    contact_status character varying(30) DEFAULT 'pending_call'::character varying,
    last_contacted_at timestamp without time zone,
    last_contacted_by uuid,
    reschedule_reason text,
    cancel_reason text,
    workflow_status character varying(30) DEFAULT 'scheduled'::character varying,
    chief_complaints jsonb DEFAULT '[]'::jsonb,
    appointment_type character varying(60),
    specialist_id uuid,
    specialist_assigned_at timestamp with time zone,
    specialist_assigned_by uuid,
    specialist_session_status character varying(20) DEFAULT NULL::character varying,
    specialist_closed_at timestamp with time zone,
    specialist_notes text,
    phone_number character varying(15),
    specialist_confirmation_status character varying(20) DEFAULT NULL::character varying,
    specialist_called_at timestamp with time zone,
    specialist_called_by uuid,
    pending_action character varying(30) DEFAULT NULL::character varying,
    pending_action_since timestamp with time zone,
    specialist_call_confirmed boolean DEFAULT false NOT NULL,
    CONSTRAINT appointments_source_check CHECK (((source)::text = ANY (ARRAY['whatsapp'::text, 'walkin'::text, 'followup'::text, 'emergency'::text, 'phone'::text, 'public_site'::text, 'website'::text]))),
    CONSTRAINT appointments_spec_conf_check CHECK (((specialist_confirmation_status IS NULL) OR ((specialist_confirmation_status)::text = ANY (ARRAY[('pending_call'::character varying)::text, ('confirmed'::character varying)::text, ('declined'::character varying)::text])))),
    CONSTRAINT appointments_status_check CHECK (((status)::text = ANY (ARRAY['pending'::text, 'scheduled'::text, 'confirmed'::text, 'arrived'::text, 'ready'::text, 'in_progress'::text, 'in_treatment'::text, 'payment_pending'::text, 'completed'::text, 'done'::text, 'rescheduled'::text, 'rejected'::text, 'no_show'::text, 'cancelled'::text])))
);


--
-- Name: ar_preview_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ar_preview_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    banuba_token text,
    enabled_effects text[] DEFAULT ARRAY['whitening'::text],
    default_whitening_intensity integer DEFAULT 60,
    braces_style character varying(20) DEFAULT 'metal'::character varying,
    veneer_shade character varying(20) DEFAULT 'natural'::character varying,
    show_alignment_guide boolean DEFAULT true,
    custom_branding_text text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: bot_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bot_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clinic_id uuid NOT NULL,
    n8n_webhook_url text,
    n8n_enabled boolean DEFAULT false,
    telegram_bot_token text,
    telegram_chat_id character varying(100),
    telegram_enabled boolean DEFAULT false,
    whatsapp_bot_enabled boolean DEFAULT false,
    whatsapp_intent_routing jsonb DEFAULT '[]'::jsonb,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: bot_event_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bot_event_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clinic_id uuid NOT NULL,
    channel character varying(20) NOT NULL,
    direction character varying(10) NOT NULL,
    patient_id uuid,
    from_id character varying(100),
    intent character varying(50),
    message_text text,
    response_text text,
    status character varying(20) DEFAULT 'processed'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT bot_event_log_status_check CHECK (((status)::text = ANY (ARRAY[('processed'::character varying)::text, ('sent'::character varying)::text, ('failed'::character varying)::text, ('queued'::character varying)::text, ('duplicate'::character varying)::text, ('ignored'::character varying)::text])))
);


--
-- Name: business_hours; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_hours (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clinic_id uuid NOT NULL,
    weekday integer NOT NULL,
    is_closed boolean DEFAULT false,
    open_time time without time zone,
    close_time time without time zone,
    break_start time without time zone,
    break_end time without time zone,
    CONSTRAINT business_hours_weekday_check CHECK (((weekday >= 0) AND (weekday <= 6)))
);


--
-- Name: clinic_content; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clinic_content (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clinic_id uuid,
    section character varying(50) NOT NULL,
    title text,
    body text,
    image_url text,
    image_url_2 text,
    order_idx integer DEFAULT 0,
    is_active boolean DEFAULT true,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    subtitle text,
    cta_text character varying(60),
    cta_link text
);


--
-- Name: clinic_holidays; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clinic_holidays (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clinic_id uuid NOT NULL,
    holiday_date date NOT NULL,
    reason character varying(200),
    is_recurring boolean DEFAULT false
);


--
-- Name: clinic_info; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clinic_info (
    id integer NOT NULL,
    key text NOT NULL,
    value text,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: clinic_info_ext; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clinic_info_ext (
    clinic_id uuid NOT NULL,
    logo_url text,
    letterhead_url text,
    gst_number character varying(40),
    license_number character varying(60),
    establishment_year integer,
    tagline character varying(200),
    primary_doctor_name character varying(120),
    primary_doctor_qual character varying(200),
    primary_doctor_reg character varying(60),
    accent_color character varying(20) DEFAULT '#0E7C7B'::character varying,
    secondary_color character varying(20) DEFAULT '#0A5C5B'::character varying,
    rx_language character varying(10) DEFAULT 'en'::character varying,
    rx_format character varying(10) DEFAULT 'A4'::character varying,
    rx_show_qr boolean DEFAULT true,
    rx_footer_text text,
    public_about text,
    public_emergency_msg text,
    socials jsonb DEFAULT '{}'::jsonb,
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid
);


--
-- Name: clinic_info_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.clinic_info_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: clinic_info_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.clinic_info_id_seq OWNED BY public.clinic_info.id;


--
-- Name: clinic_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clinic_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clinic_id uuid NOT NULL,
    notification_type character varying(50) NOT NULL,
    recipient_staff_id uuid,
    recipient_role character varying(30),
    sender_staff_id uuid,
    title text NOT NULL,
    message text,
    data jsonb DEFAULT '{}'::jsonb,
    priority character varying(20) DEFAULT 'normal'::character varying,
    is_read boolean DEFAULT false,
    read_at timestamp without time zone,
    related_patient_id uuid,
    related_appointment_id uuid,
    related_session_id uuid,
    created_at timestamp without time zone DEFAULT now(),
    expires_at timestamp without time zone
);


--
-- Name: clinic_page_sections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clinic_page_sections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    page_id uuid NOT NULL,
    section_type character varying(30) NOT NULL,
    display_order integer DEFAULT 0,
    content jsonb DEFAULT '{}'::jsonb,
    is_visible boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: clinic_pages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clinic_pages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clinic_id uuid NOT NULL,
    slug character varying(50) NOT NULL,
    title character varying(200),
    meta_description text,
    is_published boolean DEFAULT true,
    display_order integer DEFAULT 0,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: clinic_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clinic_settings (
    clinic_id uuid NOT NULL,
    message_transport character varying(20) DEFAULT 'click2chat'::character varying NOT NULL,
    cloud_api_token text,
    cloud_api_phone_id character varying(60),
    cloud_api_waba_id character varying(60),
    webhook_url text,
    webhook_secret character varying(128),
    reminder_24h_enabled boolean DEFAULT true NOT NULL,
    reminder_2h_enabled boolean DEFAULT true NOT NULL,
    reminder_30m_enabled boolean DEFAULT false NOT NULL,
    receipt_mode character varying(20) DEFAULT 'manual_confirm'::character varying NOT NULL,
    rating_ask_enabled boolean DEFAULT true NOT NULL,
    rating_ask_hours integer DEFAULT 24 NOT NULL,
    rating_retry_days integer DEFAULT 5 NOT NULL,
    rating_discount_amount numeric(10,2) DEFAULT 100.00 NOT NULL,
    rating_discount_mode character varying(20) DEFAULT 'auto_apply'::character varying NOT NULL,
    razorpay_key_id character varying(80),
    razorpay_key_secret text,
    razorpay_mode character varying(10) DEFAULT 'test'::character varying NOT NULL,
    phone_consult_enabled boolean DEFAULT false NOT NULL,
    phone_consult_fee numeric(10,2) DEFAULT 100.00 NOT NULL,
    phone_consult_duration_min integer DEFAULT 10 NOT NULL,
    extra_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid,
    n8n_hosting_kind character varying(30) DEFAULT 'self_hosted'::character varying,
    n8n_webhook_base text,
    n8n_dashboard_url text
);


--
-- Name: clinical_link_scores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clinical_link_scores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    link_type character varying(40) NOT NULL,
    source_key character varying(300) NOT NULL,
    target_key character varying(300) NOT NULL,
    clinic_id uuid,
    score integer DEFAULT 1 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: clinics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clinics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    short_name character varying(30) NOT NULL,
    address text NOT NULL,
    google_maps_link text,
    phone character varying(15) NOT NULL,
    whatsapp_number character varying(15) NOT NULL,
    timings jsonb DEFAULT '{}'::jsonb NOT NULL,
    logo_url text,
    doctor_name character varying(100),
    doctor_degree character varying(200),
    doctor_reg_no character varying(50),
    signature_url text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    tagline text,
    google_maps_embed_url text,
    street_view_embed_url text,
    directions_url text,
    latitude numeric(10,7),
    longitude numeric(10,7),
    hero_image_url text,
    theme_color character varying(20),
    public_phone character varying(20),
    whatsapp_link text,
    show_on_public_site boolean DEFAULT true,
    display_order integer DEFAULT 0,
    google_place_id text
);


--
-- Name: common_complaints; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.common_complaints (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    complaint_name character varying(150) NOT NULL,
    category character varying(50) DEFAULT 'general'::character varying,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: common_conditions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.common_conditions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    condition_name character varying(100) NOT NULL,
    category character varying(50) DEFAULT 'general'::character varying,
    is_default boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: message_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.message_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clinic_id uuid NOT NULL,
    template_key character varying(60),
    recipient_kind character varying(20) NOT NULL,
    recipient_id uuid,
    recipient_name character varying(200),
    recipient_phone character varying(30) NOT NULL,
    body text NOT NULL,
    appointment_id uuid,
    payment_id uuid,
    lab_order_id uuid,
    visit_id uuid,
    status character varying(20) DEFAULT 'queued'::character varying NOT NULL,
    transport character varying(20) NOT NULL,
    direction character varying(10) DEFAULT 'out'::character varying NOT NULL,
    trigger character varying(20) DEFAULT 'manual'::character varying NOT NULL,
    provider_msg_id character varying(120),
    error_text text,
    scheduled_for timestamp with time zone,
    sent_at timestamp with time zone,
    failed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid
);


--
-- Name: communication_counter_v; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.communication_counter_v AS
 SELECT clinic_id,
    count(*) FILTER (WHERE (((template_key)::text = 'appointment_confirmation'::text) AND ((status)::text = 'sent'::text))) AS confirmations_sent,
    count(*) FILTER (WHERE (((template_key)::text ~~ 'reminder_%'::text) AND ((status)::text = 'sent'::text))) AS reminders_sent,
    count(*) FILTER (WHERE (((template_key)::text ~~ 'followup_%'::text) AND ((status)::text = 'sent'::text))) AS followup_reminders_sent,
    count(*) FILTER (WHERE (((template_key)::text = 'receipt'::text) AND ((status)::text = 'sent'::text))) AS receipts_sent,
    count(*) FILTER (WHERE (((template_key)::text = 'rating_ask'::text) AND ((status)::text = 'sent'::text))) AS rating_requests_sent,
    count(*) FILTER (WHERE (((template_key)::text = 'rating_retry'::text) AND ((status)::text = 'sent'::text))) AS rating_reminders_sent,
    count(*) FILTER (WHERE (((template_key)::text = 'reward_earned'::text) AND ((status)::text = 'sent'::text))) AS rewards_generated,
    count(*) FILTER (WHERE (((template_key)::text ~~ 'lab_order%'::text) AND ((status)::text = 'sent'::text))) AS lab_orders_sent,
    count(*) FILTER (WHERE (((template_key)::text = ANY (ARRAY[('lab_due_tomorrow'::character varying)::text, ('lab_due_today'::character varying)::text, ('lab_overdue'::character varying)::text])) AND ((status)::text = 'sent'::text))) AS lab_reminders_sent,
    count(*) FILTER (WHERE (((template_key)::text ~~ 'specialist_%'::text) AND ((status)::text = 'sent'::text))) AS specialist_messages_sent,
    count(*) FILTER (WHERE (((template_key)::text = 'doctor_daily_digest'::text) AND ((status)::text = 'sent'::text))) AS doctor_digest_sent,
    count(*) FILTER (WHERE (((template_key)::text = 'nurse_daily_digest'::text) AND ((status)::text = 'sent'::text))) AS nurse_digest_sent,
    count(*) FILTER (WHERE (((trigger)::text = 'manual'::text) AND ((status)::text = 'sent'::text))) AS manual_messages_sent,
    count(*) FILTER (WHERE ((status)::text = 'failed'::text)) AS failed_messages,
    count(*) FILTER (WHERE ((status)::text = 'manual_pending'::text)) AS click_to_chat_pending,
    count(*) FILTER (WHERE ((created_at)::date = CURRENT_DATE)) AS today_count,
    count(*) FILTER (WHERE (created_at >= (CURRENT_DATE - '7 days'::interval))) AS week_count,
    count(*) FILTER (WHERE (created_at >= (CURRENT_DATE - '30 days'::interval))) AS month_count
   FROM public.message_log
  GROUP BY clinic_id;


--
-- Name: communication_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.communication_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid,
    direction character varying(10) NOT NULL,
    channel character varying(20) DEFAULT 'whatsapp'::character varying,
    content text,
    status character varying(20),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: dashboard_widget_prefs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dashboard_widget_prefs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clinic_id uuid NOT NULL,
    staff_id uuid,
    widget_key character varying(50) NOT NULL,
    is_visible boolean DEFAULT true,
    display_order integer DEFAULT 0,
    config jsonb DEFAULT '{}'::jsonb,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: diagnosis_catalog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.diagnosis_catalog (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    diagnosis_name character varying(120) NOT NULL,
    suggested_treatments jsonb DEFAULT '[]'::jsonb,
    is_default boolean DEFAULT false,
    usage_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    name character varying(120) NOT NULL,
    is_active boolean DEFAULT true
);


--
-- Name: examination_catalog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.examination_catalog (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(120) NOT NULL,
    category character varying(40) DEFAULT 'general'::character varying,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: examination_finding_catalog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.examination_finding_catalog (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    finding_name character varying(100) NOT NULL,
    category character varying(40) DEFAULT 'general'::character varying,
    is_default boolean DEFAULT false,
    usage_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: fee_schedule_overrides; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fee_schedule_overrides (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clinic_id uuid NOT NULL,
    service_id uuid,
    category character varying(60),
    label character varying(120) NOT NULL,
    override_price numeric(10,2),
    discount_percent numeric(5,2),
    valid_from date,
    valid_until date,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: follow_ups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.follow_ups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    clinic_id uuid NOT NULL,
    related_visit_id uuid,
    related_appointment_id uuid,
    follow_up_date date NOT NULL,
    purpose character varying(200) NOT NULL,
    status character varying(20) DEFAULT 'scheduled'::character varying NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    notes text
);


--
-- Name: gallery_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gallery_images (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clinic_id uuid,
    category character varying(40) DEFAULT 'general'::character varying,
    title character varying(200),
    caption text,
    image_url text NOT NULL,
    order_idx integer DEFAULT 0,
    is_active boolean DEFAULT true,
    uploaded_by uuid,
    uploaded_at timestamp without time zone DEFAULT now()
);


--
-- Name: illness_library; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.illness_library (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clinic_id uuid,
    name character varying(200) NOT NULL,
    icd_code character varying(20),
    category character varying(60),
    severity_default character varying(20),
    suggested_treatment_default character varying(120),
    is_active boolean DEFAULT true
);


--
-- Name: image_annotations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.image_annotations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    image_id uuid NOT NULL,
    annotation_type character varying(30) NOT NULL,
    annotation_data jsonb NOT NULL,
    added_by uuid,
    added_at timestamp without time zone DEFAULT now()
);


--
-- Name: kanban_columns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kanban_columns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clinic_id uuid NOT NULL,
    label character varying(60) NOT NULL,
    plan_status character varying(40) NOT NULL,
    column_order integer NOT NULL,
    color character varying(20) DEFAULT '#3B82F6'::character varying,
    is_active boolean DEFAULT true
);


--
-- Name: lab_order_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_order_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lab_order_id uuid NOT NULL,
    amount numeric(10,2) NOT NULL,
    paid_date date DEFAULT CURRENT_DATE,
    payment_mode character varying(20),
    reference character varying(80),
    notes text,
    recorded_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: lab_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    serial_no integer NOT NULL,
    clinic_id uuid NOT NULL,
    patient_id uuid NOT NULL,
    appointment_id uuid,
    treatment_plan_item_id uuid,
    vendor_id uuid,
    work_type character varying(120) NOT NULL,
    teeth jsonb DEFAULT '[]'::jsonb,
    shade character varying(20),
    sent_date date,
    expected_date date,
    received_date date,
    status character varying(20) DEFAULT 'pending'::character varying,
    cost numeric(10,2) DEFAULT 0,
    invoice_no character varying(80),
    details text,
    notes text,
    vendor_notes text,
    created_by uuid,
    received_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    before_image_url text,
    after_image_url text,
    closure_notes text,
    closed_by uuid,
    closed_at timestamp with time zone,
    qr_code_id uuid,
    CONSTRAINT lab_orders_status_check CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('sent'::character varying)::text, ('received'::character varying)::text, ('fitted'::character varying)::text, ('completed'::character varying)::text, ('rejected'::character varying)::text, ('redo'::character varying)::text, ('cancelled'::character varying)::text])))
);


--
-- Name: lab_orders_serial_no_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lab_orders_serial_no_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lab_orders_serial_no_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lab_orders_serial_no_seq OWNED BY public.lab_orders.serial_no;


--
-- Name: lab_vendors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_vendors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(150) NOT NULL,
    contact_person character varying(100),
    phone character varying(20),
    whatsapp_number character varying(20),
    email character varying(150),
    address text,
    gst character varying(20),
    specialities jsonb DEFAULT '[]'::jsonb,
    rating numeric(2,1) DEFAULT 0,
    is_preferred boolean DEFAULT false,
    is_active boolean DEFAULT true,
    notes text,
    clinic_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: lab_work_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_work_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(120) NOT NULL,
    category character varying(50),
    typical_days integer DEFAULT 7,
    typical_cost numeric(10,2),
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    clinic_id uuid,
    usage_count integer DEFAULT 0,
    last_used_at timestamp with time zone,
    added_from character varying(30) DEFAULT 'seed'::character varying
);


--
-- Name: media; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.media (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clinic_id uuid,
    patient_id uuid,
    type character varying(20) NOT NULL,
    title character varying(100),
    url text NOT NULL,
    category character varying(50),
    show_on_public boolean DEFAULT false,
    uploaded_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT media_type_check CHECK (((type)::text = ANY (ARRAY[('photo'::character varying)::text, ('video'::character varying)::text, ('xray'::character varying)::text, ('before_after'::character varying)::text, ('document'::character varying)::text])))
);


--
-- Name: media_gallery; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.media_gallery (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clinic_id uuid NOT NULL,
    patient_id uuid NOT NULL,
    tooth_number character varying(10),
    media_type character varying(20) NOT NULL,
    image_url text NOT NULL,
    thumbnail_url text,
    caption text,
    taken_at timestamp with time zone DEFAULT now(),
    taken_by uuid,
    treatment_plan_id uuid,
    is_shared_with_patient boolean DEFAULT false,
    file_size_bytes bigint,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: medicine_catalog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.medicine_catalog (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(150) NOT NULL,
    category character varying(50) NOT NULL,
    strengths jsonb DEFAULT '[]'::jsonb,
    default_strength character varying(50),
    default_dose character varying(50),
    frequencies jsonb DEFAULT '[]'::jsonb,
    default_frequency character varying(50),
    default_duration character varying(30),
    instructions text,
    contraindications text,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    added_from character varying(30) DEFAULT 'manual'::character varying,
    added_by uuid,
    usage_count integer DEFAULT 0,
    last_used_at timestamp with time zone
);


--
-- Name: medicine_reminders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.medicine_reminders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    prescription_id uuid,
    patient_id uuid NOT NULL,
    medicine_name character varying(100) NOT NULL,
    dose character varying(50),
    frequency character varying(30),
    start_date date NOT NULL,
    end_date date NOT NULL,
    reminder_times jsonb DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: message_log_stats_v; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.message_log_stats_v AS
 SELECT clinic_id,
    count(*) FILTER (WHERE (((status)::text = 'sent'::text) AND ((direction)::text = 'out'::text))) AS total_sent,
    count(*) FILTER (WHERE (((status)::text = 'sent'::text) AND ((direction)::text = 'out'::text) AND ((trigger)::text = 'auto'::text))) AS auto_sent,
    count(*) FILTER (WHERE (((status)::text = 'sent'::text) AND ((direction)::text = 'out'::text) AND ((trigger)::text = 'manual'::text))) AS manual_sent,
    count(*) FILTER (WHERE ((status)::text = 'failed'::text)) AS failed,
    count(*) FILTER (WHERE ((status)::text = 'queued'::text)) AS queued,
    count(*) FILTER (WHERE ((created_at)::date = CURRENT_DATE)) AS today_count,
    count(*) FILTER (WHERE (created_at >= (CURRENT_DATE - '7 days'::interval))) AS week_count
   FROM public.message_log
  GROUP BY clinic_id;


--
-- Name: message_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.message_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clinic_id uuid,
    template_key character varying(60) NOT NULL,
    category character varying(40) NOT NULL,
    label character varying(120) NOT NULL,
    body text NOT NULL,
    cloud_template_name character varying(80),
    cloud_template_lang character varying(10) DEFAULT 'en'::character varying,
    is_active boolean DEFAULT true NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: module_visibility; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.module_visibility (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clinic_id uuid NOT NULL,
    module_key character varying(60) NOT NULL,
    role character varying(30) NOT NULL,
    is_visible boolean DEFAULT true NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid
);


--
-- Name: patients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    phone character varying(15) NOT NULL,
    age integer,
    gender character varying(10),
    date_of_birth date,
    address text,
    preferred_clinic_id uuid,
    total_visits integer DEFAULT 0,
    wa_session_state jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true,
    is_new_no_treatment boolean DEFAULT false,
    auto_delete_at timestamp without time zone,
    manually_flagged_to_keep boolean DEFAULT false,
    existing_illnesses jsonb DEFAULT '[]'::jsonb,
    chairside_notes text,
    alternate_whatsapp_number character varying(30)
);


--
-- Name: tooth_observations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tooth_observations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    tooth_number integer NOT NULL,
    surface character varying(20),
    observation text NOT NULL,
    severity character varying(20) DEFAULT 'info'::character varying NOT NULL,
    status character varying(20) DEFAULT 'open'::character varying NOT NULL,
    suggested_treatment character varying(120),
    observed_at timestamp with time zone DEFAULT now() NOT NULL,
    observed_by uuid,
    resolved_at timestamp with time zone,
    resolved_by uuid,
    visit_id uuid,
    notes text
);


--
-- Name: treatment_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.treatment_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    clinic_id uuid NOT NULL,
    doctor_id uuid,
    name character varying(200) NOT NULL,
    complaint text,
    diagnosis text,
    estimated_cost numeric(10,2) DEFAULT 0,
    extra_charges numeric(10,2) DEFAULT 0,
    discount numeric(10,2) DEFAULT 0,
    final_payable numeric(10,2) DEFAULT 0,
    total_paid numeric(10,2) DEFAULT 0,
    balance numeric(10,2) DEFAULT 0,
    total_sittings_planned integer DEFAULT 1,
    sittings_completed integer DEFAULT 0,
    status character varying(30) DEFAULT 'new'::character varying,
    followup_date date,
    followup_notes text,
    internal_notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    diagnoses_list jsonb DEFAULT '[]'::jsonb,
    plan_name character varying(255),
    is_archived boolean DEFAULT false,
    archived_at timestamp without time zone,
    kanban_position integer DEFAULT 0,
    CONSTRAINT treatment_plans_status_check CHECK (((status)::text = ANY (ARRAY[('new'::character varying)::text, ('consultation_done'::character varying)::text, ('treatment_advised'::character varying)::text, ('treatment_started'::character varying)::text, ('in_progress'::character varying)::text, ('procedure_completed'::character varying)::text, ('payment_pending'::character varying)::text, ('followup_pending'::character varying)::text, ('closure_pending'::character varying)::text, ('closed'::character varying)::text, ('cancelled'::character varying)::text])))
);


--
-- Name: patient_booking_constraints_v; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.patient_booking_constraints_v AS
 SELECT id AS patient_id,
    preferred_clinic_id AS clinic_id,
    ( SELECT count(*) AS count
           FROM public.lab_orders lo
          WHERE ((lo.patient_id = p.id) AND ((lo.status)::text = ANY (ARRAY[('pending'::character varying)::text, ('sent'::character varying)::text])))) AS pending_lab_orders,
    ( SELECT count(*) AS count
           FROM public.lab_orders lo
          WHERE ((lo.patient_id = p.id) AND ((lo.status)::text = 'received'::text))) AS lab_ready_for_fitting,
    ( SELECT count(*) AS count
           FROM public.lab_orders lo
          WHERE ((lo.patient_id = p.id) AND ((lo.status)::text = ANY (ARRAY[('pending'::character varying)::text, ('sent'::character varying)::text])) AND (lo.expected_date < CURRENT_DATE))) AS lab_overdue,
    ( SELECT count(*) AS count
           FROM public.appointments a
          WHERE ((a.patient_id = p.id) AND (a.specialist_id IS NOT NULL) AND ((COALESCE(a.specialist_confirmation_status, 'pending_call'::character varying))::text = 'pending_call'::text) AND ((a.status)::text <> ALL (ARRAY[('completed'::character varying)::text, ('cancelled'::character varying)::text, ('no_show'::character varying)::text, ('rejected'::character varying)::text])))) AS specialist_pending_confirmation,
    ( SELECT (COALESCE(sum(tp.final_payable), (0)::numeric) - COALESCE(sum(tp.total_paid), (0)::numeric))
           FROM public.treatment_plans tp
          WHERE (tp.patient_id = p.id)) AS outstanding_balance,
    ( SELECT count(*) AS count
           FROM public.tooth_observations o
          WHERE ((o.patient_id = p.id) AND ((o.status)::text = 'open'::text) AND ((o.severity)::text = ANY (ARRAY[('moderate'::character varying)::text, ('severe'::character varying)::text, ('urgent'::character varying)::text])))) AS urgent_observations
   FROM public.patients p;


--
-- Name: VIEW patient_booking_constraints_v; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.patient_booking_constraints_v IS 'Per-patient booking blockers. Statuses corrected for current schema. Used by appointment hub to warn before finalising.';


--
-- Name: patient_credits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patient_credits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    clinic_id uuid NOT NULL,
    amount numeric(10,2) NOT NULL,
    reason character varying(120) NOT NULL,
    rating_id uuid,
    applied_to_plan_id uuid,
    applied_to_payment_id uuid,
    is_used boolean DEFAULT false NOT NULL,
    expires_at date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    used_at timestamp with time zone,
    notes text
);


--
-- Name: patient_health; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patient_health (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    diabetes boolean DEFAULT false,
    hypertension boolean DEFAULT false,
    heart_disease boolean DEFAULT false,
    thyroid boolean DEFAULT false,
    asthma boolean DEFAULT false,
    kidney_disease boolean DEFAULT false,
    liver_disease boolean DEFAULT false,
    pregnant boolean DEFAULT false,
    blood_thinner boolean DEFAULT false,
    allergies text DEFAULT ''::text,
    previous_surgeries text DEFAULT ''::text,
    current_medicines text DEFAULT ''::text,
    smoking boolean DEFAULT false,
    tobacco boolean DEFAULT false,
    other_conditions text DEFAULT ''::text,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: patient_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patient_images (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    clinic_id uuid,
    image_url text NOT NULL,
    thumbnail_url text,
    image_type character varying(30) NOT NULL,
    title text,
    description text,
    file_size_bytes bigint,
    mime_type character varying(50),
    width integer,
    height integer,
    linked_tooth_number integer,
    linked_plan_id uuid,
    linked_sitting_id uuid,
    linked_session_id uuid,
    captured_date date,
    uploaded_by uuid,
    uploaded_at timestamp without time zone DEFAULT now(),
    is_active boolean DEFAULT true
);


--
-- Name: patient_portal_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patient_portal_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    token character varying(128) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_count integer DEFAULT 0,
    last_used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: patient_ratings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patient_ratings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    clinic_id uuid NOT NULL,
    visit_id uuid,
    appointment_id uuid,
    rating integer NOT NULL,
    comment text,
    asked_at timestamp with time zone,
    submitted_at timestamp with time zone DEFAULT now() NOT NULL,
    credit_applied boolean DEFAULT false NOT NULL,
    credit_id uuid,
    token character varying(60),
    CONSTRAINT patient_ratings_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: payment_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    plan_id uuid,
    appointment_id uuid,
    clinic_id uuid NOT NULL,
    amount numeric(10,2) NOT NULL,
    payment_mode character varying(20) NOT NULL,
    razorpay_payment_id character varying(100),
    razorpay_link_url text,
    remarks text,
    receipt_sent boolean DEFAULT false,
    date date DEFAULT CURRENT_DATE NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    transaction_reference character varying(255),
    notes text,
    CONSTRAINT payment_transactions_payment_mode_check CHECK (((payment_mode)::text = ANY (ARRAY[('cash'::character varying)::text, ('upi'::character varying)::text, ('card'::character varying)::text, ('razorpay'::character varying)::text, ('bank_transfer'::character varying)::text, ('other'::character varying)::text])))
);


--
-- Name: prescriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prescriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    appointment_id uuid,
    plan_id uuid,
    patient_id uuid NOT NULL,
    doctor_id uuid NOT NULL,
    clinic_id uuid NOT NULL,
    serial_number integer,
    diagnosis text,
    doctor_raw_notes text,
    medicines jsonb DEFAULT '[]'::jsonb NOT NULL,
    visible_advice text,
    internal_notes text,
    followup_date date,
    pdf_url text,
    sent_via_whatsapp boolean DEFAULT false,
    sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    complaint text,
    diagnoses_list jsonb DEFAULT '[]'::jsonb,
    qr_code_id uuid
);


--
-- Name: patient_summary_v; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.patient_summary_v AS
 SELECT id,
    name,
    phone,
    age,
    gender,
    preferred_clinic_id,
    is_active,
    total_visits,
    existing_illnesses,
    created_at,
    updated_at,
    ( SELECT max(COALESCE((a.completed_at)::date, a.confirmed_date, a.requested_date)) AS max
           FROM public.appointments a
          WHERE ((a.patient_id = p.id) AND ((COALESCE(a.workflow_status, a.status))::text = ANY (ARRAY[('completed'::character varying)::text, ('done'::character varying)::text, ('in_treatment'::character varying)::text, ('payment_pending'::character varying)::text])))) AS last_visit_date,
    ( SELECT count(*) AS count
           FROM public.treatment_plans tp
          WHERE ((tp.patient_id = p.id) AND (COALESCE(tp.is_archived, false) = false) AND ((COALESCE(tp.status, ''::character varying))::text <> ALL (ARRAY[('closed'::character varying)::text, ('cancelled'::character varying)::text, ('completed'::character varying)::text])))) AS active_plans,
    COALESCE(( SELECT sum(COALESCE(tp.final_payable, tp.estimated_cost, (0)::numeric)) AS sum
           FROM public.treatment_plans tp
          WHERE ((tp.patient_id = p.id) AND ((COALESCE(tp.status, ''::character varying))::text <> 'cancelled'::text))), (0)::numeric) AS lifetime_billed,
    COALESCE(( SELECT sum(pt.amount) AS sum
           FROM public.payment_transactions pt
          WHERE (pt.patient_id = p.id)), (0)::numeric) AS lifetime_paid,
    GREATEST((COALESCE(( SELECT sum(COALESCE(tp.final_payable, tp.estimated_cost, (0)::numeric)) AS sum
           FROM public.treatment_plans tp
          WHERE ((tp.patient_id = p.id) AND ((COALESCE(tp.status, ''::character varying))::text <> 'cancelled'::text))), (0)::numeric) - COALESCE(( SELECT sum(pt.amount) AS sum
           FROM public.payment_transactions pt
          WHERE (pt.patient_id = p.id)), (0)::numeric)), (0)::numeric) AS outstanding,
    ( SELECT count(*) AS count
           FROM public.prescriptions rx
          WHERE (rx.patient_id = p.id)) AS rx_count,
    ( SELECT count(*) AS count
           FROM public.patient_images im
          WHERE ((im.patient_id = p.id) AND (im.is_active = true))) AS media_count,
    ((jsonb_array_length(COALESCE(existing_illnesses, '[]'::jsonb)) > 0) OR (EXISTS ( SELECT 1
           FROM public.patient_health h
          WHERE ((h.patient_id = p.id) AND (h.diabetes OR h.hypertension OR h.heart_disease OR h.blood_thinner OR h.pregnant))))) AS has_alerts
   FROM public.patients p;


--
-- Name: patient_uploads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patient_uploads (
    id integer NOT NULL,
    patient_id uuid NOT NULL,
    appointment_id uuid,
    file_name text NOT NULL,
    file_path text NOT NULL,
    file_type text NOT NULL,
    mime_type text,
    caption text,
    uploaded_by uuid,
    uploaded_at timestamp with time zone DEFAULT now(),
    tooth_number integer,
    session_id uuid,
    file_kind character varying(30)
);


--
-- Name: patient_uploads_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.patient_uploads_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: patient_uploads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.patient_uploads_id_seq OWNED BY public.patient_uploads.id;


--
-- Name: phone_consultations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.phone_consultations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clinic_id uuid NOT NULL,
    patient_id uuid,
    patient_name character varying(200) NOT NULL,
    patient_phone character varying(30) NOT NULL,
    patient_age integer,
    patient_gender character varying(20),
    complaint text NOT NULL,
    duration_complaint character varying(60),
    fee_amount numeric(10,2) DEFAULT 100.00 NOT NULL,
    razorpay_order_id character varying(80),
    razorpay_payment_id character varying(80),
    payment_status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    paid_at timestamp with time zone,
    status character varying(20) DEFAULT 'queued'::character varying NOT NULL,
    doctor_id uuid,
    called_at timestamp with time zone,
    completed_at timestamp with time zone,
    rx_id uuid,
    rx_sent_at timestamp with time zone,
    consult_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    source character varying(40) DEFAULT 'public_website'::character varying NOT NULL
);


--
-- Name: plan_revisions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plan_revisions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_id uuid NOT NULL,
    revision_number integer NOT NULL,
    change_summary text NOT NULL,
    item_snapshot jsonb DEFAULT '{}'::jsonb,
    created_by uuid,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: procedure_catalog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.procedure_catalog (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    category character varying(50) NOT NULL,
    cost_min numeric(10,2) DEFAULT 0,
    cost_max numeric(10,2) DEFAULT 0,
    default_cost numeric(10,2) DEFAULT 0,
    followup_days integer,
    common_advice jsonb DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_tooth_based boolean DEFAULT false,
    work_steps jsonb DEFAULT '[]'::jsonb,
    usage_count integer DEFAULT 0,
    added_from character varying(30) DEFAULT 'manual'::character varying,
    requires_lab boolean DEFAULT false,
    lab_work_type character varying(120)
);


--
-- Name: procedure_medicine_map; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.procedure_medicine_map (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    procedure_id uuid NOT NULL,
    medicine_id uuid NOT NULL,
    is_default boolean DEFAULT true
);


--
-- Name: qr_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.qr_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clinic_id uuid,
    source character varying(50) DEFAULT 'bundle_w'::character varying,
    whatsapp_url text DEFAULT ''::text,
    scan_count integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    kind character varying(30),
    target_id uuid,
    target_url text,
    short_code character varying(20),
    scans_count integer DEFAULT 0,
    last_scanned_at timestamp with time zone,
    png_path text,
    svg_path text,
    expires_at timestamp with time zone
);


--
-- Name: reminder_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reminder_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clinic_id uuid NOT NULL,
    reminder_key character varying(100) NOT NULL,
    patient_id uuid,
    appointment_id uuid,
    fired_at timestamp with time zone DEFAULT now(),
    status character varying(20) DEFAULT 'sent'::character varying,
    error_detail text
);


--
-- Name: reminder_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reminder_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clinic_id uuid NOT NULL,
    whatsapp_enabled boolean DEFAULT true,
    sms_enabled boolean DEFAULT false,
    appt_24h_enabled boolean DEFAULT true,
    appt_24h_send_time time without time zone DEFAULT '09:00:00'::time without time zone,
    appt_2h_enabled boolean DEFAULT true,
    appt_30m_enabled boolean DEFAULT false,
    followup_day_enabled boolean DEFAULT true,
    followup_day_send_time time without time zone DEFAULT '10:00:00'::time without time zone,
    followup_1day_before_enabled boolean DEFAULT false,
    followup_7day_before_enabled boolean DEFAULT false,
    payment_3day_enabled boolean DEFAULT false,
    payment_7day_enabled boolean DEFAULT false,
    birthday_enabled boolean DEFAULT false,
    birthday_send_time time without time zone DEFAULT '08:00:00'::time without time zone,
    morning_digest_enabled boolean DEFAULT true,
    morning_digest_send_time time without time zone DEFAULT '07:00:00'::time without time zone,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: reschedule_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reschedule_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clinic_id uuid NOT NULL,
    patient_id uuid NOT NULL,
    appointment_id uuid NOT NULL,
    requested_date date NOT NULL,
    requested_time time without time zone,
    reason text,
    status character varying(20) DEFAULT 'pending'::character varying,
    resolved_by uuid,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: rewards_redeemed_v; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.rewards_redeemed_v AS
 SELECT clinic_id,
    count(*) AS rewards_redeemed
   FROM public.patient_credits
  WHERE (is_used = true)
  GROUP BY clinic_id;


--
-- Name: service_catalog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_catalog (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clinic_id uuid NOT NULL,
    category character varying(60) NOT NULL,
    name character varying(120) NOT NULL,
    code character varying(40),
    default_duration_min integer DEFAULT 30,
    default_price numeric(10,2),
    description text,
    requires_lab boolean DEFAULT false,
    requires_specialist boolean DEFAULT false,
    typical_sittings integer DEFAULT 1,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: site_doctors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.site_doctors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    staff_id uuid,
    display_name character varying(100) NOT NULL,
    qualification character varying(200),
    designation character varying(100),
    bio text,
    photo_url text,
    years_experience integer,
    specializations jsonb DEFAULT '[]'::jsonb,
    show_on_public_site boolean DEFAULT true,
    order_idx integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: site_services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.site_services (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(120) NOT NULL,
    short_description text,
    full_description text,
    icon_emoji character varying(10) DEFAULT '🦷'::character varying,
    icon_image_url text,
    hero_image_url text,
    cta_text character varying(60),
    cta_link character varying(200),
    price_starting_from numeric(10,2),
    duration_minutes integer,
    is_featured boolean DEFAULT false,
    is_active boolean DEFAULT true,
    order_idx integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: site_testimonials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.site_testimonials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_name character varying(100) NOT NULL,
    patient_photo_url text,
    rating integer DEFAULT 5,
    text text NOT NULL,
    treatment_type character varying(100),
    source character varying(30) DEFAULT 'manual'::character varying,
    is_featured boolean DEFAULT false,
    is_active boolean DEFAULT true,
    order_idx integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: site_theme; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.site_theme (
    id integer DEFAULT 1 NOT NULL,
    primary_color character varying(20) DEFAULT '#0E7C7B'::character varying,
    secondary_color character varying(20) DEFAULT '#06B6D4'::character varying,
    accent_color character varying(20) DEFAULT '#22D3EE'::character varying,
    dark_bg character varying(20) DEFAULT '#0F172A'::character varying,
    logo_url text,
    favicon_url text,
    site_title character varying(120) DEFAULT 'Siya Dental Care'::character varying,
    site_tagline character varying(200) DEFAULT 'Modern dentistry. Compassionate care.'::character varying,
    meta_description text,
    google_analytics_id character varying(40),
    instagram_url text,
    facebook_url text,
    youtube_url text,
    twitter_url text,
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT site_theme_id_check CHECK ((id = 1))
);


--
-- Name: site_videos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.site_videos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clinic_id uuid,
    category character varying(40) DEFAULT 'general'::character varying,
    title character varying(200),
    caption text,
    video_url text NOT NULL,
    thumbnail_url text,
    is_youtube boolean DEFAULT false,
    youtube_id character varying(40),
    autoplay boolean DEFAULT false,
    loop_video boolean DEFAULT false,
    order_idx integer DEFAULT 0,
    is_active boolean DEFAULT true,
    uploaded_by uuid,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: smile_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.smile_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clinic_id uuid NOT NULL,
    patient_id uuid,
    before_image_url text,
    after_image_url text,
    whitening_level integer DEFAULT 5,
    gum_contour_level integer DEFAULT 0,
    alignment_overlay boolean DEFAULT false,
    shade_preset character varying(20) DEFAULT 'A2'::character varying,
    notes text,
    sent_via_whatsapp boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: specialist_earnings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.specialist_earnings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    specialist_id uuid NOT NULL,
    appointment_id uuid,
    patient_id uuid,
    clinic_id uuid NOT NULL,
    amount numeric(10,2) NOT NULL,
    notes text,
    earned_on date DEFAULT CURRENT_DATE,
    is_settled boolean DEFAULT false,
    settled_on date,
    settled_amount numeric(10,2),
    settled_payment_mode character varying(20),
    settled_reference character varying(80),
    settled_notes text,
    settled_by uuid,
    recorded_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    rate_tier character varying(40),
    treatment_key character varying(80),
    case_status character varying(20) DEFAULT 'completed'::character varying,
    verified_at timestamp with time zone,
    verified_by uuid
);


--
-- Name: specialist_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.specialist_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    appointment_id uuid,
    specialist_id uuid,
    recipient_role character varying(20),
    event_type character varying(40),
    channel character varying(20) DEFAULT 'manual'::character varying,
    message text,
    sent_at timestamp with time zone DEFAULT now(),
    sent_by uuid
);


--
-- Name: specialist_rate_tiers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.specialist_rate_tiers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clinic_id uuid NOT NULL,
    specialist_id uuid NOT NULL,
    tier_name character varying(40) NOT NULL,
    treatment_key character varying(80),
    rate_amount numeric(10,2) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    usage_count integer DEFAULT 0,
    last_used_at timestamp with time zone,
    label character varying(100),
    added_from character varying(30) DEFAULT 'seed'::character varying
);


--
-- Name: staff; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clinic_id uuid,
    name character varying(100) NOT NULL,
    role character varying(20) NOT NULL,
    phone character varying(15) NOT NULL,
    telegram_chat_id character varying(50),
    pin_hash character varying(255),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    email character varying(120),
    last_login_at timestamp without time zone,
    created_by uuid,
    deactivated_at timestamp without time zone,
    deactivated_by uuid,
    permissions jsonb DEFAULT '{}'::jsonb,
    specialization character varying(80),
    is_external boolean DEFAULT false,
    default_visit_fee numeric(10,2),
    whatsapp_number character varying(20),
    CONSTRAINT staff_role_check CHECK (((role)::text = ANY (ARRAY['doctor'::text, 'specialist'::text, 'nurse'::text, 'receptionist'::text, 'admin'::text])))
);


--
-- Name: to_be_appointed; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.to_be_appointed (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid,
    clinic_id uuid NOT NULL,
    original_appointment_id uuid,
    reason text,
    proposed_service text,
    added_by_staff_id uuid,
    added_at timestamp without time zone DEFAULT now(),
    followup_scheduled_for timestamp without time zone,
    last_followup_at timestamp without time zone,
    is_resolved boolean DEFAULT false,
    resolved_at timestamp without time zone,
    resolved_appointment_id uuid,
    notes text
);


--
-- Name: tooth_clinical_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tooth_clinical_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    tooth_number integer NOT NULL,
    examination jsonb DEFAULT '[]'::jsonb,
    diagnosis character varying(120),
    notes text,
    recorded_by uuid,
    recorded_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT tooth_clinical_tooth_check CHECK (((tooth_number >= 11) AND (tooth_number <= 85)))
);


--
-- Name: tooth_conditions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tooth_conditions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    tooth_number integer NOT NULL,
    condition character varying(50),
    surface character varying(30),
    severity character varying(20),
    notes text,
    recorded_by uuid,
    recorded_at timestamp without time zone DEFAULT now(),
    is_active boolean DEFAULT true,
    CONSTRAINT tooth_conditions_tooth_number_check CHECK (((tooth_number >= 11) AND (tooth_number <= 85)))
);


--
-- Name: tooth_diagnoses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tooth_diagnoses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    tooth_number integer NOT NULL,
    diagnosis character varying(200) NOT NULL,
    notes text,
    recorded_by uuid,
    recorded_at timestamp without time zone DEFAULT now(),
    is_active boolean DEFAULT true
);


--
-- Name: tooth_examinations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tooth_examinations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    tooth_number integer NOT NULL,
    finding character varying(200) NOT NULL,
    notes text,
    recorded_by uuid,
    recorded_at timestamp without time zone DEFAULT now(),
    is_active boolean DEFAULT true
);


--
-- Name: tooth_issue_catalog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tooth_issue_catalog (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    issue_name character varying(80) NOT NULL,
    is_default boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: tooth_treatments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tooth_treatments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    tooth_number integer NOT NULL,
    treatment_plan_id uuid,
    sitting_id uuid,
    treatment_type character varying(50),
    surface character varying(30),
    status character varying(20) DEFAULT 'planned'::character varying,
    notes text,
    planned_at timestamp without time zone DEFAULT now(),
    started_at timestamp without time zone,
    completed_at timestamp without time zone,
    completed_by uuid,
    plan_item_id uuid,
    treatment_kind character varying(24),
    CONSTRAINT tooth_treatments_tooth_number_check CHECK (((tooth_number >= 11) AND (tooth_number <= 85)))
);


--
-- Name: treatment_plan_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.treatment_plan_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_id uuid NOT NULL,
    procedure_catalog_id uuid,
    procedure_name character varying(100) NOT NULL,
    tooth_number character varying(10),
    estimated_cost numeric(10,2) DEFAULT 0,
    actual_cost numeric(10,2),
    status character varying(20) DEFAULT 'advised'::character varying,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    procedure_id uuid,
    unit_price numeric(10,2),
    total_price numeric(10,2),
    teeth jsonb DEFAULT '[]'::jsonb,
    area_label character varying(60),
    suggested_rate numeric(10,2) DEFAULT 0,
    doctor_rate numeric(10,2) DEFAULT 0,
    discount numeric(10,2) DEFAULT 0,
    final_amount numeric(10,2) DEFAULT 0,
    completed_steps jsonb DEFAULT '[]'::jsonb,
    updated_at timestamp without time zone DEFAULT now(),
    examination jsonb DEFAULT '[]'::jsonb,
    diagnosis character varying(120),
    examination_summary text,
    requires_lab boolean DEFAULT false,
    lab_status character varying(20) DEFAULT NULL::character varying,
    priority character varying(20) DEFAULT 'routine'::character varying,
    lab_order_id uuid,
    CONSTRAINT treatment_plan_items_status_check CHECK (((status)::text = ANY (ARRAY[('advised'::character varying)::text, ('in_progress'::character varying)::text, ('completed'::character varying)::text, ('cancelled'::character varying)::text])))
);


--
-- Name: treatment_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.treatment_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    doctor_id uuid NOT NULL,
    clinic_id uuid NOT NULL,
    appointment_id uuid,
    sitting_id uuid,
    plan_id uuid,
    walk_in_id uuid,
    started_at timestamp without time zone DEFAULT now(),
    finalized_at timestamp without time zone,
    procedures_done jsonb DEFAULT '[]'::jsonb,
    treatment_notes text,
    next_step text,
    amount_payable numeric(10,2) DEFAULT 0,
    prescription_id uuid,
    used_tooth_chart boolean DEFAULT false,
    status character varying(30) DEFAULT 'in_progress'::character varying,
    nurse_notified_at timestamp without time zone,
    payment_collected_at timestamp without time zone,
    payment_collected_by uuid,
    amount_collected numeric(10,2) DEFAULT 0,
    balance_remaining numeric(10,2) DEFAULT 0,
    payment_components jsonb DEFAULT '[]'::jsonb,
    created_at timestamp without time zone DEFAULT now(),
    discount_amount numeric(10,2) DEFAULT 0,
    discount_reason text
);


--
-- Name: treatment_sittings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.treatment_sittings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_id uuid NOT NULL,
    appointment_id uuid,
    sitting_number integer NOT NULL,
    date date,
    procedures_done text,
    notes text,
    status character varying(20) DEFAULT 'planned'::character varying,
    amount_collected numeric(10,2) DEFAULT 0,
    payment_mode character varying(20),
    created_at timestamp with time zone DEFAULT now(),
    scheduled_date date,
    scheduled_time time without time zone,
    medicines_given jsonb DEFAULT '[]'::jsonb,
    next_step text,
    doctor_id uuid,
    CONSTRAINT treatment_sittings_status_check CHECK (((status)::text = ANY (ARRAY[('planned'::character varying)::text, ('completed'::character varying)::text, ('missed'::character varying)::text, ('cancelled'::character varying)::text])))
);


--
-- Name: treatment_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.treatment_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clinic_id uuid,
    name character varying(120) NOT NULL,
    description text,
    items jsonb DEFAULT '[]'::jsonb NOT NULL,
    usage_count integer DEFAULT 0,
    created_by uuid,
    created_at timestamp without time zone DEFAULT now(),
    is_active boolean DEFAULT true,
    template_name character varying(100),
    category character varying(50),
    default_sittings integer DEFAULT 1,
    estimated_cost numeric(10,2),
    procedures jsonb DEFAULT '[]'::jsonb,
    default_medicines jsonb DEFAULT '[]'::jsonb,
    default_advice text,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: v_appointments_bucketed; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_appointments_bucketed AS
 SELECT id,
    patient_id,
    clinic_id,
    doctor_id,
    treatment_plan_id,
    sitting_number,
    requested_date,
    requested_time,
    confirmed_date,
    confirmed_time,
    source,
    reason,
    status,
    queue_position,
    arrived_at,
    started_at,
    completed_at,
    staff_notes,
    created_at,
    updated_at,
    scheduled_date,
    scheduled_time,
    duration_minutes,
    contact_status,
    last_contacted_at,
    last_contacted_by,
    reschedule_reason,
    cancel_reason,
    workflow_status,
    chief_complaints,
    appointment_type,
    specialist_id,
    specialist_assigned_at,
    specialist_assigned_by,
    specialist_session_status,
    specialist_closed_at,
    specialist_notes,
    phone_number,
    COALESCE(confirmed_date, requested_date) AS effective_date,
    COALESCE(confirmed_time, requested_time) AS effective_time,
        CASE
            WHEN (((workflow_status)::text = 'cancelled'::text) OR ((status)::text = 'cancelled'::text)) THEN 'cancelled'::text
            WHEN (((workflow_status)::text = 'completed'::text) OR ((status)::text = ANY (ARRAY[('completed'::character varying)::text, ('done'::character varying)::text]))) THEN 'completed'::text
            WHEN ((status)::text = 'no_show'::text) THEN 'no_show'::text
            WHEN ((workflow_status)::text = ANY (ARRAY[('arrived'::character varying)::text, ('ready'::character varying)::text, ('in_treatment'::character varying)::text, ('payment_pending'::character varying)::text])) THEN 'in_clinic'::text
            WHEN ((contact_status)::text = 'pending_call'::text) THEN 'unscheduled'::text
            WHEN ((contact_status)::text = 'rescheduled'::text) THEN 'rescheduled'::text
            WHEN ((contact_status)::text = 'no_answer'::text) THEN 'no_answer'::text
            WHEN (((contact_status)::text = 'confirmed'::text) AND ((workflow_status)::text = 'scheduled'::text)) THEN 'confirmed'::text
            WHEN ((workflow_status)::text = 'confirmed'::text) THEN 'confirmed'::text
            WHEN ((workflow_status)::text = 'scheduled'::text) THEN 'scheduled'::text
            ELSE 'other'::text
        END AS bucket
   FROM public.appointments a;


--
-- Name: v_daily_revenue; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_daily_revenue AS
 SELECT clinic_id,
    date,
    count(*) AS txn_count,
    sum(amount) AS revenue,
    count(DISTINCT patient_id) AS unique_patients
   FROM public.payment_transactions
  GROUP BY clinic_id, date;


--
-- Name: v_daily_revenue_by_mode; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_daily_revenue_by_mode AS
 SELECT clinic_id,
    date(created_at) AS revenue_date,
    payment_mode,
    count(*) AS transaction_count,
    sum(amount) AS total_amount
   FROM public.payment_transactions p
  WHERE (amount > (0)::numeric)
  GROUP BY clinic_id, (date(created_at)), payment_mode;


--
-- Name: v_doctor_performance; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_doctor_performance AS
 SELECT ts.doctor_id,
    s.name AS doctor_name,
    ts.clinic_id,
    date_trunc('day'::text, ts.started_at) AS work_day,
    count(DISTINCT ts.id) AS sessions_count,
    count(DISTINCT ts.patient_id) AS unique_patients,
    sum(ts.amount_collected) AS revenue_generated
   FROM (public.treatment_sessions ts
     JOIN public.staff s ON ((s.id = ts.doctor_id)))
  WHERE ((ts.status)::text = 'completed'::text)
  GROUP BY ts.doctor_id, s.name, ts.clinic_id, (date_trunc('day'::text, ts.started_at));


--
-- Name: v_lab_payables; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_lab_payables AS
 SELECT lo.id AS lab_order_id,
    lo.serial_no,
    lo.clinic_id,
    lo.vendor_id,
    lv.name AS vendor_name,
    lv.phone AS vendor_phone,
    lv.whatsapp_number AS vendor_whatsapp,
    lo.patient_id,
    p.name AS patient_name,
    lo.work_type,
    lo.status,
    lo.sent_date,
    lo.received_date,
    lo.cost AS order_cost,
    COALESCE(pay.paid_amount, (0)::numeric) AS paid_amount,
    (lo.cost - COALESCE(pay.paid_amount, (0)::numeric)) AS outstanding,
    GREATEST((CURRENT_DATE - lo.received_date), 0) AS days_since_received,
    GREATEST((CURRENT_DATE - lo.sent_date), 0) AS days_since_sent
   FROM (((public.lab_orders lo
     LEFT JOIN public.lab_vendors lv ON ((lv.id = lo.vendor_id)))
     LEFT JOIN public.patients p ON ((p.id = lo.patient_id)))
     LEFT JOIN ( SELECT lab_order_payments.lab_order_id,
            sum(lab_order_payments.amount) AS paid_amount
           FROM public.lab_order_payments
          GROUP BY lab_order_payments.lab_order_id) pay ON ((pay.lab_order_id = lo.id)))
  WHERE (((lo.status)::text <> 'cancelled'::text) AND (lo.cost > (0)::numeric) AND ((lo.cost - COALESCE(pay.paid_amount, (0)::numeric)) > (0)::numeric));


--
-- Name: VIEW v_lab_payables; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_lab_payables IS 'Outstanding lab vendor payables: cost minus payments. Excludes cancelled and fully-paid orders.';


--
-- Name: v_monthly_revenue; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_monthly_revenue AS
 SELECT clinic_id,
    date_trunc('month'::text, created_at) AS revenue_month,
    payment_mode,
    count(*) AS transaction_count,
    sum(amount) AS total_amount
   FROM public.payment_transactions
  WHERE (amount > (0)::numeric)
  GROUP BY clinic_id, (date_trunc('month'::text, created_at)), payment_mode;


--
-- Name: v_outstanding_balances; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_outstanding_balances AS
 SELECT tp.patient_id,
    p.name AS patient_name,
    p.phone AS patient_phone,
    tp.clinic_id,
    tp.id AS plan_id,
    tp.plan_name,
    tp.estimated_cost,
    COALESCE(tp.total_paid, (0)::numeric) AS total_paid,
    (tp.estimated_cost - COALESCE(tp.total_paid, (0)::numeric)) AS balance,
    (EXTRACT(day FROM (now() - tp.updated_at)))::integer AS days_since_update,
    tp.updated_at AS last_activity
   FROM (public.treatment_plans tp
     JOIN public.patients p ON ((p.id = tp.patient_id)))
  WHERE (tp.estimated_cost > COALESCE(tp.total_paid, (0)::numeric));


--
-- Name: v_patient_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_patient_summary AS
 SELECT p.id,
    p.name,
    p.phone,
    p.age,
    p.gender,
    p.preferred_clinic_id,
    p.total_visits,
    p.created_at,
    COALESCE(plan_stats.total_billed, (0)::numeric) AS total_billed,
    COALESCE(plan_stats.total_paid, (0)::numeric) AS total_paid,
    COALESCE(plan_stats.total_balance, (0)::numeric) AS total_balance,
    COALESCE(plan_stats.active_plans, (0)::bigint) AS active_plans,
    last_visit.last_visit_date
   FROM ((public.patients p
     LEFT JOIN LATERAL ( SELECT sum(treatment_plans.final_payable) AS total_billed,
            sum(treatment_plans.total_paid) AS total_paid,
            sum(treatment_plans.balance) AS total_balance,
            count(*) FILTER (WHERE ((treatment_plans.status)::text <> ALL (ARRAY[('completed'::character varying)::text, ('cancelled'::character varying)::text]))) AS active_plans
           FROM public.treatment_plans
          WHERE (treatment_plans.patient_id = p.id)) plan_stats ON (true))
     LEFT JOIN LATERAL ( SELECT (max(appointments.completed_at))::date AS last_visit_date
           FROM public.appointments
          WHERE ((appointments.patient_id = p.id) AND ((appointments.status)::text = 'done'::text))) last_visit ON (true));


--
-- Name: v_pending_lab_orders_by_patient; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_pending_lab_orders_by_patient AS
 SELECT patient_id,
    clinic_id,
    count(*) FILTER (WHERE ((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('sent'::character varying)::text]))) AS pending_count,
    count(*) FILTER (WHERE ((status)::text = 'received'::text)) AS received_count,
    min(expected_date) FILTER (WHERE ((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('sent'::character varying)::text]))) AS earliest_expected,
    max(expected_date) FILTER (WHERE (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('sent'::character varying)::text])) AND (expected_date < CURRENT_DATE))) AS most_overdue
   FROM public.lab_orders lo
  WHERE ((status)::text <> ALL (ARRAY[('cancelled'::character varying)::text, ('fitted'::character varying)::text]))
  GROUP BY patient_id, clinic_id;


--
-- Name: v_procedure_revenue; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_procedure_revenue AS
 SELECT tpi.procedure_id,
    pc.name AS procedure_name,
    pc.category,
    tp.clinic_id,
    count(*) AS times_used,
    avg(tpi.unit_price) AS avg_price,
    sum(tpi.total_price) AS total_revenue
   FROM ((public.treatment_plan_items tpi
     JOIN public.procedure_catalog pc ON ((pc.id = tpi.procedure_id)))
     JOIN public.treatment_plans tp ON ((tp.id = tpi.plan_id)))
  GROUP BY tpi.procedure_id, pc.name, pc.category, tp.clinic_id;


--
-- Name: v_specialist_outstanding; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_specialist_outstanding AS
 SELECT se.specialist_id,
    s.name AS specialist_name,
    se.clinic_id,
    count(*) AS cases_outstanding,
    COALESCE(sum(se.amount), (0)::numeric) AS amount_outstanding,
    min(se.earned_on) AS oldest_earning
   FROM (public.specialist_earnings se
     JOIN public.staff s ON ((s.id = se.specialist_id)))
  WHERE (se.is_settled = false)
  GROUP BY se.specialist_id, s.name, se.clinic_id;


--
-- Name: v_specialist_payables; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_specialist_payables AS
 SELECT se.id AS earning_id,
    se.specialist_id,
    s.name AS specialist_name,
    s.phone AS specialist_phone,
    s.whatsapp_number AS specialist_whatsapp,
    se.clinic_id,
    se.patient_id,
    p.name AS patient_name,
    se.appointment_id,
    se.amount AS earning_amount,
    se.is_settled,
    se.settled_amount,
    se.settled_on AS settled_at,
    se.settled_payment_mode AS payment_mode,
    (se.amount - COALESCE(se.settled_amount, (0)::numeric)) AS outstanding,
    se.verified_at,
    se.verified_by,
    se.case_status,
    se.created_at AS earned_at
   FROM ((public.specialist_earnings se
     LEFT JOIN public.staff s ON ((s.id = se.specialist_id)))
     LEFT JOIN public.patients p ON ((p.id = se.patient_id)))
  WHERE ((se.is_settled IS NOT TRUE) OR ((se.amount - COALESCE(se.settled_amount, (0)::numeric)) > (0)::numeric));


--
-- Name: VIEW v_specialist_payables; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_specialist_payables IS 'Outstanding specialist payables. Includes unsettled or partially-settled earnings.';


--
-- Name: v_workshop_specialist_work; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_workshop_specialist_work AS
 SELECT a.id AS appointment_id,
    a.patient_id,
    p.name AS patient_name,
    a.specialist_id,
    sp.name AS specialist_name,
    a.specialist_session_status,
    a.specialist_confirmation_status,
    a.specialist_assigned_at,
    a.specialist_closed_at,
    a.specialist_notes,
    a.scheduled_date,
    a.clinic_id
   FROM ((public.appointments a
     LEFT JOIN public.patients p ON ((p.id = a.patient_id)))
     LEFT JOIN public.staff sp ON ((sp.id = a.specialist_id)))
  WHERE ((a.specialist_id IS NOT NULL) AND ((a.status)::text <> 'cancelled'::text))
  ORDER BY
        CASE a.specialist_session_status
            WHEN 'pending'::text THEN 1
            WHEN 'done'::text THEN 2
            WHEN 'closed'::text THEN 3
            WHEN 'verified'::text THEN 4
            ELSE 5
        END, a.specialist_assigned_at DESC;


--
-- Name: VIEW v_workshop_specialist_work; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_workshop_specialist_work IS 'Specialist work tracker: pending → done → verified. Used by Workshop sidebar group.';


--
-- Name: walk_in_patients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.walk_in_patients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid,
    clinic_id uuid NOT NULL,
    registered_by_staff_id uuid,
    registered_at timestamp without time zone DEFAULT now(),
    visit_reason text,
    doctor_id uuid,
    doctor_notified boolean DEFAULT false,
    doctor_notified_at timestamp without time zone,
    outcome character varying(30) DEFAULT 'pending'::character varying,
    outcome_recorded_at timestamp without time zone,
    notes text
);


--
-- Name: workspace_drafts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workspace_drafts (
    patient_id uuid NOT NULL,
    data jsonb DEFAULT '{}'::jsonb,
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: appointment_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_requests ALTER COLUMN id SET DEFAULT nextval('public.appointment_requests_id_seq'::regclass);


--
-- Name: clinic_info id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinic_info ALTER COLUMN id SET DEFAULT nextval('public.clinic_info_id_seq'::regclass);


--
-- Name: lab_orders serial_no; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_orders ALTER COLUMN serial_no SET DEFAULT nextval('public.lab_orders_serial_no_seq'::regclass);


--
-- Name: patient_uploads id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_uploads ALTER COLUMN id SET DEFAULT nextval('public.patient_uploads_id_seq'::regclass);


--
-- Data for Name: appointment_call_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.appointment_call_logs (id, appointment_id, called_by_staff_id, call_status, call_time, notes, callback_scheduled_for, created_at) FROM stdin;
e0ee497c-9194-44b8-821f-2affb66dfce3	5607d539-d841-4ff4-88d7-10ea8b601215	d1111111-1111-1111-1111-111111111111	confirmed	2026-06-20 22:41:30.190462	confirm	\N	2026-06-20 22:41:30.190462
315953d7-c113-44df-9fc6-728ccc67433c	2a3a29ad-4b20-4a7e-a538-8d668e541d28	d1111111-1111-1111-1111-111111111111	confirmed	2026-06-20 22:42:56.290201	confirm	\N	2026-06-20 22:42:56.290201
06c234cd-13ab-4e91-86a8-d1abdaccf075	2a3a29ad-4b20-4a7e-a538-8d668e541d28	d1111111-1111-1111-1111-111111111111	confirmed	2026-06-20 22:43:16.01103	confirm	\N	2026-06-20 22:43:16.01103
4d13a438-3493-431c-8982-33e34336278f	30000000-0000-4000-8000-000000000102	d1111111-1111-1111-1111-111111111111	refused	2026-06-20 23:33:47.639896	refused	\N	2026-06-20 23:33:47.639896
4a91cd47-39fa-492b-aff5-ffcd60cd077e	30000000-0000-4000-8000-000000000102	d1111111-1111-1111-1111-111111111111	date_change_pending	2026-06-20 23:34:34.661749	change_date	\N	2026-06-20 23:34:34.661749
7362f1d0-7614-4691-906b-58085e6ef0a6	30000000-0000-4000-8000-000000000102	d1111111-1111-1111-1111-111111111111	confirmed	2026-06-20 23:35:07.989266	confirm	\N	2026-06-20 23:35:07.989266
81afdb85-de49-4ec5-8582-527327a5de04	eb71a482-4d0d-4822-b905-fd4459abe57b	d1111111-1111-1111-1111-111111111111	confirmed	2026-06-20 23:48:56.688717	confirm	\N	2026-06-20 23:48:56.688717
4467d488-bebc-4a5c-bdf7-01822f8d9c65	eb71a482-4d0d-4822-b905-fd4459abe57b	d1111111-1111-1111-1111-111111111111	confirmed	2026-06-20 23:49:25.895292	confirm	\N	2026-06-20 23:49:25.895292
93fc0ae8-b5eb-4562-8b6a-8a6382a855a0	30000000-0000-4000-8000-000000000104	d2222222-2222-2222-2222-222222222222	confirmed	2026-06-21 00:34:57.781611	automated workflow verification	\N	2026-06-21 00:34:57.781611
68fc09dd-4590-4902-9ba6-d51616e23cb1	30000000-0000-4000-8000-000000000102	d1111111-1111-1111-1111-111111111111	confirmed	2026-06-21 01:39:52.364362	confirm	\N	2026-06-21 01:39:52.364362
\.


--
-- Data for Name: appointment_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.appointment_history (id, appointment_id, action_type, old_value, new_value, changed_by_staff_id, changed_at, notes) FROM stdin;
\.


--
-- Data for Name: appointment_message_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.appointment_message_logs (id, appointment_id, patient_id, sent_by_staff_id, channel, template_used, message_body, sent_at, delivery_status, patient_reply) FROM stdin;
6add0c28-5f52-4222-ad63-d04c22ef32f3	eb71a482-4d0d-4822-b905-fd4459abe57b	10000000-0000-4000-8000-000000000103	d1111111-1111-1111-1111-111111111111	whatsapp	confirmation	Hi Meera Nair, your appointment at Siya Dental Care — Main Branch is confirmed for  at  for Follow-up. Please arrive 10 minutes early. Reply YES to confirm or call +919876500001. - Siya Dental Care — Main Branch	2026-06-20 23:49:08.954851	manually_sent	\N
\.


--
-- Data for Name: appointment_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.appointment_requests (id, patient_name, phone, preferred_date, preferred_time, branch, message, status, created_at, clinic_id, email, source, converted_to_appointment_id, handled_by, notes, service) FROM stdin;
\.


--
-- Data for Name: appointment_types; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.appointment_types (id, type_name, sort_order, is_default, created_at) FROM stdin;
6b34e18c-6ada-4c78-9b8d-78d21fc8de91	Consultation	1	t	2026-06-11 16:44:16.736991
910adf97-be00-41c2-863a-0703eb2414f4	Tooth Pain	2	t	2026-06-11 16:44:16.736991
e49e13ba-1b77-4df9-b712-ea2f8f580b4a	Cleaning	3	t	2026-06-11 16:44:16.736991
8508bfcd-3434-4794-9185-a8c942bcdff7	RCT	4	t	2026-06-11 16:44:16.736991
a9df448a-bacc-4d7d-8589-ae10eda8674f	Crown Trial	5	t	2026-06-11 16:44:16.736991
3a4b7284-996b-4762-a2b4-46ad2a016e80	Crown Cementation	6	t	2026-06-11 16:44:16.736991
549c05a1-103b-4916-bcee-8d0eea053743	Extraction	7	t	2026-06-11 16:44:16.736991
be6a940c-6991-428b-977b-9ebee5ff5c48	Implant Review	8	t	2026-06-11 16:44:16.736991
63dd5f9f-4abc-4d78-8aa7-e3a5b661cd24	Dressing	9	t	2026-06-11 16:44:16.736991
e812ae70-6f66-439a-88b4-25c001657e84	Orthodontic Review	10	t	2026-06-11 16:44:16.736991
da362054-c6fb-4ef6-bf2b-fe972e8acc8f	Filling	11	t	2026-06-11 16:44:16.736991
9e7c63f8-d174-4220-bd5a-adb72cb7a3c8	Other	99	t	2026-06-11 16:44:16.736991
\.


--
-- Data for Name: appointments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.appointments (id, patient_id, clinic_id, doctor_id, treatment_plan_id, sitting_number, requested_date, requested_time, confirmed_date, confirmed_time, source, reason, status, queue_position, arrived_at, started_at, completed_at, staff_notes, created_at, updated_at, scheduled_date, scheduled_time, duration_minutes, contact_status, last_contacted_at, last_contacted_by, reschedule_reason, cancel_reason, workflow_status, chief_complaints, appointment_type, specialist_id, specialist_assigned_at, specialist_assigned_by, specialist_session_status, specialist_closed_at, specialist_notes, phone_number, specialist_confirmation_status, specialist_called_at, specialist_called_by, pending_action, pending_action_since, specialist_call_confirmed) FROM stdin;
5607d539-d841-4ff4-88d7-10ea8b601215	10000000-0000-4000-8000-000000000101	a1111111-1111-1111-1111-111111111111	d1111111-1111-1111-1111-111111111111	\N	\N	2026-06-20	\N	\N	\N	followup	Follow-up	completed	\N	2026-06-20 22:41:35.83619+05:30	2026-06-20 22:41:46.593677+05:30	2026-06-20 22:42:22.22418+05:30	\N	2026-06-20 22:40:47.484261+05:30	2026-06-20 22:42:22.22418+05:30	\N	\N	30	confirmed	2026-06-20 22:41:30.176091	d1111111-1111-1111-1111-111111111111	\N	\N	completed	[]	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
30000000-0000-4000-8000-000000000101	10000000-0000-4000-8000-000000000101	a1111111-1111-1111-1111-111111111111	d1111111-1111-1111-1111-111111111111	20000000-0000-4000-8000-000000000101	\N	2026-06-20	10:00:00	2026-06-20	10:00:00	phone	RCT consultation	completed	\N	2026-06-20 22:38:53.067075+05:30	2026-06-20 22:39:11.403788+05:30	2026-06-20 22:40:47.484261+05:30	\N	2026-06-20 22:37:56.627141+05:30	2026-06-20 22:40:47.484261+05:30	2026-06-20	10:00:00	30	confirmed	\N	\N	\N	\N	completed	["Tooth pain"]	RCT	07e07975-94d7-4c30-8a71-7e75f420092f	2026-06-20 22:37:56.627141+05:30	\N	verified	2026-06-20 22:39:39.33438+05:30	\nClosed: Work completed by specialist	9876500101	confirmed	\N	\N	\N	\N	f
30000000-0000-4000-8000-000000000103	10000000-0000-4000-8000-000000000103	a1111111-1111-1111-1111-111111111111	d1111111-1111-1111-1111-111111111111	20000000-0000-4000-8000-000000000103	\N	2026-06-20	15:15:00	2026-06-20	15:15:00	followup	Temporary crown review	completed	\N	2026-06-20 23:35:21.24564+05:30	2026-06-20 23:36:45.538691+05:30	2026-06-20 23:47:44.689168+05:30	\N	2026-06-20 22:37:56.627141+05:30	2026-06-20 23:48:47.345992+05:30	2026-06-20	15:15:00	30	confirmed	\N	\N	\N	\N	completed	["Loose temporary crown"]	Crown	07e07975-94d7-4c30-8a71-7e75f420092f	2026-06-20 23:44:39.222465+05:30	d1111111-1111-1111-1111-111111111111	pending	\N	\nAssigned: · 1500 · ₹1500	9876500103	confirmed	\N	\N	\N	\N	t
eb71a482-4d0d-4822-b905-fd4459abe57b	10000000-0000-4000-8000-000000000103	a1111111-1111-1111-1111-111111111111	d1111111-1111-1111-1111-111111111111	\N	\N	2026-06-20	10:00:00	\N	\N	followup	Follow-up	in_treatment	\N	2026-06-20 23:49:36.954443+05:30	2026-06-20 23:52:18.036452+05:30	\N	\N	2026-06-20 23:47:00.476725+05:30	2026-06-20 23:52:18.036452+05:30	\N	\N	30	confirmed	2026-06-20 23:49:25.890498	d1111111-1111-1111-1111-111111111111	\N	\N	in_treatment	[]	Follow-up	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
2a3a29ad-4b20-4a7e-a538-8d668e541d28	10000000-0000-4000-8000-000000000101	a1111111-1111-1111-1111-111111111111	d1111111-1111-1111-1111-111111111111	\N	\N	2026-06-20	\N	2026-06-20	\N	followup	Follow-up	in_treatment	\N	2026-06-20 23:56:06.268285+05:30	2026-06-20 23:56:13.556711+05:30	\N	\N	2026-06-20 22:42:22.22418+05:30	2026-06-20 23:56:13.556711+05:30	2026-06-20	\N	30	confirmed	2026-06-20 22:43:15.990621	d1111111-1111-1111-1111-111111111111	\N	\N	in_treatment	[]	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
30000000-0000-4000-8000-000000000104	10000000-0000-4000-8000-000000000104	a1111111-1111-1111-1111-111111111111	d1111111-1111-1111-1111-111111111111	\N	\N	2026-06-20	17:00:00	\N	17:00:00	website	New patient consult	arrived	\N	2026-06-21 00:40:04.201816+05:30	\N	\N	\N	2026-06-20 22:37:56.627141+05:30	2026-06-21 00:40:04.201816+05:30	2026-06-20	17:00:00	30	confirmed	2026-06-21 00:34:57.428254	d2222222-2222-2222-2222-222222222222	\N	\N	arrived	["First visit check-up"]	Consultation	\N	\N	\N	\N	\N	\N	9876500104	\N	\N	\N	\N	\N	f
30000000-0000-4000-8000-000000000102	10000000-0000-4000-8000-000000000102	a1111111-1111-1111-1111-111111111111	d1111111-1111-1111-1111-111111111111	20000000-0000-4000-8000-000000000102	\N	2026-06-20	\N	\N	\N	walkin	Scaling consult	arrived	\N	2026-06-21 01:39:57.178061+05:30	\N	\N	\N	2026-06-20 22:37:56.627141+05:30	2026-06-21 01:39:57.178061+05:30	\N	\N	30	confirmed	2026-06-21 01:39:52.356791	d1111111-1111-1111-1111-111111111111	\N	\N	arrived	["Bleeding gums"]	Consultation	\N	\N	\N	\N	\N	\N	9876500102	\N	\N	\N	\N	\N	f
\.


--
-- Data for Name: ar_preview_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ar_preview_settings (id, banuba_token, enabled_effects, default_whitening_intensity, braces_style, veneer_shade, show_alignment_guide, custom_branding_text, created_at, updated_at) FROM stdin;
caaa679a-f027-4c5f-9c8c-975f8d369338	\N	{whitening,alignment}	60	metal	natural	t	\N	2026-06-16 09:39:11.631736+05:30	2026-06-18 17:10:59.277573+05:30
\.


--
-- Data for Name: bot_config; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.bot_config (id, clinic_id, n8n_webhook_url, n8n_enabled, telegram_bot_token, telegram_chat_id, telegram_enabled, whatsapp_bot_enabled, whatsapp_intent_routing, updated_at) FROM stdin;
c9b2c9ad-9ed6-4d7c-bc12-3979dab93639	b2222222-2222-2222-2222-222222222222	\N	f	\N	\N	f	f	[{"label": "List upcoming", "action": "list_appointments", "keyword": "appointment"}, {"label": "Book a slot", "action": "request_appointment", "keyword": "book"}, {"label": "Cancel last", "action": "request_cancel", "keyword": "cancel"}, {"label": "Show pending payments", "action": "show_balance", "keyword": "balance"}, {"label": "Past visits", "action": "show_history", "keyword": "history"}]	2026-06-17 14:02:16.203284+05:30
767a2bcc-8dfb-4536-836b-3ecc39f64801	a1111111-1111-1111-1111-111111111111	\N	f	\N	\N	f	t	[{"label": "List upcoming", "action": "list_appointments", "keyword": "appointment"}, {"label": "Book a slot", "action": "request_appointment", "keyword": "book"}, {"label": "Cancel last", "action": "request_cancel", "keyword": "cancel"}, {"label": "Show pending payments", "action": "show_balance", "keyword": "balance"}, {"label": "Past visits", "action": "show_history", "keyword": "history"}]	2026-06-17 14:03:41.06781+05:30
\.


--
-- Data for Name: bot_event_log; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.bot_event_log (id, clinic_id, channel, direction, patient_id, from_id, intent, message_text, response_text, status, created_at) FROM stdin;
\.


--
-- Data for Name: business_hours; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.business_hours (id, clinic_id, weekday, is_closed, open_time, close_time, break_start, break_end) FROM stdin;
8cd786bd-1f92-4c38-a475-0a23bb88342c	b2222222-2222-2222-2222-222222222222	3	f	09:00:00	20:00:00	13:00:00	17:00:00
9842b7aa-7f04-4a8b-ade0-17500864a201	a1111111-1111-1111-1111-111111111111	5	f	09:00:00	20:00:00	13:00:00	17:00:00
b4da9450-f256-4365-adb4-7d118f4c42db	b2222222-2222-2222-2222-222222222222	4	f	09:00:00	20:00:00	13:00:00	17:00:00
13932e8b-aae1-443b-96d1-d7320ac26c90	b2222222-2222-2222-2222-222222222222	1	f	09:00:00	20:00:00	13:00:00	17:00:00
d4364c58-ba9d-427b-a1c3-c83e2cf1a618	a1111111-1111-1111-1111-111111111111	0	f	09:00:00	20:00:00	13:00:00	17:00:00
f3c9e5d8-e50b-42b1-ad0d-c0a68f8cf596	a1111111-1111-1111-1111-111111111111	2	f	09:00:00	20:00:00	13:00:00	17:00:00
9b8e8895-8f42-4abc-9615-eb40fb784353	a1111111-1111-1111-1111-111111111111	4	f	09:00:00	20:00:00	13:00:00	17:00:00
6b5addce-81d0-47c3-8add-98db7005f131	a1111111-1111-1111-1111-111111111111	1	f	09:00:00	20:00:00	13:00:00	17:00:00
77b38a66-556f-453d-a63a-fb0699d33a1e	a1111111-1111-1111-1111-111111111111	3	f	09:00:00	20:00:00	13:00:00	17:00:00
0e44a98e-aec0-4d99-8f3e-2b822aa4a452	b2222222-2222-2222-2222-222222222222	5	f	09:00:00	20:00:00	13:00:00	17:00:00
0d126faa-4fcc-4448-aefd-68fba344d44d	b2222222-2222-2222-2222-222222222222	0	f	09:00:00	20:00:00	13:00:00	17:00:00
cf8376fa-a29e-4716-b924-78b55a7a9577	b2222222-2222-2222-2222-222222222222	2	f	09:00:00	20:00:00	13:00:00	17:00:00
1bfab5d3-f5a1-4957-a26e-d644bd50940d	a1111111-1111-1111-1111-111111111111	6	t	\N	\N	\N	\N
02f6d9fd-d1bc-495a-a272-5907268bffa1	b2222222-2222-2222-2222-222222222222	6	t	\N	\N	\N	\N
\.


--
-- Data for Name: clinic_content; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.clinic_content (id, clinic_id, section, title, body, image_url, image_url_2, order_idx, is_active, metadata, created_at, updated_at, subtitle, cta_text, cta_link) FROM stdin;
0c21050f-f3aa-49ac-a11c-3dc415e23d15	a1111111-1111-1111-1111-111111111111	hero	Your Perfect Smile Starts Here	Expert dental care with a gentle touch — implants, orthodontics, and complete family dentistry under one roof.	\N	\N	1	t	{}	2026-06-08 17:16:55.846324+05:30	2026-06-08 17:16:55.846324+05:30	\N	\N	\N
c6aac987-6afe-4410-a26a-039cb94056da	a1111111-1111-1111-1111-111111111111	about	About Dr. Madhu Edward	BDS, Reg. No. OD-28456. Passionate about delivering pain-free, confident smiles to every patient in Rourkela. Specializing in implants and orthodontic care with over a decade of clinical experience.	\N	\N	1	t	{}	2026-06-08 17:16:55.846324+05:30	2026-06-08 17:16:55.846324+05:30	\N	\N	\N
3f10d2ba-6aac-413b-b5e9-8065471dd37f	a1111111-1111-1111-1111-111111111111	service	Dental Implants	Permanent tooth replacement that looks and feels natural. Single, multiple, or full-arch implants tailored to your needs.	\N	\N	1	t	{}	2026-06-08 17:16:55.846324+05:30	2026-06-08 17:16:55.846324+05:30	\N	\N	\N
15365453-ac62-47ea-8a72-711483f792e1	a1111111-1111-1111-1111-111111111111	service	Orthodontics & Braces	Straighten your teeth with traditional braces, ceramic options, or invisible aligners.	\N	\N	2	t	{}	2026-06-08 17:16:55.846324+05:30	2026-06-08 17:16:55.846324+05:30	\N	\N	\N
7d5693af-0ebb-4f00-8da9-3f26595229c8	a1111111-1111-1111-1111-111111111111	service	Root Canal Treatment	Pain-free, single-sitting root canals using modern rotary instrumentation.	\N	\N	3	t	{}	2026-06-08 17:16:55.846324+05:30	2026-06-08 17:16:55.846324+05:30	\N	\N	\N
f3686904-b571-4617-9df9-e85706cf3e01	a1111111-1111-1111-1111-111111111111	service	Teeth Whitening	Professional in-clinic whitening for a brighter, confident smile in under an hour.	\N	\N	4	t	{}	2026-06-08 17:16:55.846324+05:30	2026-06-08 17:16:55.846324+05:30	\N	\N	\N
d457cc6d-0c1f-4eca-b635-acec4ea001cb	a1111111-1111-1111-1111-111111111111	service	Pediatric Dentistry	Friendly, gentle dental care designed for children of all ages.	\N	\N	5	t	{}	2026-06-08 17:16:55.846324+05:30	2026-06-08 17:16:55.846324+05:30	\N	\N	\N
2d1c69bf-b58c-45f8-897e-2473e9d9fd66	a1111111-1111-1111-1111-111111111111	service	Cosmetic Dentistry	Veneers, smile makeovers, and aesthetic restorations.	\N	\N	6	t	{}	2026-06-08 17:16:55.846324+05:30	2026-06-08 17:16:55.846324+05:30	\N	\N	\N
4fb1e111-7024-445c-b486-0d97dd5f466e	a1111111-1111-1111-1111-111111111111	testimonial	Anonymous Patient — Implant	Got my implant done at Siya — Dr. Edward made the entire process painless. Highly recommended!	\N	\N	1	t	{}	2026-06-08 17:16:55.846324+05:30	2026-06-08 17:16:55.846324+05:30	\N	\N	\N
caa62b89-9935-4b25-8540-98a27df44a60	a1111111-1111-1111-1111-111111111111	testimonial	Anonymous Patient — Braces	Best orthodontic treatment in Rourkela. The clinic is clean, modern, and the staff are wonderful.	\N	\N	2	t	{}	2026-06-08 17:16:55.846324+05:30	2026-06-08 17:16:55.846324+05:30	\N	\N	\N
185a3830-6115-4fe0-b7f9-1e3f5d60becc	a1111111-1111-1111-1111-111111111111	faq	Do you accept walk-in patients?	Yes, we accept walk-ins during clinic hours but appointments are recommended to reduce wait time.	\N	\N	1	t	{}	2026-06-08 17:16:55.846324+05:30	2026-06-08 17:16:55.846324+05:30	\N	\N	\N
6cb14eaa-3670-4ecf-9871-eebbb5bb0225	a1111111-1111-1111-1111-111111111111	faq	Is dental treatment painful?	We use modern anesthesia and gentle techniques. Most procedures are completely pain-free.	\N	\N	2	t	{}	2026-06-08 17:16:55.846324+05:30	2026-06-08 17:16:55.846324+05:30	\N	\N	\N
ce57b121-1d95-4c21-adf7-86b3cd9c664c	a1111111-1111-1111-1111-111111111111	faq	Do you offer EMI for treatment costs?	Yes, we offer flexible payment options including EMI for major treatments like implants and braces.	\N	\N	3	t	{}	2026-06-08 17:16:55.846324+05:30	2026-06-08 17:16:55.846324+05:30	\N	\N	\N
edad47c7-6ad7-419d-8efd-3d5ea6c20bc5	a1111111-1111-1111-1111-111111111111	faq	How long does an implant treatment take?	Typically 3-6 months from implant placement to final crown, depending on bone healing.	\N	\N	4	t	{}	2026-06-08 17:16:55.846324+05:30	2026-06-08 17:16:55.846324+05:30	\N	\N	\N
\.


--
-- Data for Name: clinic_holidays; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.clinic_holidays (id, clinic_id, holiday_date, reason, is_recurring) FROM stdin;
\.


--
-- Data for Name: clinic_info; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.clinic_info (id, key, value, updated_at) FROM stdin;
1	clinic_name	Siya Dental Care	2026-06-08 15:55:03.403073+05:30
2	tagline	Implant & Orthodontic Centre	2026-06-08 15:55:03.403073+05:30
3	doctor_name	Dr. Madhu Edward	2026-06-08 15:55:03.403073+05:30
4	doctor_qualification	BDS, Reg. No. OD-28456	2026-06-08 15:55:03.403073+05:30
5	branch1_name	Daily Market	2026-06-08 15:55:03.403073+05:30
6	branch1_address	PETROL PUMP, MADU MAHARAJ GALI, near DAILY MARKET, DAILY MARKET, Udit Nagar, Rourkela, Odisha 769001	2026-06-08 15:55:03.403073+05:30
7	branch1_phone		2026-06-08 15:55:03.403073+05:30
8	branch1_hours	Mon-Sat: 09:00 AM - 1:00 PM, 5:00 PM - 8:00 PM	2026-06-08 15:55:03.403073+05:30
9	branch2_name	Jhirpani	2026-06-08 15:55:03.403073+05:30
10	branch2_address	1st floor, wonder medicine complex, near RC Church, Jhirpani, Rourkela, Odisha 769042	2026-06-08 15:55:03.403073+05:30
11	branch2_phone		2026-06-08 15:55:03.403073+05:30
12	branch2_hours	Mon-Sat: 09:00 AM - 1:00 PM, 5:00 PM - 8:00 PM	2026-06-08 15:55:03.403073+05:30
13	about	Expert dental care with a gentle touch. Specializing in implants, orthodontics, and comprehensive family dentistry.	2026-06-08 15:55:03.403073+05:30
\.


--
-- Data for Name: clinic_info_ext; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.clinic_info_ext (clinic_id, logo_url, letterhead_url, gst_number, license_number, establishment_year, tagline, primary_doctor_name, primary_doctor_qual, primary_doctor_reg, accent_color, secondary_color, rx_language, rx_format, rx_show_qr, rx_footer_text, public_about, public_emergency_msg, socials, updated_at, updated_by) FROM stdin;
a1111111-1111-1111-1111-111111111111	\N	\N	\N	\N	\N	\N	\N	\N	\N	#0E7C7B	#0A5C5B	en	A4	t	\N	\N	\N	{}	2026-06-15 10:13:34.02512+05:30	\N
b2222222-2222-2222-2222-222222222222	\N	\N	\N	\N	\N	\N	\N	\N	\N	#0E7C7B	#0A5C5B	en	A4	t	\N	\N	\N	{}	2026-06-15 10:13:34.02512+05:30	\N
\.


--
-- Data for Name: clinic_notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.clinic_notifications (id, clinic_id, notification_type, recipient_staff_id, recipient_role, sender_staff_id, title, message, data, priority, is_read, read_at, related_patient_id, related_appointment_id, related_session_id, created_at, expires_at) FROM stdin;
3127b058-d50a-4d29-8398-a03e6bee81a2	a1111111-1111-1111-1111-111111111111	patient_arrived	\N	doctor	\N	🟢 Aarav Sharma arrived	Aarav Sharma is waiting in your queue	{}	high	f	\N	a0000001-0000-0000-0000-000000000001	b0000001-0000-0000-0000-000000000001	\N	2026-06-20 16:37:36.238977	\N
1dfef64d-2c47-46fc-bff6-60b7a87fe554	a1111111-1111-1111-1111-111111111111	patient_arrived	\N	doctor	\N	🟢 Rahul Verma arrived	Rahul Verma is waiting in your queue	{}	high	f	\N	a0000003-0000-0000-0000-000000000003	b0000003-0000-0000-0000-000000000003	\N	2026-06-20 17:59:49.02016	\N
323121a2-2184-4212-aa17-b35056e35383	a1111111-1111-1111-1111-111111111111	patient_arrived	\N	doctor	\N	🟢 Asha Verma arrived	Asha Verma is waiting in your queue	{}	high	f	\N	10000000-0000-4000-8000-000000000101	30000000-0000-4000-8000-000000000101	\N	2026-06-20 22:38:53.067075	\N
aba4db48-148a-4a73-bba8-6e60f5b238e8	a1111111-1111-1111-1111-111111111111	payment_to_collect	\N	nurse	d1111111-1111-1111-1111-111111111111	💰 Collect ₹500 — Asha Verma	Visit closed by doctor	{}	high	f	\N	10000000-0000-4000-8000-000000000101	\N	a2cdc120-b2fd-49a0-b2a7-de77f9381107	2026-06-20 22:40:33.9048	\N
2fc24fea-d149-41c6-9ba6-02ca1893e37e	a1111111-1111-1111-1111-111111111111	patient_arrived	\N	doctor	\N	🟢 Asha Verma arrived	Asha Verma is waiting in your queue	{}	high	f	\N	10000000-0000-4000-8000-000000000101	5607d539-d841-4ff4-88d7-10ea8b601215	\N	2026-06-20 22:41:35.83619	\N
b222d431-c5ed-423b-b6f9-a43e2d06b821	a1111111-1111-1111-1111-111111111111	payment_to_collect	\N	nurse	d1111111-1111-1111-1111-111111111111	💰 Collect ₹100 — Asha Verma	Visit closed by doctor	{}	high	f	\N	10000000-0000-4000-8000-000000000101	\N	479069ee-e38a-499f-94e8-9907a208e07a	2026-06-20 22:42:11.99367	\N
c899436a-e314-4f3b-9eb3-b14d70440572	a1111111-1111-1111-1111-111111111111	patient_arrived	\N	doctor	\N	🟢 Asha Verma arrived	Asha Verma is waiting in your queue	{}	high	f	\N	10000000-0000-4000-8000-000000000101	2a3a29ad-4b20-4a7e-a538-8d668e541d28	\N	2026-06-20 22:43:17.120847	\N
c588f69f-4c38-4622-9434-3171174fcef5	a1111111-1111-1111-1111-111111111111	patient_arrived	\N	doctor	\N	🟢 Meera Nair arrived	Meera Nair is waiting in your queue	{}	high	f	\N	10000000-0000-4000-8000-000000000103	30000000-0000-4000-8000-000000000103	\N	2026-06-20 23:35:21.24564	\N
bf4484df-4bae-452b-b9e5-3e90fd847593	a1111111-1111-1111-1111-111111111111	payment_to_collect	\N	nurse	d1111111-1111-1111-1111-111111111111	💰 Collect ₹500 — Meera Nair	Visit closed by doctor	{}	high	f	\N	10000000-0000-4000-8000-000000000103	\N	ed98d664-efe0-4473-8f32-7db50ab4011a	2026-06-20 23:47:00.476725	\N
0ae9875f-f55d-4a0d-b4cf-1a2b02437f9f	a1111111-1111-1111-1111-111111111111	patient_arrived	\N	doctor	\N	🟢 Meera Nair arrived	Meera Nair is waiting in your queue	{}	high	f	\N	10000000-0000-4000-8000-000000000103	eb71a482-4d0d-4822-b905-fd4459abe57b	\N	2026-06-20 23:49:36.954443	\N
d4285d6b-676a-4fbd-8a8b-c95b319ce8a4	a1111111-1111-1111-1111-111111111111	patient_arrived	\N	doctor	\N	🟢 Asha Verma arrived	Asha Verma is waiting in your queue	{}	high	f	\N	10000000-0000-4000-8000-000000000101	2a3a29ad-4b20-4a7e-a538-8d668e541d28	\N	2026-06-20 23:56:06.268285	\N
8539c96c-0532-483d-a71d-f43da7c769f6	a1111111-1111-1111-1111-111111111111	patient_arrived	\N	doctor	\N	🟢 Arjun Rao arrived	Arjun Rao is waiting in your queue	{}	high	f	\N	10000000-0000-4000-8000-000000000104	30000000-0000-4000-8000-000000000104	\N	2026-06-21 00:40:04.201816	\N
0c8156ea-b0ab-4aac-b28e-b1bf3549f1e6	a1111111-1111-1111-1111-111111111111	patient_arrived	\N	doctor	\N	🟢 Rohan Gupta arrived	Rohan Gupta is waiting in your queue	{}	high	f	\N	10000000-0000-4000-8000-000000000102	30000000-0000-4000-8000-000000000102	\N	2026-06-21 01:39:57.178061	\N
\.


--
-- Data for Name: clinic_page_sections; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.clinic_page_sections (id, page_id, section_type, display_order, content, is_visible, created_at) FROM stdin;
c1f6fbc3-45b1-4364-8b09-d66e3eb1d2be	e76fa229-d015-49c9-aed0-7ef75d97b290	slideshow	2	{"slides": [], "autoplay": true, "interval": 5000}	t	2026-06-17 14:02:16.203284+05:30
589e4e58-0de2-4233-99f1-0805b8da3d74	e76fa229-d015-49c9-aed0-7ef75d97b290	map	7	{"address": "Sector 5, Rourkela, Odisha", "embed_url": ""}	t	2026-06-17 14:02:16.203284+05:30
654d0ea7-637e-4c55-a431-f739ea7ac0ac	e76fa229-d015-49c9-aed0-7ef75d97b290	cta_block	6	{"cta_link": "https://wa.me/918895050000", "cta_text": "WhatsApp Us", "headline": "Ready for a Brighter Smile?", "subheadline": "Book your appointment today"}	t	2026-06-17 14:02:16.203284+05:30
c617b4bf-63fc-45bf-ba29-124f229cb4c7	63270569-0be1-4c81-90d0-4b2236e484f1	testimonial	5	{"items": [], "title": "Our Patients Say"}	t	2026-06-17 14:02:16.203284+05:30
eed0d7a4-3eff-455a-b528-d1b39a44e29e	63270569-0be1-4c81-90d0-4b2236e484f1	slideshow	2	{"slides": [], "autoplay": true, "interval": 5000}	t	2026-06-17 14:02:16.203284+05:30
a692e026-1537-4a25-b780-8e2835bedd3a	63270569-0be1-4c81-90d0-4b2236e484f1	map	7	{"address": "Sector 5, Rourkela, Odisha", "embed_url": ""}	t	2026-06-17 14:02:16.203284+05:30
9896b9c1-72a5-430d-bd03-646a6b61d619	63270569-0be1-4c81-90d0-4b2236e484f1	cta_block	6	{"cta_link": "https://wa.me/918895050000", "cta_text": "WhatsApp Us", "headline": "Ready for a Brighter Smile?", "subheadline": "Book your appointment today"}	t	2026-06-17 14:02:16.203284+05:30
163ad08c-e821-488d-a8a7-b76d86a8d870	e76fa229-d015-49c9-aed0-7ef75d97b290	testimonial	5	{"items": [], "title": "Our Patients Say"}	t	2026-06-17 14:02:16.203284+05:30
7829bbfa-aa6d-488f-9f60-4b75fe79989d	63270569-0be1-4c81-90d0-4b2236e484f1	hero	1	{"cta_link": "#contact", "cta_text": "Book Appointment", "headline": "Modern Dental Care, Trusted Hands", "subheadline": "Two branches in Rourkela. Expert care, gentle approach.", "background_image": "/uploads/hero-default.jpg"}	t	2026-06-17 14:02:16.203284+05:30
cbb44aee-5246-46b0-bff7-a8c00b0ac205	63270569-0be1-4c81-90d0-4b2236e484f1	doctor_card	4	{"bio": "Expert dental practitioner with years of experience in restorative and cosmetic dentistry.", "name": "Dr. Madhu Edward", "image": "/uploads/doctor.jpg", "credentials": "BDS"}	t	2026-06-17 14:02:16.203284+05:30
6fe59880-ebf5-4f8d-82a8-309639acf44f	e76fa229-d015-49c9-aed0-7ef75d97b290	service_grid	3	{"title": "What We Do", "services": [{"desc": "Painless, single-sitting", "icon": "🦷", "name": "Root Canal"}, {"desc": "PFM, Zirconia", "icon": "👑", "name": "Crowns & Bridges"}, {"desc": "Veneers, whitening", "icon": "✨", "name": "Smile Design"}, {"desc": "Permanent solutions", "icon": "🔩", "name": "Implants"}, {"desc": "Child-friendly", "icon": "👶", "name": "Kids Dentistry"}, {"desc": "Wisdom teeth", "icon": "⚕️", "name": "Oral Surgery"}]}	t	2026-06-17 14:02:16.203284+05:30
a834a3e9-a18e-4f1d-9a4b-39302da31d08	e76fa229-d015-49c9-aed0-7ef75d97b290	hero	1	{"cta_link": "#contact", "cta_text": "Book Appointment", "headline": "Modern Dental Care, Trusted Hands", "subheadline": "Two branches in Rourkela. Expert care, gentle approach.", "background_image": "/uploads/hero-default.jpg"}	t	2026-06-17 14:02:16.203284+05:30
1354b6ab-8357-403f-95c5-72500ff2335a	63270569-0be1-4c81-90d0-4b2236e484f1	service_grid	3	{"title": "What We Do", "services": [{"desc": "Painless, single-sitting", "icon": "🦷", "name": "Root Canal"}, {"desc": "PFM, Zirconia", "icon": "👑", "name": "Crowns & Bridges"}, {"desc": "Veneers, whitening", "icon": "✨", "name": "Smile Design"}, {"desc": "Permanent solutions", "icon": "🔩", "name": "Implants"}, {"desc": "Child-friendly", "icon": "👶", "name": "Kids Dentistry"}, {"desc": "Wisdom teeth", "icon": "⚕️", "name": "Oral Surgery"}]}	t	2026-06-17 14:02:16.203284+05:30
ba6ca737-3e67-4575-ba4b-99c0a68671ca	e76fa229-d015-49c9-aed0-7ef75d97b290	doctor_card	4	{"bio": "Expert dental practitioner with years of experience in restorative and cosmetic dentistry.", "name": "Dr. Madhu Edward", "image": "/uploads/doctor.jpg", "credentials": "BDS"}	t	2026-06-17 14:02:16.203284+05:30
\.


--
-- Data for Name: clinic_pages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.clinic_pages (id, clinic_id, slug, title, meta_description, is_published, display_order, updated_at) FROM stdin;
63270569-0be1-4c81-90d0-4b2236e484f1	a1111111-1111-1111-1111-111111111111	home	Siya Dental Care	Modern dental care in Rourkela. Expert RCT, crowns, implants, smile design.	t	1	2026-06-17 14:02:16.203284+05:30
1c53e538-1e76-4ba0-a9d7-a908b3ca764e	a1111111-1111-1111-1111-111111111111	about	About Us	About Dr. Madhu Edward and Siya Dental Care.	t	2	2026-06-17 14:02:16.203284+05:30
b2828ecd-0c7d-407b-ac69-d0ae58b824ee	a1111111-1111-1111-1111-111111111111	services	Our Services	Comprehensive dental services from cleanings to implants.	t	3	2026-06-17 14:02:16.203284+05:30
d8bf61cb-1d29-4d42-a2db-8c9cd59ba3e8	a1111111-1111-1111-1111-111111111111	gallery	Smile Gallery	Real smile transformations from our patients.	t	4	2026-06-17 14:02:16.203284+05:30
2be96e98-9321-46f2-9f50-11d4495df0d3	a1111111-1111-1111-1111-111111111111	contact	Contact	Visit us at Rourkela. Two branches.	t	5	2026-06-17 14:02:16.203284+05:30
e76fa229-d015-49c9-aed0-7ef75d97b290	b2222222-2222-2222-2222-222222222222	home	Siya Dental Care	Modern dental care in Rourkela. Expert RCT, crowns, implants, smile design.	t	1	2026-06-17 14:02:16.203284+05:30
2bb8e96d-058d-4d75-bb1d-18d9726b4c4f	b2222222-2222-2222-2222-222222222222	about	About Us	About Dr. Madhu Edward and Siya Dental Care.	t	2	2026-06-17 14:02:16.203284+05:30
598137a2-98d1-412a-8cc9-0081fc5be8e7	b2222222-2222-2222-2222-222222222222	services	Our Services	Comprehensive dental services from cleanings to implants.	t	3	2026-06-17 14:02:16.203284+05:30
40399be2-4300-49d9-97c5-7899d77a5f3e	b2222222-2222-2222-2222-222222222222	gallery	Smile Gallery	Real smile transformations from our patients.	t	4	2026-06-17 14:02:16.203284+05:30
d722e863-36b5-4c47-959c-88da428c6aac	b2222222-2222-2222-2222-222222222222	contact	Contact	Visit us at Rourkela. Two branches.	t	5	2026-06-17 14:02:16.203284+05:30
\.


--
-- Data for Name: clinic_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.clinic_settings (clinic_id, message_transport, cloud_api_token, cloud_api_phone_id, cloud_api_waba_id, webhook_url, webhook_secret, reminder_24h_enabled, reminder_2h_enabled, reminder_30m_enabled, receipt_mode, rating_ask_enabled, rating_ask_hours, rating_retry_days, rating_discount_amount, rating_discount_mode, razorpay_key_id, razorpay_key_secret, razorpay_mode, phone_consult_enabled, phone_consult_fee, phone_consult_duration_min, extra_json, updated_at, updated_by, n8n_hosting_kind, n8n_webhook_base, n8n_dashboard_url) FROM stdin;
a1111111-1111-1111-1111-111111111111	click2chat	\N	\N	\N	\N	\N	t	t	f	manual_confirm	t	24	5	100.00	auto_apply	\N	\N	test	f	100.00	10	{}	2026-06-15 09:45:29.484512+05:30	\N	self_hosted	\N	\N
b2222222-2222-2222-2222-222222222222	click2chat	\N	\N	\N	\N	\N	t	t	f	manual_confirm	t	24	5	100.00	auto_apply	\N	\N	test	f	100.00	10	{}	2026-06-15 09:45:29.484512+05:30	\N	self_hosted	\N	\N
\.


--
-- Data for Name: clinical_link_scores; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.clinical_link_scores (id, link_type, source_key, target_key, clinic_id, score, updated_at) FROM stdin;
a584a963-bb1f-408d-a513-898a566a761d	exam_diag	Pain on palpation positive	Reversible pulpitis	\N	5	2026-06-12 18:37:21.996868+05:30
6b920e4a-b3aa-4c5a-9bcf-e71ffd451e84	exam_diag	TOP positive	Irreversible pulpitis	\N	5	2026-06-12 18:37:21.996868+05:30
fe30aa2d-d42c-46af-b1d5-f598a12fe291	exam_diag	TOP Negative	Reversible pulpitis	\N	3	2026-06-12 18:37:21.996868+05:30
8de74f9a-344a-4151-bf38-66eb87b60e7e	exam_diag	Sensitivity on airblow positive	Reversible pulpitis	\N	4	2026-06-12 18:37:21.996868+05:30
469af795-3870-499f-9553-cb76e903e70b	exam_diag	Bleeding on probing	Gingivitis	\N	6	2026-06-12 18:37:21.996868+05:30
c29135db-b7da-4ae9-abd2-53ac9689d799	diag_medicine	Reversible Pulpitis	Ibuprofen 400mg	\N	5	2026-06-12 18:37:22.063216+05:30
ef21a3fe-2aae-40ea-97c5-341fad3f0f5f	diag_medicine	Reversible Pulpitis	Paracetamol 500mg	\N	4	2026-06-12 18:37:22.063216+05:30
978edca5-7148-4f5a-9fbc-621aaec15235	diag_medicine	Irreversible Pulpitis	Amoxicillin 500mg	\N	6	2026-06-12 18:37:22.063216+05:30
55396f44-6248-482d-96f3-a8b389a9d437	diag_medicine	Irreversible Pulpitis	Ibuprofen 400mg	\N	5	2026-06-12 18:37:22.063216+05:30
3066fd1e-9ee6-4c89-b6a8-dcdd9c02130f	diag_medicine	Necrotic Pulp	Amoxicillin 500mg	\N	5	2026-06-12 18:37:22.063216+05:30
83ce578d-bb73-43cf-a498-14d036a9ab93	diag_medicine	Necrotic Pulp	Metronidazole 400mg	\N	4	2026-06-12 18:37:22.063216+05:30
82abb169-69b6-40e6-b736-2ac5a4a30299	diag_medicine	Periapical Abscess	Amoxicillin 500mg	\N	7	2026-06-12 18:37:22.063216+05:30
b35cb656-bff2-4b78-b692-e7e2a8a48f85	diag_medicine	Periapical Abscess	Metronidazole 400mg	\N	6	2026-06-12 18:37:22.063216+05:30
89a2c56e-6483-4cbd-85f7-5d2ba667fef6	diag_medicine	Periapical Abscess	Ibuprofen 400mg	\N	5	2026-06-12 18:37:22.063216+05:30
e58cfc46-479b-4378-a2eb-7fad9347f007	diag_medicine	Gingivitis	Chlorhexidine Mouthwash 0.2%	\N	6	2026-06-12 18:37:22.063216+05:30
e7c86c70-8f1a-4440-830c-e01beb329cd5	diag_medicine	Periodontitis	Amoxicillin 500mg	\N	4	2026-06-12 18:37:22.063216+05:30
3260dd18-8e6e-4ba1-abb0-b287ca6ce605	diag_medicine	Periodontitis	Metronidazole 400mg	\N	4	2026-06-12 18:37:22.063216+05:30
2307336d-3bbe-4bd7-ad1a-d23d4f018f66	diag_medicine	Periodontitis	Chlorhexidine Mouthwash 0.2%	\N	5	2026-06-12 18:37:22.063216+05:30
cfcd80cf-713e-47b9-a550-310bd36c7cbb	treat_med	Root Canal Treatment	Amoxicillin 500mg	\N	5	2026-06-12 18:37:22.063216+05:30
bec1c6b2-4646-4e0f-8211-1e000c8acd52	treat_med	Root Canal Treatment	Ibuprofen 400mg	\N	5	2026-06-12 18:37:22.063216+05:30
3b73db79-ab13-44d4-9198-81afd67e5695	treat_med	Extraction	Amoxicillin 500mg	\N	6	2026-06-12 18:37:22.063216+05:30
a04c0639-5271-49e5-9704-3a84eb188e2c	treat_med	Extraction	Ibuprofen 400mg	\N	5	2026-06-12 18:37:22.063216+05:30
109e1048-db6b-42dc-9449-0ff8d991dae9	treat_med	Extraction	Paracetamol 500mg	\N	4	2026-06-12 18:37:22.063216+05:30
c09c661f-e031-4138-9ce0-3d5f8b9bb78f	treat_med	Surgical Extraction	Amoxicillin 500mg	\N	6	2026-06-12 18:37:22.063216+05:30
78e6f426-aa0c-405c-8534-cf6a3d97703b	treat_med	Surgical Extraction	Metronidazole 400mg	\N	4	2026-06-12 18:37:22.063216+05:30
b4e040cb-688d-4a32-a724-1ca15b5a70dd	treat_med	Surgical Extraction	Ibuprofen 400mg	\N	5	2026-06-12 18:37:22.063216+05:30
530cca8d-537b-4417-899d-63676afd5f0f	treat_med	Incision and Drainage	Amoxicillin 500mg	\N	5	2026-06-12 18:37:22.063216+05:30
5d915312-7eba-45bf-94aa-2b9fe8a54f0e	treat_med	Incision and Drainage	Metronidazole 400mg	\N	5	2026-06-12 18:37:22.063216+05:30
bd52740c-db74-4d2f-bfa7-9c3161e1a011	treat_med	Scaling	Chlorhexidine Mouthwash 0.2%	\N	6	2026-06-12 18:37:22.063216+05:30
39f82114-18dd-45ec-8735-e45d103f03c4	treat_med	Crown Cementation	Ibuprofen 400mg	\N	3	2026-06-12 18:37:22.063216+05:30
abd44500-930c-4372-a77f-864ba734a05a	treat_med	Impaction Surgery	Amoxicillin 500mg	\N	6	2026-06-12 18:37:22.063216+05:30
a7ac9467-0414-4703-a3b4-be403365a8e4	treat_med	Impaction Surgery	Metronidazole 400mg	\N	5	2026-06-12 18:37:22.063216+05:30
f5d27e7b-5a6d-43e4-a87f-47f743523f57	treat_med	Impaction Surgery	Ibuprofen 400mg	\N	5	2026-06-12 18:37:22.063216+05:30
d5927a61-cb5d-4003-b99c-ed2f6b43ec10	treat_med	Impaction Surgery	Chlorhexidine Mouthwash 0.2%	\N	4	2026-06-12 18:37:22.063216+05:30
61cda0e8-1fee-4447-88e8-f7c79c00b781	exam_diag	Secondary Caries	Gingivitis	a1111111-1111-1111-1111-111111111111	4	2026-06-18 16:43:26.11202+05:30
579a17d3-50cb-43e0-9876-7c6a3d8cbe36	diag_treatment	Gingivitis	Scaling	a1111111-1111-1111-1111-111111111111	2	2026-06-18 16:43:54.303791+05:30
a6a52522-2bdf-4ded-ad26-b7b75c1e69f1	diag_treatment	Calculus, Calculus	Root Canal (RCT)	a1111111-1111-1111-1111-111111111111	1	2026-06-13 15:04:44.001728+05:30
54c9cf79-455c-42cd-98a4-778b0c9f1ae6	diag_treatment	Gingivitis	Filling - Composite	a1111111-1111-1111-1111-111111111111	4	2026-06-18 16:43:57.766198+05:30
2ec71377-14e2-4619-8f6b-8773dbc81e9d	exam_diag	Deep Caries	Deep Caries	a1111111-1111-1111-1111-111111111111	8	2026-06-18 16:44:13.26254+05:30
3227c415-2b55-43d9-9a14-59e960addfeb	diag_medicine	Deep Caries	Chlorhexidine Mouthwash 0.2%	a1111111-1111-1111-1111-111111111111	1	2026-06-18 14:01:38.119998+05:30
a27a888a-479a-4817-877e-592b29e0c187	diag_treatment	Deep Caries	Complete Denture	a1111111-1111-1111-1111-111111111111	4	2026-06-18 16:44:16.042711+05:30
9a5be22b-5ba0-47b1-a647-4afcafac5d03	treat_med	Bridge (per unit)	Chlorhexidine Mouthwash 0.2%	a1111111-1111-1111-1111-111111111111	1	2026-06-18 14:01:38.119998+05:30
12acdc2f-e9d4-4c79-817e-fb51f4dcf91e	diag_treatment	Impacted Tooth	Filling - Composite	a1111111-1111-1111-1111-111111111111	2	2026-06-18 16:43:13.532135+05:30
27679fba-6bf6-445d-80e9-7d1dafb7f6c9	exam_diag	Deep Caries	Gingivitis	a1111111-1111-1111-1111-111111111111	2	2026-06-18 16:47:41.830032+05:30
90e79896-d68d-4e48-9e99-2affc08deada	exam_diag	Deep Caries	Impacted Tooth	a1111111-1111-1111-1111-111111111111	6	2026-06-20 13:18:59.503391+05:30
507fbc28-1963-4953-bf63-3b4d4b3f4baf	diag_treatment	Deep Caries	Flap Surgery	a1111111-1111-1111-1111-111111111111	2	2026-06-20 14:01:49.732046+05:30
0a665e8d-51d2-4981-908c-521870524a1f	diag_treatment	Specialist workflow verification	Specialist flow verification	a1111111-1111-1111-1111-111111111111	1	2026-06-20 17:59:55.269947+05:30
b8e77ff0-0072-457a-985e-ef8201b84b6b	treat_med	Flap Surgery	Aceclofenac+Paracetamol	a1111111-1111-1111-1111-111111111111	1	2026-06-22 23:36:04.720318+05:30
cc173d59-853c-4a7e-9476-cfdd910dc9d4	exam_diag	Deep Caries	Calculus	a1111111-1111-1111-1111-111111111111	4	2026-06-20 23:38:26.013514+05:30
71b9e560-1f65-46f6-a003-9c744bb0bc65	exam_diag	Caries	Deep Caries	a1111111-1111-1111-1111-111111111111	8	2026-06-21 00:43:16.872171+05:30
e8798195-f0f6-48ad-9534-0da781167b8a	exam_diag	Erosion	Deep Caries	a1111111-1111-1111-1111-111111111111	2	2026-06-21 00:43:16.876024+05:30
bac007f9-59bf-4baa-a260-a26defbe0f13	exam_diag	Caries	Calculus	a1111111-1111-1111-1111-111111111111	24	2026-06-22 22:40:45.964091+05:30
2cc044d3-68f6-4a94-9cb4-714f8d5c8604	diag_treatment	Deep Caries	RCT	a1111111-1111-1111-1111-111111111111	6	2026-06-21 00:43:21.705542+05:30
f9be6e77-69c9-4a98-8e5d-eeeca7000ac2	diag_treatment	Calculus	Scaling	a1111111-1111-1111-1111-111111111111	6	2026-06-20 23:39:07.543028+05:30
0775f81f-f4f0-4e5c-97c3-8024d2a11a78	diag_treatment	Calculus, Deep Caries	Filling	a1111111-1111-1111-1111-111111111111	1	2026-06-21 00:43:29.956431+05:30
097f46e5-035f-44d9-a931-6961b2082ba9	treat_med	Root Canal (RCT)	Aceclofenac+Paracetamol	a1111111-1111-1111-1111-111111111111	1	2026-06-22 23:36:04.720715+05:30
9e26c0f1-401e-4634-bc95-96e0ce7f992a	diag_treatment	Deep Caries	Filling	a1111111-1111-1111-1111-111111111111	3	2026-06-21 00:43:30.025161+05:30
f557578e-67eb-4f18-8d2e-af5cf2537067	treat_med	Filling	Aceclofenac+Paracetamol	a1111111-1111-1111-1111-111111111111	2	2026-06-22 23:36:04.719935+05:30
86c767bb-c9e7-4cba-bf6c-67eeb99ac860	diag_treatment	Calculus	Filling	a1111111-1111-1111-1111-111111111111	1	2026-06-21 00:43:30.024515+05:30
12aba74c-e258-4aa9-b82a-d363d8e43295	diag_treatment	Calculus	Flap Surgery	a1111111-1111-1111-1111-111111111111	18	2026-06-22 22:40:48.464584+05:30
e523a0b1-ea92-454a-8007-97ecb80848b5	treat_med	RCT	Aceclofenac+Paracetamol	a1111111-1111-1111-1111-111111111111	2	2026-06-22 23:36:04.715617+05:30
b599d040-2604-4e93-b407-aeb4f3947535	diag_treatment	Calculus	Root Canal (RCT)	a1111111-1111-1111-1111-111111111111	8	2026-06-22 22:40:52.228323+05:30
\.


--
-- Data for Name: clinics; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.clinics (id, name, short_name, address, google_maps_link, phone, whatsapp_number, timings, logo_url, doctor_name, doctor_degree, doctor_reg_no, signature_url, is_active, created_at, updated_at, tagline, google_maps_embed_url, street_view_embed_url, directions_url, latitude, longitude, hero_image_url, theme_color, public_phone, whatsapp_link, show_on_public_site, display_order, google_place_id) FROM stdin;
a1111111-1111-1111-1111-111111111111	Siya Dental Care - Daily Market	Daily Market	PETROL PUMP, MADU MAHARAJ GALI, near DAILY MARKET, DAILY MARKET, Udit Nagar, Rourkela, Odisha 769001	https://www.google.com/maps/dir//Siya+Dental+Care+-+Best+Dental+Clinic+in+Rourkela%2F+Best+Dentist+in+Rourkela%2F+Implantologist+in+Rourkela,+PETROL+PUMP,+MADU+MAHARAJ+GALI,+near+DAILY+MARKET,+DAILY+MARKET,+Udit+Nagar,+Rourkela,+Odisha+769001/@22.2481109,84.8666382,13z/data=!4m9!4m8!1m0!1m5!1m1!1s0x3a20195931c64cc7:0x72ee0662016319b9!2m2!1d84.8546404!2d22.2265668!3e0?entry=ttu	+919876500001	+919876500001	{"sun": "Closed", "mon_sat": "09:00 AM - 1:00 PM, 5:00 PM - 8:00 PM"}	\N	Dr. Madhu Edward	BDS	OD-28456	\N	t	2026-06-08 15:50:32.978312+05:30	2026-06-08 15:50:32.978312+05:30	\N	https://www.google.com/maps?q=Siya%20Dental%20Care%20Daily%20Market%20Rourkela&ftid=0x3a20195931c64cc7:0x72ee0662016319b9&z=17&output=embed	\N	https://www.google.com/maps/dir//Siya+Dental+Care+-+Best+Dental+Clinic+in+Rourkela%2F+Best+Dentist+in+Rourkela%2F+Implantologist+in+Rourkela,+PETROL+PUMP,+MADU+MAHARAJ+GALI,+near+DAILY+MARKET,+DAILY+MARKET,+Udit+Nagar,+Rourkela,+Odisha+769001/@22.2481109,84.8666382,13z/data=!4m9!4m8!1m0!1m5!1m1!1s0x3a20195931c64cc7:0x72ee0662016319b9!2m2!1d84.8546404!2d22.2265668!3e0?entry=ttu	22.2265668	84.8546404	\N	\N	\N	\N	t	0	ChIJx0zGMVkZIDoRuRljAWIG7nI
b2222222-2222-2222-2222-222222222222	Siya Dental Care - Jhirpani	Jhirpani	1st floor, wonder medicine complex, near RC Church, Jhirpani, Rourkela, Odisha 769042	https://www.google.com/maps/dir//1st+floor,+Siya+Dental+Care+-+Best+Dental+Clinic+in+Rourkela%2F+Best+Dentist+in+Rourkela%2F+Implantologist+in+Rourkela,+wonder+medicine+complex,+near+RC+Church,+Jhirpani,+Rourkela,+Odisha+769042/@22.2481109,84.8666382,13z/data=!4m9!4m8!1m0!1m5!1m1!1s0x3a201dbd81c1e77b:0xde8ef5b33a9e451b!2m2!1d84.900952!2d22.2652459!3e0?entry=ttu	+919876500002	+919876500001	{"sun": "Closed", "mon_sat": "09:00 AM - 1:00 PM, 5:00 PM - 8:00 PM"}	\N	Dr. Madhu Edward	BDS	OD-28456	\N	t	2026-06-08 15:50:32.978312+05:30	2026-06-08 15:50:32.978312+05:30	\N	https://www.google.com/maps?q=Siya%20Dental%20Care%20Jhirpani%20Rourkela&ftid=0x3a201dbd81c1e77b:0xde8ef5b33a9e451b&z=17&output=embed	\N	https://www.google.com/maps/dir//1st+floor,+Siya+Dental+Care+-+Best+Dental+Clinic+in+Rourkela%2F+Best+Dentist+in+Rourkela%2F+Implantologist+in+Rourkela,+wonder+medicine+complex,+near+RC+Church,+Jhirpani,+Rourkela,+Odisha+769042/@22.2481109,84.8666382,13z/data=!4m9!4m8!1m0!1m5!1m1!1s0x3a201dbd81c1e77b:0xde8ef5b33a9e451b!2m2!1d84.900952!2d22.2652459!3e0?entry=ttu	22.2652459	84.900952	\N	\N	\N	\N	t	0	ChIJe-cBgb0dIDoRG0WeOrP1jt4
\.


--
-- Data for Name: common_complaints; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.common_complaints (id, complaint_name, category, created_at) FROM stdin;
248c56f7-c785-493c-b763-87890c50c669	Toothache	general	2026-06-10 19:08:58.159837
67fd07a2-63ca-4544-8e2e-944e1f652177	Sensitivity to hot/cold	general	2026-06-10 19:08:58.169249
a641ba9b-e16d-43f4-bbcd-054cc3773c9e	Bleeding gums	general	2026-06-10 19:08:58.169686
a86e29be-8d53-40ad-b757-8fc8351cbb05	Swelling	general	2026-06-10 19:08:58.169983
4b753778-1fad-4b22-ae67-4e2242981b2c	Bad breath	general	2026-06-10 19:08:58.170281
64f3cc37-1997-49f1-a5bf-e9856d8ecd3e	Broken tooth	general	2026-06-10 19:08:58.170586
151aaed5-ec97-4c9d-be87-54e1ff47178e	Loose tooth	general	2026-06-10 19:08:58.170862
db4c8137-5777-4547-989e-284643c1eb52	Pain while chewing	general	2026-06-10 19:08:58.171133
03ea9e34-d50e-429c-8073-67b2cc08bbbd	Food lodgement	general	2026-06-10 19:08:58.171379
fac550e6-e123-491b-8ca5-41be317083a7	Cavity	general	2026-06-10 19:08:58.171619
33f1be31-9101-4900-ae21-3e0552e1093b	Discoloured tooth	general	2026-06-10 19:08:58.17188
1b912959-fd47-4e01-a328-ca7b899f7d62	Wisdom tooth pain	general	2026-06-10 19:08:58.172117
7891f128-3dc9-4f19-ba2d-75ee9447c2cb	Clicking jaw	general	2026-06-10 19:08:58.17235
e4941b27-a861-42b6-ab6b-357df0ca31fd	Dry socket	general	2026-06-10 19:08:58.172601
bb2112ea-ec10-4158-ac0f-50693463d7e0	Mouth ulcer	general	2026-06-10 19:08:58.172854
\.


--
-- Data for Name: common_conditions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.common_conditions (id, condition_name, category, is_default, created_at) FROM stdin;
f782b65c-f01a-4a80-bc92-43b7d6f84196	Diabetes	systemic	t	2026-06-10 09:26:28.332029
8bd633c6-69e1-425c-ab4b-762ef35c040a	Hypertension	systemic	t	2026-06-10 09:26:28.332029
36bf5e88-5193-430f-b80e-2a88aefdb495	Thyroid Disorder	systemic	t	2026-06-10 09:26:28.332029
3ff4368f-1d8e-4e04-ae91-7a13c580cb43	Asthma	systemic	t	2026-06-10 09:26:28.332029
0c7c298e-cf4e-474a-a4d1-9c495cfd6f68	Heart Disease	systemic	t	2026-06-10 09:26:28.332029
6d491ff7-c6ce-4271-b46e-14595beac2d4	Pregnancy	systemic	t	2026-06-10 09:26:28.332029
99c910ce-2d72-41cf-8c5b-49680b0e5b91	Epilepsy	systemic	t	2026-06-10 09:26:28.332029
1f7708f6-5d8d-4c60-b346-3552b491481a	Hepatitis B	systemic	t	2026-06-10 09:26:28.332029
a2878827-8b96-43de-8415-4824316825b4	HIV	systemic	t	2026-06-10 09:26:28.332029
a2bc08c5-21fc-4725-9ac3-1e79d7b08df8	Bleeding Disorder	systemic	t	2026-06-10 09:26:28.332029
56759afc-853b-4ebb-b62f-7ea8c422130c	Drug Allergy	allergy	t	2026-06-10 09:26:28.332029
16bb41fa-f398-4a04-a164-c342a0aa046d	Latex Allergy	allergy	t	2026-06-10 09:26:28.332029
f05b632d-59be-4c4d-8481-a78072454f35	Penicillin Allergy	allergy	t	2026-06-10 09:26:28.332029
de647957-5edb-47ea-a9d3-7576cb7a0b2e	Anesthesia Allergy	allergy	t	2026-06-10 09:26:28.332029
7481f908-1a37-4944-9d09-ceed1e7d8945	Bruxism	dental	t	2026-06-10 09:26:28.332029
a7aeb3f4-8018-47f5-95e5-a009b572fda8	TMJ Disorder	dental	t	2026-06-10 09:26:28.332029
d255958d-0924-49d9-8c06-b799030afd1e	Dry Mouth	dental	t	2026-06-10 09:26:28.332029
1923712a-f12f-43ff-9fee-a6748f01cc2e	Periodontal Disease	dental	t	2026-06-10 09:26:28.332029
\.


--
-- Data for Name: communication_log; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.communication_log (id, patient_id, direction, channel, content, status, created_at) FROM stdin;
\.


--
-- Data for Name: dashboard_widget_prefs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.dashboard_widget_prefs (id, clinic_id, staff_id, widget_key, is_visible, display_order, config, updated_at) FROM stdin;
f69ba04e-0251-456f-9251-c4a1ffac0298	a1111111-1111-1111-1111-111111111111	\N	today_summary	t	1	{}	2026-06-18 09:45:22.255809+05:30
2ec23855-c613-457d-865d-3f5f5a574d59	a1111111-1111-1111-1111-111111111111	\N	revenue_pulse	t	2	{}	2026-06-18 09:45:22.255809+05:30
e91a7723-6d02-4225-89f1-3e2138bbed04	a1111111-1111-1111-1111-111111111111	\N	appt_funnel	t	3	{}	2026-06-18 09:45:22.255809+05:30
5630e9da-6cbf-4b0b-abab-925761436119	a1111111-1111-1111-1111-111111111111	\N	lab_pipeline	t	4	{}	2026-06-18 09:45:22.255809+05:30
21a2f9c5-fc24-4ad8-b851-c47c4869a90b	a1111111-1111-1111-1111-111111111111	\N	outstanding_aging	t	5	{}	2026-06-18 09:45:22.255809+05:30
fbcc68fe-aff8-4d87-8ad2-5731c8bda5f1	a1111111-1111-1111-1111-111111111111	\N	followup_alerts	t	6	{}	2026-06-18 09:45:22.255809+05:30
c040cfe2-c024-42da-ae49-d4cce178c28c	a1111111-1111-1111-1111-111111111111	\N	no_show_30d	t	7	{}	2026-06-18 09:45:22.255809+05:30
1d417da6-4452-4159-b4bd-b255805ef8d7	a1111111-1111-1111-1111-111111111111	\N	top_procedures	t	8	{}	2026-06-18 09:45:22.255809+05:30
d23d5201-ea16-4e7a-9dde-6cb38fe06e03	a1111111-1111-1111-1111-111111111111	\N	reschedule_queue	t	9	{}	2026-06-18 09:45:22.255809+05:30
8efe8274-1747-4270-9059-48e135c1a8f5	a1111111-1111-1111-1111-111111111111	\N	bot_pulse	t	10	{}	2026-06-18 09:45:22.255809+05:30
969e1f7c-1b3c-46b1-95df-0ab1e67c3ea6	a1111111-1111-1111-1111-111111111111	\N	reminders_health	t	11	{}	2026-06-18 09:45:22.255809+05:30
e69d524c-cee9-40fe-a75a-76453403de93	b2222222-2222-2222-2222-222222222222	\N	today_summary	t	1	{}	2026-06-18 09:45:22.255809+05:30
3836759b-9ae3-4f0a-a47e-045264586a63	b2222222-2222-2222-2222-222222222222	\N	revenue_pulse	t	2	{}	2026-06-18 09:45:22.255809+05:30
d6ff01f0-ad55-4eec-b9d5-8047889ac939	b2222222-2222-2222-2222-222222222222	\N	appt_funnel	t	3	{}	2026-06-18 09:45:22.255809+05:30
d17b2b22-7e0f-4843-abad-7bae0a486a96	b2222222-2222-2222-2222-222222222222	\N	lab_pipeline	t	4	{}	2026-06-18 09:45:22.255809+05:30
a17309bf-558c-44cd-8c3d-b17ae92a02b5	b2222222-2222-2222-2222-222222222222	\N	outstanding_aging	t	5	{}	2026-06-18 09:45:22.255809+05:30
ac181c79-069d-4fe0-9626-58e722e41903	b2222222-2222-2222-2222-222222222222	\N	followup_alerts	t	6	{}	2026-06-18 09:45:22.255809+05:30
d090e32e-f921-47d4-b7d1-0dd692aab61f	b2222222-2222-2222-2222-222222222222	\N	no_show_30d	t	7	{}	2026-06-18 09:45:22.255809+05:30
f4b3ea8b-b20f-450f-9269-dab168439d96	b2222222-2222-2222-2222-222222222222	\N	top_procedures	t	8	{}	2026-06-18 09:45:22.255809+05:30
c87b7279-a4c3-4768-89fd-820f92dde9e7	b2222222-2222-2222-2222-222222222222	\N	reschedule_queue	t	9	{}	2026-06-18 09:45:22.255809+05:30
f554ced4-4935-47d9-8716-61bdce84c0c4	b2222222-2222-2222-2222-222222222222	\N	bot_pulse	t	10	{}	2026-06-18 09:45:22.255809+05:30
33526b17-1fb5-4b0d-926f-043c0d5d6ff7	b2222222-2222-2222-2222-222222222222	\N	reminders_health	t	11	{}	2026-06-18 09:45:22.255809+05:30
\.


--
-- Data for Name: diagnosis_catalog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.diagnosis_catalog (id, diagnosis_name, suggested_treatments, is_default, usage_count, created_at, name, is_active) FROM stdin;
3b07e313-714e-48f3-83ba-87c2dd0d78da	Gingivitis	["Scaling", "Oral Hygiene Review"]	t	0	2026-06-12 09:20:23.240728	Gingivitis	t
95f65197-bf9e-43d4-a9ec-0304b9a8dbae	Periodontitis	["Scaling", "Root Planing", "Periodontal Review"]	t	0	2026-06-12 09:20:23.240728	Periodontitis	t
ddedd968-d836-471b-b762-dd2d2125a025	Reversible Pulpitis	["Filling", "Observation"]	t	0	2026-06-12 09:20:23.240728	Reversible Pulpitis	t
c8386faf-d59a-4b38-8a36-3c0c559d1e44	Irreversible Pulpitis	["RCT", "Extraction"]	t	0	2026-06-12 09:20:23.240728	Irreversible Pulpitis	t
a17ad577-e2d0-4b1e-b60b-db6a5a3385cd	Necrotic Pulp	["RCT", "Extraction"]	t	0	2026-06-12 09:20:23.240728	Necrotic Pulp	t
93d8ef49-092b-46fc-9a63-6221ea02f805	Periapical Abscess	["RCT", "Extraction", "Drainage"]	t	0	2026-06-12 09:20:23.240728	Periapical Abscess	t
df2e1017-a381-4d84-963d-9b7c5e65544b	Deep Caries	["Filling", "RCT"]	t	0	2026-06-12 09:20:23.240728	Deep Caries	t
a9715557-8576-4bac-a080-d04c47f15e63	Impacted Tooth	["Extraction"]	t	0	2026-06-12 09:20:23.240728	Impacted Tooth	t
11b45626-9a50-4351-b888-da81fd90da8c	Missing Tooth	["Implant", "Bridge", "Denture"]	t	0	2026-06-12 09:20:23.240728	Missing Tooth	t
97a23cd6-9380-413d-8f64-4095d75d7112	Calculus	["Scaling"]	t	0	2026-06-12 09:20:23.240728	Calculus	t
\.


--
-- Data for Name: examination_catalog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.examination_catalog (id, name, category, is_active, created_at) FROM stdin;
ec428e87-58b9-430f-9b4f-eeace110786b	TOP Positive	vitality	t	2026-06-12 09:20:23.414149
6260a552-29f2-48d6-ac1a-e523a552fe80	TOP Negative	vitality	t	2026-06-12 09:20:23.414149
9283f328-afd9-429f-a08e-55ca4c7e61ed	Air Blow Sensitive	vitality	t	2026-06-12 09:20:23.414149
f72560d6-04b1-4067-8722-14db96da5f07	Cold Test Positive	vitality	t	2026-06-12 09:20:23.414149
5bd9b83f-a84f-4da4-b33c-37d0375191d2	Cold Test Negative	vitality	t	2026-06-12 09:20:23.414149
b516e776-e610-4070-8f47-ef345eb970cf	Heat Test Positive	vitality	t	2026-06-12 09:20:23.414149
b4d07a5d-a614-45cf-9356-d2e1c7e78a58	Heat Test Negative	vitality	t	2026-06-12 09:20:23.414149
24e2d307-c028-4ef8-9907-95a64efc313b	Electric Pulp Test Positive	vitality	t	2026-06-12 09:20:23.414149
d67e2692-58d3-4d72-b18f-d2c3ef6d605d	Electric Pulp Test Negative	vitality	t	2026-06-12 09:20:23.414149
03f7b9de-4570-4586-99f4-c1c3ce484986	Tenderness Present	periapical	t	2026-06-12 09:20:23.414149
e55e05fc-cc91-4317-9d98-824b7b4c7a8a	Tenderness Absent	periapical	t	2026-06-12 09:20:23.414149
1b58ff35-a11b-4846-a046-720a1c0ad037	Swelling Present	periapical	t	2026-06-12 09:20:23.414149
8c0f936b-2f1d-41d6-9df0-25b8ffdaf85f	Sinus Tract Present	periapical	t	2026-06-12 09:20:23.414149
477002bc-8fcb-4f39-a245-8ea139101fb5	Mobility Grade 1	mobility	t	2026-06-12 09:20:23.414149
9ce1f486-f313-4d52-8306-91add7d9e72e	Mobility Grade 2	mobility	t	2026-06-12 09:20:23.414149
2d097d3d-723e-4d63-b6c7-f913dc947c5d	Mobility Grade 3	mobility	t	2026-06-12 09:20:23.414149
a8f7a24e-9dcc-4af9-a123-51ec6fa5cc74	Caries	caries	t	2026-06-12 09:20:23.414149
e745cde0-1bca-42ab-a9bb-c981cc7425a7	Deep Caries	caries	t	2026-06-12 09:20:23.414149
04d5760d-0a40-41e5-a1ee-252467269832	Secondary Caries	caries	t	2026-06-12 09:20:23.414149
1040e83c-67b4-4cdd-ba84-5aff4074baf5	Fracture	trauma	t	2026-06-12 09:20:23.414149
a7895cca-497a-4f3d-ac17-8d7a33a7e5c8	Crack Line	trauma	t	2026-06-12 09:20:23.414149
29a83f2f-524b-4ab4-b3e6-c189e7054ec1	Chipped	trauma	t	2026-06-12 09:20:23.414149
93c7e079-972a-4916-9ae9-bb9ec439b10c	Missing Tooth	other	t	2026-06-12 09:20:23.414149
965dc8a5-92de-48eb-8687-71d415339266	Impacted	other	t	2026-06-12 09:20:23.414149
19a7a3a2-9a21-4397-9966-12afce999d02	Partially Erupted	other	t	2026-06-12 09:20:23.414149
b2014671-53b7-4f97-a2d7-76478ed7380a	Attrition	other	t	2026-06-12 09:20:23.414149
1242b144-88b5-420e-ab4c-82b331a27b6c	Abrasion	other	t	2026-06-12 09:20:23.414149
52d0b5ad-b927-4d38-985c-971fe46ba0f0	Erosion	other	t	2026-06-12 09:20:23.414149
6087b5e9-8078-4595-94e6-3634aa072d1e	Discoloration	other	t	2026-06-12 09:20:23.414149
51459f0a-a643-4581-92a6-7a0f1c1df41c	Calculus	periodontal	t	2026-06-12 09:20:23.414149
62a84caf-b50f-4517-902d-375a50499660	Gingival Recession	periodontal	t	2026-06-12 09:20:23.414149
091aeac8-7f72-487e-b25a-24428aabd7d9	Pocket > 4mm	periodontal	t	2026-06-12 09:20:23.414149
a575e93b-982b-4d32-ad89-69c45cd483a0	Bleeding on Probing	periodontal	t	2026-06-12 09:20:23.414149
768f6159-ba11-4026-bfb7-e358fd1a2410	Food Impaction	other	t	2026-06-12 09:20:23.414149
\.


--
-- Data for Name: examination_finding_catalog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.examination_finding_catalog (id, finding_name, category, is_default, usage_count, created_at) FROM stdin;
7c9e41fc-88da-4942-a6c1-8d15172907ca	TOP Positive	percussion	t	0	2026-06-12 09:20:23.240728
3b6b9850-cead-4299-81bc-784b463a3ada	TOP Negative	percussion	t	0	2026-06-12 09:20:23.240728
f0ce0cdb-93b1-4cf8-987b-7c339712eaec	Air Blow Sensitive	sensitivity	t	0	2026-06-12 09:20:23.240728
3c94a32b-79ff-45db-bfdd-5eab4c96497f	Air Blow Negative	sensitivity	t	0	2026-06-12 09:20:23.240728
07f893a0-0b5d-4455-a196-1d4a2155037c	Cold Test Positive	pulp_test	t	0	2026-06-12 09:20:23.240728
2306df63-069c-41f7-97c0-ec176cfa5481	Cold Test Negative	pulp_test	t	0	2026-06-12 09:20:23.240728
d1bf07b2-bfcb-4b51-bd41-bb1c7a56b9b6	Heat Test Positive	pulp_test	t	0	2026-06-12 09:20:23.240728
af260368-2033-401a-a49f-690427445ee0	Heat Test Negative	pulp_test	t	0	2026-06-12 09:20:23.240728
ccc8b013-ffeb-4aa2-a06b-e1d21f1a6b41	Tenderness Present	clinical	t	0	2026-06-12 09:20:23.240728
dcdb932c-ac65-4a6e-ad1b-057cfe647755	Swelling Present	clinical	t	0	2026-06-12 09:20:23.240728
969594a7-b152-4390-b2a0-af3614675440	Mobility Grade 1	periodontal	t	0	2026-06-12 09:20:23.240728
c2b05adc-02f8-41cf-ba67-25897fc345b6	Mobility Grade 2	periodontal	t	0	2026-06-12 09:20:23.240728
67f4638d-45a3-44e7-bd17-f17918f31ab6	Mobility Grade 3	periodontal	t	0	2026-06-12 09:20:23.240728
4ff5386f-c3aa-4840-8167-141d934a51c2	Caries	clinical	t	0	2026-06-12 09:20:23.240728
9c277019-c009-47f2-986e-eb968418fbc7	Deep Caries	clinical	t	0	2026-06-12 09:20:23.240728
238ddd13-dfac-4adf-bd50-538c2da97616	Fracture	clinical	t	0	2026-06-12 09:20:23.240728
0ee814b3-f756-40c2-815b-b411b7d57f9c	Missing Tooth	clinical	t	0	2026-06-12 09:20:23.240728
\.


--
-- Data for Name: fee_schedule_overrides; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.fee_schedule_overrides (id, clinic_id, service_id, category, label, override_price, discount_percent, valid_from, valid_until, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: follow_ups; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.follow_ups (id, patient_id, clinic_id, related_visit_id, related_appointment_id, follow_up_date, purpose, status, created_by, created_at, completed_at, notes) FROM stdin;
\.


--
-- Data for Name: gallery_images; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.gallery_images (id, clinic_id, category, title, caption, image_url, order_idx, is_active, uploaded_by, uploaded_at) FROM stdin;
\.


--
-- Data for Name: illness_library; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.illness_library (id, clinic_id, name, icd_code, category, severity_default, suggested_treatment_default, is_active) FROM stdin;
ad3b2a54-d82e-425d-88de-c95175fef8f6	\N	Dental caries (Class I)	\N	caries	mild	Composite filling	t
9935d249-10cb-4392-a887-66760356e8ef	\N	Dental caries (Class II)	\N	caries	moderate	Composite filling	t
8968f4d1-eda5-46be-80f7-0f0ce0303da0	\N	Dental caries (Class III/IV)	\N	caries	moderate	Aesthetic composite	t
e1dfb223-bba8-4ffb-b23b-0ce44f07c4a8	\N	Dental caries (Class V)	\N	caries	mild	GIC filling	t
5fdbe11b-2f79-458b-9220-1c6e481ddcd1	\N	Pulpitis — reversible	\N	pulpal	moderate	Sedative dressing	t
8e45cdb4-4481-47bb-8985-dd408b653d63	\N	Pulpitis — irreversible	\N	pulpal	severe	RCT	t
c5d65a73-4464-4325-9843-b1c32d6a96ae	\N	Periapical abscess	\N	pulpal	urgent	RCT + drainage	t
6e92c23e-7222-46a3-9732-707bc1b53e80	\N	Chronic apical periodontitis	\N	pulpal	severe	RCT	t
c7f22584-cafe-452e-8c15-c0d37539e083	\N	Gingivitis	\N	gingival	mild	Scaling + OHI	t
5807aac3-3b59-49fa-afd8-e57c208aacf5	\N	Chronic periodontitis	\N	periodontal	moderate	Scaling + root planing	t
191ad8b7-e540-4fd9-86b4-4de09ba5e6e5	\N	Aggressive periodontitis	\N	periodontal	severe	Flap surgery	t
99eed1bf-7233-4d03-b85d-1234153a4652	\N	Bruxism	\N	occlusal	watch	Night guard	t
d8d18b03-860e-4165-abe0-7ee3add8a607	\N	Attrition	\N	occlusal	watch	Occlusal adjustment	t
7d3223b7-cc39-42d2-9b3a-e4f70104a426	\N	Abrasion	\N	occlusal	mild	Restoration	t
d71ab329-01cb-4924-a885-2e30f8841e34	\N	Tooth fracture — enamel	\N	trauma	mild	Composite repair	t
fd95b89c-602e-427d-951f-1b56f8056b5b	\N	Tooth fracture — dentin	\N	trauma	moderate	Composite + monitoring	t
6dff6e8d-7ace-46a0-8e13-d7307a418a3a	\N	Tooth fracture — pulpal	\N	trauma	urgent	RCT or extraction	t
c95393d5-c17b-4e98-93db-b6076d270c96	\N	Impacted wisdom tooth	\N	developmental	watch	Surgical extraction	t
ed550f60-821c-4309-911a-6227df2585d6	\N	Hypoplasia	\N	developmental	info	Aesthetic restoration	t
648f7b42-7278-4f02-8697-793a087cef16	\N	Aphthous ulcer	\N	oral_lesion	mild	Topical anaesthetic + reassurance	t
22d94989-b89f-435c-9221-b6e1af81fa39	\N	Oral candidiasis	\N	oral_lesion	moderate	Antifungal	t
1bef8d05-a782-49be-9cab-83bd2a44931a	\N	Leukoplakia	\N	oral_lesion	severe	Biopsy required	t
\.


--
-- Data for Name: image_annotations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.image_annotations (id, image_id, annotation_type, annotation_data, added_by, added_at) FROM stdin;
\.


--
-- Data for Name: kanban_columns; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.kanban_columns (id, clinic_id, label, plan_status, column_order, color, is_active) FROM stdin;
477ffa6f-0fef-494d-b252-7a26df569b42	a1111111-1111-1111-1111-111111111111	💡 Proposed	proposed	1	#94A3B8	t
7d52c860-598a-49ac-ad3f-8d121ac894a3	a1111111-1111-1111-1111-111111111111	📋 Planned	planned	2	#3B82F6	t
c91b66ce-923c-40ee-88d6-39d7d6dbf6cc	a1111111-1111-1111-1111-111111111111	🦷 In Progress	in_progress	3	#F59E0B	t
71a603a5-e00d-4acc-b0d2-69ffb978641f	a1111111-1111-1111-1111-111111111111	✓ Completed	completed	4	#10B981	t
6a4b9595-3e32-42c5-9ee8-21b813a43241	b2222222-2222-2222-2222-222222222222	💡 Proposed	proposed	1	#94A3B8	t
5a53a21f-58b7-47d7-a46b-8d5a8eb00387	b2222222-2222-2222-2222-222222222222	📋 Planned	planned	2	#3B82F6	t
2b32bdd8-7367-46bd-9549-e3abd2681d13	b2222222-2222-2222-2222-222222222222	🦷 In Progress	in_progress	3	#F59E0B	t
745ee837-f025-49b5-99a7-0d3ebf92c59f	b2222222-2222-2222-2222-222222222222	✓ Completed	completed	4	#10B981	t
\.


--
-- Data for Name: lab_order_payments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lab_order_payments (id, lab_order_id, amount, paid_date, payment_mode, reference, notes, recorded_by, created_at) FROM stdin;
96008fbd-679c-4901-9e80-42c3fcfb30c5	d67f2a0d-f2ae-4874-8ed3-47fcf10174ec	500.00	2026-06-20	upi	\N	Paid on lab receipt	d1111111-1111-1111-1111-111111111111	2026-06-20 22:53:59.033826+05:30
\.


--
-- Data for Name: lab_orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lab_orders (id, serial_no, clinic_id, patient_id, appointment_id, treatment_plan_item_id, vendor_id, work_type, teeth, shade, sent_date, expected_date, received_date, status, cost, invoice_no, details, notes, vendor_notes, created_by, received_by, created_at, updated_at, before_image_url, after_image_url, closure_notes, closed_by, closed_at, qr_code_id) FROM stdin;
e4017d2e-2cf4-4301-aa99-7b5c9f57e3fb	5	a1111111-1111-1111-1111-111111111111	10000000-0000-4000-8000-000000000103	30000000-0000-4000-8000-000000000103	\N	3648bf13-6c1f-483b-b05c-ff993691c474	Lab Work	[]	\N	2026-06-20	2026-06-27	2026-06-20	received	0.00	\N	\N	\N	\N	d1111111-1111-1111-1111-111111111111	d1111111-1111-1111-1111-111111111111	2026-06-20 23:45:07.65214+05:30	2026-06-20 23:48:27.033983+05:30	\N	\N	\N	\N	\N	\N
6b0acee0-39ef-4454-b479-be18f6d56efd	4	a1111111-1111-1111-1111-111111111111	10000000-0000-4000-8000-000000000101	\N	7b8627a9-1738-4de2-8efa-f235afa5bb86	e53cff14-95a4-4f53-a1a0-1ad822f5aab1	Zirconia Crown	[42]	\N	\N	2026-06-28	2026-06-20	fitted	1800.00	\N	\N	nurse confirmed order	\N	d1111111-1111-1111-1111-111111111111	d1111111-1111-1111-1111-111111111111	2026-06-20 23:19:01.827672+05:30	2026-06-21 00:33:30.981908+05:30	\N	\N	\N	\N	\N	\N
d67f2a0d-f2ae-4874-8ed3-47fcf10174ec	3	a1111111-1111-1111-1111-111111111111	10000000-0000-4000-8000-000000000101	5607d539-d841-4ff4-88d7-10ea8b601215	\N	e53cff14-95a4-4f53-a1a0-1ad822f5aab1	Crown (PFM)	[14]	\N	2026-06-20	2026-06-27	2026-06-20	fitted	500.00	\N	\N	\N	\N	d1111111-1111-1111-1111-111111111111	d1111111-1111-1111-1111-111111111111	2026-06-20 22:42:04.150061+05:30	2026-06-21 01:40:52.871432+05:30	\N	\N	\N	\N	\N	\N
4180a385-af51-4ea1-a2ac-aafd26b20f69	6	a1111111-1111-1111-1111-111111111111	10000000-0000-4000-8000-000000000102	\N	\N	e53cff14-95a4-4f53-a1a0-1ad822f5aab1	Crown (PFM)	[]	\N	\N	\N	2026-06-22	received	0.00	\N	\N		\N	d1111111-1111-1111-1111-111111111111	d1111111-1111-1111-1111-111111111111	2026-06-22 22:27:53.904416+05:30	2026-06-22 22:41:38.173398+05:30	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: lab_vendors; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lab_vendors (id, name, contact_person, phone, whatsapp_number, email, address, gst, specialities, rating, is_preferred, is_active, notes, clinic_id, created_at, updated_at) FROM stdin;
e53cff14-95a4-4f53-a1a0-1ad822f5aab1	Bharat Dental Lab	Ramesh Kumar	+919439123456	+919439123456	\N	Bisra Road, Rourkela	\N	["Crown", "Bridge", "RPD"]	0.0	t	t	Default sample vendor — edit/delete in Settings → Labs	a1111111-1111-1111-1111-111111111111	2026-06-19 13:02:05.392981+05:30	2026-06-19 13:02:05.392981+05:30
3648bf13-6c1f-483b-b05c-ff993691c474	Pearl Ceramic Works	Anita Patnaik	+919437998877	+919437998877	\N	Civil Township, Rourkela	\N	["Crown", "Veneer", "Implant"]	0.0	f	t	Default sample vendor — edit/delete in Settings → Labs	a1111111-1111-1111-1111-111111111111	2026-06-19 13:02:05.392981+05:30	2026-06-19 13:02:05.392981+05:30
12559812-2f3b-40c2-b1ed-f0dc772a4a8e	Bharat Dental Lab	Ramesh Kumar	+919439123456	+919439123456	\N	Bisra Road, Rourkela	\N	["Crown", "Bridge", "RPD"]	0.0	t	t	Default sample vendor — edit/delete in Settings → Labs	b2222222-2222-2222-2222-222222222222	2026-06-19 13:02:05.392981+05:30	2026-06-19 13:02:05.392981+05:30
33d020dd-4ae6-458b-a029-2248b3d93b45	Pearl Ceramic Works	Anita Patnaik	+919437998877	+919437998877	\N	Civil Township, Rourkela	\N	["Crown", "Veneer", "Implant"]	0.0	f	t	Default sample vendor — edit/delete in Settings → Labs	b2222222-2222-2222-2222-222222222222	2026-06-19 13:02:05.392981+05:30	2026-06-19 13:02:05.392981+05:30
d89043d0-15e7-45f8-9b72-0d669afef975	tt	\N					\N	[]	0.0	f	f	\N	a1111111-1111-1111-1111-111111111111	2026-06-19 14:31:17.841875+05:30	2026-06-19 14:31:17.841875+05:30
\.


--
-- Data for Name: lab_work_types; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lab_work_types (id, name, category, typical_days, typical_cost, is_active, sort_order, created_at, clinic_id, usage_count, last_used_at, added_from) FROM stdin;
23535f25-8b1c-4b36-b64d-b863b0ad44cc	Crown (Full Ceramic)	Prosthetic	10	6000.00	t	3	2026-06-13 09:13:21.861097+05:30	\N	0	\N	seed
ed99ca8e-95d9-4ebb-83d5-62888d0b201d	Bridge (3-unit PFM)	Prosthetic	10	4500.00	t	4	2026-06-13 09:13:21.861097+05:30	\N	0	\N	seed
48002b9f-fbbd-48e6-989b-ce74cefafaeb	RPD (Acrylic)	Prosthetic	14	4000.00	t	5	2026-06-13 09:13:21.861097+05:30	\N	0	\N	seed
7af44ea5-4dc9-409e-afc8-d65301a6b48d	RPD (Cobalt-Chrome)	Prosthetic	21	12000.00	t	6	2026-06-13 09:13:21.861097+05:30	\N	0	\N	seed
b8b6201b-4666-48f0-96f2-c04e3b102a84	Complete Denture	Prosthetic	21	8000.00	t	7	2026-06-13 09:13:21.861097+05:30	\N	0	\N	seed
187b91d2-9494-4146-8409-45b96cf32b07	Implant Abutment + Crown	Prosthetic	14	12000.00	t	8	2026-06-13 09:13:21.861097+05:30	\N	0	\N	seed
ff8aea9b-be72-4e00-a516-57955102aaee	Night Guard	Orthodontic	10	2500.00	t	9	2026-06-13 09:13:21.861097+05:30	\N	0	\N	seed
4238dd0a-baca-4ef5-8465-72b97f766641	Bleaching Tray	Orthodontic	5	1500.00	t	10	2026-06-13 09:13:21.861097+05:30	\N	0	\N	seed
1502bea6-457c-47f5-aa9d-690705c85972	Surgical Stent	Surgical	7	1500.00	t	11	2026-06-13 09:13:21.861097+05:30	\N	0	\N	seed
c9a3bd1d-0b10-4515-9aa4-1fbe1ad4c2e4	PFM Crown	crown	5	2500.00	t	10	2026-06-19 13:02:05.392981+05:30	\N	0	\N	seed
02e71633-ee2e-4327-ac00-60bac97e7c46	Inlay/Onlay	inlay	7	3500.00	t	80	2026-06-19 13:02:05.392981+05:30	\N	0	\N	seed
28e49faa-ab20-4587-a397-24caa8f497c6	Zirconia Crown	crown	7	6000.00	t	20	2026-06-19 13:02:05.392981+05:30	\N	0	\N	seed
11f15c8c-2ef2-439b-86a7-58cdf12451f0	Implant abutment	implant	14	8000.00	t	90	2026-06-19 13:02:05.392981+05:30	\N	0	\N	seed
394d9ef9-4fe5-4ba3-b233-91442bccfeb3	Veneer (porcelain)	veneer	7	5500.00	t	70	2026-06-19 13:02:05.392981+05:30	\N	0	\N	seed
7094a88d-66d5-4da9-babd-5469e269ca66	Bridge (3-unit Zr)	bridge	8	16000.00	t	40	2026-06-19 13:02:05.392981+05:30	\N	0	\N	seed
07517f17-f1d1-40be-be26-58141b05a118	CPD	denture	10	7000.00	t	60	2026-06-19 13:02:05.392981+05:30	\N	0	\N	seed
07a3c3e0-c4cd-45bc-ab47-fcaa8ab71012	Crown (Zirconia)	Prosthetic	7	4500.00	t	2	2026-06-13 09:13:21.861097+05:30	\N	1	2026-06-20 14:31:37.200875+05:30	seed
fa68b968-29e8-428d-a00c-11ebaf0d1f0c	Crown (PFM)	Prosthetic	7	1500.00	t	1	2026-06-13 09:13:21.861097+05:30	\N	3	2026-06-20 22:42:04.202168+05:30	seed
\.


--
-- Data for Name: media; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.media (id, clinic_id, patient_id, type, title, url, category, show_on_public, uploaded_by, created_at) FROM stdin;
\.


--
-- Data for Name: media_gallery; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.media_gallery (id, clinic_id, patient_id, tooth_number, media_type, image_url, thumbnail_url, caption, taken_at, taken_by, treatment_plan_id, is_shared_with_patient, file_size_bytes, created_at) FROM stdin;
\.


--
-- Data for Name: medicine_catalog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.medicine_catalog (id, name, category, strengths, default_strength, default_dose, frequencies, default_frequency, default_duration, instructions, contraindications, is_active, sort_order, created_at, updated_at, added_from, added_by, usage_count, last_used_at) FROM stdin;
10000000-0000-4000-8000-000000000001	Amoxicillin	Antibiotic	["250mg", "500mg"]	500mg	1 capsule	["Three times daily", "Twice daily"]	Three times daily	5 days	After meals. Complete full course.	\N	t	0	2026-06-04 19:16:25.890933+05:30	2026-06-04 19:16:25.890933+05:30	manual	\N	0	\N
10000000-0000-4000-8000-000000000002	Augmentin (Amox+Clav)	Antibiotic	["375mg", "625mg", "1g"]	625mg	1 tablet	["Twice daily", "Three times daily"]	Twice daily	5 days	After meals. Complete full course.	\N	t	0	2026-06-04 19:16:25.890933+05:30	2026-06-04 19:16:25.890933+05:30	manual	\N	0	\N
10000000-0000-4000-8000-000000000003	Azithromycin	Antibiotic	["250mg", "500mg"]	500mg	1 tablet	["Once daily"]	Once daily	3 days	1 hour before meals.	\N	t	0	2026-06-04 19:16:25.890933+05:30	2026-06-04 19:16:25.890933+05:30	manual	\N	0	\N
10000000-0000-4000-8000-000000000004	Metronidazole	Antibiotic	["200mg", "400mg"]	400mg	1 tablet	["Three times daily", "Twice daily"]	Three times daily	5 days	After meals. Avoid alcohol.	\N	t	0	2026-06-04 19:16:25.890933+05:30	2026-06-04 19:16:25.890933+05:30	manual	\N	0	\N
10000000-0000-4000-8000-000000000005	Clindamycin	Antibiotic	["150mg", "300mg"]	300mg	1 capsule	["Three times daily", "Four times daily"]	Three times daily	7 days	After meals with water.	\N	t	0	2026-06-04 19:16:25.890933+05:30	2026-06-04 19:16:25.890933+05:30	manual	\N	0	\N
10000000-0000-4000-8000-000000000006	Doxycycline	Antibiotic	["100mg"]	100mg	1 capsule	["Twice daily", "Once daily"]	Twice daily	5 days	After meals. No lying down 30 min.	\N	t	0	2026-06-04 19:16:25.890933+05:30	2026-06-04 19:16:25.890933+05:30	manual	\N	0	\N
10000000-0000-4000-8000-000000000007	Ibuprofen	Painkiller	["200mg", "400mg", "600mg"]	400mg	1 tablet	["Three times daily", "Twice daily", "As needed (SOS)"]	Three times daily	3 days	After meals. Not on empty stomach.	\N	t	0	2026-06-04 19:16:25.890933+05:30	2026-06-04 19:16:25.890933+05:30	manual	\N	0	\N
10000000-0000-4000-8000-000000000009	Paracetamol	Painkiller	["500mg", "650mg"]	650mg	1 tablet	["Three times daily", "As needed (SOS)"]	As needed (SOS)	3 days	Max 4 tablets/day.	\N	t	0	2026-06-04 19:16:25.890933+05:30	2026-06-04 19:16:25.890933+05:30	manual	\N	0	\N
10000000-0000-4000-8000-000000000010	Ketorolac	Painkiller	["10mg"]	10mg	1 tablet	["Three times daily", "As needed (SOS)"]	As needed (SOS)	2 days	After meals. Short-term only.	\N	t	0	2026-06-04 19:16:25.890933+05:30	2026-06-04 19:16:25.890933+05:30	manual	\N	0	\N
10000000-0000-4000-8000-000000000011	Diclofenac	Painkiller	["50mg"]	50mg	1 tablet	["Twice daily", "Three times daily"]	Twice daily	3 days	After meals.	\N	t	0	2026-06-04 19:16:25.890933+05:30	2026-06-04 19:16:25.890933+05:30	manual	\N	0	\N
10000000-0000-4000-8000-000000000012	Pantoprazole	Antacid	["40mg"]	40mg	1 tablet	["Once daily before breakfast", "Twice daily"]	Before breakfast	5 days	Empty stomach, 30 min before food.	\N	t	0	2026-06-04 19:16:25.890933+05:30	2026-06-04 19:16:25.890933+05:30	manual	\N	0	\N
10000000-0000-4000-8000-000000000013	Ranitidine	Antacid	["150mg"]	150mg	1 tablet	["Twice daily"]	Twice daily	5 days	Before meals.	\N	t	0	2026-06-04 19:16:25.890933+05:30	2026-06-04 19:16:25.890933+05:30	manual	\N	0	\N
10000000-0000-4000-8000-000000000014	Chlorhexidine Mouthwash	Mouthwash	["0.2%"]	0.2%	15ml	["Twice daily", "Three times daily"]	Twice daily	7 days	Swish 30 sec and spit. No food 30 min.	\N	t	0	2026-06-04 19:16:25.890933+05:30	2026-06-04 19:16:25.890933+05:30	manual	\N	0	\N
10000000-0000-4000-8000-000000000015	Benzydamine Mouthwash	Mouthwash	["0.15%"]	0.15%	15ml	["Three times daily"]	Three times daily	5 days	Swish and spit. Do not dilute.	\N	t	0	2026-06-04 19:16:25.890933+05:30	2026-06-04 19:16:25.890933+05:30	manual	\N	0	\N
10000000-0000-4000-8000-000000000016	Lignocaine Gel 2%	Topical	["2%"]	2%	Apply small amount	["Three times daily", "As needed"]	Three times daily	3 days	On affected area. No food 30 min.	\N	t	0	2026-06-04 19:16:25.890933+05:30	2026-06-04 19:16:25.890933+05:30	manual	\N	0	\N
10000000-0000-4000-8000-000000000017	Triamcinolone Paste	Topical Steroid	["0.1%"]	0.1%	Apply small amount	["Three times daily"]	Three times daily	5 days	On ulcer after meals & bedtime.	\N	t	0	2026-06-04 19:16:25.890933+05:30	2026-06-04 19:16:25.890933+05:30	manual	\N	0	\N
10000000-0000-4000-8000-000000000018	Clotrimazole Paint	Antifungal	["1%"]	1%	Apply with cotton	["Three times daily"]	Three times daily	7 days	On affected area after meals.	\N	t	0	2026-06-04 19:16:25.890933+05:30	2026-06-04 19:16:25.890933+05:30	manual	\N	0	\N
10000000-0000-4000-8000-000000000019	Desensitizing Toothpaste	Oral Care	["5% KNO3"]	5% KNO3	Pea-sized	["Twice daily"]	Twice daily	Ongoing	Brush gently 2 min. Apply on sensitive teeth.	\N	t	0	2026-06-04 19:16:25.890933+05:30	2026-06-04 19:16:25.890933+05:30	manual	\N	0	\N
10000000-0000-4000-8000-000000000020	Warm Saline Gargle	Home Remedy	["1 tsp salt"]	1 tsp salt	1 glass	["3-4 times daily"]	3-4 times daily	5 days	Lukewarm water. Gargle 30 seconds.	\N	t	0	2026-06-04 19:16:25.890933+05:30	2026-06-04 19:16:25.890933+05:30	manual	\N	0	\N
10000000-0000-4000-8000-000000000021	Prednisolone	Steroid	["5mg", "10mg", "20mg"]	10mg	1 tablet	["Once daily morning"]	Once daily morning	5 days (tapering)	After breakfast. Do not stop abruptly.	\N	t	0	2026-06-04 19:16:25.890933+05:30	2026-06-04 19:16:25.890933+05:30	manual	\N	0	\N
10000000-0000-4000-8000-000000000022	Cetirizine	Anti-allergy	["10mg"]	10mg	1 tablet	["Once daily at bedtime"]	At bedtime	5 days	May cause drowsiness.	\N	t	0	2026-06-04 19:16:25.890933+05:30	2026-06-04 19:16:25.890933+05:30	manual	\N	0	\N
10000000-0000-4000-8000-000000000023	Ice Pack	Home Remedy	["External"]	External	15-20 min	["Every 2-3 hours"]	Every 2-3 hours	First 24 hours	On cheek. Towel between ice and skin.	\N	t	0	2026-06-04 19:16:25.890933+05:30	2026-06-04 19:16:25.890933+05:30	manual	\N	0	\N
44bf9b37-49e4-4780-a79d-0b22c029e0f0	TMP M2	Antibiotic	["250mg"]	250mg	1	["BD"]	BD	3d	After food		t	0	2026-06-19 10:15:01.083005+05:30	2026-06-19 10:15:01.083007+05:30	manual	\N	0	\N
10000000-0000-4000-8000-000000000008	Aceclofenac+Paracetamol	Painkiller	["100+325mg", "100+500mg"]	100+325mg	1 tablet	["Twice daily", "Three times daily"]	Twice daily	3 days	After meals..	\N	t	0	2026-06-04 19:16:25.890933+05:30	2026-06-22 22:25:07.438012+05:30	manual	\N	1	2026-06-17 14:03:41.232376+05:30
98a2e6a8-0e44-4a3e-8fe1-9567050518f3	a	Antibiotic	[""]			[""]					t	0	2026-06-22 22:25:14.029353+05:30	2026-06-22 22:25:14.029356+05:30	manual	\N	0	\N
\.


--
-- Data for Name: medicine_reminders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.medicine_reminders (id, prescription_id, patient_id, medicine_name, dose, frequency, start_date, end_date, reminder_times, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: message_log; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.message_log (id, clinic_id, template_key, recipient_kind, recipient_id, recipient_name, recipient_phone, body, appointment_id, payment_id, lab_order_id, visit_id, status, transport, direction, trigger, provider_msg_id, error_text, scheduled_for, sent_at, failed_at, created_at, created_by) FROM stdin;
8f68b9c0-4aea-421e-a09c-8abf10279336	a1111111-1111-1111-1111-111111111111	lab_received	patient	a0000001-0000-0000-0000-000000000001	Aarav Sharma	919810000001	Hi Aarav Sharma, your PFM Crown is ready! Please book a fitting appointment: https://wa.me/919876500001?text=Hi%2C%20my%20PFM Crown%20is%20ready%2C%20I%27d%20like%20to%20book%20a%20fitting or call +919876500001.	\N	\N	aa146f94-c927-4340-8666-c71910eb288c	\N	manual_pending	click2chat	out	event	\N	\N	\N	2026-06-20 16:37:31.000896+05:30	\N	2026-06-20 16:37:30.994635+05:30	\N
c7e5c240-f18c-42db-bc9e-accda0be20cc	a1111111-1111-1111-1111-111111111111	lab_received	patient	a0000001-0000-0000-0000-000000000001	Aarav Sharma	919810000001	Hi Aarav Sharma, your PFM Crown is ready! Please book a fitting appointment: https://wa.me/919876500001?text=Hi%2C%20my%20PFM Crown%20is%20ready%2C%20I%27d%20like%20to%20book%20a%20fitting or call +919876500001.	\N	\N	aa146f94-c927-4340-8666-c71910eb288c	\N	manual_pending	click2chat	out	event	\N	\N	\N	2026-06-20 16:37:31.015831+05:30	\N	2026-06-20 16:37:31.010888+05:30	d2222222-2222-2222-2222-222222222222
7040c783-eba0-4b1e-930d-32efc45aeb40	a1111111-1111-1111-1111-111111111111	arrival_confirmation	patient	a0000001-0000-0000-0000-000000000001	Aarav Sharma	919810000001	Hi Aarav Sharma, we've marked you as arrived at Siya Dental Care — Main Branch. Estimated wait: 10 min. Dr. Dr. Madhu Edward will see you shortly.	b0000001-0000-0000-0000-000000000001	\N	\N	\N	manual_pending	click2chat	out	manual	\N	\N	\N	2026-06-20 16:37:36.267632+05:30	\N	2026-06-20 16:37:36.238977+05:30	\N
5f47c13e-6f3f-471d-9c39-725548a75a37	a1111111-1111-1111-1111-111111111111	arrival_confirmation	patient	a0000003-0000-0000-0000-000000000003	Rahul Verma	919810000003	Hi Rahul Verma, we've marked you as arrived at Siya Dental Care — Main Branch. Estimated wait: 10 min. Dr. Dr. Madhu Edward will see you shortly.	b0000003-0000-0000-0000-000000000003	\N	\N	\N	manual_pending	click2chat	out	manual	\N	\N	\N	2026-06-20 17:59:49.071915+05:30	\N	2026-06-20 17:59:49.02016+05:30	\N
80e9d603-a53c-4bad-8c7b-fdfce3f3caaf	a1111111-1111-1111-1111-111111111111	arrival_confirmation	patient	10000000-0000-4000-8000-000000000101	Asha Verma	919876501101	Hi Asha Verma, we've marked you as arrived at Siya Dental Care — Main Branch. Estimated wait: 10 min. Dr. Dr. Madhu Edward will see you shortly.	30000000-0000-4000-8000-000000000101	\N	\N	\N	manual_pending	click2chat	out	manual	\N	\N	\N	2026-06-20 22:38:53.090782+05:30	\N	2026-06-20 22:38:53.067075+05:30	\N
b3cb4926-8b11-4ed4-b9d4-a87308168989	a1111111-1111-1111-1111-111111111111	appointment_rescheduled	patient	10000000-0000-4000-8000-000000000101	Asha Verma	919876501101	Hi Asha Verma, your appointment at Siya Dental Care — Main Branch has been rescheduled from None  to *20 Jun 2026 at *. — Dr. Dr. Madhu Edward	5607d539-d841-4ff4-88d7-10ea8b601215	\N	\N	\N	manual_pending	click2chat	out	event	\N	\N	\N	2026-06-20 22:41:24.813043+05:30	\N	2026-06-20 22:41:24.788351+05:30	\N
a5ec3f30-6fdf-4d3c-9ff6-13f965250cea	a1111111-1111-1111-1111-111111111111	arrival_confirmation	patient	10000000-0000-4000-8000-000000000101	Asha Verma	919876501101	Hi Asha Verma, we've marked you as arrived at Siya Dental Care — Main Branch. Estimated wait: 10 min. Dr. Dr. Madhu Edward will see you shortly.	5607d539-d841-4ff4-88d7-10ea8b601215	\N	\N	\N	manual_pending	click2chat	out	manual	\N	\N	\N	2026-06-20 22:41:35.867065+05:30	\N	2026-06-20 22:41:35.83619+05:30	\N
8963ffd3-f5a4-4ee7-912e-99c0630c45df	a1111111-1111-1111-1111-111111111111	lab_received	patient	10000000-0000-4000-8000-000000000101	Asha Verma	919876500101	Hi Asha Verma, your Crown (PFM) is ready! Please book a fitting appointment: https://wa.me/919876500001?text=Hi%2C%20my%20Crown (PFM)%20is%20ready%2C%20I%27d%20like%20to%20book%20a%20fitting or call +919876500001.	\N	\N	d67f2a0d-f2ae-4874-8ed3-47fcf10174ec	\N	manual_pending	click2chat	out	event	\N	\N	\N	2026-06-20 22:42:44.591176+05:30	\N	2026-06-20 22:42:44.578424+05:30	\N
f8fbe89d-5a79-45ae-9ec5-99bf3b2e0b6f	a1111111-1111-1111-1111-111111111111	lab_received	patient	10000000-0000-4000-8000-000000000101	Asha Verma	919876500101	Hi Asha Verma, your Crown (PFM) is ready! Please book a fitting appointment: https://wa.me/919876500001?text=Hi%2C%20my%20Crown (PFM)%20is%20ready%2C%20I%27d%20like%20to%20book%20a%20fitting or call +919876500001.	\N	\N	d67f2a0d-f2ae-4874-8ed3-47fcf10174ec	\N	manual_pending	click2chat	out	event	\N	\N	\N	2026-06-20 22:42:44.618413+05:30	\N	2026-06-20 22:42:44.614508+05:30	d1111111-1111-1111-1111-111111111111
26839ac5-ce8f-491c-baf7-a2c1fbd19309	a1111111-1111-1111-1111-111111111111	appointment_rescheduled	patient	10000000-0000-4000-8000-000000000101	Asha Verma	919876501101	Hi Asha Verma, your appointment at Siya Dental Care — Main Branch has been rescheduled from None  to *20 Jun 2026 at *. — Dr. Dr. Madhu Edward	2a3a29ad-4b20-4a7e-a538-8d668e541d28	\N	\N	\N	manual_pending	click2chat	out	event	\N	\N	\N	2026-06-20 22:42:59.411549+05:30	\N	2026-06-20 22:42:59.393743+05:30	\N
f17f4a86-6930-4ea5-b6b5-dc923f70d88c	a1111111-1111-1111-1111-111111111111	arrival_confirmation	patient	10000000-0000-4000-8000-000000000101	Asha Verma	919876501101	Hi Asha Verma, we've marked you as arrived at Siya Dental Care — Main Branch. Estimated wait: 10 min. Dr. Dr. Madhu Edward will see you shortly.	2a3a29ad-4b20-4a7e-a538-8d668e541d28	\N	\N	\N	manual_pending	click2chat	out	manual	\N	\N	\N	2026-06-20 22:43:17.13546+05:30	\N	2026-06-20 22:43:17.120847+05:30	\N
7aff68d9-9ce4-46b3-971b-449d2f365495	a1111111-1111-1111-1111-111111111111	appointment_rescheduled	patient	10000000-0000-4000-8000-000000000102	Rohan Gupta	919876500102	Hi Rohan Gupta, your appointment at Siya Dental Care — Main Branch has been rescheduled from 21 Jun 12:30 to *20 Jun 2026 at 12:30*. — Dr. Dr. Madhu Edward	30000000-0000-4000-8000-000000000102	\N	\N	\N	manual_pending	click2chat	out	event	\N	\N	\N	2026-06-20 23:32:10.385321+05:30	\N	2026-06-20 23:32:10.343413+05:30	\N
c25b16b0-9395-4788-b2ed-ef672a79fae2	a1111111-1111-1111-1111-111111111111	arrival_confirmation	patient	10000000-0000-4000-8000-000000000103	Meera Nair	919876501103	Hi Meera Nair, we've marked you as arrived at Siya Dental Care — Main Branch. Estimated wait: 10 min. Dr. Dr. Madhu Edward will see you shortly.	30000000-0000-4000-8000-000000000103	\N	\N	\N	manual_pending	click2chat	out	manual	\N	\N	\N	2026-06-20 23:35:21.264986+05:30	\N	2026-06-20 23:35:21.24564+05:30	\N
15676396-5d6c-4e60-8df8-12053e3f1483	a1111111-1111-1111-1111-111111111111	specialist_assigned	specialist	07e07975-94d7-4c30-8a71-7e75f420092f	SS	919876599991	Hi Dr. SS, you've been assigned a Crown case at Siya Dental Care — Main Branch on 20 Jun at 15:15. Patient: MN, . Chief complaint: Temporary crown review.	30000000-0000-4000-8000-000000000103	\N	\N	\N	manual_pending	click2chat	out	event	\N	\N	\N	2026-06-20 23:44:39.23906+05:30	\N	2026-06-20 23:44:39.230797+05:30	\N
1e84d572-7694-45dd-8eb0-93cf4e928ffb	a1111111-1111-1111-1111-111111111111	lab_received	patient	10000000-0000-4000-8000-000000000103	Meera Nair	919876500103	Hi Meera Nair, your Lab Work is ready! Please book a fitting appointment: https://wa.me/919876500001?text=Hi%2C%20my%20Lab Work%20is%20ready%2C%20I%27d%20like%20to%20book%20a%20fitting or call +919876500001.	\N	\N	e4017d2e-2cf4-4301-aa99-7b5c9f57e3fb	\N	manual_pending	click2chat	out	event	\N	\N	\N	2026-06-20 23:48:27.046336+05:30	\N	2026-06-20 23:48:27.039789+05:30	\N
109df60e-d8da-4b95-8066-5021b9df4c1f	a1111111-1111-1111-1111-111111111111	appointment_rescheduled	patient	10000000-0000-4000-8000-000000000103	Meera Nair	919876501103	Hi Meera Nair, your appointment at Siya Dental Care — Main Branch has been rescheduled from 21 Jun 10:00 to *20 Jun 2026 at 10:00*. — Dr. Dr. Madhu Edward	eb71a482-4d0d-4822-b905-fd4459abe57b	\N	\N	\N	manual_pending	click2chat	out	event	\N	\N	\N	2026-06-20 23:49:01.926472+05:30	\N	2026-06-20 23:49:01.909339+05:30	\N
ff6beb00-8aa0-4bfe-8618-d24b9b35de4c	a1111111-1111-1111-1111-111111111111	arrival_confirmation	patient	10000000-0000-4000-8000-000000000103	Meera Nair	919876501103	Hi Meera Nair, we've marked you as arrived at Siya Dental Care — Main Branch. Estimated wait: 10 min. Dr. Dr. Madhu Edward will see you shortly.	eb71a482-4d0d-4822-b905-fd4459abe57b	\N	\N	\N	manual_pending	click2chat	out	manual	\N	\N	\N	2026-06-20 23:49:36.968316+05:30	\N	2026-06-20 23:49:36.954443+05:30	\N
001fd843-84e4-4e54-807d-6a9e782c4943	a1111111-1111-1111-1111-111111111111	lab_received	patient	10000000-0000-4000-8000-000000000101	Asha Verma	919876500101	Hi Asha Verma, your Zirconia Crown is ready! Please book a fitting appointment: https://wa.me/919876500001?text=Hi%2C%20my%20Zirconia Crown%20is%20ready%2C%20I%27d%20like%20to%20book%20a%20fitting or call +919876500001.	\N	\N	6b0acee0-39ef-4454-b479-be18f6d56efd	\N	manual_pending	click2chat	out	event	\N	\N	\N	2026-06-20 23:56:04.946482+05:30	\N	2026-06-20 23:56:04.940324+05:30	\N
90ef63f8-2a17-46a7-b14d-73a31abb4a7b	a1111111-1111-1111-1111-111111111111	arrival_confirmation	patient	10000000-0000-4000-8000-000000000101	Asha Verma	919876501101	Hi Asha Verma, we've marked you as arrived at Siya Dental Care — Main Branch. Estimated wait: 10 min. Dr. Dr. Madhu Edward will see you shortly.	2a3a29ad-4b20-4a7e-a538-8d668e541d28	\N	\N	\N	manual_pending	click2chat	out	manual	\N	\N	\N	2026-06-20 23:56:06.287119+05:30	\N	2026-06-20 23:56:06.268285+05:30	\N
aa9f0f8e-b7e6-462e-b8a3-e86529fbe63a	a1111111-1111-1111-1111-111111111111	arrival_confirmation	patient	10000000-0000-4000-8000-000000000104	Arjun Rao	919876500104	Hi Arjun Rao, we've marked you as arrived at Siya Dental Care — Main Branch. Estimated wait: 10 min. Dr. Dr. Madhu Edward will see you shortly.	30000000-0000-4000-8000-000000000104	\N	\N	\N	manual_pending	click2chat	out	manual	\N	\N	\N	2026-06-21 00:40:04.329467+05:30	\N	2026-06-21 00:40:04.201816+05:30	\N
63b51441-158f-4b41-b99a-7f55bbfae8be	a1111111-1111-1111-1111-111111111111	appointment_rescheduled	patient	10000000-0000-4000-8000-000000000102	Rohan Gupta	919876500102	Hi Rohan Gupta, your appointment at Siya Dental Care — Main Branch has been rescheduled from None  to *20 Jun 2026 at *. — Dr. Dr. Madhu Edward	30000000-0000-4000-8000-000000000102	\N	\N	\N	manual_pending	click2chat	out	event	\N	\N	\N	2026-06-21 01:39:42.117771+05:30	\N	2026-06-21 01:39:42.084405+05:30	\N
86dd1024-b1a5-4646-a732-834c828d3052	a1111111-1111-1111-1111-111111111111	arrival_confirmation	patient	10000000-0000-4000-8000-000000000102	Rohan Gupta	919876500102	Hi Rohan Gupta, we've marked you as arrived at Siya Dental Care — Main Branch. Estimated wait: 10 min. Dr. Dr. Madhu Edward will see you shortly.	30000000-0000-4000-8000-000000000102	\N	\N	\N	manual_pending	click2chat	out	manual	\N	\N	\N	2026-06-21 01:39:57.203483+05:30	\N	2026-06-21 01:39:57.178061+05:30	\N
949bf1fd-2808-470c-944c-cd0d16843541	a1111111-1111-1111-1111-111111111111	\N	patient	10000000-0000-4000-8000-000000000102	Rohan Gupta	919876500102	Hi {patient_name}, this is a test from Siya Dental.	\N	\N	\N	\N	manual_pending	click2chat	out	manual	\N	\N	\N	2026-06-22 22:24:14.985271+05:30	\N	2026-06-22 22:24:14.983154+05:30	d1111111-1111-1111-1111-111111111111
c675f77f-b88c-4fc9-aa63-5fbee277f0e0	a1111111-1111-1111-1111-111111111111	\N	patient	10000000-0000-4000-8000-000000000102	Test	919876500102	Hi {patient_name}!	\N	\N	\N	\N	manual_pending	click2chat	out	manual	\N	\N	\N	2026-06-22 22:24:36.205896+05:30	\N	2026-06-22 22:24:36.205191+05:30	d1111111-1111-1111-1111-111111111111
1fea5e27-9867-4cc0-ba67-c08dbf902f4d	a1111111-1111-1111-1111-111111111111	\N	patient	10000000-0000-4000-8000-000000000102	Test	919876500102	Hi Rohan!	\N	\N	\N	\N	manual_pending	click2chat	out	manual	\N	\N	\N	2026-06-22 22:25:18.71065+05:30	\N	2026-06-22 22:25:18.709112+05:30	d1111111-1111-1111-1111-111111111111
0ce708e3-f923-4b37-97d5-36eabb18d343	a1111111-1111-1111-1111-111111111111	lab_received	patient	10000000-0000-4000-8000-000000000102	Rohan Gupta	919876500102	Hi Rohan Gupta, your Crown (PFM) is ready! Please book a fitting appointment: https://wa.me/919876500001?text=Hi%2C%20my%20Crown (PFM)%20is%20ready%2C%20I%27d%20like%20to%20book%20a%20fitting or call +919876500001.	\N	\N	4180a385-af51-4ea1-a2ac-aafd26b20f69	\N	manual_pending	click2chat	out	event	\N	\N	\N	2026-06-22 22:41:38.184595+05:30	\N	2026-06-22 22:41:38.177472+05:30	\N
\.


--
-- Data for Name: message_templates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.message_templates (id, clinic_id, template_key, category, label, body, cloud_template_name, cloud_template_lang, is_active, updated_at) FROM stdin;
d544c3fe-94f9-412b-aa4b-714dd44c166a	\N	appointment_confirmation	appointment	Appointment booked	Hi {patient_name}, your appointment at {clinic_name} is confirmed for {date} at {time}. See you soon! — Dr. {doctor_name}	\N	en	t	2026-06-15 09:45:29.484512+05:30
7a9a61ca-4461-491c-9d9b-127e121d84cb	\N	reminder_24h	appointment	Reminder — 24h before	Hi {patient_name}, this is a reminder of your dental appointment tomorrow ({date}) at {time}. Reply YES to confirm, NO to reschedule. — {clinic_name}	\N	en	t	2026-06-15 09:45:29.484512+05:30
1017fb39-4659-415c-8c18-db5fec268a00	\N	reminder_2h	appointment	Reminder — 2h before	Hi {patient_name}, your appointment is in 2 hours ({time}). The clinic is at {clinic_address}. See you soon!	\N	en	t	2026-06-15 09:45:29.484512+05:30
816c8ff8-5589-41cb-ba39-0e22ec3cc284	\N	reminder_30m	appointment	Reminder — 30 min before	Hi {patient_name}, your appointment is in 30 minutes. We're at {clinic_address}.	\N	en	t	2026-06-15 09:45:29.484512+05:30
4ef6b7ba-12e6-40d3-bcd1-cd95d368251c	\N	receipt	billing	Payment receipt	Hi {patient_name}, receipt for your visit on {date}: ₹{amount} ({mode}). Balance: ₹{balance}. Thank you! — {clinic_name}	\N	en	t	2026-06-15 09:45:29.484512+05:30
d87c01fe-8dd8-42b4-878f-27a486b8894a	\N	rating_ask	feedback	Ask for rating	Hi {patient_name}, how was your visit at {clinic_name} on {visit_date}? Rate us 1–5 stars here: {rating_link}\\n\\nLeave a rating and get ₹{discount} off your next visit! 🎁	\N	en	t	2026-06-15 09:45:29.484512+05:30
66a0918f-b5ec-461b-af19-c3b9d9b0a023	\N	rating_retry	feedback	Rating reminder	Hi {patient_name}, we'd love your feedback on your recent visit! Rate us here for a ₹{discount} credit: {rating_link}	\N	en	t	2026-06-15 09:45:29.484512+05:30
5c0acfeb-8eed-4e3e-b981-679ac8d47226	\N	lab_received	lab	Lab work received	Hi {patient_name}, your {work_type} is ready! Please book a fitting appointment: {booking_link} or call {clinic_phone}.	\N	en	t	2026-06-15 09:45:29.484512+05:30
00da8bfc-df6d-4ca5-92b1-63cbf2dd5d95	\N	lab_to_vendor	lab	Lab order to vendor	Hi {vendor_name}, new {work_type} order for patient {patient_initials}, teeth {teeth}, shade {shade}. Expected by {expected_date}. — {clinic_name}	\N	en	t	2026-06-15 09:45:29.484512+05:30
66cecc0c-9289-48fa-b2ba-fe8b670fed49	\N	specialist_assigned	specialist	Specialist assignment	Hi Dr. {specialist_name}, you've been assigned a {appointment_type} case at {clinic_name} on {date} at {time}. Patient: {patient_initials}, {patient_age}{patient_gender}. Chief complaint: {complaint}.	\N	en	t	2026-06-15 09:45:29.484512+05:30
86c4abf5-5a2f-4ba0-9d85-607306b79d76	\N	specialist_to_patient	specialist	Specialist intro to patient	Hi {patient_name}, Dr. {specialist_name} (specialist in {specialization}) will see you for your appointment on {date} at {time} at {clinic_name}.	\N	en	t	2026-06-15 09:45:29.484512+05:30
65e06e8f-8e91-49d4-9269-dccb8ff1dc57	\N	doctor_daily_summary	doctor	Daily summary to doctor	Dr. {doctor_name}, today: {visits_count} visits · ₹{collected} collected · {pending_count} pay-pending · {tomorrow_count} appointments tomorrow.	\N	en	t	2026-06-15 09:45:29.484512+05:30
11a9c1e5-50de-487c-99f5-2d2a714b6462	\N	phone_consult_confirmation	phone_consult	Phone consult booked	Hi {patient_name}, your ₹{fee} phone consultation is confirmed. Dr. {doctor_name} will call you on {phone} within {duration_min} minutes from now. Prescription will be sent via WhatsApp.	\N	en	t	2026-06-15 09:45:29.484512+05:30
ef27520e-46d3-4519-a59b-b22f4512bf3a	\N	phone_consult_rx	phone_consult	Phone consult Rx	Hi {patient_name}, here is your prescription from today's phone consultation with Dr. {doctor_name}:\\n\\n{rx_text}\\n\\nDownload PDF: {rx_pdf}\\n\\nFollow-up: {followup_date}	\N	en	t	2026-06-15 09:45:29.484512+05:30
fbf0b35d-cf80-4b67-96e2-db049fba3b4f	\N	appointment_rescheduled	appointment	Appointment rescheduled	Hi {patient_name}, your appointment at {clinic_name} has been rescheduled from {old_date} {old_time} to *{new_date} at {new_time}*. — Dr. {doctor_name}	\N	en	t	2026-06-15 09:58:44.458335+05:30
54744e73-ea03-47bd-b89b-e99bdf8197bb	\N	appointment_cancelled	appointment	Appointment cancelled	Hi {patient_name}, your appointment at {clinic_name} on {date} at {time} has been cancelled. Please call {clinic_phone} to rebook. We're sorry for any inconvenience.	\N	en	t	2026-06-15 09:58:44.458335+05:30
dd545770-5118-4ce6-a60f-7e4f760b06ef	\N	arrival_confirmation	appointment	Arrival confirmed	Hi {patient_name}, we've marked you as arrived at {clinic_name}. Estimated wait: {wait_minutes} min. Dr. {doctor_name} will see you shortly.	\N	en	t	2026-06-15 09:58:44.458335+05:30
fdd3a9a9-61dd-4e35-bb2e-045865772456	\N	thank_you_visit	appointment	Thank you (post-visit)	Thank you {patient_name} for visiting {clinic_name} today! Take care and reach out anytime at {clinic_phone}. — Dr. {doctor_name}	\N	en	t	2026-06-15 09:58:44.458335+05:30
dbbe9eef-d696-4bef-bdc9-d6a16e7a6fea	\N	reward_earned	feedback	Reward earned	Hi {patient_name}, your ₹{amount} reward credit is now active! Use it on your next visit at {clinic_name}. Valid until {expires_at}.	\N	en	t	2026-06-15 09:58:44.458335+05:30
c9ab7d27-3441-443f-91b4-2902edeb4efe	\N	followup_scheduled	followup	Follow-up scheduled	Hi {patient_name}, your follow-up at {clinic_name} is scheduled for *{followup_date}*. Purpose: {purpose}. We'll send a reminder closer to the date.	\N	en	t	2026-06-15 09:58:44.458335+05:30
844d3ca7-d77a-4948-973b-09576524c84b	\N	followup_reminder_3d	followup	Follow-up reminder (3 days)	Hi {patient_name}, friendly reminder: your follow-up at {clinic_name} is in 3 days on {followup_date}. Purpose: {purpose}.	\N	en	t	2026-06-15 09:58:44.458335+05:30
a36bd26e-d235-4594-84b2-286a3fdc44c3	\N	followup_reminder_1d	followup	Follow-up reminder (1 day)	Hi {patient_name}, your follow-up is *tomorrow* ({followup_date}) at {clinic_name}. Reply YES to confirm.	\N	en	t	2026-06-15 09:58:44.458335+05:30
b09d8bdb-2b4f-4902-be47-4c74a67b65e0	\N	followup_due_today	followup	Follow-up today	Hi {patient_name}, your follow-up at {clinic_name} is *today*. Purpose: {purpose}. Please come by {time}.	\N	en	t	2026-06-15 09:58:44.458335+05:30
77240a46-48fb-4bc4-9840-660eb44a87c5	\N	recall_reminder	followup	Recall reminder (missed)	Hi {patient_name}, we noticed you missed your scheduled follow-up. Your dental health matters! Please call {clinic_phone} to reschedule.	\N	en	t	2026-06-15 09:58:44.458335+05:30
fd72d4b0-84db-453d-936e-308b145c5b03	\N	lab_order_placed	lab	Lab order placed	Hi {vendor_name}, new {work_type} order from {clinic_name}. Patient: {patient_code}, Teeth: {teeth}, Shade: {shade}. Due: *{due_date}*. — Dr. {doctor_name}	\N	en	t	2026-06-15 09:58:44.458335+05:30
dcf55b84-f152-4676-a805-33168297cb48	\N	lab_order_modified	lab	Lab order modified	Hi {vendor_name}, order #{order_id} ({work_type}, patient {patient_code}) has been modified. New requirements: {changes}. Updated due: {due_date}.	\N	en	t	2026-06-15 09:58:44.458335+05:30
8c44b0d9-5492-448c-9c2d-cd4962cc0de5	\N	lab_due_tomorrow	lab	Lab due tomorrow	Hi {vendor_name}, reminder: {work_type} for patient {patient_code} (order #{order_id}) is due *tomorrow* ({due_date}). Please confirm.	\N	en	t	2026-06-15 09:58:44.458335+05:30
c5edbeaf-45e9-493a-91e3-883cb8ca7320	\N	lab_due_today	lab	Lab due today	Hi {vendor_name}, {work_type} for {patient_code} (order #{order_id}) is *due today*. Please deliver by EOD.	\N	en	t	2026-06-15 09:58:44.458335+05:30
3c4f44d0-8ce2-4989-bd43-240551b214af	\N	lab_overdue	lab	Lab overdue	Hi {vendor_name}, {work_type} for {patient_code} (order #{order_id}) was due on {due_date} — *now {days_overdue} day(s) overdue*. Please update.	\N	en	t	2026-06-15 09:58:44.458335+05:30
f8f648e4-4c34-4031-ac2e-fba6f13bad67	\N	lab_trial_appointment	lab	Lab trial fitting	Hi {vendor_name}, trial fitting for patient {patient_code} ({work_type}) scheduled at {clinic_name} on *{trial_date}* at {trial_time}.	\N	en	t	2026-06-15 09:58:44.458335+05:30
6163dcc1-1efa-443d-a4b7-ad0623607459	\N	lab_case_complete	lab	Lab case completed	Thank you {vendor_name}! {work_type} for {patient_code} (order #{order_id}) has been received and fitted. Invoice will follow.	\N	en	t	2026-06-15 09:58:44.458335+05:30
071ef974-40dd-4ac0-89e4-397b5e9b9d26	\N	specialist_morning_digest	specialist	Specialist morning digest	Good morning Dr. {specialist_name}! Today's cases at {clinic_name}:\\n\\n{case_list}\\n\\nTotal: {case_count} patient(s). Have a great day!	\N	en	t	2026-06-15 09:58:44.458335+05:30
e7947b09-013b-4abc-bc9a-2574173d9847	\N	specialist_reminder_1d	specialist	Specialist reminder (1 day)	Hi Dr. {specialist_name}, you have {case_count} case(s) tomorrow at {clinic_name}. Patients: {patient_list}. Please confirm attendance.	\N	en	t	2026-06-15 09:58:44.458335+05:30
29863ce1-f04b-414d-8641-84dcb907263c	\N	specialist_case_completed	specialist	Case completed (to doctor)	Dr. {doctor_name}, Dr. {specialist_name} completed case for *{patient_name}* on {date}. Treatment: {treatment_summary}. Rate tier: {rate_tier}.	\N	en	t	2026-06-15 09:58:44.458335+05:30
013405fa-2969-45e0-a324-a4a46fa62cb1	\N	specialist_thank_you	specialist	Specialist thank you (EOD)	Thank you Dr. {specialist_name} for {case_count} case(s) today at {clinic_name}. Total earning: ₹{total_amount}. Settlement will follow as scheduled.	\N	en	t	2026-06-15 09:58:44.458335+05:30
ea42b7d4-5030-4e7b-8377-18a87fd89a1e	\N	doctor_daily_digest	doctor	Doctor morning digest	Good morning Dr. {doctor_name}! Today at {clinic_name}:\\n• Appointments: {appointment_count}\\n• New patients: {new_patient_count}\\n• Follow-ups: {followup_count}\\n• Specialist cases: {specialist_count}\\n• Pending payments: ₹{pending_amount}\\n• Lab deliveries due: {lab_due_count}	\N	en	t	2026-06-15 09:58:44.458335+05:30
6ef92e07-080b-408e-866a-f48c1510581a	\N	nurse_daily_digest	nurse	Nurse morning digest	Good morning! Today at {clinic_name}:\\n• Patients booked: {appointment_count}\\n• New: {new_patient_count}\\n• Follow-ups: {followup_count}\\n• Specialist visits: {specialist_count}\\n• Lab deliveries today: {lab_due_count}\\n• Pending payments to collect: ₹{pending_amount}	\N	en	t	2026-06-15 09:58:44.458335+05:30
1e447c10-9a67-4d6d-b5d5-23c231c53733	\N	high_priority_alert	doctor	High-priority patient alert	⚠️ Dr. {doctor_name}, high-priority patient: *{patient_name}*. Reason: {reason}. Please review.	\N	en	t	2026-06-15 09:58:44.458335+05:30
ebec6a6d-fb3c-4a1e-a01c-741aa374bb7a	\N	lab_delay_alert	doctor	Lab delay alert	🔴 Dr. {doctor_name}, lab delay: {work_type} for *{patient_name}* (vendor: {vendor_name}) is {days_overdue} day(s) overdue. Original due: {due_date}.	\N	en	t	2026-06-15 09:58:44.458335+05:30
5837287c-db35-421e-8a83-9771b7719c85	\N	failed_reminder_alert	nurse	Failed reminder alert	⚠️ Reminder to {patient_name} ({patient_phone}) failed: {error}. Please follow up manually.	\N	en	t	2026-06-15 09:58:44.458335+05:30
8aae1b5b-85bf-4eab-8dd9-a5ca7125da15	\N	treatment_approval_required	doctor	Treatment needs approval	Dr. {doctor_name}, treatment plan for *{patient_name}* (₹{amount}, {procedure_count} procedures) needs your approval.	\N	en	t	2026-06-15 09:58:44.458335+05:30
\.


--
-- Data for Name: module_visibility; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.module_visibility (id, clinic_id, module_key, role, is_visible, updated_at, updated_by) FROM stdin;
f007b05d-b72c-4c42-8821-cc6c3bd1f4f2	b2222222-2222-2222-2222-222222222222	dashboard	doctor	t	2026-06-19 13:02:05.632527+05:30	\N
63f2d3cd-344b-489f-af53-af807f491c1c	b2222222-2222-2222-2222-222222222222	dashboard	admin	t	2026-06-19 13:02:05.632527+05:30	\N
3184c664-14c0-4b32-8fb8-6cfd4face290	b2222222-2222-2222-2222-222222222222	dashboard	receptionist	t	2026-06-19 13:02:05.632527+05:30	\N
03d59360-d36c-4dfe-b30d-87abf15eef26	b2222222-2222-2222-2222-222222222222	appointments	doctor	t	2026-06-19 13:02:05.632527+05:30	\N
f098214c-e148-4d55-ae33-e05c618f4702	b2222222-2222-2222-2222-222222222222	appointments	admin	t	2026-06-19 13:02:05.632527+05:30	\N
e45a89d9-2cac-486a-b1bc-ed88661683d0	b2222222-2222-2222-2222-222222222222	appointments	receptionist	t	2026-06-19 13:02:05.632527+05:30	\N
ec7bde94-9753-44bb-8c9b-056b4ed172c0	b2222222-2222-2222-2222-222222222222	appointments	specialist	f	2026-06-19 13:02:05.632527+05:30	\N
7d164277-ab90-4f9d-a153-6516466aa51b	b2222222-2222-2222-2222-222222222222	patients	doctor	t	2026-06-19 13:02:05.632527+05:30	\N
207b8953-fa52-4f06-9030-225d2d563468	b2222222-2222-2222-2222-222222222222	patients	admin	t	2026-06-19 13:02:05.632527+05:30	\N
5dad7269-7cf5-4671-9553-f58d95a36e26	b2222222-2222-2222-2222-222222222222	patients	receptionist	t	2026-06-19 13:02:05.632527+05:30	\N
b125faed-1eeb-44dd-823a-fe54095d5735	b2222222-2222-2222-2222-222222222222	queue	doctor	t	2026-06-19 13:02:05.632527+05:30	\N
090d4a83-b44b-42ca-970b-a0c7edb4fac1	b2222222-2222-2222-2222-222222222222	queue	admin	t	2026-06-19 13:02:05.632527+05:30	\N
20e74eb8-4d8f-4051-ae4a-af4c2043bc9b	b2222222-2222-2222-2222-222222222222	queue	receptionist	t	2026-06-19 13:02:05.632527+05:30	\N
05533ac0-5966-43ab-9b5f-6ca8bcb63931	b2222222-2222-2222-2222-222222222222	kanban	doctor	t	2026-06-19 13:02:05.632527+05:30	\N
f51478e1-bc8d-4ec6-80ed-291eb6e85bed	b2222222-2222-2222-2222-222222222222	kanban	admin	t	2026-06-19 13:02:05.632527+05:30	\N
f2f0c750-d913-46ba-b8d8-6069686cf1da	b2222222-2222-2222-2222-222222222222	kanban	receptionist	f	2026-06-19 13:02:05.632527+05:30	\N
6e9acdbd-b2dd-440b-be68-cb4373d0c45e	b2222222-2222-2222-2222-222222222222	kanban	specialist	f	2026-06-19 13:02:05.632527+05:30	\N
422a013d-a7b3-497a-811a-2f3c647b159f	b2222222-2222-2222-2222-222222222222	billing	doctor	t	2026-06-19 13:02:05.632527+05:30	\N
2a69fcb2-96a4-4d69-bfe6-5a49bc77be79	b2222222-2222-2222-2222-222222222222	billing	admin	t	2026-06-19 13:02:05.632527+05:30	\N
5700a2cc-b904-4817-b766-939b1e870965	b2222222-2222-2222-2222-222222222222	billing	receptionist	t	2026-06-19 13:02:05.632527+05:30	\N
e3cc2358-4b46-45b4-9661-cf79ee2cff41	b2222222-2222-2222-2222-222222222222	billing	specialist	f	2026-06-19 13:02:05.632527+05:30	\N
0f2d6459-b0b1-491a-a9c6-dac54a37c9b8	b2222222-2222-2222-2222-222222222222	medicines	doctor	t	2026-06-19 13:02:05.632527+05:30	\N
5b550da3-4ccb-483d-b00c-053fb7667bf6	b2222222-2222-2222-2222-222222222222	medicines	admin	t	2026-06-19 13:02:05.632527+05:30	\N
fe2e9f74-7d27-4a7a-8d10-7bdc4991ebab	b2222222-2222-2222-2222-222222222222	medicines	receptionist	f	2026-06-19 13:02:05.632527+05:30	\N
3ee89cf0-d070-45c1-8ca5-a5f9ee5b585a	b2222222-2222-2222-2222-222222222222	medicines	specialist	f	2026-06-19 13:02:05.632527+05:30	\N
c1717e29-7a08-438a-b2b1-6003760858c6	b2222222-2222-2222-2222-222222222222	procedures	doctor	t	2026-06-19 13:02:05.632527+05:30	\N
8e9d6811-b805-4e8f-a07c-8e00088c4d4e	b2222222-2222-2222-2222-222222222222	procedures	admin	t	2026-06-19 13:02:05.632527+05:30	\N
dee9101b-0873-409c-83f1-b4f19576f6c9	b2222222-2222-2222-2222-222222222222	procedures	receptionist	f	2026-06-19 13:02:05.632527+05:30	\N
a1559618-02ac-4568-8999-43a4d79bda16	b2222222-2222-2222-2222-222222222222	procedures	specialist	f	2026-06-19 13:02:05.632527+05:30	\N
79d67f3d-a3f0-44b1-ad28-491d0873b201	b2222222-2222-2222-2222-222222222222	lab	doctor	t	2026-06-19 13:02:05.632527+05:30	\N
0230347b-282d-41d5-bc84-02d49d1526ba	b2222222-2222-2222-2222-222222222222	lab	admin	t	2026-06-19 13:02:05.632527+05:30	\N
e3d10926-77c3-4cca-93a2-66e7e9864cff	b2222222-2222-2222-2222-222222222222	lab	receptionist	t	2026-06-19 13:02:05.632527+05:30	\N
1d21ae31-e55e-4a7b-a105-f0ac8be76ed0	b2222222-2222-2222-2222-222222222222	counters	doctor	t	2026-06-19 13:02:05.632527+05:30	\N
de3dca15-936c-4e0a-8295-d6700d86092a	b2222222-2222-2222-2222-222222222222	counters	admin	t	2026-06-19 13:02:05.632527+05:30	\N
5863ccd7-bde3-40d0-980b-f2f422b5a01b	b2222222-2222-2222-2222-222222222222	counters	receptionist	f	2026-06-19 13:02:05.632527+05:30	\N
7612640e-2ae3-4175-a10c-0adcb3b3b04c	b2222222-2222-2222-2222-222222222222	counters	specialist	f	2026-06-19 13:02:05.632527+05:30	\N
23ec8918-3375-4bd1-8cd7-fe0d3d2290b8	b2222222-2222-2222-2222-222222222222	specialists	doctor	t	2026-06-19 13:02:05.632527+05:30	\N
b876735b-7593-48ad-9313-29ea2e16edb7	b2222222-2222-2222-2222-222222222222	specialists	admin	t	2026-06-19 13:02:05.632527+05:30	\N
072bedae-6566-451f-abe7-41c20224f198	b2222222-2222-2222-2222-222222222222	specialists	receptionist	f	2026-06-19 13:02:05.632527+05:30	\N
3e24259d-03c3-48d1-9b4d-04c06669da19	b2222222-2222-2222-2222-222222222222	specialists	specialist	f	2026-06-19 13:02:05.632527+05:30	\N
0e67e91d-2735-4a1e-b57b-838b28ef63b8	b2222222-2222-2222-2222-222222222222	staff	doctor	t	2026-06-19 13:02:05.632527+05:30	\N
96838c53-92f9-4de2-986e-a9fac1065d87	b2222222-2222-2222-2222-222222222222	staff	admin	t	2026-06-19 13:02:05.632527+05:30	\N
27062d71-da52-4b8f-8703-b4cf4645ce00	b2222222-2222-2222-2222-222222222222	staff	receptionist	f	2026-06-19 13:02:05.632527+05:30	\N
a582f5e1-671d-4c40-b1a5-6d2eb705de08	b2222222-2222-2222-2222-222222222222	staff	specialist	f	2026-06-19 13:02:05.632527+05:30	\N
c855cde3-6959-4354-8f9e-0da4910be203	b2222222-2222-2222-2222-222222222222	gallery	doctor	t	2026-06-19 13:02:05.632527+05:30	\N
ff371d51-c49a-494c-88ee-ade040a8901a	b2222222-2222-2222-2222-222222222222	gallery	admin	t	2026-06-19 13:02:05.632527+05:30	\N
8f25ef80-4129-4857-9d2d-037b3f3aac31	b2222222-2222-2222-2222-222222222222	gallery	receptionist	f	2026-06-19 13:02:05.632527+05:30	\N
8eb92377-8e2c-4367-8d7e-a9b2f71f367a	b2222222-2222-2222-2222-222222222222	gallery	specialist	f	2026-06-19 13:02:05.632527+05:30	\N
a7bd5f25-9f52-43fa-abe6-dc8dfc43f102	b2222222-2222-2222-2222-222222222222	website	doctor	t	2026-06-19 13:02:05.632527+05:30	\N
12f21b8b-5827-448c-8f77-89b661222b53	b2222222-2222-2222-2222-222222222222	website	admin	t	2026-06-19 13:02:05.632527+05:30	\N
c698c573-58f1-4ab9-8ac6-bed6bccee525	b2222222-2222-2222-2222-222222222222	website	receptionist	f	2026-06-19 13:02:05.632527+05:30	\N
608f74a1-5edb-4dbd-87ee-4b2391962d0d	b2222222-2222-2222-2222-222222222222	website	specialist	f	2026-06-19 13:02:05.632527+05:30	\N
10741532-9406-46e1-a1a7-8563ad61ea3b	b2222222-2222-2222-2222-222222222222	consult	doctor	t	2026-06-19 13:02:05.632527+05:30	\N
1ce0bdaa-a364-4087-b979-634d4abb001d	b2222222-2222-2222-2222-222222222222	consult	admin	t	2026-06-19 13:02:05.632527+05:30	\N
0100a308-6cc0-46e0-af8c-8762f26b5dd4	b2222222-2222-2222-2222-222222222222	consult	receptionist	f	2026-06-19 13:02:05.632527+05:30	\N
009a51ec-6a69-43eb-843c-061c3fc2ae3b	b2222222-2222-2222-2222-222222222222	consult	specialist	f	2026-06-19 13:02:05.632527+05:30	\N
d2be865a-dc90-4944-9a80-a215b1a58112	b2222222-2222-2222-2222-222222222222	messages	doctor	t	2026-06-19 13:02:05.632527+05:30	\N
ac95308c-35be-4752-ab12-ad5989d6886f	b2222222-2222-2222-2222-222222222222	messages	admin	t	2026-06-19 13:02:05.632527+05:30	\N
010a0e5a-61f6-4b75-8224-c218302621e8	b2222222-2222-2222-2222-222222222222	messages	receptionist	t	2026-06-19 13:02:05.632527+05:30	\N
358d3f70-aa8e-4141-b9ef-adf3449ca966	b2222222-2222-2222-2222-222222222222	messages	specialist	f	2026-06-19 13:02:05.632527+05:30	\N
65ceb63b-f339-48f2-ae8f-5e3cffb14f2b	b2222222-2222-2222-2222-222222222222	bulkwa	doctor	t	2026-06-19 13:02:05.632527+05:30	\N
1c53783a-12ba-4be0-bef5-9869a4fa43f6	b2222222-2222-2222-2222-222222222222	bulkwa	admin	t	2026-06-19 13:02:05.632527+05:30	\N
89bd3be3-2f63-4f98-a0a9-5b80f4f67455	b2222222-2222-2222-2222-222222222222	bulkwa	receptionist	f	2026-06-19 13:02:05.632527+05:30	\N
3c906aeb-25c0-4684-954f-ad854b276266	b2222222-2222-2222-2222-222222222222	bulkwa	specialist	f	2026-06-19 13:02:05.632527+05:30	\N
f7076e87-cb81-41b2-8148-8c87f11f102d	b2222222-2222-2222-2222-222222222222	settings	doctor	t	2026-06-19 13:02:05.632527+05:30	\N
b7c4aa36-5545-46b5-a83a-74c769f3f581	b2222222-2222-2222-2222-222222222222	settings	admin	t	2026-06-19 13:02:05.632527+05:30	\N
f4d1b8d2-cf35-4f94-9f6a-8ac3b6c5fe64	b2222222-2222-2222-2222-222222222222	settings	receptionist	f	2026-06-19 13:02:05.632527+05:30	\N
9459bd5e-a222-423c-86b9-8ebe508bdc71	b2222222-2222-2222-2222-222222222222	settings	specialist	f	2026-06-19 13:02:05.632527+05:30	\N
0e6c3a13-1e0d-449e-894b-2ac7c9f117b3	a1111111-1111-1111-1111-111111111111	mypractice	specialist	t	2026-06-20 09:44:51.841404+05:30	\N
ed0b74d3-bb43-4035-8bd5-6ae8737b859d	a1111111-1111-1111-1111-111111111111	mypractice	doctor	f	2026-06-20 09:44:51.841404+05:30	\N
6dca3c5f-8c3d-4b35-9a7b-be926c05ea00	a1111111-1111-1111-1111-111111111111	mypractice	admin	f	2026-06-20 09:44:51.841404+05:30	\N
43d10a5a-4464-4b81-80f6-97a47895c38b	a1111111-1111-1111-1111-111111111111	mypractice	receptionist	f	2026-06-20 09:44:51.841404+05:30	\N
cde23692-7e31-4bd2-8c64-4f19f02b14c0	a1111111-1111-1111-1111-111111111111	workshop	specialist	f	2026-06-20 09:44:51.841404+05:30	\N
377a9385-b9ea-461d-bff9-ddb0c17ef0dd	a1111111-1111-1111-1111-111111111111	revenue	specialist	f	2026-06-20 09:44:51.841404+05:30	\N
8c461225-9e9e-45d8-9777-ef148acc624a	a1111111-1111-1111-1111-111111111111	archived	specialist	f	2026-06-20 09:44:51.841404+05:30	\N
0fa08f5a-f029-4f3e-bc28-c2f974cb6e05	b2222222-2222-2222-2222-222222222222	mypractice	specialist	t	2026-06-20 09:44:51.841404+05:30	\N
21fc9cdd-b144-4476-bb9e-77e5a8090886	b2222222-2222-2222-2222-222222222222	mypractice	doctor	f	2026-06-20 09:44:51.841404+05:30	\N
e17bc312-3cd5-4a29-a2e0-f38c3915d687	b2222222-2222-2222-2222-222222222222	mypractice	admin	f	2026-06-20 09:44:51.841404+05:30	\N
1d5a421d-a431-4b03-ad35-db17ca4cf9de	b2222222-2222-2222-2222-222222222222	mypractice	receptionist	f	2026-06-20 09:44:51.841404+05:30	\N
4a150604-1cda-4c3d-aeba-f506e232afbc	b2222222-2222-2222-2222-222222222222	workshop	specialist	f	2026-06-20 09:44:51.841404+05:30	\N
330d87a5-accd-4f57-acd3-1285adaf25ff	b2222222-2222-2222-2222-222222222222	revenue	specialist	f	2026-06-20 09:44:51.841404+05:30	\N
36d3e120-522c-4a4a-b7ca-cf2dad7d5dd6	b2222222-2222-2222-2222-222222222222	archived	specialist	f	2026-06-20 09:44:51.841404+05:30	\N
c8ca0d16-c0e3-44bb-b544-d77f4735e1d6	b2222222-2222-2222-2222-222222222222	dashboard	specialist	t	2026-06-19 13:02:05.632527+05:30	\N
a36bcf5d-068a-44cd-92fc-3a2323a111fd	b2222222-2222-2222-2222-222222222222	queue	specialist	t	2026-06-19 13:02:05.632527+05:30	\N
cb27d5d9-f049-4911-8c03-f400dbaac2a7	b2222222-2222-2222-2222-222222222222	patients	specialist	t	2026-06-19 13:02:05.632527+05:30	\N
91f1bb54-651d-4450-8b62-67771404f4bd	b2222222-2222-2222-2222-222222222222	lab	specialist	t	2026-06-19 13:02:05.632527+05:30	\N
ddae95e9-4e02-4392-a2de-686c93085de9	a1111111-1111-1111-1111-111111111111	dashboard	doctor	t	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
8b442579-4ccd-47b5-803c-64a629a8c584	a1111111-1111-1111-1111-111111111111	appointments	doctor	t	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
c5e8c982-3a10-4806-b090-92647927d5b2	a1111111-1111-1111-1111-111111111111	patients	doctor	t	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
8dd39105-953c-48b4-9f3c-3cf6f8cdd2c9	a1111111-1111-1111-1111-111111111111	queue	doctor	t	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
84fea5eb-cdca-443d-949d-ac3544485273	a1111111-1111-1111-1111-111111111111	kanban	doctor	t	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
ec1b1381-b809-4fba-9111-37efd362b94f	a1111111-1111-1111-1111-111111111111	billing	doctor	t	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
9d45a5ce-f497-41fd-bac6-adacef744523	a1111111-1111-1111-1111-111111111111	medicines	doctor	t	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
4bfc6875-b36e-444a-8867-a8751f6e0282	a1111111-1111-1111-1111-111111111111	procedures	doctor	t	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
3ad1a727-fa59-45ed-90ef-231fde7a9dc8	a1111111-1111-1111-1111-111111111111	lab	doctor	t	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
a835d74f-aeae-4e46-940c-5204a4af80b5	a1111111-1111-1111-1111-111111111111	counters	doctor	t	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
e1f58e1b-0821-4684-81bf-6d5f588870cb	a1111111-1111-1111-1111-111111111111	specialists	doctor	t	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
7f1c53f9-cb6e-4d2d-8d5e-7a0f94025f4c	a1111111-1111-1111-1111-111111111111	staff	doctor	t	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
69dd5202-855e-44ec-845b-3c3a7a75a7e1	a1111111-1111-1111-1111-111111111111	gallery	doctor	t	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
2d8887dd-7ce2-4fc6-bbc6-7196df3724e7	a1111111-1111-1111-1111-111111111111	website	doctor	t	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
3530b4b7-0bbc-40dd-bb76-3cb666ca0d67	a1111111-1111-1111-1111-111111111111	consult	doctor	t	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
99ee23e7-00b0-4361-89f3-4d149a5c4d11	a1111111-1111-1111-1111-111111111111	messages	doctor	t	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
102c2312-42b4-4830-8aa7-604df2f6e537	a1111111-1111-1111-1111-111111111111	bulkwa	doctor	t	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
ef1cfe24-12bd-4362-96b2-70450eb6576d	a1111111-1111-1111-1111-111111111111	settings	doctor	t	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
d543d447-b482-47a4-96bb-bb4c6e792621	a1111111-1111-1111-1111-111111111111	dashboard	admin	t	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
f3264bb2-f3bd-401c-b588-db02b06e3a69	a1111111-1111-1111-1111-111111111111	appointments	admin	t	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
036cb4c8-a9b8-4a9b-b802-fa6a64c02fc4	a1111111-1111-1111-1111-111111111111	patients	admin	t	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
fdd0e8da-422a-4305-b0a6-9236c733a422	a1111111-1111-1111-1111-111111111111	queue	admin	t	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
b3f6d19d-1c95-4c4e-a005-397e16ca5a2a	a1111111-1111-1111-1111-111111111111	kanban	admin	t	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
c18403a7-663b-4cb4-ad75-2c5f61681398	a1111111-1111-1111-1111-111111111111	billing	admin	t	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
ac0e030b-9dfa-4d58-b3e4-06ea2503fc66	a1111111-1111-1111-1111-111111111111	medicines	admin	t	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
591032ba-cf24-45bb-82fe-ffba9014c9d4	a1111111-1111-1111-1111-111111111111	procedures	admin	t	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
f0bf2b1e-53ec-41f2-9177-fac2d657bc64	a1111111-1111-1111-1111-111111111111	lab	admin	t	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
bd1a152c-a3db-4eb3-8105-03af07c11c21	a1111111-1111-1111-1111-111111111111	counters	admin	t	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
0152453d-7a6f-4677-875d-9fdf357422e6	a1111111-1111-1111-1111-111111111111	specialists	admin	t	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
ae713e33-aa50-4380-9157-c89d0fd5790f	a1111111-1111-1111-1111-111111111111	staff	admin	t	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
4976b8fb-ba38-4f7e-856e-202c581bbc13	a1111111-1111-1111-1111-111111111111	gallery	admin	t	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
ea05ca45-f266-475f-b02e-aec762f38296	a1111111-1111-1111-1111-111111111111	website	admin	t	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
09b7d5f8-18f1-4244-aef5-d75674fd4d8d	a1111111-1111-1111-1111-111111111111	consult	admin	t	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
c51fd7ee-9b8b-4671-a3d8-d6b013cd11c0	a1111111-1111-1111-1111-111111111111	messages	admin	t	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
80a01e6d-beea-48ae-a8fc-f1fdb5250606	a1111111-1111-1111-1111-111111111111	bulkwa	admin	t	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
c9887ff4-2fda-4698-9f3e-46cefe438cd5	a1111111-1111-1111-1111-111111111111	settings	admin	t	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
242037a8-fcda-47e8-9f7d-621196d96d6e	a1111111-1111-1111-1111-111111111111	dashboard	receptionist	f	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
900d92b7-f0f0-48de-bd38-3b8b8cdd04d7	a1111111-1111-1111-1111-111111111111	appointments	receptionist	t	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
32be5996-2a03-472d-bc40-658a594371a9	a1111111-1111-1111-1111-111111111111	patients	receptionist	f	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
2c1a931b-ef1e-43c8-a90d-ae60230629c9	a1111111-1111-1111-1111-111111111111	queue	receptionist	f	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
6d47ef00-632b-4049-b7a8-1411a972420d	a1111111-1111-1111-1111-111111111111	kanban	receptionist	f	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
3dfda049-7d33-42ad-9edc-0b29c5befef2	a1111111-1111-1111-1111-111111111111	billing	receptionist	f	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
8729d3a2-00f4-4551-b744-392e19e386a4	a1111111-1111-1111-1111-111111111111	medicines	receptionist	f	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
7c2d6b5c-d73f-44d0-8bbb-1923caef0a03	a1111111-1111-1111-1111-111111111111	procedures	receptionist	f	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
6993a64f-24dd-4c9c-8b7e-16202a090214	a1111111-1111-1111-1111-111111111111	lab	receptionist	t	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
70499588-1075-4d17-9588-8f93adb288f1	a1111111-1111-1111-1111-111111111111	counters	receptionist	f	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
fcbcfe57-6678-45e8-b103-59b95ba16720	a1111111-1111-1111-1111-111111111111	specialists	receptionist	f	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
6eaeef59-5b23-49fd-a84b-e5a4097eabad	a1111111-1111-1111-1111-111111111111	staff	receptionist	f	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
bcf6258e-a927-444a-b124-29dfdd552fc7	a1111111-1111-1111-1111-111111111111	gallery	receptionist	f	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
1e1efb03-02e6-4cf8-9583-63591ae5459d	a1111111-1111-1111-1111-111111111111	website	receptionist	f	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
4217fb4b-2477-47f9-97c7-6c0aab891c94	a1111111-1111-1111-1111-111111111111	consult	receptionist	f	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
82c74758-6065-49a6-a7e4-026b75718890	a1111111-1111-1111-1111-111111111111	messages	receptionist	f	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
8872471c-a9c7-4aae-840e-70826c1a6a87	a1111111-1111-1111-1111-111111111111	bulkwa	receptionist	f	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
cad01fd4-216c-480a-b4a2-2692ec945164	a1111111-1111-1111-1111-111111111111	settings	receptionist	f	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
1482304d-eb36-4a74-89d7-53887bb60da8	a1111111-1111-1111-1111-111111111111	dashboard	specialist	f	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
ed5d0597-983c-4b13-a3a1-4496b02d29ba	a1111111-1111-1111-1111-111111111111	appointments	specialist	f	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
3f3b9437-b3bd-49c9-88f3-62b56fa0963b	a1111111-1111-1111-1111-111111111111	patients	specialist	t	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
453a5bd0-b644-4c2d-9731-227e12424aff	a1111111-1111-1111-1111-111111111111	queue	specialist	t	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
478e7f9f-6127-49a1-8144-2013e43907cc	a1111111-1111-1111-1111-111111111111	kanban	specialist	f	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
668c9e3b-cc98-4de0-92b7-c4e8fc4b7645	a1111111-1111-1111-1111-111111111111	billing	specialist	f	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
7b02270e-2950-45b2-b23e-5065d54c8856	a1111111-1111-1111-1111-111111111111	medicines	specialist	f	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
2b75e07c-bac9-4035-82d0-822258235e53	a1111111-1111-1111-1111-111111111111	procedures	specialist	f	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
05bc3b5d-2021-4d28-bae3-8474f8937d61	a1111111-1111-1111-1111-111111111111	lab	specialist	f	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
d0fdb16c-a99f-4ef3-ba10-779fc944f368	a1111111-1111-1111-1111-111111111111	counters	specialist	f	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
626c5116-26fb-4c5d-90a2-112563bcbf52	a1111111-1111-1111-1111-111111111111	specialists	specialist	f	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
036cc17d-f633-4062-ac50-8770c3e6f899	a1111111-1111-1111-1111-111111111111	staff	specialist	f	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
cb9ea2e3-f6e6-4b11-b7fa-0a062dd7dfcf	a1111111-1111-1111-1111-111111111111	gallery	specialist	f	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
d3ef6290-dfae-4868-ab7e-1dd6e0efc5dd	a1111111-1111-1111-1111-111111111111	website	specialist	f	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
0ba3f84d-de1b-43e5-8619-75df5e746da2	a1111111-1111-1111-1111-111111111111	consult	specialist	f	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
a04476ba-2026-4237-be46-6d3cd44f3d27	a1111111-1111-1111-1111-111111111111	messages	specialist	f	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
efc44a26-e197-4477-bfec-a20229c65529	a1111111-1111-1111-1111-111111111111	bulkwa	specialist	f	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
d2de184c-a6d0-474b-a599-3b8758b4e980	a1111111-1111-1111-1111-111111111111	settings	specialist	f	2026-06-21 11:16:38.238511+05:30	d1111111-1111-1111-1111-111111111111
\.


--
-- Data for Name: patient_credits; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.patient_credits (id, patient_id, clinic_id, amount, reason, rating_id, applied_to_plan_id, applied_to_payment_id, is_used, expires_at, created_at, used_at, notes) FROM stdin;
\.


--
-- Data for Name: patient_health; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.patient_health (id, patient_id, diabetes, hypertension, heart_disease, thyroid, asthma, kidney_disease, liver_disease, pregnant, blood_thinner, allergies, previous_surgeries, current_medicines, smoking, tobacco, other_conditions, updated_at) FROM stdin;
34755979-1ee5-40a6-a3a2-c852313dba75	10000000-0000-4000-8000-000000000101	f	f	f	f	f	f	f	f	f				f	f		2026-06-20 22:37:56.619243+05:30
f02b8a36-491d-418a-88a7-b4c56599234b	10000000-0000-4000-8000-000000000102	t	f	f	f	f	f	f	f	f			Metformin	f	f		2026-06-20 22:37:56.619243+05:30
9504e379-1219-4e78-8020-53ed6d6bf3ae	10000000-0000-4000-8000-000000000103	f	t	f	f	f	f	f	f	f	Penicillin		Amlodipine	f	f		2026-06-20 22:37:56.619243+05:30
a4387de7-55b1-4af5-8646-b535f0fea4d1	10000000-0000-4000-8000-000000000104	f	f	f	f	f	f	f	f	f				f	f		2026-06-20 22:37:56.619243+05:30
\.


--
-- Data for Name: patient_images; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.patient_images (id, patient_id, clinic_id, image_url, thumbnail_url, image_type, title, description, file_size_bytes, mime_type, width, height, linked_tooth_number, linked_plan_id, linked_sitting_id, linked_session_id, captured_date, uploaded_by, uploaded_at, is_active) FROM stdin;
\.


--
-- Data for Name: patient_portal_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.patient_portal_tokens (id, patient_id, token, expires_at, used_count, last_used_at, created_at) FROM stdin;
4c155a01-600e-47d4-a53e-99a3909d8f5e	10000000-0000-4000-8000-000000000102	KAKncL829Imm7NrNiG3Bhni10U9F8KcWP1Re2zvgMMo	2026-07-22 16:51:26.315209+05:30	0	\N	2026-06-22 22:21:26.31724+05:30
\.


--
-- Data for Name: patient_ratings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.patient_ratings (id, patient_id, clinic_id, visit_id, appointment_id, rating, comment, asked_at, submitted_at, credit_applied, credit_id, token) FROM stdin;
\.


--
-- Data for Name: patient_uploads; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.patient_uploads (id, patient_id, appointment_id, file_name, file_path, file_type, mime_type, caption, uploaded_by, uploaded_at, tooth_number, session_id, file_kind) FROM stdin;
\.


--
-- Data for Name: patients; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.patients (id, name, phone, age, gender, date_of_birth, address, preferred_clinic_id, total_visits, wa_session_state, created_at, updated_at, is_active, is_new_no_treatment, auto_delete_at, manually_flagged_to_keep, existing_illnesses, chairside_notes, alternate_whatsapp_number) FROM stdin;
10000000-0000-4000-8000-000000000102	Rohan Gupta	9876500102	35	Male	\N	\N	a1111111-1111-1111-1111-111111111111	0	{}	2026-06-20 22:37:56.401044+05:30	2026-06-20 22:37:56.401044+05:30	t	f	\N	f	["Diabetes"]	\N	\N
10000000-0000-4000-8000-000000000104	Arjun Rao	9876500104	24	Male	\N	\N	a1111111-1111-1111-1111-111111111111	0	{}	2026-06-20 22:37:56.401044+05:30	2026-06-20 22:37:56.401044+05:30	t	f	\N	f	[]	\N	\N
10000000-0000-4000-8000-000000000101	Asha Verma	9876500101	29	Female	\N	\N	a1111111-1111-1111-1111-111111111111	3	{}	2026-06-20 22:37:56.401044+05:30	2026-06-20 22:37:56.401044+05:30	t	f	\N	f	["Sensitive teeth"]	\N	9876501101
10000000-0000-4000-8000-000000000103	Meera Nair	9876500103	41	Female	\N	\N	a1111111-1111-1111-1111-111111111111	4	{}	2026-06-20 22:37:56.401044+05:30	2026-06-20 22:37:56.401044+05:30	t	f	\N	f	["Hypertension"]		9876501103
\.


--
-- Data for Name: payment_transactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payment_transactions (id, patient_id, plan_id, appointment_id, clinic_id, amount, payment_mode, razorpay_payment_id, razorpay_link_url, remarks, receipt_sent, date, created_at, transaction_reference, notes) FROM stdin;
e62ab2cd-b596-46ec-9605-3a7c8ee77fa3	10000000-0000-4000-8000-000000000101	\N	\N	a1111111-1111-1111-1111-111111111111	500.00	card	\N	\N	\N	f	2026-06-20	2026-06-20 22:40:47.484261+05:30	\N	\N
1aceac96-7aa9-4e35-8ccb-18b28c7ef050	10000000-0000-4000-8000-000000000101	\N	\N	a1111111-1111-1111-1111-111111111111	100.00	card	\N	\N	\N	f	2026-06-20	2026-06-20 22:42:22.22418+05:30	\N	\N
12fa4468-9222-4469-9fec-06d2a0ce27f8	10000000-0000-4000-8000-000000000103	\N	\N	a1111111-1111-1111-1111-111111111111	500.00	cash	\N	\N	\N	f	2026-06-20	2026-06-20 23:47:44.689168+05:30	\N	\N
\.


--
-- Data for Name: phone_consultations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.phone_consultations (id, clinic_id, patient_id, patient_name, patient_phone, patient_age, patient_gender, complaint, duration_complaint, fee_amount, razorpay_order_id, razorpay_payment_id, payment_status, paid_at, status, doctor_id, called_at, completed_at, rx_id, rx_sent_at, consult_notes, created_at, source) FROM stdin;
\.


--
-- Data for Name: plan_revisions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.plan_revisions (id, plan_id, revision_number, change_summary, item_snapshot, created_by, created_at) FROM stdin;
2e6f2471-2fbf-4ff5-87d2-ecd4374f1931	61eb2c08-1283-4f7d-b43c-fed25b06407c	1	Added Specialist flow verification Specialist work — ₹0	{"action": "add", "item_id": "c3a950cd-72dd-4a2c-97e8-21fdaf02f46a"}	07e07975-94d7-4c30-8a71-7e75f420092f	2026-06-20 17:59:55.269947
56f9ea36-2ce6-4259-bc27-482e88e16580	20000000-0000-4000-8000-000000000101	1	Added Bridge (per unit) 42 — ₹5,000	{"action": "add", "item_id": "7b8627a9-1738-4de2-8efa-f235afa5bb86"}	07e07975-94d7-4c30-8a71-7e75f420092f	2026-06-20 22:39:34.55124
fc2a76ec-309e-4d65-805c-a3ba5720f5cb	20000000-0000-4000-8000-000000000103	1	Added Scaling 12 — ₹0	{"action": "add", "item_id": "7ba33b0d-e332-4fbc-bce6-704542edbe2a"}	d1111111-1111-1111-1111-111111111111	2026-06-20 23:38:58.007886
c4688de3-ca5f-4667-99fb-6d90c9f102c4	20000000-0000-4000-8000-000000000103	2	Added Scaling 11 — ₹0	{"action": "add", "item_id": "dfc2ffcd-177a-4b5e-8998-d2540152a91e"}	d1111111-1111-1111-1111-111111111111	2026-06-20 23:39:07.518449
a651b42d-af26-41eb-a0db-dd83b5267df8	20000000-0000-4000-8000-000000000103	3	Updated Bridge (per unit) 12 (rate ₹5,000, teeth 12)	{"action": "edit", "item_id": "7ba33b0d-e332-4fbc-bce6-704542edbe2a"}	d1111111-1111-1111-1111-111111111111	2026-06-20 23:40:01.399346
2606005b-b88f-42b3-a84c-62dbfc0c670a	20000000-0000-4000-8000-000000000103	4	Removed Scaling 11	{"action": "delete", "item_id": "dfc2ffcd-177a-4b5e-8998-d2540152a91e"}	d1111111-1111-1111-1111-111111111111	2026-06-20 23:40:24.422086
6c5689d8-6736-4e5a-a1cb-90264b3071db	20000000-0000-4000-8000-000000000103	5	Added Bridge (per unit) 11 — ₹5,000	{"action": "add", "item_id": "e45dda86-03bf-4882-951a-a7a38548b9eb"}	d1111111-1111-1111-1111-111111111111	2026-06-20 23:40:39.115034
eb59ff4a-fe67-41d3-ae79-f66a6bb3de07	20000000-0000-4000-8000-000000000103	6	Duplicated Bridge (per unit) 12	{"action": "duplicate", "item_id": "ab36bd0a-0aef-4770-bc8e-38aa0619fa6a"}	d1111111-1111-1111-1111-111111111111	2026-06-20 23:40:48.915835
907a1fed-a355-4989-8f70-0073eed1b2cf	20000000-0000-4000-8000-000000000103	7	Updated Crown - PFM 12 (teeth 12)	{"action": "edit", "item_id": "ab36bd0a-0aef-4770-bc8e-38aa0619fa6a"}	d1111111-1111-1111-1111-111111111111	2026-06-20 23:41:01.90721
a74190e8-0b72-41ea-b1a0-0aade78a67a3	20000000-0000-4000-8000-000000000103	8	Visit: Tooth Preparation (Bridge (per unit) 11); Impression (Bridge (per unit) 11)	{"session_id": "ed98d664-efe0-4473-8f32-7db50ab4011a"}	d1111111-1111-1111-1111-111111111111	2026-06-20 23:47:00.476725
ecf7b5c3-ea0e-430f-90ad-156b10211bc3	20000000-0000-4000-8000-000000000102	1	Added RCT 28 — ₹0	{"action": "add", "item_id": "6a6d36e6-cb2c-4d2c-b2ef-3d07fbef737a"}	d1111111-1111-1111-1111-111111111111	2026-06-21 00:43:21.664884
5df6dd7e-9bbb-4f42-8bac-26cd55515721	20000000-0000-4000-8000-000000000102	2	Added Filling 11 — ₹0	{"action": "add", "item_id": "a9c40434-4308-4553-a208-1333941f43fb"}	d1111111-1111-1111-1111-111111111111	2026-06-21 00:43:29.956431
c3aa1821-3352-41d2-bccd-e724949d9725	20000000-0000-4000-8000-000000000102	3	Added Flap Surgery 12 — ₹5,000	{"action": "add", "item_id": "92e3947b-b68c-425a-9943-98bdf961ec03"}	d1111111-1111-1111-1111-111111111111	2026-06-22 22:40:48.422771
e980979d-ee1c-46ce-baa7-b3ba16267384	20000000-0000-4000-8000-000000000102	4	Added Root Canal (RCT) 12 — ₹5,000	{"action": "add", "item_id": "a99f187d-c151-44d7-98b7-104b41a2cbc6"}	d1111111-1111-1111-1111-111111111111	2026-06-22 22:40:52.202579
\.


--
-- Data for Name: prescriptions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.prescriptions (id, appointment_id, plan_id, patient_id, doctor_id, clinic_id, serial_number, diagnosis, doctor_raw_notes, medicines, visible_advice, internal_notes, followup_date, pdf_url, sent_via_whatsapp, sent_at, created_at, complaint, diagnoses_list, qr_code_id) FROM stdin;
2cc8e70c-d66c-477c-8c6c-e47d71cb490b	30000000-0000-4000-8000-000000000101	20000000-0000-4000-8000-000000000101	10000000-0000-4000-8000-000000000101	d1111111-1111-1111-1111-111111111111	a1111111-1111-1111-1111-111111111111	1	\N	\N	[]	\N	\N	\N	\N	f	\N	2026-06-20 22:40:33.9048+05:30	Tooth pain	[]	\N
d681ede0-bd91-4be8-9f30-06f0a92ff1c2	5607d539-d841-4ff4-88d7-10ea8b601215	20000000-0000-4000-8000-000000000101	10000000-0000-4000-8000-000000000101	d1111111-1111-1111-1111-111111111111	a1111111-1111-1111-1111-111111111111	2	\N	\N	[]	\N	\N	\N	\N	f	\N	2026-06-20 22:42:11.99367+05:30	Tooth pain	[]	\N
2ac2ce69-8914-4ffd-91f7-0694560fcb18	30000000-0000-4000-8000-000000000103	20000000-0000-4000-8000-000000000103	10000000-0000-4000-8000-000000000103	d1111111-1111-1111-1111-111111111111	a1111111-1111-1111-1111-111111111111	1	\N	\N	[{"dose": "1 tab", "name": "", "duration": "5 days", "strength": "", "frequency": "1-0-1", "instructions": ""}]	Clean under bridge with floss threader	\N	2026-06-21	\N	f	\N	2026-06-20 23:47:00.476725+05:30	Loose temporary crown	[]	\N
\.


--
-- Data for Name: procedure_catalog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.procedure_catalog (id, name, category, cost_min, cost_max, default_cost, followup_days, common_advice, is_active, sort_order, created_at, updated_at, is_tooth_based, work_steps, usage_count, added_from, requires_lab, lab_work_type) FROM stdin;
20000000-0000-4000-8000-000000000002	X-Ray (IOPA)	Diagnostic	150.00	300.00	200.00	\N	[]	t	0	2026-06-04 19:16:25.892998+05:30	2026-06-04 19:16:25.892998+05:30	f	[]	0	manual	f	\N
20000000-0000-4000-8000-000000000003	X-Ray (OPG)	Diagnostic	400.00	800.00	500.00	\N	[]	t	0	2026-06-04 19:16:25.892998+05:30	2026-06-04 19:16:25.892998+05:30	f	[]	0	manual	f	\N
20000000-0000-4000-8000-000000000005	Fluoride Application	Preventive	300.00	600.00	400.00	180	["No eating/drinking 30 min"]	t	0	2026-06-04 19:16:25.892998+05:30	2026-06-04 19:16:25.892998+05:30	f	[]	0	manual	f	\N
20000000-0000-4000-8000-000000000010	Pulpotomy	Endodontics	1000.00	2500.00	1500.00	7	["Avoid hard food on treated side"]	t	0	2026-06-04 19:16:25.892998+05:30	2026-06-04 19:16:25.892998+05:30	f	[]	0	manual	f	\N
20000000-0000-4000-8000-000000000018	Abscess Drainage	Surgery	500.00	1500.00	800.00	3	["Continue warm saline", "Complete antibiotic course"]	t	0	2026-06-04 19:16:25.892998+05:30	2026-06-04 19:16:25.892998+05:30	f	[]	0	manual	f	\N
20000000-0000-4000-8000-000000000027	Space Maintainer	Pediatric	1500.00	3000.00	2000.00	30	["Dont play with appliance"]	t	0	2026-06-04 19:16:25.892998+05:30	2026-06-04 19:16:25.892998+05:30	f	[]	0	manual	f	\N
20000000-0000-4000-8000-000000000028	Sealant	Preventive	500.00	1000.00	700.00	180	["Avoid sticky food 24 hrs"]	t	0	2026-06-04 19:16:25.892998+05:30	2026-06-04 19:16:25.892998+05:30	f	[]	0	manual	f	\N
20000000-0000-4000-8000-000000000011	Crown - PFM	Prosthodontics	3000.00	6000.00	4000.00	7	["Temporary crown - avoid sticky food"]	t	0	2026-06-08 16:42:02.378576+05:30	2026-06-08 16:42:02.378576+05:30	t	["Tooth Preparation", "Impression", "Crown Trial", "Crown Cementation"]	0	manual	t	Crown (PFM)
20000000-0000-4000-8000-000000000012	Crown - Zirconia	Prosthodontics	6000.00	15000.00	10000.00	7	["Temporary crown - avoid sticky food"]	t	0	2026-06-08 16:42:02.378576+05:30	2026-06-08 16:42:02.378576+05:30	t	["Tooth Preparation", "Impression", "Crown Trial", "Crown Cementation"]	0	manual	t	Crown (PFM)
20000000-0000-4000-8000-000000000020	Implant Crown	Implantology	10000.00	25000.00	15000.00	7	["Avoid hard food initially"]	t	0	2026-06-04 19:16:25.892998+05:30	2026-06-04 19:16:25.892998+05:30	t	["Tooth Preparation", "Impression", "Crown Trial", "Crown Cementation"]	0	manual	t	Implant Abutment + Crown
20000000-0000-4000-8000-000000000019	Dental Implant	Implantology	25000.00	50000.00	35000.00	14	["No chewing implant side 2 weeks", "Soft diet 1 week", "Follow-ups critical"]	t	0	2026-06-04 19:16:25.892998+05:30	2026-06-04 19:16:25.892998+05:30	t	["Implant Placement", "Healing Cap", "Impression", "Crown Placement"]	0	manual	t	Implant Abutment + Crown
20000000-0000-4000-8000-000000000009	RCT Re-treatment	Endodontics	5000.00	12000.00	7000.00	7	["Multiple visits needed"]	t	0	2026-06-04 19:16:25.892998+05:30	2026-06-04 19:16:25.892998+05:30	t	["Access Opening", "BMP", "Obturation", "Post & Core", "Crown Preparation", "Crown Cementation"]	0	manual	f	\N
20000000-0000-4000-8000-000000000006	Filling - GIC	Restorative	500.00	1000.00	600.00	\N	["Avoid chewing on filled side 2 hrs", "Mild sensitivity normal"]	t	0	2026-06-08 16:42:02.378576+05:30	2026-06-08 16:42:02.378576+05:30	t	["Filling Completed"]	0	manual	f	\N
20000000-0000-4000-8000-000000000017	Extraction - Surgical	Surgery	2000.00	5000.00	3000.00	7	["Bite gauze 45 min", "Ice pack 24 hrs", "No spitting/straw", "Soft diet 3-4 days", "Swelling 2-3 days normal"]	t	0	2026-06-08 16:42:02.378576+05:30	2026-06-08 16:42:02.378576+05:30	t	["Extraction Completed", "Suturing", "Suture Removal"]	0	manual	f	\N
20000000-0000-4000-8000-000000000016	Extraction - Simple	Surgery	500.00	1500.00	800.00	7	["Bite gauze 30 min", "No spitting/straw 24 hrs", "Cold compress 24 hrs", "Warm saline next day", "Soft diet 2 days"]	t	0	2026-06-08 16:42:02.378576+05:30	2026-06-08 16:42:02.378576+05:30	t	["Extraction Completed", "Suturing", "Suture Removal"]	0	manual	f	\N
20000000-0000-4000-8000-000000000024	Veneer (per tooth)	Cosmetic	5000.00	15000.00	8000.00	7	["Avoid biting hard objects"]	t	0	2026-06-04 19:16:25.892998+05:30	2026-06-04 19:16:25.892998+05:30	t	["Tooth Preparation", "Impression", "Veneer Trial", "Veneer Cementation"]	0	manual	f	\N
cfaac738-ecec-4fbc-b951-5838680f471b	Dressing	Tooth-Based	210.00	450.00	300.00	\N	[]	t	0	2026-06-11 16:44:17.008134+05:30	2026-06-11 16:44:17.008134+05:30	t	["Dressing Done"]	0	spec_seed	f	\N
20000000-0000-4000-8000-000000000004	Scaling & Polishing	Preventive	500.00	1500.00	1000.00	180	["Avoid eating 1 hour after", "Mild sensitivity normal 2-3 days", "Use soft bristle brush"]	t	0	2026-06-04 19:16:25.892998+05:30	2026-06-04 19:16:25.892998+05:30	f	["Scaling Completed", "Polishing"]	0	manual	f	\N
20000000-0000-4000-8000-000000000025	Deep Cleaning / SRP	Periodontics	1000.00	3000.00	1500.00	14	["Sensitivity normal 1 week"]	t	0	2026-06-04 19:16:25.892998+05:30	2026-06-04 19:16:25.892998+05:30	f	["Scaling Completed", "Polishing"]	0	manual	f	\N
f53b6ed2-e640-4866-8cfe-9996bc44f8c4	TMP P2	Endodontics	1000.00	1500.00	1200.00	7	["Soft diet"]	t	0	2026-06-19 10:15:01.097992+05:30	2026-06-19 10:15:01.097994+05:30	f	[]	0	manual	f	\N
20000000-0000-4000-8000-000000000023	Teeth Whitening	Cosmetic	5000.00	15000.00	8000.00	\N	["Avoid colored food/drinks 48 hrs", "Sensitivity 1-2 days normal"]	t	0	2026-06-04 19:16:25.892998+05:30	2026-06-04 19:16:25.892998+05:30	f	["Whitening Session"]	0	manual	f	\N
20000000-0000-4000-8000-000000000021	Braces - Metal	Orthodontics	25000.00	50000.00	35000.00	30	["Discomfort 3-5 days normal", "Use ortho wax", "Avoid hard/sticky food"]	t	0	2026-06-08 16:42:02.378576+05:30	2026-06-08 16:42:02.378576+05:30	f	["Adjustment Done", "Wire Change"]	0	manual	f	\N
20000000-0000-4000-8000-000000000022	Braces - Ceramic	Orthodontics	35000.00	70000.00	50000.00	30	["Avoid staining food (tea, coffee, turmeric)"]	t	0	2026-06-08 16:42:02.378576+05:30	2026-06-08 16:42:02.378576+05:30	f	["Adjustment Done", "Wire Change"]	0	manual	f	\N
df4d9e9b-7b4d-4676-b60d-690963fe76ec	Implant Consultation	General	350.00	750.00	500.00	\N	[]	t	0	2026-06-11 16:44:17.008134+05:30	2026-06-11 16:44:17.008134+05:30	f	["Consultation Done"]	0	spec_seed	f	\N
82027f64-3d57-4bc3-a316-0fae5bc68e2f	Oral Hygiene Review	General	140.00	300.00	200.00	\N	[]	t	0	2026-06-11 16:44:17.008134+05:30	2026-06-11 16:44:17.008134+05:30	f	["Review Done"]	0	spec_seed	f	\N
20000000-0000-4000-8000-000000000015	Partial Denture	Prosthodontics	3000.00	10000.00	6000.00	3	["Remove at night", "Clean daily"]	t	0	2026-06-04 19:16:25.892998+05:30	2026-06-04 19:16:25.892998+05:30	f	["Impression", "Bite Registration", "Try-in", "Denture Delivery"]	0	manual	t	RPD (Acrylic)
20000000-0000-4000-8000-000000000001	Consultation	Diagnostic	200.00	500.00	300.00	\N	[]	t	0	2026-06-04 19:16:25.892998+05:30	2026-06-04 19:16:25.892998+05:30	f	["Consultation Done"]	2	manual	f	\N
20000000-0000-4000-8000-000000000014	Complete Denture	Prosthodontics	5000.00	15000.00	10000.00	3	["Practice speaking", "Start soft food", "Remove at night"]	t	0	2026-06-04 19:16:25.892998+05:30	2026-06-04 19:16:25.892998+05:30	f	["Impression", "Bite Registration", "Try-in", "Denture Delivery"]	2	manual	t	Complete Denture
20000000-0000-4000-8000-000000000007	Filling - Composite	Restorative	800.00	2000.00	1200.00	\N	["Avoid eating 2 hours", "Avoid hot/cold food 24 hrs"]	t	0	2026-06-08 16:42:02.378576+05:30	2026-06-08 16:42:02.378576+05:30	t	["Filling Completed"]	6	manual	f	\N
20000000-0000-4000-8000-000000000013	Bridge (per unit)	Prosthodontics	3000.00	10000.00	5000.00	7	["Clean under bridge with floss threader"]	t	0	2026-06-04 19:16:25.892998+05:30	2026-06-04 19:16:25.892998+05:30	t	["Tooth Preparation", "Impression", "Bridge Trial", "Bridge Cementation"]	5	manual	t	Bridge (3-unit PFM)
428da199-0a36-468f-8a95-527d9d7e1b1c	a	Diagnostic	0.00	0.00	999.00	\N	[]	t	0	2026-06-22 22:24:56.664997+05:30	2026-06-22 22:31:30.395867+05:30	f	[]	0	manual	f	\N
20000000-0000-4000-8000-000000000026	Flap Surgery	Periodontics	3000.00	8000.00	5000.00	7	["No brushing surgical area 1 week", "Soft diet 3 days"]	t	0	2026-06-04 19:16:25.892998+05:30	2026-06-04 19:16:25.892998+05:30	f	[]	10	manual	f	\N
20000000-0000-4000-8000-000000000008	Root Canal (RCT)	Endodontics	3000.00	8000.00	5000.00	7	["Dont chew treated side until crown", "Discomfort 2-3 days normal", "Complete antibiotic course", "Crown within 2 weeks"]	t	0	2026-06-04 19:16:25.892998+05:30	2026-06-04 19:16:25.892998+05:30	t	["Access Opening", "BMP", "Obturation", "Post & Core", "Crown Preparation", "Crown Cementation"]	7	manual	f	\N
\.


--
-- Data for Name: procedure_medicine_map; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.procedure_medicine_map (id, procedure_id, medicine_id, is_default) FROM stdin;
82b73805-e399-4c58-bfe8-57f3f2a59220	20000000-0000-4000-8000-000000000004	10000000-0000-4000-8000-000000000014	t
9185e429-e6a3-423d-b06e-94e76a8b5246	20000000-0000-4000-8000-000000000008	10000000-0000-4000-8000-000000000001	t
703fca9d-8a64-4500-a988-2771129a3a4c	20000000-0000-4000-8000-000000000008	10000000-0000-4000-8000-000000000007	t
898a5289-9b4a-453a-b1d4-08c2af21281a	20000000-0000-4000-8000-000000000008	10000000-0000-4000-8000-000000000012	t
f555fc3b-14e6-4273-a232-f1fc1e612a2e	20000000-0000-4000-8000-000000000008	10000000-0000-4000-8000-000000000014	t
71d98cea-c027-4146-ad29-8586f04afff2	20000000-0000-4000-8000-000000000009	10000000-0000-4000-8000-000000000002	t
ad24ae86-ed4a-4d3f-a336-d9c228034f9d	20000000-0000-4000-8000-000000000009	10000000-0000-4000-8000-000000000007	t
c2cba890-bca3-4699-8596-3c975a364192	20000000-0000-4000-8000-000000000009	10000000-0000-4000-8000-000000000012	t
16c9bb5b-d92b-4493-813f-117c26f134e6	20000000-0000-4000-8000-000000000018	10000000-0000-4000-8000-000000000002	t
8603c47a-dde6-4bb4-aa55-6e0beebf0ad6	20000000-0000-4000-8000-000000000018	10000000-0000-4000-8000-000000000004	t
6345a080-13b2-47bb-b601-794c5ca3dbb1	20000000-0000-4000-8000-000000000018	10000000-0000-4000-8000-000000000007	t
977a7827-b6f8-4b5c-922a-6939ddb078c3	20000000-0000-4000-8000-000000000018	10000000-0000-4000-8000-000000000012	t
5c415acf-a577-4656-899e-b0ddcf13bab8	20000000-0000-4000-8000-000000000018	10000000-0000-4000-8000-000000000020	t
888a7d93-ad03-44af-b6f8-229c3783d638	20000000-0000-4000-8000-000000000019	10000000-0000-4000-8000-000000000002	t
1fecf269-a2cd-4641-8470-d6881f289fb7	20000000-0000-4000-8000-000000000019	10000000-0000-4000-8000-000000000007	t
1d7059ac-7d5e-4444-8eae-04857c3ce623	20000000-0000-4000-8000-000000000019	10000000-0000-4000-8000-000000000012	t
4e32680a-ac25-49b9-afa4-594086f7ca49	20000000-0000-4000-8000-000000000019	10000000-0000-4000-8000-000000000014	t
7503aeeb-9a1b-4819-b7e2-be243cca308a	20000000-0000-4000-8000-000000000023	10000000-0000-4000-8000-000000000019	t
9f78e7e5-df64-43fd-bee8-d05ed6d9c9b4	20000000-0000-4000-8000-000000000025	10000000-0000-4000-8000-000000000014	t
953b2ce1-fd28-4c62-bf2b-c936827e2919	20000000-0000-4000-8000-000000000025	10000000-0000-4000-8000-000000000004	t
3697ac92-7a16-4824-b793-efb263a83caa	20000000-0000-4000-8000-000000000026	10000000-0000-4000-8000-000000000002	t
4ee0b284-2a0e-4b96-8ec0-faf9baf72724	20000000-0000-4000-8000-000000000026	10000000-0000-4000-8000-000000000004	t
759c2961-c96c-4085-8952-1e47aee673b9	20000000-0000-4000-8000-000000000026	10000000-0000-4000-8000-000000000007	t
f178a40a-f2bb-4ebe-8971-211f17cd391b	20000000-0000-4000-8000-000000000026	10000000-0000-4000-8000-000000000012	t
a31ff90e-13a4-4408-8553-0e1a2ecd089a	20000000-0000-4000-8000-000000000026	10000000-0000-4000-8000-000000000014	t
61c1f3e9-8f30-4a42-86d6-26e2872ea90a	f53b6ed2-e640-4866-8cfe-9996bc44f8c4	44bf9b37-49e4-4780-a79d-0b22c029e0f0	t
\.


--
-- Data for Name: qr_codes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.qr_codes (id, clinic_id, source, whatsapp_url, scan_count, is_active, created_at, kind, target_id, target_url, short_code, scans_count, last_scanned_at, png_path, svg_path, expires_at) FROM stdin;
\.


--
-- Data for Name: reminder_log; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.reminder_log (id, clinic_id, reminder_key, patient_id, appointment_id, fired_at, status, error_detail) FROM stdin;
\.


--
-- Data for Name: reminder_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.reminder_settings (id, clinic_id, whatsapp_enabled, sms_enabled, appt_24h_enabled, appt_24h_send_time, appt_2h_enabled, appt_30m_enabled, followup_day_enabled, followup_day_send_time, followup_1day_before_enabled, followup_7day_before_enabled, payment_3day_enabled, payment_7day_enabled, birthday_enabled, birthday_send_time, morning_digest_enabled, morning_digest_send_time, updated_at) FROM stdin;
e83c6400-8903-488e-aa70-1695917d718b	b2222222-2222-2222-2222-222222222222	t	f	t	09:00:00	t	f	t	10:00:00	f	f	f	f	f	08:00:00	t	07:00:00	2026-06-17 13:29:36.39001+05:30
c6099179-bb6e-4275-aff0-ca9e27810721	a1111111-1111-1111-1111-111111111111	t	f	t	10:00:00	f	f	t	10:00:00	f	f	f	f	f	08:00:00	t	07:00:00	2026-06-17 13:43:54.030902+05:30
\.


--
-- Data for Name: reschedule_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.reschedule_requests (id, clinic_id, patient_id, appointment_id, requested_date, requested_time, reason, status, resolved_by, resolved_at, created_at) FROM stdin;
\.


--
-- Data for Name: service_catalog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.service_catalog (id, clinic_id, category, name, code, default_duration_min, default_price, description, requires_lab, requires_specialist, typical_sittings, is_active, created_at) FROM stdin;
992c534c-1943-481e-9148-35eac2a69f6c	a1111111-1111-1111-1111-111111111111	consultation	New consultation	\N	30	500.00	\N	f	f	1	t	2026-06-15 10:13:34.02512+05:30
e0d279b3-f41a-4521-9eb1-a5462e8c4dd2	a1111111-1111-1111-1111-111111111111	consultation	Follow-up consultation	\N	15	200.00	\N	f	f	1	t	2026-06-15 10:13:34.02512+05:30
7c6b6e21-2666-4cce-9e6c-2e16b87f7414	a1111111-1111-1111-1111-111111111111	diagnostic	IOPA X-ray	\N	5	200.00	\N	f	f	1	t	2026-06-15 10:13:34.02512+05:30
804d7f81-e89c-422d-a5de-4e65ff956b15	a1111111-1111-1111-1111-111111111111	diagnostic	OPG	\N	10	600.00	\N	f	f	1	t	2026-06-15 10:13:34.02512+05:30
5c7d75e6-427f-44d3-b93f-d8d711458a4a	a1111111-1111-1111-1111-111111111111	diagnostic	CBCT scan	\N	15	3500.00	\N	f	f	1	t	2026-06-15 10:13:34.02512+05:30
786276b2-55c8-4a8a-b81e-5a074a1163b5	a1111111-1111-1111-1111-111111111111	preventive	Scaling & polishing	\N	30	1500.00	\N	f	f	1	t	2026-06-15 10:13:34.02512+05:30
f13fda72-2157-4d28-9c05-df819b919f44	a1111111-1111-1111-1111-111111111111	preventive	Fluoride application	\N	15	800.00	\N	f	f	1	t	2026-06-15 10:13:34.02512+05:30
f05dbf54-9cb8-471b-83c2-4c4f244e8b8d	a1111111-1111-1111-1111-111111111111	restorative	Composite filling — small	\N	30	1200.00	\N	f	f	1	t	2026-06-15 10:13:34.02512+05:30
a8d28bba-d486-46f4-946c-5607463eae5c	a1111111-1111-1111-1111-111111111111	restorative	Composite filling — large	\N	45	2000.00	\N	f	f	1	t	2026-06-15 10:13:34.02512+05:30
0a7ef360-50b8-4593-a204-076ed8c169b9	a1111111-1111-1111-1111-111111111111	restorative	GIC filling	\N	30	800.00	\N	f	f	1	t	2026-06-15 10:13:34.02512+05:30
e73a68cc-39b0-487b-83bf-68c09062674f	a1111111-1111-1111-1111-111111111111	endodontic	RCT — Anterior	\N	60	4500.00	\N	f	f	2	t	2026-06-15 10:13:34.02512+05:30
70e98c02-38d2-4974-9cc7-a6088a0ab658	a1111111-1111-1111-1111-111111111111	endodontic	RCT — Premolar	\N	75	5500.00	\N	f	f	2	t	2026-06-15 10:13:34.02512+05:30
24e3e9a8-f56e-4f54-a097-3a77afff9500	a1111111-1111-1111-1111-111111111111	endodontic	RCT — Molar	\N	90	6500.00	\N	f	f	2	t	2026-06-15 10:13:34.02512+05:30
8b3e0992-414a-4da7-acca-6267415aeaf2	a1111111-1111-1111-1111-111111111111	endodontic	RCT re-treatment	\N	120	8500.00	\N	f	f	3	t	2026-06-15 10:13:34.02512+05:30
a9e6d1eb-b732-43d2-8d80-9751b30af4c0	a1111111-1111-1111-1111-111111111111	oral_surgery	Extraction — simple	\N	20	1500.00	\N	f	f	1	t	2026-06-15 10:13:34.02512+05:30
a95597a2-6e32-4a13-a8ea-1284be688c74	a1111111-1111-1111-1111-111111111111	oral_surgery	Extraction — surgical	\N	60	4500.00	\N	f	f	1	t	2026-06-15 10:13:34.02512+05:30
fc933ae6-40bf-45a3-b7ab-732af5e249f1	a1111111-1111-1111-1111-111111111111	oral_surgery	Wisdom tooth extraction	\N	90	7500.00	\N	f	f	1	t	2026-06-15 10:13:34.02512+05:30
73bd6542-11a6-48e4-8df2-edd8c6cec80b	a1111111-1111-1111-1111-111111111111	prosthodontic	PFM Crown	\N	60	6500.00	\N	t	f	3	t	2026-06-15 10:13:34.02512+05:30
7646e55f-5ce6-445f-8ba1-774b9c51a01c	a1111111-1111-1111-1111-111111111111	prosthodontic	Zirconia Crown	\N	60	12000.00	\N	t	f	3	t	2026-06-15 10:13:34.02512+05:30
9e3d78b0-00af-47e2-8bcf-388f454e7907	a1111111-1111-1111-1111-111111111111	prosthodontic	Complete Denture	\N	120	18000.00	\N	t	f	4	t	2026-06-15 10:13:34.02512+05:30
176a7916-c70f-4408-bc89-f704bbb99676	a1111111-1111-1111-1111-111111111111	prosthodontic	Partial Denture	\N	90	9500.00	\N	t	f	3	t	2026-06-15 10:13:34.02512+05:30
811d6512-4139-4597-84c5-5aa155ce5e53	a1111111-1111-1111-1111-111111111111	prosthodontic	Implant — single	\N	120	35000.00	\N	t	f	4	t	2026-06-15 10:13:34.02512+05:30
cb7f8d7c-5750-48f0-a90f-dabea1c574a6	a1111111-1111-1111-1111-111111111111	cosmetic	Veneer (per tooth)	\N	60	8500.00	\N	t	f	2	t	2026-06-15 10:13:34.02512+05:30
f40231f2-f9f1-4035-8d87-abfde004be29	a1111111-1111-1111-1111-111111111111	cosmetic	Teeth whitening	\N	90	6500.00	\N	f	f	1	t	2026-06-15 10:13:34.02512+05:30
aa645bb6-a3aa-4b4e-8ae3-03f0247aec6f	a1111111-1111-1111-1111-111111111111	orthodontic	Ortho consult + records	\N	60	2500.00	\N	f	f	1	t	2026-06-15 10:13:34.02512+05:30
651a3a78-9aca-4cfc-8a67-f27ba8c7be2d	a1111111-1111-1111-1111-111111111111	orthodontic	Metal braces (full course)	\N	30	35000.00	\N	f	f	18	t	2026-06-15 10:13:34.02512+05:30
87c69d3e-47c1-4c82-9e6a-1ea7906e4e16	a1111111-1111-1111-1111-111111111111	orthodontic	Clear aligners	\N	30	75000.00	\N	t	f	12	t	2026-06-15 10:13:34.02512+05:30
01806134-ecf4-471a-9f7f-39c1504ed1e8	a1111111-1111-1111-1111-111111111111	pediatric	Pediatric exam	\N	20	500.00	\N	f	f	1	t	2026-06-15 10:13:34.02512+05:30
3c1b3431-9c97-4bcb-ba8e-07ce8fd8773c	a1111111-1111-1111-1111-111111111111	pediatric	Pulpectomy (milk tooth)	\N	45	2500.00	\N	f	f	1	t	2026-06-15 10:13:34.02512+05:30
de184e12-dec2-4896-8461-6d2c51a1eea8	a1111111-1111-1111-1111-111111111111	periodontal	Curettage (per quadrant)	\N	30	2500.00	\N	f	f	4	t	2026-06-15 10:13:34.02512+05:30
8a4596ac-b159-4817-a669-21496e1c5ae8	a1111111-1111-1111-1111-111111111111	periodontal	Flap surgery (per quadrant)	\N	60	6500.00	\N	f	f	4	t	2026-06-15 10:13:34.02512+05:30
ff814cae-e1fb-46ed-b72c-f80f49d150a6	b2222222-2222-2222-2222-222222222222	consultation	New consultation	\N	30	500.00	\N	f	f	1	t	2026-06-15 10:13:34.02512+05:30
1da4da00-751e-40d2-baf7-0bda6270bd89	b2222222-2222-2222-2222-222222222222	consultation	Follow-up consultation	\N	15	200.00	\N	f	f	1	t	2026-06-15 10:13:34.02512+05:30
9325269e-6b3d-4cd3-a3fd-66dee9ef080b	b2222222-2222-2222-2222-222222222222	diagnostic	IOPA X-ray	\N	5	200.00	\N	f	f	1	t	2026-06-15 10:13:34.02512+05:30
fe660a63-106d-4a93-b2d7-88d30ae5f48b	b2222222-2222-2222-2222-222222222222	diagnostic	OPG	\N	10	600.00	\N	f	f	1	t	2026-06-15 10:13:34.02512+05:30
bac11e61-ec15-4b28-a256-a027474f598c	b2222222-2222-2222-2222-222222222222	diagnostic	CBCT scan	\N	15	3500.00	\N	f	f	1	t	2026-06-15 10:13:34.02512+05:30
897f1c38-45c0-49dd-8822-d6be763126af	b2222222-2222-2222-2222-222222222222	preventive	Scaling & polishing	\N	30	1500.00	\N	f	f	1	t	2026-06-15 10:13:34.02512+05:30
e9b04a9b-4a60-4f3a-8492-3f16d7e644a0	b2222222-2222-2222-2222-222222222222	preventive	Fluoride application	\N	15	800.00	\N	f	f	1	t	2026-06-15 10:13:34.02512+05:30
a84a6d64-1b0b-4e7e-b466-b5b281c8988e	b2222222-2222-2222-2222-222222222222	restorative	Composite filling — small	\N	30	1200.00	\N	f	f	1	t	2026-06-15 10:13:34.02512+05:30
a6ac5b82-d55f-492f-8e59-77a238d2f6d2	b2222222-2222-2222-2222-222222222222	restorative	Composite filling — large	\N	45	2000.00	\N	f	f	1	t	2026-06-15 10:13:34.02512+05:30
a5f08e94-7d3a-4a36-858c-18ae59704b51	b2222222-2222-2222-2222-222222222222	restorative	GIC filling	\N	30	800.00	\N	f	f	1	t	2026-06-15 10:13:34.02512+05:30
80861588-4e74-4d79-8073-1fe6aaf578b6	b2222222-2222-2222-2222-222222222222	endodontic	RCT — Anterior	\N	60	4500.00	\N	f	f	2	t	2026-06-15 10:13:34.02512+05:30
0d4fb364-a15c-48e3-afff-3577ca9c7208	b2222222-2222-2222-2222-222222222222	endodontic	RCT — Premolar	\N	75	5500.00	\N	f	f	2	t	2026-06-15 10:13:34.02512+05:30
e2cdbd36-4d93-4cd2-807b-ec0bb601d05a	b2222222-2222-2222-2222-222222222222	endodontic	RCT — Molar	\N	90	6500.00	\N	f	f	2	t	2026-06-15 10:13:34.02512+05:30
5939824f-69a1-4b93-bbd4-9bb3f80c6c6e	b2222222-2222-2222-2222-222222222222	endodontic	RCT re-treatment	\N	120	8500.00	\N	f	f	3	t	2026-06-15 10:13:34.02512+05:30
26913d29-cb1e-4d59-bf6b-f42dda0bf24a	b2222222-2222-2222-2222-222222222222	oral_surgery	Extraction — simple	\N	20	1500.00	\N	f	f	1	t	2026-06-15 10:13:34.02512+05:30
cf0d651f-8c57-4347-94d9-312296c96560	b2222222-2222-2222-2222-222222222222	oral_surgery	Extraction — surgical	\N	60	4500.00	\N	f	f	1	t	2026-06-15 10:13:34.02512+05:30
a83b1e89-c4e2-4e8f-a3b8-38dea5f3d9c6	b2222222-2222-2222-2222-222222222222	oral_surgery	Wisdom tooth extraction	\N	90	7500.00	\N	f	f	1	t	2026-06-15 10:13:34.02512+05:30
c572fb7c-4565-4630-9fda-6c9db872f43c	b2222222-2222-2222-2222-222222222222	prosthodontic	PFM Crown	\N	60	6500.00	\N	t	f	3	t	2026-06-15 10:13:34.02512+05:30
f135141f-71ad-4262-8eb1-0c079210c8cd	b2222222-2222-2222-2222-222222222222	prosthodontic	Zirconia Crown	\N	60	12000.00	\N	t	f	3	t	2026-06-15 10:13:34.02512+05:30
39a18172-a146-44ee-aaeb-67a3ec6bd137	b2222222-2222-2222-2222-222222222222	prosthodontic	Complete Denture	\N	120	18000.00	\N	t	f	4	t	2026-06-15 10:13:34.02512+05:30
355ef9d9-6c26-4c69-acf9-37bae01bd158	b2222222-2222-2222-2222-222222222222	prosthodontic	Partial Denture	\N	90	9500.00	\N	t	f	3	t	2026-06-15 10:13:34.02512+05:30
734503fd-39a7-4053-9ffb-2393bea9d9f4	b2222222-2222-2222-2222-222222222222	prosthodontic	Implant — single	\N	120	35000.00	\N	t	f	4	t	2026-06-15 10:13:34.02512+05:30
ed565b86-d876-485d-a271-2030f5297eac	b2222222-2222-2222-2222-222222222222	cosmetic	Veneer (per tooth)	\N	60	8500.00	\N	t	f	2	t	2026-06-15 10:13:34.02512+05:30
dbc61a6c-41de-40d6-a71e-c1952be94710	b2222222-2222-2222-2222-222222222222	cosmetic	Teeth whitening	\N	90	6500.00	\N	f	f	1	t	2026-06-15 10:13:34.02512+05:30
1971cf80-75e9-4e6c-93ca-494bdc74d4ab	b2222222-2222-2222-2222-222222222222	orthodontic	Ortho consult + records	\N	60	2500.00	\N	f	f	1	t	2026-06-15 10:13:34.02512+05:30
350b98a2-3364-4a12-864d-6e0c09dac49d	b2222222-2222-2222-2222-222222222222	orthodontic	Metal braces (full course)	\N	30	35000.00	\N	f	f	18	t	2026-06-15 10:13:34.02512+05:30
b325ac08-f97f-4fc3-909b-d3a072910dc7	b2222222-2222-2222-2222-222222222222	orthodontic	Clear aligners	\N	30	75000.00	\N	t	f	12	t	2026-06-15 10:13:34.02512+05:30
697a4d9b-113b-48c4-a240-7366f85af29b	b2222222-2222-2222-2222-222222222222	pediatric	Pediatric exam	\N	20	500.00	\N	f	f	1	t	2026-06-15 10:13:34.02512+05:30
989e4888-35fc-44ef-a092-59e6e8ef2ce8	b2222222-2222-2222-2222-222222222222	pediatric	Pulpectomy (milk tooth)	\N	45	2500.00	\N	f	f	1	t	2026-06-15 10:13:34.02512+05:30
5066f27f-b429-4ef5-8ac2-ec0bf7ca64b3	b2222222-2222-2222-2222-222222222222	periodontal	Curettage (per quadrant)	\N	30	2500.00	\N	f	f	4	t	2026-06-15 10:13:34.02512+05:30
34b11905-5224-493b-a80e-38d3daecbace	b2222222-2222-2222-2222-222222222222	periodontal	Flap surgery (per quadrant)	\N	60	6500.00	\N	f	f	4	t	2026-06-15 10:13:34.02512+05:30
\.


--
-- Data for Name: site_doctors; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.site_doctors (id, staff_id, display_name, qualification, designation, bio, photo_url, years_experience, specializations, show_on_public_site, order_idx, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: site_services; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.site_services (id, name, short_description, full_description, icon_emoji, icon_image_url, hero_image_url, cta_text, cta_link, price_starting_from, duration_minutes, is_featured, is_active, order_idx, created_at) FROM stdin;
2966414f-dc6c-4230-8fee-75c4a968e2c5	Smile Makeover	Veneers, whitening & cosmetic dentistry	\N	✨	\N	\N	\N	\N	\N	\N	t	t	1	2026-06-12 14:34:44.946042
3f4fb936-c40c-46e1-9af2-00aa8f19bbee	Root Canal Treatment	Pain-free RCT with rotary endodontics	\N	🦷	\N	\N	\N	\N	\N	\N	t	t	2	2026-06-12 14:34:44.946042
99866f32-4e92-4c46-a8ed-8c6d119a0792	Dental Implants	Replace missing teeth permanently	\N	💎	\N	\N	\N	\N	\N	\N	t	t	3	2026-06-12 14:34:44.946042
5c0b8fc6-6439-43ef-a25c-a3efad9e8e9f	Orthodontics & Aligners	Braces and invisible aligners	\N	🪥	\N	\N	\N	\N	\N	\N	f	t	4	2026-06-12 14:34:44.946042
73a1bb03-62ec-4d5d-92fa-e03b6c23180a	Pediatric Dentistry	Gentle care for children	\N	👶	\N	\N	\N	\N	\N	\N	f	t	5	2026-06-12 14:34:44.946042
9bb1c281-3990-4ab7-8a83-88a02fb4be5d	Oral Surgery	Wisdom teeth, extractions & more	\N	🔬	\N	\N	\N	\N	\N	\N	f	t	6	2026-06-12 14:34:44.946042
\.


--
-- Data for Name: site_testimonials; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.site_testimonials (id, patient_name, patient_photo_url, rating, text, treatment_type, source, is_featured, is_active, order_idx, created_at) FROM stdin;
\.


--
-- Data for Name: site_theme; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.site_theme (id, primary_color, secondary_color, accent_color, dark_bg, logo_url, favicon_url, site_title, site_tagline, meta_description, google_analytics_id, instagram_url, facebook_url, youtube_url, twitter_url, updated_at) FROM stdin;
1	#0E7C7B	#06B6D4	#22D3EE	#0F172A	\N	\N	Siya Dental Care	Modern dentistry. Compassionate care.	\N	\N	\N	\N	\N	\N	2026-06-12 14:34:44.946042
\.


--
-- Data for Name: site_videos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.site_videos (id, clinic_id, category, title, caption, video_url, thumbnail_url, is_youtube, youtube_id, autoplay, loop_video, order_idx, is_active, uploaded_by, created_at) FROM stdin;
\.


--
-- Data for Name: smile_sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.smile_sessions (id, clinic_id, patient_id, before_image_url, after_image_url, whitening_level, gum_contour_level, alignment_overlay, shade_preset, notes, sent_via_whatsapp, created_at) FROM stdin;
\.


--
-- Data for Name: specialist_earnings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.specialist_earnings (id, specialist_id, appointment_id, patient_id, clinic_id, amount, notes, earned_on, is_settled, settled_on, settled_amount, settled_payment_mode, settled_reference, settled_notes, settled_by, recorded_by, created_at, updated_at, rate_tier, treatment_key, case_status, verified_at, verified_by) FROM stdin;
d4911d7a-e012-4bc0-94c6-311459780176	07e07975-94d7-4c30-8a71-7e75f420092f	30000000-0000-4000-8000-000000000101	10000000-0000-4000-8000-000000000101	a1111111-1111-1111-1111-111111111111	1000.00	Verified by doctor	2026-06-20	f	\N	\N	\N	\N	\N	\N	d1111111-1111-1111-1111-111111111111	2026-06-20 22:48:09.399856+05:30	2026-06-20 22:48:09.399856+05:30	\N	\N	verified	2026-06-20 22:48:09.399856+05:30	d1111111-1111-1111-1111-111111111111
\.


--
-- Data for Name: specialist_notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.specialist_notifications (id, appointment_id, specialist_id, recipient_role, event_type, channel, message, sent_at, sent_by) FROM stdin;
12af520e-3a39-455a-97fd-1617933c26b0	30000000-0000-4000-8000-000000000101	07e07975-94d7-4c30-8a71-7e75f420092f	specialist	patient_in_queue	manual	Asha Verma is now in the queue and waiting	2026-06-20 22:38:53.067075+05:30	\N
f6a883f9-b814-4da4-a969-82ab546ac030	30000000-0000-4000-8000-000000000101	07e07975-94d7-4c30-8a71-7e75f420092f	senior_doctor	session_closed	in_app	Specialist SS closed session for Asha Verma	2026-06-20 22:39:39.33438+05:30	07e07975-94d7-4c30-8a71-7e75f420092f
c4a48122-bd72-4e73-a758-7b13b90bc825	30000000-0000-4000-8000-000000000103	07e07975-94d7-4c30-8a71-7e75f420092f	specialist	assigned	manual	You have been assigned a patient on 2026-06-20 at 15:15:00	2026-06-20 23:44:39.222465+05:30	d1111111-1111-1111-1111-111111111111
718948b0-36c5-43ca-9538-febe22cc7da6	30000000-0000-4000-8000-000000000103	07e07975-94d7-4c30-8a71-7e75f420092f	specialist	call_confirm	manual	Specialist call outcome for Meera Nair: [confirmed]	2026-06-20 23:48:47.345992+05:30	d1111111-1111-1111-1111-111111111111
\.


--
-- Data for Name: specialist_rate_tiers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.specialist_rate_tiers (id, clinic_id, specialist_id, tier_name, treatment_key, rate_amount, is_active, created_at, usage_count, last_used_at, label, added_from) FROM stdin;
0042f2d6-9448-4863-a906-39334fa50287	a1111111-1111-1111-1111-111111111111	07e07975-94d7-4c30-8a71-7e75f420092f	standard	1500	1500.00	t	2026-06-20 23:44:26.755762+05:30	2	2026-06-20 23:44:39.204445+05:30	1500	inline
\.


--
-- Data for Name: staff; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.staff (id, clinic_id, name, role, phone, telegram_chat_id, pin_hash, is_active, created_at, email, last_login_at, created_by, deactivated_at, deactivated_by, permissions, specialization, is_external, default_visit_fee, whatsapp_number) FROM stdin;
d2222222-2222-2222-2222-222222222222	a1111111-1111-1111-1111-111111111111	Nurse Priya	nurse	+919876500003	\N	$2b$12$TtWSv6BqEk7Xc/QJAW65cOGbJe4rj6w9nkB4Zgpusn.f2.8m5G/Uy	t	2026-06-08 15:50:32.983493+05:30	\N	\N	\N	\N	\N	{}	\N	f	\N	\N
d1111111-1111-1111-1111-111111111111	a1111111-1111-1111-1111-111111111111	Dr. Monika	doctor	+919876500001	\N	$2b$12$hzazzf60Ct9jNnV4k/4APOqg1ThfXbyKzJ17j5e9EJqpL1PuRGSVi	t	2026-06-08 15:50:32.983493+05:30	\N	\N	\N	\N	\N	{}	\N	f	\N	\N
07e07975-94d7-4c30-8a71-7e75f420092f	a1111111-1111-1111-1111-111111111111	Shefali	specialist	+919876599991	\N	$2b$12$W5On1VI8cA1o4DBEbIEuuODD1TGxIv8xMb9DuWxRtk31hnfi..qai	t	2026-06-19 15:13:06.351684+05:30	\N	\N	\N	\N	\N	{}	Endodontist	t	1500.00	+919876599991
\.


--
-- Data for Name: to_be_appointed; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.to_be_appointed (id, patient_id, clinic_id, original_appointment_id, reason, proposed_service, added_by_staff_id, added_at, followup_scheduled_for, last_followup_at, is_resolved, resolved_at, resolved_appointment_id, notes) FROM stdin;
\.


--
-- Data for Name: tooth_clinical_records; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tooth_clinical_records (id, patient_id, tooth_number, examination, diagnosis, notes, recorded_by, recorded_at, updated_at) FROM stdin;
\.


--
-- Data for Name: tooth_conditions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tooth_conditions (id, patient_id, tooth_number, condition, surface, severity, notes, recorded_by, recorded_at, is_active) FROM stdin;
\.


--
-- Data for Name: tooth_diagnoses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tooth_diagnoses (id, patient_id, tooth_number, diagnosis, notes, recorded_by, recorded_at, is_active) FROM stdin;
f3568bb4-5a9d-4615-b52e-0e4f621d23ad	10000000-0000-4000-8000-000000000103	11	Calculus	\N	d1111111-1111-1111-1111-111111111111	2026-06-20 23:38:25.994776	t
863d7506-74b6-4e94-a381-68b639c715a8	10000000-0000-4000-8000-000000000103	12	Calculus	\N	d1111111-1111-1111-1111-111111111111	2026-06-20 23:38:40.228445	t
bf36cd14-8424-4aa0-934d-812986b3e1cb	10000000-0000-4000-8000-000000000102	11	Calculus	\N	d1111111-1111-1111-1111-111111111111	2026-06-21 00:43:07.706518	t
dead1b9a-8904-49f4-8773-a27460e08372	10000000-0000-4000-8000-000000000102	11	Deep Caries	\N	d1111111-1111-1111-1111-111111111111	2026-06-21 00:43:10.264591	t
ac5c74e7-ee5b-4fab-8084-5c55e499b417	10000000-0000-4000-8000-000000000102	28	Deep Caries	\N	d1111111-1111-1111-1111-111111111111	2026-06-21 00:43:16.851033	t
e8b595f5-b930-423f-9211-2e887c53d07d	10000000-0000-4000-8000-000000000102	12	Calculus	\N	d1111111-1111-1111-1111-111111111111	2026-06-22 22:40:45.940736	t
\.


--
-- Data for Name: tooth_examinations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tooth_examinations (id, patient_id, tooth_number, finding, notes, recorded_by, recorded_at, is_active) FROM stdin;
a1d4ea3f-34f9-42a1-9a85-a93429c32f64	10000000-0000-4000-8000-000000000103	12	Caries	\N	d1111111-1111-1111-1111-111111111111	2026-06-20 23:37:54.534727	t
4aadccbc-f51a-4536-a270-0fb761c98e9a	10000000-0000-4000-8000-000000000103	11	Deep Caries	\N	d1111111-1111-1111-1111-111111111111	2026-06-20 23:38:01.448549	t
187a3f51-6df0-4ce9-82ba-3fd0ab8558ed	10000000-0000-4000-8000-000000000102	11	Caries	\N	d1111111-1111-1111-1111-111111111111	2026-06-21 00:43:04.682499	t
ff2e23fb-6726-4724-9976-9c55db73d2da	10000000-0000-4000-8000-000000000102	28	Caries	\N	d1111111-1111-1111-1111-111111111111	2026-06-21 00:43:13.4804	t
dc6b0f2f-4a1c-413e-9ddc-906a701568a7	10000000-0000-4000-8000-000000000102	28	Erosion	\N	d1111111-1111-1111-1111-111111111111	2026-06-21 00:43:15.125349	t
2c622833-4f3a-4cdd-b4e8-c108e4a3ef15	10000000-0000-4000-8000-000000000102	12	Caries	\N	d1111111-1111-1111-1111-111111111111	2026-06-22 22:40:43.558763	t
6c34730a-45cf-49e7-a54c-bbc914cccb5c	10000000-0000-4000-8000-000000000102	13	Mobility Grade 2	\N	d1111111-1111-1111-1111-111111111111	2026-06-22 23:35:27.488618	t
\.


--
-- Data for Name: tooth_issue_catalog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tooth_issue_catalog (id, issue_name, is_default, created_at) FROM stdin;
29b5b766-d092-44fe-91b4-b01f28378210	Caries	t	2026-06-11 16:44:17.008134
e0f3a593-41df-4649-bd0e-c033b3ddebc0	Deep Caries	t	2026-06-11 16:44:17.008134
d15ff3e9-6e0f-4f7c-a642-2d090ad82697	Fracture	t	2026-06-11 16:44:17.008134
528b590c-b356-4503-9e50-02ad3f5ae29f	Missing Tooth	t	2026-06-11 16:44:17.008134
6f99e74a-b9f7-4a69-bacb-26f25c50c8a1	Pain	t	2026-06-11 16:44:17.008134
ec6e2bf9-9ed5-494f-8157-9aa862880ef8	Sensitivity	t	2026-06-11 16:44:17.008134
6fce0256-34c0-4799-9c47-5892000274f5	Swelling	t	2026-06-11 16:44:17.008134
aad3fd3a-6742-4443-b05c-b85341b031f2	Mobility	t	2026-06-11 16:44:17.008134
8bc69f3e-1161-4337-99b5-049796a79023	Bleeding Gums	t	2026-06-11 16:44:17.008134
47a521d3-cf15-4baa-92c1-bfe6e5600aa1	Other	t	2026-06-11 16:44:17.008134
\.


--
-- Data for Name: tooth_observations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tooth_observations (id, patient_id, tooth_number, surface, observation, severity, status, suggested_treatment, observed_at, observed_by, resolved_at, resolved_by, visit_id, notes) FROM stdin;
\.


--
-- Data for Name: tooth_treatments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tooth_treatments (id, patient_id, tooth_number, treatment_plan_id, sitting_id, treatment_type, surface, status, notes, planned_at, started_at, completed_at, completed_by, plan_item_id, treatment_kind) FROM stdin;
971d3db1-18af-4b3d-970d-85a8413a0852	10000000-0000-4000-8000-000000000101	42	20000000-0000-4000-8000-000000000101	\N	Bridge (per unit)	\N	planned	\N	2026-06-20 22:39:34.55124	\N	\N	\N	7b8627a9-1738-4de2-8efa-f235afa5bb86	bridge
d8db2cd1-d6a7-461d-a2e5-fd0c958dabc3	10000000-0000-4000-8000-000000000103	12	20000000-0000-4000-8000-000000000103	\N	Bridge (per unit)	\N	planned	\N	2026-06-20 23:40:01.399346	\N	\N	\N	7ba33b0d-e332-4fbc-bce6-704542edbe2a	bridge
80c40aa1-41eb-42bb-a9e9-eee4cfa108b5	10000000-0000-4000-8000-000000000103	12	20000000-0000-4000-8000-000000000103	\N	Crown - PFM	\N	planned	\N	2026-06-20 23:41:01.90721	\N	\N	\N	ab36bd0a-0aef-4770-bc8e-38aa0619fa6a	crown
996c4760-0919-4b48-8fbe-705196e0f677	10000000-0000-4000-8000-000000000103	11	20000000-0000-4000-8000-000000000103	\N	Bridge (per unit)	\N	in_progress	\N	2026-06-20 23:40:39.115034	\N	\N	\N	e45dda86-03bf-4882-951a-a7a38548b9eb	bridge
74237bff-5d81-45d0-a4d4-4cdaacd78d36	10000000-0000-4000-8000-000000000102	28	20000000-0000-4000-8000-000000000102	\N	RCT	\N	planned	\N	2026-06-21 00:43:21.664884	\N	\N	\N	6a6d36e6-cb2c-4d2c-b2ef-3d07fbef737a	rct
e9c3707e-b16d-4994-9cf9-b1d7a7574565	10000000-0000-4000-8000-000000000102	11	20000000-0000-4000-8000-000000000102	\N	Filling	\N	planned	\N	2026-06-21 00:43:29.956431	\N	\N	\N	a9c40434-4308-4553-a208-1333941f43fb	filling
10f3bd4f-81d3-40c7-aebc-f7e2de17d6a7	10000000-0000-4000-8000-000000000102	12	20000000-0000-4000-8000-000000000102	\N	Flap Surgery	\N	planned	\N	2026-06-22 22:40:48.422771	\N	\N	\N	92e3947b-b68c-425a-9943-98bdf961ec03	other
7196dcde-936e-47e2-85f7-68bdbd707ebf	10000000-0000-4000-8000-000000000102	12	20000000-0000-4000-8000-000000000102	\N	Root Canal (RCT)	\N	planned	\N	2026-06-22 22:40:52.202579	\N	\N	\N	a99f187d-c151-44d7-98b7-104b41a2cbc6	rct
\.


--
-- Data for Name: treatment_plan_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.treatment_plan_items (id, plan_id, procedure_catalog_id, procedure_name, tooth_number, estimated_cost, actual_cost, status, notes, created_at, procedure_id, unit_price, total_price, teeth, area_label, suggested_rate, doctor_rate, discount, final_amount, completed_steps, updated_at, examination, diagnosis, examination_summary, requires_lab, lab_status, priority, lab_order_id) FROM stdin;
7ba33b0d-e332-4fbc-bce6-704542edbe2a	20000000-0000-4000-8000-000000000103	\N	Bridge (per unit)	12	0.00	\N	advised	\N	2026-06-20 23:38:58.007886+05:30	\N	\N	\N	[12]	\N	5000.00	5000.00	0.00	5000.00	[]	2026-06-20 23:40:01.399346	[]	Calculus	Caries	f	\N	routine	\N
dfc2ffcd-177a-4b5e-8998-d2540152a91e	20000000-0000-4000-8000-000000000103	\N	Scaling	11	0.00	\N	cancelled	\N	2026-06-20 23:39:07.518449+05:30	\N	\N	\N	[11]	\N	0.00	0.00	0.00	0.00	[]	2026-06-20 23:40:24.422086	[]	Calculus	Deep Caries	f	\N	routine	\N
ab36bd0a-0aef-4770-bc8e-38aa0619fa6a	20000000-0000-4000-8000-000000000103	\N	Crown - PFM	12	0.00	\N	advised	\N	2026-06-20 23:40:48.915835+05:30	\N	\N	\N	[12]	\N	4000.00	5000.00	0.00	5000.00	[]	2026-06-20 23:41:01.90721	[]	\N	\N	f	\N	routine	\N
e45dda86-03bf-4882-951a-a7a38548b9eb	20000000-0000-4000-8000-000000000103	20000000-0000-4000-8000-000000000013	Bridge (per unit)	11	0.00	\N	advised	\N	2026-06-20 23:40:39.115034+05:30	\N	\N	\N	[11]	\N	5000.00	5000.00	0.00	5000.00	["Tooth Preparation", "Impression"]	2026-06-20 23:47:00.476725	[]	\N	\N	f	\N	routine	\N
7b8627a9-1738-4de2-8efa-f235afa5bb86	20000000-0000-4000-8000-000000000101	20000000-0000-4000-8000-000000000013	Bridge (per unit)	42	0.00	\N	advised	\N	2026-06-20 22:39:34.55124+05:30	\N	\N	\N	[42]	\N	5000.00	5000.00	0.00	5000.00	[]	2026-06-21 00:33:30.981908	[]	\N	\N	t	approved	routine	\N
6a6d36e6-cb2c-4d2c-b2ef-3d07fbef737a	20000000-0000-4000-8000-000000000102	\N	RCT	28	0.00	\N	advised	\N	2026-06-21 00:43:21.664884+05:30	\N	\N	\N	[28]	\N	0.00	0.00	0.00	0.00	[]	2026-06-21 00:43:21.664884	[]	Deep Caries	Caries, Erosion	f	\N	routine	\N
a9c40434-4308-4553-a208-1333941f43fb	20000000-0000-4000-8000-000000000102	\N	Filling	11	0.00	\N	advised	\N	2026-06-21 00:43:29.956431+05:30	\N	\N	\N	[11]	\N	0.00	0.00	0.00	0.00	[]	2026-06-21 00:43:29.956431	[]	Calculus, Deep Caries	Caries	f	\N	routine	\N
92e3947b-b68c-425a-9943-98bdf961ec03	20000000-0000-4000-8000-000000000102	20000000-0000-4000-8000-000000000026	Flap Surgery	12	0.00	\N	advised	\N	2026-06-22 22:40:48.422771+05:30	\N	\N	\N	[12]	\N	5000.00	5000.00	0.00	5000.00	[]	2026-06-22 22:40:48.422771	[]	Calculus	Caries	f	\N	routine	\N
a99f187d-c151-44d7-98b7-104b41a2cbc6	20000000-0000-4000-8000-000000000102	20000000-0000-4000-8000-000000000008	Root Canal (RCT)	12	0.00	\N	advised	\N	2026-06-22 22:40:52.202579+05:30	\N	\N	\N	[12]	\N	5000.00	5000.00	0.00	5000.00	[]	2026-06-22 22:40:52.202579	[]	Calculus	Caries	f	\N	routine	\N
\.


--
-- Data for Name: treatment_plans; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.treatment_plans (id, patient_id, clinic_id, doctor_id, name, complaint, diagnosis, estimated_cost, extra_charges, discount, final_payable, total_paid, balance, total_sittings_planned, sittings_completed, status, followup_date, followup_notes, internal_notes, created_at, updated_at, diagnoses_list, plan_name, is_archived, archived_at, kanban_position) FROM stdin;
20000000-0000-4000-8000-000000000101	10000000-0000-4000-8000-000000000101	a1111111-1111-1111-1111-111111111111	d1111111-1111-1111-1111-111111111111	RCT Upper Molar	Pain in upper right molar	Deep caries requiring RCT	5000.00	0.00	0.00	5000.00	0.00	4500.00	2	0	treatment_started	\N	\N	\N	2026-06-20 22:37:56.623683+05:30	2026-06-20 22:39:34.55124+05:30	[]	RCT Upper Molar	f	\N	0
20000000-0000-4000-8000-000000000103	10000000-0000-4000-8000-000000000103	a1111111-1111-1111-1111-111111111111	d1111111-1111-1111-1111-111111111111	Crown Follow-up	Loose temporary crown	Temporary crown review and recementation	15000.00	0.00	0.00	15000.00	0.00	1000.00	2	2	in_progress	\N	\N	\N	2026-06-20 22:37:56.623683+05:30	2026-06-20 23:47:00.476725+05:30	[]	Crown Follow-up	f	\N	0
20000000-0000-4000-8000-000000000102	10000000-0000-4000-8000-000000000102	a1111111-1111-1111-1111-111111111111	d1111111-1111-1111-1111-111111111111	Scaling Consultation	Bleeding gums	Generalized gingivitis	10000.00	0.00	0.00	10000.00	0.00	1500.00	1	0	treatment_advised	\N	\N	\N	2026-06-20 22:37:56.623683+05:30	2026-06-22 22:40:52.202579+05:30	[]	Scaling Consultation	f	\N	0
\.


--
-- Data for Name: treatment_sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.treatment_sessions (id, patient_id, doctor_id, clinic_id, appointment_id, sitting_id, plan_id, walk_in_id, started_at, finalized_at, procedures_done, treatment_notes, next_step, amount_payable, prescription_id, used_tooth_chart, status, nurse_notified_at, payment_collected_at, payment_collected_by, amount_collected, balance_remaining, payment_components, created_at, discount_amount, discount_reason) FROM stdin;
a2cdc120-b2fd-49a0-b2a7-de77f9381107	10000000-0000-4000-8000-000000000101	d1111111-1111-1111-1111-111111111111	a1111111-1111-1111-1111-111111111111	30000000-0000-4000-8000-000000000101	\N	\N	\N	2026-06-20 22:40:33.9048	2026-06-20 22:40:33.9048	[]	\N	\N	500.00	\N	f	completed	\N	2026-06-20 22:40:47.484261	d1111111-1111-1111-1111-111111111111	500.00	0.00	[]	2026-06-20 22:40:33.9048	0.00	\N
479069ee-e38a-499f-94e8-9907a208e07a	10000000-0000-4000-8000-000000000101	d1111111-1111-1111-1111-111111111111	a1111111-1111-1111-1111-111111111111	5607d539-d841-4ff4-88d7-10ea8b601215	\N	\N	\N	2026-06-20 22:41:46.582534	2026-06-20 22:42:11.99367	[]	\N	\N	100.00	\N	f	completed	\N	2026-06-20 22:42:22.22418	d1111111-1111-1111-1111-111111111111	100.00	0.00	[]	2026-06-20 22:41:46.582534	0.00	\N
cbf099e0-d194-4f65-829f-4228e5e69569	10000000-0000-4000-8000-000000000101	d1111111-1111-1111-1111-111111111111	a1111111-1111-1111-1111-111111111111	2a3a29ad-4b20-4a7e-a538-8d668e541d28	\N	\N	\N	2026-06-20 22:43:22.090277	\N	[]	\N	\N	0.00	\N	f	in_progress	\N	\N	\N	0.00	0.00	[]	2026-06-20 22:43:22.090277	0.00	\N
ed98d664-efe0-4473-8f32-7db50ab4011a	10000000-0000-4000-8000-000000000103	d1111111-1111-1111-1111-111111111111	a1111111-1111-1111-1111-111111111111	30000000-0000-4000-8000-000000000103	\N	\N	\N	2026-06-20 23:36:45.502521	2026-06-20 23:47:00.476725	[{"step": "Tooth Preparation", "teeth": [11], "item_id": "e45dda86-03bf-4882-951a-a7a38548b9eb", "treatment": "Bridge (per unit)", "item_completed": false}, {"step": "Impression", "teeth": [11], "item_id": "e45dda86-03bf-4882-951a-a7a38548b9eb", "treatment": "Bridge (per unit)", "item_completed": false}]	\N	\N	500.00	\N	f	completed	\N	2026-06-20 23:47:44.689168	d1111111-1111-1111-1111-111111111111	500.00	0.00	[]	2026-06-20 23:36:45.502521	0.00	\N
57ba63cb-76c0-4707-9808-c6683793e2e8	10000000-0000-4000-8000-000000000103	d1111111-1111-1111-1111-111111111111	a1111111-1111-1111-1111-111111111111	eb71a482-4d0d-4822-b905-fd4459abe57b	\N	\N	\N	2026-06-20 23:52:17.683759	\N	[]	\N	\N	0.00	\N	f	in_progress	\N	\N	\N	0.00	0.00	[]	2026-06-20 23:52:17.683759	0.00	\N
7750f8f6-5740-4176-94a9-672877837626	10000000-0000-4000-8000-000000000101	d1111111-1111-1111-1111-111111111111	a1111111-1111-1111-1111-111111111111	2a3a29ad-4b20-4a7e-a538-8d668e541d28	\N	\N	\N	2026-06-20 23:56:13.538804	\N	[]	\N	\N	0.00	\N	f	in_progress	\N	\N	\N	0.00	0.00	[]	2026-06-20 23:56:13.538804	0.00	\N
\.


--
-- Data for Name: treatment_sittings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.treatment_sittings (id, plan_id, appointment_id, sitting_number, date, procedures_done, notes, status, amount_collected, payment_mode, created_at, scheduled_date, scheduled_time, medicines_given, next_step, doctor_id) FROM stdin;
\.


--
-- Data for Name: treatment_templates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.treatment_templates (id, clinic_id, name, description, items, usage_count, created_by, created_at, is_active, template_name, category, default_sittings, estimated_cost, procedures, default_medicines, default_advice, updated_at) FROM stdin;
23595535-593e-4aca-a14d-feee1089dd26	a1111111-1111-1111-1111-111111111111	RCT + Crown	Single-tooth RCT followed by Zirconia crown	[{"discount": 0, "doctor_rate": 4500, "suggested_rate": 4500, "treatment_name": "RCT", "teeth_placeholder": true}, {"discount": 0, "doctor_rate": 3500, "suggested_rate": 3500, "treatment_name": "Crown", "teeth_placeholder": true}]	0	\N	2026-06-12 09:20:22.955498	t	RCT + Crown	\N	1	\N	[]	[]	\N	2026-06-17 13:29:36.39001+05:30
e4fac3c8-4edb-4282-8cc8-5327f2c85ac5	a1111111-1111-1111-1111-111111111111	Full Mouth Scaling + Polish	Routine cleaning package	[{"discount": 0, "area_label": "Full Mouth", "doctor_rate": 1200, "suggested_rate": 1200, "treatment_name": "Scaling"}]	0	\N	2026-06-12 09:20:22.955498	t	Full Mouth Scaling + Polish	\N	1	\N	[]	[]	\N	2026-06-17 13:29:36.39001+05:30
13c39e51-2607-447b-a5f5-8e7d11fdd835	a1111111-1111-1111-1111-111111111111	Orthodontic Review (6-week)	Routine ortho adjustment	[{"discount": 0, "doctor_rate": 500, "suggested_rate": 500, "treatment_name": "Orthodontic Review"}]	0	\N	2026-06-12 09:20:22.955498	t	Orthodontic Review (6-week)	\N	1	\N	[]	[]	\N	2026-06-17 13:29:36.39001+05:30
7f59607d-a44c-4d1b-82bf-96e560121b54	a1111111-1111-1111-1111-111111111111	Emergency Pain Management	Pain relief + diagnosis	[{"discount": 0, "doctor_rate": 300, "suggested_rate": 300, "treatment_name": "Consultation"}, {"discount": 0, "doctor_rate": 300, "suggested_rate": 300, "treatment_name": "Dressing", "teeth_placeholder": true}]	0	\N	2026-06-12 09:20:22.955498	t	Emergency Pain Management	\N	1	\N	[]	[]	\N	2026-06-17 13:29:36.39001+05:30
0e6ccdd2-0f5c-46e5-bc69-09a95c4c4da0	a1111111-1111-1111-1111-111111111111	Single-Sitting RCT	Single visit RCT	[]	0	\N	2026-06-17 13:29:36.39001	t	Single-Sitting RCT	endodontic	1	4500.00	[{"notes": "Full procedure", "sitting_no": 1, "procedure_name": "Access + BMP + Obturation"}]	[]	Soft diet for 24 hrs.	2026-06-17 13:29:36.39001+05:30
3dfa13ce-21e7-4cb0-bc99-96be4cbe9018	a1111111-1111-1111-1111-111111111111	Composite Filling	Direct composite restoration	[]	0	\N	2026-06-17 13:29:36.39001	t	Composite Filling	restorative	1	1200.00	[{"notes": "Shade match", "sitting_no": 1, "procedure_name": "Cavity Prep + Composite Fill"}]	[]	Avoid hot/cold for 24 hrs.	2026-06-17 13:29:36.39001+05:30
4abbff2f-e9f9-48c5-ac3b-ef568ce20d51	a1111111-1111-1111-1111-111111111111	Crown (PFM, 2-sitting)	Tooth preparation + cementation	[]	0	\N	2026-06-17 13:29:36.39001	t	Crown (PFM, 2-sitting)	prosthetic	2	8000.00	[{"notes": "Temp crown", "sitting_no": 1, "procedure_name": "Tooth Preparation + Impression"}, {"notes": "Occlusion check", "sitting_no": 2, "procedure_name": "Crown Cementation"}]	[]	Soft diet 24 hrs.	2026-06-17 13:29:36.39001+05:30
a0c66b6c-a228-4f30-be8f-4e30fc2f2db2	a1111111-1111-1111-1111-111111111111	Scaling + Polishing	Full mouth scaling	[]	0	\N	2026-06-17 13:29:36.39001	t	Scaling + Polishing	periodontic	1	1500.00	[{"notes": "Both arches", "sitting_no": 1, "procedure_name": "Ultrasonic Scaling + Polishing"}]	[]	Salt water rinse 3x/day.	2026-06-17 13:29:36.39001+05:30
1725fa9f-8725-4f83-8a39-ed8cb2b1fbc3	a1111111-1111-1111-1111-111111111111	Extraction (Simple)	Simple extraction	[]	0	\N	2026-06-17 13:29:36.39001	t	Extraction (Simple)	surgical	1	1000.00	[{"notes": "LA, post-op instructions", "sitting_no": 1, "procedure_name": "Simple Extraction"}]	[]	Bite on gauze 30 min.	2026-06-17 13:29:36.39001+05:30
23b92679-485f-4c8c-973f-0033de4c8470	a1111111-1111-1111-1111-111111111111	Wisdom Tooth Extraction	Surgical 3rd molar removal	[]	0	\N	2026-06-17 13:29:36.39001	t	Wisdom Tooth Extraction	surgical	1	4000.00	[{"notes": "LA, flap if needed", "sitting_no": 1, "procedure_name": "Surgical Extraction + Suturing"}]	[]	Ice pack first day.	2026-06-17 13:29:36.39001+05:30
4a1c8ad6-02e0-437d-9a6a-61a34f29d29a	a1111111-1111-1111-1111-111111111111	Zirconia Crown (2-sitting)	Premium crown	[]	0	\N	2026-06-17 13:29:36.39001	t	Zirconia Crown (2-sitting)	prosthetic	2	14000.00	[{"notes": "Temp crown", "sitting_no": 1, "procedure_name": "Tooth Preparation + Digital Impression"}, {"notes": "Occlusion adjustment", "sitting_no": 2, "procedure_name": "Zirconia Crown Cementation"}]	[]	Avoid biting hard items on crown.	2026-06-17 13:29:36.39001+05:30
99f1e6ac-d725-4b13-a42d-53c23f22e719	b2222222-2222-2222-2222-222222222222	Root Canal Treatment (3-sitting)	Standard RCT protocol	[]	0	\N	2026-06-17 13:29:36.39001	t	Root Canal Treatment (3-sitting)	endodontic	3	5500.00	[{"notes": "Local anesthesia", "sitting_no": 1, "procedure_name": "Access Opening + Working Length"}, {"notes": "Intracanal medicament", "sitting_no": 2, "procedure_name": "BMP + Cleaning"}, {"notes": "Final seal", "sitting_no": 3, "procedure_name": "Obturation"}]	[]	Avoid hard food on treated tooth.	2026-06-17 13:29:36.39001+05:30
ada563a3-39b8-4047-9af0-be6fef8f2452	a1111111-1111-1111-1111-111111111111	Root Canal Treatment (3-sitting)	Standard RCT protocol	[]	5	\N	2026-06-17 13:29:36.39001	t	Root Canal Treatment (3-sitting)	endodontic	3	5500.00	[{"notes": "Local anesthesia", "sitting_no": 1, "procedure_name": "Access Opening + Working Length"}, {"notes": "Intracanal medicament", "sitting_no": 2, "procedure_name": "BMP + Cleaning"}, {"notes": "Final seal", "sitting_no": 3, "procedure_name": "Obturation"}]	[]	Avoid hard food on treated tooth.	2026-06-17 13:29:36.39001+05:30
e783b79f-8d48-4d97-a757-1033df303797	a1111111-1111-1111-1111-111111111111	Implant Workup	Consultation + diagnostic prep for implant	[{"discount": 0, "doctor_rate": 300, "suggested_rate": 300, "treatment_name": "Consultation"}, {"discount": 0, "doctor_rate": 25000, "suggested_rate": 25000, "treatment_name": "Implant", "teeth_placeholder": true}]	2	\N	2026-06-12 09:20:22.955498	t	Implant Workup	\N	1	\N	[]	[]	\N	2026-06-17 13:29:36.39001+05:30
e76078b6-2ef8-44aa-917b-0b52e85d88c8	b2222222-2222-2222-2222-222222222222	Single-Sitting RCT	Single visit RCT	[]	0	\N	2026-06-17 13:29:36.39001	t	Single-Sitting RCT	endodontic	1	4500.00	[{"notes": "Full procedure", "sitting_no": 1, "procedure_name": "Access + BMP + Obturation"}]	[]	Soft diet for 24 hrs.	2026-06-17 13:29:36.39001+05:30
3d62be52-55b0-4d88-9a94-fded286180ec	b2222222-2222-2222-2222-222222222222	Composite Filling	Direct composite restoration	[]	0	\N	2026-06-17 13:29:36.39001	t	Composite Filling	restorative	1	1200.00	[{"notes": "Shade match", "sitting_no": 1, "procedure_name": "Cavity Prep + Composite Fill"}]	[]	Avoid hot/cold for 24 hrs.	2026-06-17 13:29:36.39001+05:30
97371a46-685a-4eac-8007-951dfeab20cc	b2222222-2222-2222-2222-222222222222	Crown (PFM, 2-sitting)	Tooth preparation + cementation	[]	0	\N	2026-06-17 13:29:36.39001	t	Crown (PFM, 2-sitting)	prosthetic	2	8000.00	[{"notes": "Temp crown", "sitting_no": 1, "procedure_name": "Tooth Preparation + Impression"}, {"notes": "Occlusion check", "sitting_no": 2, "procedure_name": "Crown Cementation"}]	[]	Soft diet 24 hrs.	2026-06-17 13:29:36.39001+05:30
77acb03d-6c0b-42e4-ba09-e0ccec7734f2	b2222222-2222-2222-2222-222222222222	Scaling + Polishing	Full mouth scaling	[]	0	\N	2026-06-17 13:29:36.39001	t	Scaling + Polishing	periodontic	1	1500.00	[{"notes": "Both arches", "sitting_no": 1, "procedure_name": "Ultrasonic Scaling + Polishing"}]	[]	Salt water rinse 3x/day.	2026-06-17 13:29:36.39001+05:30
147898c1-bcf1-42da-b62a-f15de88daea5	b2222222-2222-2222-2222-222222222222	Extraction (Simple)	Simple extraction	[]	0	\N	2026-06-17 13:29:36.39001	t	Extraction (Simple)	surgical	1	1000.00	[{"notes": "LA, post-op instructions", "sitting_no": 1, "procedure_name": "Simple Extraction"}]	[]	Bite on gauze 30 min.	2026-06-17 13:29:36.39001+05:30
8b74c7a2-a95a-40bc-a800-72ccb57c644c	b2222222-2222-2222-2222-222222222222	Wisdom Tooth Extraction	Surgical 3rd molar removal	[]	0	\N	2026-06-17 13:29:36.39001	t	Wisdom Tooth Extraction	surgical	1	4000.00	[{"notes": "LA, flap if needed", "sitting_no": 1, "procedure_name": "Surgical Extraction + Suturing"}]	[]	Ice pack first day.	2026-06-17 13:29:36.39001+05:30
3ce88ac1-79cd-4a45-a1b2-7da434b7bb4e	b2222222-2222-2222-2222-222222222222	Zirconia Crown (2-sitting)	Premium crown	[]	0	\N	2026-06-17 13:29:36.39001	t	Zirconia Crown (2-sitting)	prosthetic	2	14000.00	[{"notes": "Temp crown", "sitting_no": 1, "procedure_name": "Tooth Preparation + Digital Impression"}, {"notes": "Occlusion adjustment", "sitting_no": 2, "procedure_name": "Zirconia Crown Cementation"}]	[]	Avoid biting hard items on crown.	2026-06-17 13:29:36.39001+05:30
\.


--
-- Data for Name: walk_in_patients; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.walk_in_patients (id, patient_id, clinic_id, registered_by_staff_id, registered_at, visit_reason, doctor_id, doctor_notified, doctor_notified_at, outcome, outcome_recorded_at, notes) FROM stdin;
\.


--
-- Data for Name: workspace_drafts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.workspace_drafts (patient_id, data, updated_at) FROM stdin;
a0000003-0000-0000-0000-000000000003	{"adjAmt": "", "advice": "Follow doctor instructions", "rxMeds": [], "ticked": [{"step": "Specialist assessment completed", "item_id": "c3a950cd-72dd-4a2c-97e8-21fdaf02f46a", "treatment": "Specialist flow verification", "item_completed": true}], "adjReason": "", "complaint": "Wisdom tooth", "visitNotes": "SS completed specialist workflow verification", "collectToday": ""}	2026-06-20 17:59:57.351621
10000000-0000-4000-8000-000000000102	{"adjAmt": "", "advice": "", "rxMeds": [{"dose": "1 tablet", "name": "Aceclofenac+Paracetamol", "duration": "3 days", "strength": "100+325mg", "frequency": "Twice daily", "instructions": "After meals.."}], "ticked": [], "adjReason": "", "complaint": "Tooth Pain", "visitNotes": "", "collectToday": ""}	2026-06-22 23:38:15.365222
\.


--
-- Name: appointment_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.appointment_requests_id_seq', 1, false);


--
-- Name: clinic_info_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.clinic_info_id_seq', 13, true);


--
-- Name: lab_orders_serial_no_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.lab_orders_serial_no_seq', 6, true);


--
-- Name: patient_uploads_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.patient_uploads_id_seq', 1, false);


--
-- Name: appointment_call_logs appointment_call_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_call_logs
    ADD CONSTRAINT appointment_call_logs_pkey PRIMARY KEY (id);


--
-- Name: appointment_history appointment_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_history
    ADD CONSTRAINT appointment_history_pkey PRIMARY KEY (id);


--
-- Name: appointment_message_logs appointment_message_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_message_logs
    ADD CONSTRAINT appointment_message_logs_pkey PRIMARY KEY (id);


--
-- Name: appointment_requests appointment_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_requests
    ADD CONSTRAINT appointment_requests_pkey PRIMARY KEY (id);


--
-- Name: appointment_types appointment_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_types
    ADD CONSTRAINT appointment_types_pkey PRIMARY KEY (id);


--
-- Name: appointment_types appointment_types_type_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_types
    ADD CONSTRAINT appointment_types_type_name_key UNIQUE (type_name);


--
-- Name: appointments appointments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_pkey PRIMARY KEY (id);


--
-- Name: ar_preview_settings ar_preview_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ar_preview_settings
    ADD CONSTRAINT ar_preview_settings_pkey PRIMARY KEY (id);


--
-- Name: bot_config bot_config_clinic_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bot_config
    ADD CONSTRAINT bot_config_clinic_id_key UNIQUE (clinic_id);


--
-- Name: bot_config bot_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bot_config
    ADD CONSTRAINT bot_config_pkey PRIMARY KEY (id);


--
-- Name: bot_event_log bot_event_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bot_event_log
    ADD CONSTRAINT bot_event_log_pkey PRIMARY KEY (id);


--
-- Name: business_hours business_hours_clinic_id_weekday_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_hours
    ADD CONSTRAINT business_hours_clinic_id_weekday_key UNIQUE (clinic_id, weekday);


--
-- Name: business_hours business_hours_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_hours
    ADD CONSTRAINT business_hours_pkey PRIMARY KEY (id);


--
-- Name: clinic_content clinic_content_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinic_content
    ADD CONSTRAINT clinic_content_pkey PRIMARY KEY (id);


--
-- Name: clinic_holidays clinic_holidays_clinic_id_holiday_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinic_holidays
    ADD CONSTRAINT clinic_holidays_clinic_id_holiday_date_key UNIQUE (clinic_id, holiday_date);


--
-- Name: clinic_holidays clinic_holidays_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinic_holidays
    ADD CONSTRAINT clinic_holidays_pkey PRIMARY KEY (id);


--
-- Name: clinic_info_ext clinic_info_ext_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinic_info_ext
    ADD CONSTRAINT clinic_info_ext_pkey PRIMARY KEY (clinic_id);


--
-- Name: clinic_info clinic_info_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinic_info
    ADD CONSTRAINT clinic_info_key_key UNIQUE (key);


--
-- Name: clinic_info clinic_info_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinic_info
    ADD CONSTRAINT clinic_info_pkey PRIMARY KEY (id);


--
-- Name: clinic_notifications clinic_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinic_notifications
    ADD CONSTRAINT clinic_notifications_pkey PRIMARY KEY (id);


--
-- Name: clinic_page_sections clinic_page_sections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinic_page_sections
    ADD CONSTRAINT clinic_page_sections_pkey PRIMARY KEY (id);


--
-- Name: clinic_pages clinic_pages_clinic_id_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinic_pages
    ADD CONSTRAINT clinic_pages_clinic_id_slug_key UNIQUE (clinic_id, slug);


--
-- Name: clinic_pages clinic_pages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinic_pages
    ADD CONSTRAINT clinic_pages_pkey PRIMARY KEY (id);


--
-- Name: clinic_settings clinic_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinic_settings
    ADD CONSTRAINT clinic_settings_pkey PRIMARY KEY (clinic_id);


--
-- Name: clinical_link_scores clinical_link_scores_link_type_source_key_target_key_clinic_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_link_scores
    ADD CONSTRAINT clinical_link_scores_link_type_source_key_target_key_clinic_key UNIQUE (link_type, source_key, target_key, clinic_id);


--
-- Name: clinical_link_scores clinical_link_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_link_scores
    ADD CONSTRAINT clinical_link_scores_pkey PRIMARY KEY (id);


--
-- Name: clinics clinics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinics
    ADD CONSTRAINT clinics_pkey PRIMARY KEY (id);


--
-- Name: common_complaints common_complaints_complaint_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.common_complaints
    ADD CONSTRAINT common_complaints_complaint_name_key UNIQUE (complaint_name);


--
-- Name: common_complaints common_complaints_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.common_complaints
    ADD CONSTRAINT common_complaints_pkey PRIMARY KEY (id);


--
-- Name: common_conditions common_conditions_condition_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.common_conditions
    ADD CONSTRAINT common_conditions_condition_name_key UNIQUE (condition_name);


--
-- Name: common_conditions common_conditions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.common_conditions
    ADD CONSTRAINT common_conditions_pkey PRIMARY KEY (id);


--
-- Name: communication_log communication_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communication_log
    ADD CONSTRAINT communication_log_pkey PRIMARY KEY (id);


--
-- Name: dashboard_widget_prefs dashboard_widget_prefs_clinic_id_staff_id_widget_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dashboard_widget_prefs
    ADD CONSTRAINT dashboard_widget_prefs_clinic_id_staff_id_widget_key_key UNIQUE (clinic_id, staff_id, widget_key);


--
-- Name: dashboard_widget_prefs dashboard_widget_prefs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dashboard_widget_prefs
    ADD CONSTRAINT dashboard_widget_prefs_pkey PRIMARY KEY (id);


--
-- Name: diagnosis_catalog diagnosis_catalog_diagnosis_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnosis_catalog
    ADD CONSTRAINT diagnosis_catalog_diagnosis_name_key UNIQUE (diagnosis_name);


--
-- Name: diagnosis_catalog diagnosis_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnosis_catalog
    ADD CONSTRAINT diagnosis_catalog_pkey PRIMARY KEY (id);


--
-- Name: examination_catalog examination_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.examination_catalog
    ADD CONSTRAINT examination_catalog_pkey PRIMARY KEY (id);


--
-- Name: examination_finding_catalog examination_finding_catalog_finding_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.examination_finding_catalog
    ADD CONSTRAINT examination_finding_catalog_finding_name_key UNIQUE (finding_name);


--
-- Name: examination_finding_catalog examination_finding_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.examination_finding_catalog
    ADD CONSTRAINT examination_finding_catalog_pkey PRIMARY KEY (id);


--
-- Name: fee_schedule_overrides fee_schedule_overrides_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_schedule_overrides
    ADD CONSTRAINT fee_schedule_overrides_pkey PRIMARY KEY (id);


--
-- Name: follow_ups follow_ups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follow_ups
    ADD CONSTRAINT follow_ups_pkey PRIMARY KEY (id);


--
-- Name: gallery_images gallery_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gallery_images
    ADD CONSTRAINT gallery_images_pkey PRIMARY KEY (id);


--
-- Name: illness_library illness_library_clinic_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.illness_library
    ADD CONSTRAINT illness_library_clinic_id_name_key UNIQUE (clinic_id, name);


--
-- Name: illness_library illness_library_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.illness_library
    ADD CONSTRAINT illness_library_pkey PRIMARY KEY (id);


--
-- Name: image_annotations image_annotations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.image_annotations
    ADD CONSTRAINT image_annotations_pkey PRIMARY KEY (id);


--
-- Name: kanban_columns kanban_columns_clinic_id_plan_status_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kanban_columns
    ADD CONSTRAINT kanban_columns_clinic_id_plan_status_key UNIQUE (clinic_id, plan_status);


--
-- Name: kanban_columns kanban_columns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kanban_columns
    ADD CONSTRAINT kanban_columns_pkey PRIMARY KEY (id);


--
-- Name: lab_order_payments lab_order_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_order_payments
    ADD CONSTRAINT lab_order_payments_pkey PRIMARY KEY (id);


--
-- Name: lab_orders lab_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_orders
    ADD CONSTRAINT lab_orders_pkey PRIMARY KEY (id);


--
-- Name: lab_vendors lab_vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_vendors
    ADD CONSTRAINT lab_vendors_pkey PRIMARY KEY (id);


--
-- Name: lab_work_types lab_work_types_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_work_types
    ADD CONSTRAINT lab_work_types_name_key UNIQUE (name);


--
-- Name: lab_work_types lab_work_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_work_types
    ADD CONSTRAINT lab_work_types_pkey PRIMARY KEY (id);


--
-- Name: media_gallery media_gallery_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_gallery
    ADD CONSTRAINT media_gallery_pkey PRIMARY KEY (id);


--
-- Name: media media_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media
    ADD CONSTRAINT media_pkey PRIMARY KEY (id);


--
-- Name: medicine_catalog medicine_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medicine_catalog
    ADD CONSTRAINT medicine_catalog_pkey PRIMARY KEY (id);


--
-- Name: medicine_reminders medicine_reminders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medicine_reminders
    ADD CONSTRAINT medicine_reminders_pkey PRIMARY KEY (id);


--
-- Name: message_log message_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_log
    ADD CONSTRAINT message_log_pkey PRIMARY KEY (id);


--
-- Name: message_templates message_templates_clinic_id_template_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_templates
    ADD CONSTRAINT message_templates_clinic_id_template_key_key UNIQUE (clinic_id, template_key);


--
-- Name: message_templates message_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_templates
    ADD CONSTRAINT message_templates_pkey PRIMARY KEY (id);


--
-- Name: module_visibility module_visibility_clinic_id_module_key_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.module_visibility
    ADD CONSTRAINT module_visibility_clinic_id_module_key_role_key UNIQUE (clinic_id, module_key, role);


--
-- Name: module_visibility module_visibility_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.module_visibility
    ADD CONSTRAINT module_visibility_pkey PRIMARY KEY (id);


--
-- Name: patient_credits patient_credits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_credits
    ADD CONSTRAINT patient_credits_pkey PRIMARY KEY (id);


--
-- Name: patient_health patient_health_patient_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_health
    ADD CONSTRAINT patient_health_patient_id_key UNIQUE (patient_id);


--
-- Name: patient_health patient_health_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_health
    ADD CONSTRAINT patient_health_pkey PRIMARY KEY (id);


--
-- Name: patient_images patient_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_images
    ADD CONSTRAINT patient_images_pkey PRIMARY KEY (id);


--
-- Name: patient_portal_tokens patient_portal_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_portal_tokens
    ADD CONSTRAINT patient_portal_tokens_pkey PRIMARY KEY (id);


--
-- Name: patient_portal_tokens patient_portal_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_portal_tokens
    ADD CONSTRAINT patient_portal_tokens_token_key UNIQUE (token);


--
-- Name: patient_ratings patient_ratings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_ratings
    ADD CONSTRAINT patient_ratings_pkey PRIMARY KEY (id);


--
-- Name: patient_ratings patient_ratings_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_ratings
    ADD CONSTRAINT patient_ratings_token_key UNIQUE (token);


--
-- Name: patient_uploads patient_uploads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_uploads
    ADD CONSTRAINT patient_uploads_pkey PRIMARY KEY (id);


--
-- Name: patients patients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_pkey PRIMARY KEY (id);


--
-- Name: payment_transactions payment_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_pkey PRIMARY KEY (id);


--
-- Name: phone_consultations phone_consultations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phone_consultations
    ADD CONSTRAINT phone_consultations_pkey PRIMARY KEY (id);


--
-- Name: plan_revisions plan_revisions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_revisions
    ADD CONSTRAINT plan_revisions_pkey PRIMARY KEY (id);


--
-- Name: prescriptions prescriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_pkey PRIMARY KEY (id);


--
-- Name: procedure_catalog procedure_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procedure_catalog
    ADD CONSTRAINT procedure_catalog_pkey PRIMARY KEY (id);


--
-- Name: procedure_medicine_map procedure_medicine_map_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procedure_medicine_map
    ADD CONSTRAINT procedure_medicine_map_pkey PRIMARY KEY (id);


--
-- Name: procedure_medicine_map procedure_medicine_map_procedure_id_medicine_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procedure_medicine_map
    ADD CONSTRAINT procedure_medicine_map_procedure_id_medicine_id_key UNIQUE (procedure_id, medicine_id);


--
-- Name: qr_codes qr_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qr_codes
    ADD CONSTRAINT qr_codes_pkey PRIMARY KEY (id);


--
-- Name: qr_codes qr_codes_short_code_uq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qr_codes
    ADD CONSTRAINT qr_codes_short_code_uq UNIQUE (short_code);


--
-- Name: reminder_log reminder_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reminder_log
    ADD CONSTRAINT reminder_log_pkey PRIMARY KEY (id);


--
-- Name: reminder_log reminder_log_reminder_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reminder_log
    ADD CONSTRAINT reminder_log_reminder_key_key UNIQUE (reminder_key);


--
-- Name: reminder_settings reminder_settings_clinic_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reminder_settings
    ADD CONSTRAINT reminder_settings_clinic_id_key UNIQUE (clinic_id);


--
-- Name: reminder_settings reminder_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reminder_settings
    ADD CONSTRAINT reminder_settings_pkey PRIMARY KEY (id);


--
-- Name: reschedule_requests reschedule_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reschedule_requests
    ADD CONSTRAINT reschedule_requests_pkey PRIMARY KEY (id);


--
-- Name: service_catalog service_catalog_clinic_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_catalog
    ADD CONSTRAINT service_catalog_clinic_id_name_key UNIQUE (clinic_id, name);


--
-- Name: service_catalog service_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_catalog
    ADD CONSTRAINT service_catalog_pkey PRIMARY KEY (id);


--
-- Name: site_doctors site_doctors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_doctors
    ADD CONSTRAINT site_doctors_pkey PRIMARY KEY (id);


--
-- Name: site_services site_services_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_services
    ADD CONSTRAINT site_services_pkey PRIMARY KEY (id);


--
-- Name: site_testimonials site_testimonials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_testimonials
    ADD CONSTRAINT site_testimonials_pkey PRIMARY KEY (id);


--
-- Name: site_theme site_theme_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_theme
    ADD CONSTRAINT site_theme_pkey PRIMARY KEY (id);


--
-- Name: site_videos site_videos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_videos
    ADD CONSTRAINT site_videos_pkey PRIMARY KEY (id);


--
-- Name: smile_sessions smile_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.smile_sessions
    ADD CONSTRAINT smile_sessions_pkey PRIMARY KEY (id);


--
-- Name: specialist_earnings specialist_earnings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.specialist_earnings
    ADD CONSTRAINT specialist_earnings_pkey PRIMARY KEY (id);


--
-- Name: specialist_notifications specialist_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.specialist_notifications
    ADD CONSTRAINT specialist_notifications_pkey PRIMARY KEY (id);


--
-- Name: specialist_rate_tiers specialist_rate_tiers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.specialist_rate_tiers
    ADD CONSTRAINT specialist_rate_tiers_pkey PRIMARY KEY (id);


--
-- Name: specialist_rate_tiers specialist_rate_tiers_specialist_id_tier_name_treatment_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.specialist_rate_tiers
    ADD CONSTRAINT specialist_rate_tiers_specialist_id_tier_name_treatment_key_key UNIQUE (specialist_id, tier_name, treatment_key);


--
-- Name: staff staff_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_pkey PRIMARY KEY (id);


--
-- Name: to_be_appointed to_be_appointed_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.to_be_appointed
    ADD CONSTRAINT to_be_appointed_pkey PRIMARY KEY (id);


--
-- Name: tooth_clinical_records tooth_clinical_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tooth_clinical_records
    ADD CONSTRAINT tooth_clinical_records_pkey PRIMARY KEY (id);


--
-- Name: tooth_conditions tooth_conditions_patient_id_tooth_number_is_active_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tooth_conditions
    ADD CONSTRAINT tooth_conditions_patient_id_tooth_number_is_active_key UNIQUE (patient_id, tooth_number, is_active) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: tooth_conditions tooth_conditions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tooth_conditions
    ADD CONSTRAINT tooth_conditions_pkey PRIMARY KEY (id);


--
-- Name: tooth_diagnoses tooth_diagnoses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tooth_diagnoses
    ADD CONSTRAINT tooth_diagnoses_pkey PRIMARY KEY (id);


--
-- Name: tooth_examinations tooth_examinations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tooth_examinations
    ADD CONSTRAINT tooth_examinations_pkey PRIMARY KEY (id);


--
-- Name: tooth_issue_catalog tooth_issue_catalog_issue_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tooth_issue_catalog
    ADD CONSTRAINT tooth_issue_catalog_issue_name_key UNIQUE (issue_name);


--
-- Name: tooth_issue_catalog tooth_issue_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tooth_issue_catalog
    ADD CONSTRAINT tooth_issue_catalog_pkey PRIMARY KEY (id);


--
-- Name: tooth_observations tooth_observations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tooth_observations
    ADD CONSTRAINT tooth_observations_pkey PRIMARY KEY (id);


--
-- Name: tooth_treatments tooth_treatments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tooth_treatments
    ADD CONSTRAINT tooth_treatments_pkey PRIMARY KEY (id);


--
-- Name: treatment_plan_items treatment_plan_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatment_plan_items
    ADD CONSTRAINT treatment_plan_items_pkey PRIMARY KEY (id);


--
-- Name: treatment_plans treatment_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatment_plans
    ADD CONSTRAINT treatment_plans_pkey PRIMARY KEY (id);


--
-- Name: treatment_sessions treatment_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatment_sessions
    ADD CONSTRAINT treatment_sessions_pkey PRIMARY KEY (id);


--
-- Name: treatment_sittings treatment_sittings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatment_sittings
    ADD CONSTRAINT treatment_sittings_pkey PRIMARY KEY (id);


--
-- Name: treatment_templates treatment_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatment_templates
    ADD CONSTRAINT treatment_templates_pkey PRIMARY KEY (id);


--
-- Name: tooth_clinical_records uq_tooth_clinical_patient_tooth; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tooth_clinical_records
    ADD CONSTRAINT uq_tooth_clinical_patient_tooth UNIQUE (patient_id, tooth_number);


--
-- Name: walk_in_patients walk_in_patients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.walk_in_patients
    ADD CONSTRAINT walk_in_patients_pkey PRIMARY KEY (id);


--
-- Name: workspace_drafts workspace_drafts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_drafts
    ADD CONSTRAINT workspace_drafts_pkey PRIMARY KEY (patient_id);


--
-- Name: appointment_history_action_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX appointment_history_action_idx ON public.appointment_history USING btree (action_type);


--
-- Name: appointment_history_apt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX appointment_history_apt_idx ON public.appointment_history USING btree (appointment_id, changed_at DESC);


--
-- Name: idx_annot_image; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_annot_image ON public.image_annotations USING btree (image_id);


--
-- Name: idx_appointments_patient_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appointments_patient_date ON public.appointments USING btree (patient_id, COALESCE(confirmed_date, requested_date) DESC);


--
-- Name: idx_apt_arrived_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_apt_arrived_at ON public.appointments USING btree (arrived_at);


--
-- Name: idx_apt_clinic_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_apt_clinic_date ON public.appointments USING btree (clinic_id, confirmed_date);


--
-- Name: idx_apt_contact_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_apt_contact_status ON public.appointments USING btree (contact_status);


--
-- Name: idx_apt_effective_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_apt_effective_date ON public.appointments USING btree (clinic_id, COALESCE(confirmed_date, requested_date));


--
-- Name: idx_apt_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_apt_patient ON public.appointments USING btree (patient_id);


--
-- Name: idx_apt_req_clinic_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_apt_req_clinic_status ON public.appointment_requests USING btree (clinic_id, status, created_at DESC);


--
-- Name: idx_apt_specialist; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_apt_specialist ON public.appointments USING btree (specialist_id, scheduled_date) WHERE (specialist_id IS NOT NULL);


--
-- Name: idx_apt_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_apt_status ON public.appointments USING btree (status, clinic_id);


--
-- Name: idx_apt_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_apt_type ON public.appointments USING btree (appointment_type);


--
-- Name: idx_apt_workflow; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_apt_workflow ON public.appointments USING btree (workflow_status);


--
-- Name: idx_bot_event_log_clinic_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bot_event_log_clinic_created ON public.bot_event_log USING btree (clinic_id, created_at DESC);


--
-- Name: idx_bot_log_channel_dir; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bot_log_channel_dir ON public.bot_event_log USING btree (clinic_id, channel, direction, created_at DESC);


--
-- Name: idx_call_apt; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_call_apt ON public.appointment_call_logs USING btree (appointment_id);


--
-- Name: idx_call_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_call_status ON public.appointment_call_logs USING btree (call_status);


--
-- Name: idx_clinic_page_sections_page_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clinic_page_sections_page_order ON public.clinic_page_sections USING btree (page_id, display_order);


--
-- Name: idx_clinical_link_clinic; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clinical_link_clinic ON public.clinical_link_scores USING btree (clinic_id);


--
-- Name: idx_clinical_link_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clinical_link_source ON public.clinical_link_scores USING btree (link_type, source_key);


--
-- Name: idx_content_clinic_section; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_content_clinic_section ON public.clinic_content USING btree (clinic_id, section, order_idx);


--
-- Name: idx_credits_patient_unused; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_credits_patient_unused ON public.patient_credits USING btree (patient_id, is_used) WHERE (is_used = false);


--
-- Name: idx_diag_catalog_name; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_diag_catalog_name ON public.diagnosis_catalog USING btree (lower((name)::text)) WHERE is_active;


--
-- Name: idx_dwp_clinic_staff; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dwp_clinic_staff ON public.dashboard_widget_prefs USING btree (clinic_id, staff_id);


--
-- Name: idx_exam_catalog_name; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_exam_catalog_name ON public.examination_catalog USING btree (lower((name)::text)) WHERE is_active;


--
-- Name: idx_fee_override_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fee_override_active ON public.fee_schedule_overrides USING btree (clinic_id, is_active, valid_from, valid_until);


--
-- Name: idx_followups_clinic_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_followups_clinic_date ON public.follow_ups USING btree (clinic_id, follow_up_date, status);


--
-- Name: idx_followups_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_followups_patient ON public.follow_ups USING btree (patient_id, follow_up_date DESC);


--
-- Name: idx_gallery_clinic_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gallery_clinic_order ON public.gallery_images USING btree (clinic_id, category, order_idx) WHERE is_active;


--
-- Name: idx_health_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_health_patient ON public.patient_health USING btree (patient_id);


--
-- Name: idx_image_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_image_patient ON public.patient_images USING btree (patient_id);


--
-- Name: idx_image_tooth; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_image_tooth ON public.patient_images USING btree (linked_tooth_number);


--
-- Name: idx_image_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_image_type ON public.patient_images USING btree (image_type);


--
-- Name: idx_lab_orders_appointment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_orders_appointment ON public.lab_orders USING btree (appointment_id);


--
-- Name: idx_lab_orders_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_orders_patient ON public.lab_orders USING btree (patient_id, created_at DESC);


--
-- Name: idx_lab_orders_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_orders_pending ON public.lab_orders USING btree (status, expected_date) WHERE ((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('sent'::character varying)::text]));


--
-- Name: idx_lab_vendors_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_vendors_active ON public.lab_vendors USING btree (is_active, name);


--
-- Name: idx_med_catalog_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_med_catalog_active ON public.medicine_catalog USING btree (is_active, category);


--
-- Name: idx_media_gallery_clinic_taken; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_media_gallery_clinic_taken ON public.media_gallery USING btree (clinic_id, taken_at DESC);


--
-- Name: idx_media_gallery_patient_taken; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_media_gallery_patient_taken ON public.media_gallery USING btree (patient_id, taken_at DESC);


--
-- Name: idx_media_gallery_patient_tooth; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_media_gallery_patient_tooth ON public.media_gallery USING btree (patient_id, tooth_number);


--
-- Name: idx_medicine_catalog_name_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_medicine_catalog_name_trgm ON public.medicine_catalog USING gin (lower((name)::text) public.gin_trgm_ops);


--
-- Name: idx_medicine_catalog_usage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_medicine_catalog_usage ON public.medicine_catalog USING btree (usage_count DESC, name);


--
-- Name: idx_msg_apt; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_msg_apt ON public.appointment_message_logs USING btree (appointment_id);


--
-- Name: idx_msg_log_appointment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_msg_log_appointment ON public.message_log USING btree (appointment_id);


--
-- Name: idx_msg_log_clinic; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_msg_log_clinic ON public.message_log USING btree (clinic_id, created_at DESC);


--
-- Name: idx_msg_log_lab_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_msg_log_lab_order ON public.message_log USING btree (lab_order_id);


--
-- Name: idx_msg_log_recipient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_msg_log_recipient ON public.message_log USING btree (recipient_kind, recipient_id, created_at DESC);


--
-- Name: idx_msg_log_scheduled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_msg_log_scheduled ON public.message_log USING btree (status, scheduled_for) WHERE ((status)::text = 'queued'::text);


--
-- Name: idx_msg_tpl_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_msg_tpl_key ON public.message_templates USING btree (template_key, is_active);


--
-- Name: idx_notif_clinic_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notif_clinic_type ON public.clinic_notifications USING btree (clinic_id, notification_type);


--
-- Name: idx_notif_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notif_created ON public.clinic_notifications USING btree (created_at DESC);


--
-- Name: idx_notif_recipient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notif_recipient ON public.clinic_notifications USING btree (recipient_staff_id, is_read);


--
-- Name: idx_patient_auto_delete; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patient_auto_delete ON public.patients USING btree (auto_delete_at) WHERE (auto_delete_at IS NOT NULL);


--
-- Name: idx_patients_clinic_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patients_clinic_active ON public.patients USING btree (preferred_clinic_id, is_active, created_at DESC) WHERE (is_active = true);


--
-- Name: idx_patients_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patients_name ON public.patients USING btree (name);


--
-- Name: idx_patients_name_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patients_name_trgm ON public.patients USING gin (lower((name)::text) public.gin_trgm_ops);


--
-- Name: idx_patients_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patients_phone ON public.patients USING btree (phone);


--
-- Name: idx_patients_phone_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patients_phone_trgm ON public.patients USING gin (phone public.gin_trgm_ops);


--
-- Name: idx_pay_txn_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pay_txn_date ON public.payment_transactions USING btree (date, clinic_id);


--
-- Name: idx_pay_txn_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pay_txn_patient ON public.payment_transactions USING btree (patient_id);


--
-- Name: idx_pay_txn_plan; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pay_txn_plan ON public.payment_transactions USING btree (plan_id);


--
-- Name: idx_payments_patient_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_patient_created ON public.payment_transactions USING btree (patient_id, created_at DESC);


--
-- Name: idx_payments_patient_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_patient_date ON public.payment_transactions USING btree (patient_id, date DESC);


--
-- Name: idx_phone_consult_clinic; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_phone_consult_clinic ON public.phone_consultations USING btree (clinic_id, status, created_at DESC);


--
-- Name: idx_phone_consult_payment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_phone_consult_payment ON public.phone_consultations USING btree (payment_status, created_at DESC);


--
-- Name: idx_plan_items; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plan_items ON public.treatment_plan_items USING btree (plan_id);


--
-- Name: idx_plan_rev; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plan_rev ON public.plan_revisions USING btree (plan_id, revision_number);


--
-- Name: idx_plans_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plans_patient ON public.treatment_plans USING btree (patient_id);


--
-- Name: idx_plans_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plans_status ON public.treatment_plans USING btree (status, clinic_id);


--
-- Name: idx_portal_tokens_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_portal_tokens_patient ON public.patient_portal_tokens USING btree (patient_id);


--
-- Name: idx_portal_tokens_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_portal_tokens_token ON public.patient_portal_tokens USING btree (token);


--
-- Name: idx_prescriptions_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prescriptions_patient ON public.prescriptions USING btree (patient_id);


--
-- Name: idx_prescriptions_patient_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prescriptions_patient_created ON public.prescriptions USING btree (patient_id, created_at DESC);


--
-- Name: idx_prescriptions_patient_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prescriptions_patient_date ON public.prescriptions USING btree (patient_id, created_at DESC);


--
-- Name: idx_proc_catalog_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proc_catalog_active ON public.procedure_catalog USING btree (is_active, category);


--
-- Name: idx_qr_codes_clinic; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qr_codes_clinic ON public.qr_codes USING btree (clinic_id);


--
-- Name: idx_qr_codes_kind_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qr_codes_kind_target ON public.qr_codes USING btree (kind, target_id);


--
-- Name: idx_ratings_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ratings_patient ON public.patient_ratings USING btree (patient_id, submitted_at DESC);


--
-- Name: idx_ratings_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ratings_token ON public.patient_ratings USING btree (token);


--
-- Name: idx_reminder_log_clinic_fired; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reminder_log_clinic_fired ON public.reminder_log USING btree (clinic_id, fired_at DESC);


--
-- Name: idx_reschedule_clinic_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reschedule_clinic_status ON public.reschedule_requests USING btree (clinic_id, status, created_at DESC);


--
-- Name: idx_rx_diagnoses_list_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rx_diagnoses_list_gin ON public.prescriptions USING gin (diagnoses_list);


--
-- Name: idx_service_cat_clinic; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_cat_clinic ON public.service_catalog USING btree (clinic_id, category, is_active);


--
-- Name: idx_session_clinic_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_session_clinic_date ON public.treatment_sessions USING btree (clinic_id, started_at);


--
-- Name: idx_session_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_session_patient ON public.treatment_sessions USING btree (patient_id);


--
-- Name: idx_session_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_session_status ON public.treatment_sessions USING btree (status);


--
-- Name: idx_site_videos_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_site_videos_active ON public.site_videos USING btree (category, order_idx) WHERE is_active;


--
-- Name: idx_sittings_plan; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sittings_plan ON public.treatment_sittings USING btree (plan_id);


--
-- Name: idx_sittings_plan_num; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sittings_plan_num ON public.treatment_sittings USING btree (plan_id, sitting_number);


--
-- Name: idx_spec_earn_settled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_spec_earn_settled ON public.specialist_earnings USING btree (is_settled, specialist_id);


--
-- Name: idx_spec_earn_specialist; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_spec_earn_specialist ON public.specialist_earnings USING btree (specialist_id, earned_on DESC);


--
-- Name: idx_spec_tiers_specialist; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_spec_tiers_specialist ON public.specialist_rate_tiers USING btree (specialist_id, is_active);


--
-- Name: idx_staff_clinic_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_clinic_role ON public.staff USING btree (clinic_id, role, is_active);


--
-- Name: idx_tba_clinic_resolved; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tba_clinic_resolved ON public.to_be_appointed USING btree (clinic_id, is_resolved);


--
-- Name: idx_tba_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tba_patient ON public.to_be_appointed USING btree (patient_id);


--
-- Name: idx_templates_clinic; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_templates_clinic ON public.treatment_templates USING btree (clinic_id, is_active);


--
-- Name: idx_tooth_clinical_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tooth_clinical_patient ON public.tooth_clinical_records USING btree (patient_id, tooth_number);


--
-- Name: idx_tooth_cond_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tooth_cond_patient ON public.tooth_conditions USING btree (patient_id);


--
-- Name: idx_tooth_diag_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tooth_diag_patient ON public.tooth_diagnoses USING btree (patient_id, tooth_number) WHERE is_active;


--
-- Name: idx_tooth_exam_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tooth_exam_patient ON public.tooth_examinations USING btree (patient_id, tooth_number) WHERE is_active;


--
-- Name: idx_tooth_obs_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tooth_obs_patient ON public.tooth_observations USING btree (patient_id, status);


--
-- Name: idx_tooth_obs_tooth; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tooth_obs_tooth ON public.tooth_observations USING btree (patient_id, tooth_number, status);


--
-- Name: idx_tooth_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tooth_patient ON public.tooth_conditions USING btree (patient_id);


--
-- Name: idx_tooth_treatments_kind; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tooth_treatments_kind ON public.tooth_treatments USING btree (patient_id, tooth_number, treatment_kind);


--
-- Name: idx_tooth_tx_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tooth_tx_item ON public.tooth_treatments USING btree (plan_item_id);


--
-- Name: idx_tooth_tx_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tooth_tx_patient ON public.tooth_treatments USING btree (patient_id);


--
-- Name: idx_tooth_tx_plan; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tooth_tx_plan ON public.tooth_treatments USING btree (treatment_plan_id);


--
-- Name: idx_treatment_plans_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_treatment_plans_patient ON public.treatment_plans USING btree (patient_id, is_archived, status);


--
-- Name: idx_treatment_plans_patient_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_treatment_plans_patient_created ON public.treatment_plans USING btree (patient_id, created_at DESC);


--
-- Name: idx_treatment_templates_bundle_u; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_treatment_templates_bundle_u ON public.treatment_templates USING btree (clinic_id, is_active, template_name);


--
-- Name: idx_uploads_appointment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_uploads_appointment ON public.patient_uploads USING btree (appointment_id);


--
-- Name: idx_uploads_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_uploads_patient ON public.patient_uploads USING btree (patient_id);


--
-- Name: idx_walkin_clinic_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_walkin_clinic_date ON public.walk_in_patients USING btree (clinic_id, registered_at);


--
-- Name: idx_walkin_outcome; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_walkin_outcome ON public.walk_in_patients USING btree (outcome);


--
-- Name: lab_work_types_clinic_name_uniq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX lab_work_types_clinic_name_uniq ON public.lab_work_types USING btree (COALESCE(clinic_id, '00000000-0000-0000-0000-000000000000'::uuid), lower((name)::text));


--
-- Name: module_vis_clinic_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX module_vis_clinic_idx ON public.module_visibility USING btree (clinic_id);


--
-- Name: appointment_call_logs appointment_call_logs_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_call_logs
    ADD CONSTRAINT appointment_call_logs_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE CASCADE;


--
-- Name: appointment_call_logs appointment_call_logs_called_by_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_call_logs
    ADD CONSTRAINT appointment_call_logs_called_by_staff_id_fkey FOREIGN KEY (called_by_staff_id) REFERENCES public.staff(id);


--
-- Name: appointment_history appointment_history_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_history
    ADD CONSTRAINT appointment_history_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE CASCADE;


--
-- Name: appointment_message_logs appointment_message_logs_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_message_logs
    ADD CONSTRAINT appointment_message_logs_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE CASCADE;


--
-- Name: appointment_message_logs appointment_message_logs_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_message_logs
    ADD CONSTRAINT appointment_message_logs_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: appointment_message_logs appointment_message_logs_sent_by_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_message_logs
    ADD CONSTRAINT appointment_message_logs_sent_by_staff_id_fkey FOREIGN KEY (sent_by_staff_id) REFERENCES public.staff(id);


--
-- Name: appointment_requests appointment_requests_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_requests
    ADD CONSTRAINT appointment_requests_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id);


--
-- Name: appointment_requests appointment_requests_converted_to_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_requests
    ADD CONSTRAINT appointment_requests_converted_to_appointment_id_fkey FOREIGN KEY (converted_to_appointment_id) REFERENCES public.appointments(id);


--
-- Name: appointment_requests appointment_requests_handled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_requests
    ADD CONSTRAINT appointment_requests_handled_by_fkey FOREIGN KEY (handled_by) REFERENCES public.staff(id);


--
-- Name: appointments appointments_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id);


--
-- Name: appointments appointments_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.staff(id);


--
-- Name: appointments appointments_last_contacted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_last_contacted_by_fkey FOREIGN KEY (last_contacted_by) REFERENCES public.staff(id);


--
-- Name: appointments appointments_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: appointments appointments_specialist_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_specialist_assigned_by_fkey FOREIGN KEY (specialist_assigned_by) REFERENCES public.staff(id);


--
-- Name: appointments appointments_specialist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_specialist_id_fkey FOREIGN KEY (specialist_id) REFERENCES public.staff(id);


--
-- Name: bot_config bot_config_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bot_config
    ADD CONSTRAINT bot_config_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id);


--
-- Name: bot_event_log bot_event_log_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bot_event_log
    ADD CONSTRAINT bot_event_log_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id);


--
-- Name: bot_event_log bot_event_log_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bot_event_log
    ADD CONSTRAINT bot_event_log_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE SET NULL;


--
-- Name: business_hours business_hours_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_hours
    ADD CONSTRAINT business_hours_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;


--
-- Name: clinic_content clinic_content_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinic_content
    ADD CONSTRAINT clinic_content_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;


--
-- Name: clinic_holidays clinic_holidays_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinic_holidays
    ADD CONSTRAINT clinic_holidays_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;


--
-- Name: clinic_info_ext clinic_info_ext_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinic_info_ext
    ADD CONSTRAINT clinic_info_ext_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;


--
-- Name: clinic_notifications clinic_notifications_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinic_notifications
    ADD CONSTRAINT clinic_notifications_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id);


--
-- Name: clinic_notifications clinic_notifications_recipient_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinic_notifications
    ADD CONSTRAINT clinic_notifications_recipient_staff_id_fkey FOREIGN KEY (recipient_staff_id) REFERENCES public.staff(id);


--
-- Name: clinic_notifications clinic_notifications_sender_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinic_notifications
    ADD CONSTRAINT clinic_notifications_sender_staff_id_fkey FOREIGN KEY (sender_staff_id) REFERENCES public.staff(id);


--
-- Name: clinic_page_sections clinic_page_sections_page_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinic_page_sections
    ADD CONSTRAINT clinic_page_sections_page_id_fkey FOREIGN KEY (page_id) REFERENCES public.clinic_pages(id) ON DELETE CASCADE;


--
-- Name: clinic_pages clinic_pages_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinic_pages
    ADD CONSTRAINT clinic_pages_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;


--
-- Name: clinic_settings clinic_settings_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinic_settings
    ADD CONSTRAINT clinic_settings_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;


--
-- Name: communication_log communication_log_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communication_log
    ADD CONSTRAINT communication_log_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: dashboard_widget_prefs dashboard_widget_prefs_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dashboard_widget_prefs
    ADD CONSTRAINT dashboard_widget_prefs_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;


--
-- Name: dashboard_widget_prefs dashboard_widget_prefs_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dashboard_widget_prefs
    ADD CONSTRAINT dashboard_widget_prefs_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE;


--
-- Name: fee_schedule_overrides fee_schedule_overrides_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_schedule_overrides
    ADD CONSTRAINT fee_schedule_overrides_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;


--
-- Name: fee_schedule_overrides fee_schedule_overrides_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_schedule_overrides
    ADD CONSTRAINT fee_schedule_overrides_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.service_catalog(id) ON DELETE CASCADE;


--
-- Name: appointments fk_apt_plan; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT fk_apt_plan FOREIGN KEY (treatment_plan_id) REFERENCES public.treatment_plans(id);


--
-- Name: follow_ups follow_ups_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follow_ups
    ADD CONSTRAINT follow_ups_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: illness_library illness_library_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.illness_library
    ADD CONSTRAINT illness_library_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;


--
-- Name: image_annotations image_annotations_added_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.image_annotations
    ADD CONSTRAINT image_annotations_added_by_fkey FOREIGN KEY (added_by) REFERENCES public.staff(id);


--
-- Name: image_annotations image_annotations_image_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.image_annotations
    ADD CONSTRAINT image_annotations_image_id_fkey FOREIGN KEY (image_id) REFERENCES public.patient_images(id) ON DELETE CASCADE;


--
-- Name: kanban_columns kanban_columns_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kanban_columns
    ADD CONSTRAINT kanban_columns_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;


--
-- Name: lab_order_payments lab_order_payments_lab_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_order_payments
    ADD CONSTRAINT lab_order_payments_lab_order_id_fkey FOREIGN KEY (lab_order_id) REFERENCES public.lab_orders(id) ON DELETE CASCADE;


--
-- Name: lab_order_payments lab_order_payments_recorded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_order_payments
    ADD CONSTRAINT lab_order_payments_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.staff(id);


--
-- Name: lab_orders lab_orders_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_orders
    ADD CONSTRAINT lab_orders_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE SET NULL;


--
-- Name: lab_orders lab_orders_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_orders
    ADD CONSTRAINT lab_orders_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id);


--
-- Name: lab_orders lab_orders_closed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_orders
    ADD CONSTRAINT lab_orders_closed_by_fkey FOREIGN KEY (closed_by) REFERENCES public.staff(id);


--
-- Name: lab_orders lab_orders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_orders
    ADD CONSTRAINT lab_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id);


--
-- Name: lab_orders lab_orders_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_orders
    ADD CONSTRAINT lab_orders_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: lab_orders lab_orders_qr_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_orders
    ADD CONSTRAINT lab_orders_qr_code_id_fkey FOREIGN KEY (qr_code_id) REFERENCES public.qr_codes(id) ON DELETE SET NULL;


--
-- Name: lab_orders lab_orders_received_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_orders
    ADD CONSTRAINT lab_orders_received_by_fkey FOREIGN KEY (received_by) REFERENCES public.staff(id);


--
-- Name: lab_orders lab_orders_treatment_plan_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_orders
    ADD CONSTRAINT lab_orders_treatment_plan_item_id_fkey FOREIGN KEY (treatment_plan_item_id) REFERENCES public.treatment_plan_items(id) ON DELETE SET NULL;


--
-- Name: lab_orders lab_orders_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_orders
    ADD CONSTRAINT lab_orders_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.lab_vendors(id);


--
-- Name: lab_vendors lab_vendors_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_vendors
    ADD CONSTRAINT lab_vendors_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id);


--
-- Name: media media_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media
    ADD CONSTRAINT media_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id);


--
-- Name: media_gallery media_gallery_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_gallery
    ADD CONSTRAINT media_gallery_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id);


--
-- Name: media_gallery media_gallery_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_gallery
    ADD CONSTRAINT media_gallery_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: media_gallery media_gallery_taken_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_gallery
    ADD CONSTRAINT media_gallery_taken_by_fkey FOREIGN KEY (taken_by) REFERENCES public.staff(id);


--
-- Name: media_gallery media_gallery_treatment_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_gallery
    ADD CONSTRAINT media_gallery_treatment_plan_id_fkey FOREIGN KEY (treatment_plan_id) REFERENCES public.treatment_plans(id) ON DELETE SET NULL;


--
-- Name: media media_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media
    ADD CONSTRAINT media_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: media media_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media
    ADD CONSTRAINT media_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.staff(id);


--
-- Name: medicine_catalog medicine_catalog_added_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medicine_catalog
    ADD CONSTRAINT medicine_catalog_added_by_fkey FOREIGN KEY (added_by) REFERENCES public.staff(id);


--
-- Name: medicine_reminders medicine_reminders_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medicine_reminders
    ADD CONSTRAINT medicine_reminders_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: medicine_reminders medicine_reminders_prescription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medicine_reminders
    ADD CONSTRAINT medicine_reminders_prescription_id_fkey FOREIGN KEY (prescription_id) REFERENCES public.prescriptions(id) ON DELETE CASCADE;


--
-- Name: module_visibility module_visibility_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.module_visibility
    ADD CONSTRAINT module_visibility_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;


--
-- Name: patient_credits patient_credits_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_credits
    ADD CONSTRAINT patient_credits_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: patient_health patient_health_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_health
    ADD CONSTRAINT patient_health_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: patient_images patient_images_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_images
    ADD CONSTRAINT patient_images_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id);


--
-- Name: patient_images patient_images_linked_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_images
    ADD CONSTRAINT patient_images_linked_plan_id_fkey FOREIGN KEY (linked_plan_id) REFERENCES public.treatment_plans(id);


--
-- Name: patient_images patient_images_linked_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_images
    ADD CONSTRAINT patient_images_linked_session_id_fkey FOREIGN KEY (linked_session_id) REFERENCES public.treatment_sessions(id);


--
-- Name: patient_images patient_images_linked_sitting_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_images
    ADD CONSTRAINT patient_images_linked_sitting_id_fkey FOREIGN KEY (linked_sitting_id) REFERENCES public.treatment_sittings(id);


--
-- Name: patient_images patient_images_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_images
    ADD CONSTRAINT patient_images_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: patient_images patient_images_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_images
    ADD CONSTRAINT patient_images_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.staff(id);


--
-- Name: patient_portal_tokens patient_portal_tokens_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_portal_tokens
    ADD CONSTRAINT patient_portal_tokens_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: patient_ratings patient_ratings_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_ratings
    ADD CONSTRAINT patient_ratings_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: patient_uploads patient_uploads_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_uploads
    ADD CONSTRAINT patient_uploads_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE SET NULL;


--
-- Name: patient_uploads patient_uploads_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_uploads
    ADD CONSTRAINT patient_uploads_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: patient_uploads patient_uploads_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_uploads
    ADD CONSTRAINT patient_uploads_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.staff(id);


--
-- Name: patients patients_preferred_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_preferred_clinic_id_fkey FOREIGN KEY (preferred_clinic_id) REFERENCES public.clinics(id);


--
-- Name: payment_transactions payment_transactions_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id);


--
-- Name: payment_transactions payment_transactions_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id);


--
-- Name: payment_transactions payment_transactions_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: payment_transactions payment_transactions_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.treatment_plans(id);


--
-- Name: prescriptions prescriptions_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id);


--
-- Name: prescriptions prescriptions_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id);


--
-- Name: prescriptions prescriptions_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.staff(id);


--
-- Name: prescriptions prescriptions_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: prescriptions prescriptions_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.treatment_plans(id);


--
-- Name: prescriptions prescriptions_qr_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_qr_code_id_fkey FOREIGN KEY (qr_code_id) REFERENCES public.qr_codes(id) ON DELETE SET NULL;


--
-- Name: procedure_medicine_map procedure_medicine_map_medicine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procedure_medicine_map
    ADD CONSTRAINT procedure_medicine_map_medicine_id_fkey FOREIGN KEY (medicine_id) REFERENCES public.medicine_catalog(id) ON DELETE CASCADE;


--
-- Name: procedure_medicine_map procedure_medicine_map_procedure_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procedure_medicine_map
    ADD CONSTRAINT procedure_medicine_map_procedure_id_fkey FOREIGN KEY (procedure_id) REFERENCES public.procedure_catalog(id) ON DELETE CASCADE;


--
-- Name: qr_codes qr_codes_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qr_codes
    ADD CONSTRAINT qr_codes_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id);


--
-- Name: reminder_log reminder_log_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reminder_log
    ADD CONSTRAINT reminder_log_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id);


--
-- Name: reminder_log reminder_log_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reminder_log
    ADD CONSTRAINT reminder_log_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id);


--
-- Name: reminder_log reminder_log_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reminder_log
    ADD CONSTRAINT reminder_log_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: reminder_settings reminder_settings_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reminder_settings
    ADD CONSTRAINT reminder_settings_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id);


--
-- Name: reschedule_requests reschedule_requests_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reschedule_requests
    ADD CONSTRAINT reschedule_requests_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id);


--
-- Name: reschedule_requests reschedule_requests_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reschedule_requests
    ADD CONSTRAINT reschedule_requests_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id);


--
-- Name: reschedule_requests reschedule_requests_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reschedule_requests
    ADD CONSTRAINT reschedule_requests_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: reschedule_requests reschedule_requests_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reschedule_requests
    ADD CONSTRAINT reschedule_requests_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.staff(id);


--
-- Name: service_catalog service_catalog_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_catalog
    ADD CONSTRAINT service_catalog_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;


--
-- Name: site_doctors site_doctors_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_doctors
    ADD CONSTRAINT site_doctors_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: site_videos site_videos_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_videos
    ADD CONSTRAINT site_videos_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;


--
-- Name: smile_sessions smile_sessions_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.smile_sessions
    ADD CONSTRAINT smile_sessions_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id);


--
-- Name: smile_sessions smile_sessions_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.smile_sessions
    ADD CONSTRAINT smile_sessions_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: specialist_earnings specialist_earnings_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.specialist_earnings
    ADD CONSTRAINT specialist_earnings_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE SET NULL;


--
-- Name: specialist_earnings specialist_earnings_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.specialist_earnings
    ADD CONSTRAINT specialist_earnings_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id);


--
-- Name: specialist_earnings specialist_earnings_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.specialist_earnings
    ADD CONSTRAINT specialist_earnings_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE SET NULL;


--
-- Name: specialist_earnings specialist_earnings_recorded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.specialist_earnings
    ADD CONSTRAINT specialist_earnings_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.staff(id);


--
-- Name: specialist_earnings specialist_earnings_settled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.specialist_earnings
    ADD CONSTRAINT specialist_earnings_settled_by_fkey FOREIGN KEY (settled_by) REFERENCES public.staff(id);


--
-- Name: specialist_earnings specialist_earnings_specialist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.specialist_earnings
    ADD CONSTRAINT specialist_earnings_specialist_id_fkey FOREIGN KEY (specialist_id) REFERENCES public.staff(id);


--
-- Name: specialist_notifications specialist_notifications_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.specialist_notifications
    ADD CONSTRAINT specialist_notifications_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE CASCADE;


--
-- Name: specialist_notifications specialist_notifications_sent_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.specialist_notifications
    ADD CONSTRAINT specialist_notifications_sent_by_fkey FOREIGN KEY (sent_by) REFERENCES public.staff(id);


--
-- Name: specialist_notifications specialist_notifications_specialist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.specialist_notifications
    ADD CONSTRAINT specialist_notifications_specialist_id_fkey FOREIGN KEY (specialist_id) REFERENCES public.staff(id);


--
-- Name: staff staff_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;


--
-- Name: to_be_appointed to_be_appointed_added_by_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.to_be_appointed
    ADD CONSTRAINT to_be_appointed_added_by_staff_id_fkey FOREIGN KEY (added_by_staff_id) REFERENCES public.staff(id);


--
-- Name: to_be_appointed to_be_appointed_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.to_be_appointed
    ADD CONSTRAINT to_be_appointed_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id);


--
-- Name: to_be_appointed to_be_appointed_original_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.to_be_appointed
    ADD CONSTRAINT to_be_appointed_original_appointment_id_fkey FOREIGN KEY (original_appointment_id) REFERENCES public.appointments(id);


--
-- Name: to_be_appointed to_be_appointed_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.to_be_appointed
    ADD CONSTRAINT to_be_appointed_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: to_be_appointed to_be_appointed_resolved_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.to_be_appointed
    ADD CONSTRAINT to_be_appointed_resolved_appointment_id_fkey FOREIGN KEY (resolved_appointment_id) REFERENCES public.appointments(id);


--
-- Name: tooth_clinical_records tooth_clinical_records_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tooth_clinical_records
    ADD CONSTRAINT tooth_clinical_records_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: tooth_conditions tooth_conditions_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tooth_conditions
    ADD CONSTRAINT tooth_conditions_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: tooth_conditions tooth_conditions_recorded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tooth_conditions
    ADD CONSTRAINT tooth_conditions_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.staff(id);


--
-- Name: tooth_diagnoses tooth_diagnoses_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tooth_diagnoses
    ADD CONSTRAINT tooth_diagnoses_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: tooth_examinations tooth_examinations_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tooth_examinations
    ADD CONSTRAINT tooth_examinations_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: tooth_observations tooth_observations_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tooth_observations
    ADD CONSTRAINT tooth_observations_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: tooth_treatments tooth_treatments_completed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tooth_treatments
    ADD CONSTRAINT tooth_treatments_completed_by_fkey FOREIGN KEY (completed_by) REFERENCES public.staff(id);


--
-- Name: tooth_treatments tooth_treatments_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tooth_treatments
    ADD CONSTRAINT tooth_treatments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: tooth_treatments tooth_treatments_sitting_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tooth_treatments
    ADD CONSTRAINT tooth_treatments_sitting_id_fkey FOREIGN KEY (sitting_id) REFERENCES public.treatment_sittings(id);


--
-- Name: tooth_treatments tooth_treatments_treatment_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tooth_treatments
    ADD CONSTRAINT tooth_treatments_treatment_plan_id_fkey FOREIGN KEY (treatment_plan_id) REFERENCES public.treatment_plans(id);


--
-- Name: treatment_plan_items treatment_plan_items_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatment_plan_items
    ADD CONSTRAINT treatment_plan_items_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.treatment_plans(id) ON DELETE CASCADE;


--
-- Name: treatment_plan_items treatment_plan_items_procedure_catalog_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatment_plan_items
    ADD CONSTRAINT treatment_plan_items_procedure_catalog_id_fkey FOREIGN KEY (procedure_catalog_id) REFERENCES public.procedure_catalog(id);


--
-- Name: treatment_plans treatment_plans_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatment_plans
    ADD CONSTRAINT treatment_plans_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id);


--
-- Name: treatment_plans treatment_plans_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatment_plans
    ADD CONSTRAINT treatment_plans_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.staff(id);


--
-- Name: treatment_plans treatment_plans_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatment_plans
    ADD CONSTRAINT treatment_plans_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: treatment_sessions treatment_sessions_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatment_sessions
    ADD CONSTRAINT treatment_sessions_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id);


--
-- Name: treatment_sessions treatment_sessions_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatment_sessions
    ADD CONSTRAINT treatment_sessions_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id);


--
-- Name: treatment_sessions treatment_sessions_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatment_sessions
    ADD CONSTRAINT treatment_sessions_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.staff(id);


--
-- Name: treatment_sessions treatment_sessions_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatment_sessions
    ADD CONSTRAINT treatment_sessions_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: treatment_sessions treatment_sessions_payment_collected_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatment_sessions
    ADD CONSTRAINT treatment_sessions_payment_collected_by_fkey FOREIGN KEY (payment_collected_by) REFERENCES public.staff(id);


--
-- Name: treatment_sessions treatment_sessions_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatment_sessions
    ADD CONSTRAINT treatment_sessions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.treatment_plans(id);


--
-- Name: treatment_sessions treatment_sessions_prescription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatment_sessions
    ADD CONSTRAINT treatment_sessions_prescription_id_fkey FOREIGN KEY (prescription_id) REFERENCES public.prescriptions(id);


--
-- Name: treatment_sessions treatment_sessions_sitting_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatment_sessions
    ADD CONSTRAINT treatment_sessions_sitting_id_fkey FOREIGN KEY (sitting_id) REFERENCES public.treatment_sittings(id);


--
-- Name: treatment_sessions treatment_sessions_walk_in_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatment_sessions
    ADD CONSTRAINT treatment_sessions_walk_in_id_fkey FOREIGN KEY (walk_in_id) REFERENCES public.walk_in_patients(id);


--
-- Name: treatment_sittings treatment_sittings_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatment_sittings
    ADD CONSTRAINT treatment_sittings_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id);


--
-- Name: treatment_sittings treatment_sittings_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatment_sittings
    ADD CONSTRAINT treatment_sittings_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.staff(id);


--
-- Name: treatment_sittings treatment_sittings_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatment_sittings
    ADD CONSTRAINT treatment_sittings_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.treatment_plans(id) ON DELETE CASCADE;


--
-- Name: walk_in_patients walk_in_patients_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.walk_in_patients
    ADD CONSTRAINT walk_in_patients_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id);


--
-- Name: walk_in_patients walk_in_patients_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.walk_in_patients
    ADD CONSTRAINT walk_in_patients_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.staff(id);


--
-- Name: walk_in_patients walk_in_patients_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.walk_in_patients
    ADD CONSTRAINT walk_in_patients_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: walk_in_patients walk_in_patients_registered_by_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.walk_in_patients
    ADD CONSTRAINT walk_in_patients_registered_by_staff_id_fkey FOREIGN KEY (registered_by_staff_id) REFERENCES public.staff(id);


--
-- PostgreSQL database dump complete
--



-- Google reviews badge fields (added post-dump; idempotent for fresh installs)
ALTER TABLE site_theme ADD COLUMN IF NOT EXISTS google_reviews_url text;
ALTER TABLE site_theme ADD COLUMN IF NOT EXISTS google_rating text;
ALTER TABLE site_theme ADD COLUMN IF NOT EXISTS google_review_count text;
UPDATE site_theme SET google_rating = COALESCE(google_rating, '4.9'),
                      google_review_count = COALESCE(google_review_count, '120+');

-- Automatically refreshed Google review metadata.
ALTER TABLE site_testimonials
  ADD COLUMN IF NOT EXISTS google_review_name text,
  ADD COLUMN IF NOT EXISTS google_review_url text,
  ADD COLUMN IF NOT EXISTS google_author_url text,
  ADD COLUMN IF NOT EXISTS google_flag_url text,
  ADD COLUMN IF NOT EXISTS google_publish_time timestamptz,
  ADD COLUMN IF NOT EXISTS google_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS google_place_id text;

ALTER TABLE site_theme
  ADD COLUMN IF NOT EXISTS google_reviews_synced_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS ux_site_testimonials_google_review
  ON site_testimonials (google_review_name)
  WHERE source = 'google' AND google_review_name IS NOT NULL;

-- Privacy-friendly public website visitor count.
CREATE TABLE IF NOT EXISTS public_site_visitor_days (
  visitor_hash char(64) NOT NULL,
  visit_date date NOT NULL DEFAULT CURRENT_DATE,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  page_views integer NOT NULL DEFAULT 1,
  PRIMARY KEY (visitor_hash, visit_date)
);

CREATE INDEX IF NOT EXISTS ix_public_site_visitor_days_date
  ON public_site_visitor_days (visit_date DESC);

-- Treatment card billing confirmation gate (added post-dump; idempotent for fresh installs)
ALTER TABLE treatment_plan_items
  ADD COLUMN IF NOT EXISTS price_confirmed boolean NOT NULL DEFAULT false;

UPDATE treatment_plan_items
SET price_confirmed = true
WHERE COALESCE(final_amount, 0) > 0 AND price_confirmed = false;
