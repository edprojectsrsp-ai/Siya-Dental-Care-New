--
-- PostgreSQL database dump
--

\restrict WsDOPpVdJB4DgmB80cVKLnQenaITm7nniFThf7lhpqmC5B5B2Trf3kqMIMxSbfq

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: appointment_call_logs; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.appointment_call_logs OWNER TO postgres;

--
-- Name: appointment_history; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.appointment_history OWNER TO postgres;

--
-- Name: appointment_message_logs; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.appointment_message_logs OWNER TO postgres;

--
-- Name: appointment_requests; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.appointment_requests OWNER TO postgres;

--
-- Name: appointment_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.appointment_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.appointment_requests_id_seq OWNER TO postgres;

--
-- Name: appointment_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.appointment_requests_id_seq OWNED BY public.appointment_requests.id;


--
-- Name: appointment_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.appointment_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type_name character varying(60) NOT NULL,
    sort_order integer DEFAULT 100,
    is_default boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.appointment_types OWNER TO postgres;

--
-- Name: appointments; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.appointments OWNER TO postgres;

--
-- Name: ar_preview_settings; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.ar_preview_settings OWNER TO postgres;

--
-- Name: bot_config; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.bot_config OWNER TO postgres;

--
-- Name: bot_event_log; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.bot_event_log OWNER TO postgres;

--
-- Name: business_hours; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.business_hours OWNER TO postgres;

--
-- Name: clinic_content; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.clinic_content OWNER TO postgres;

--
-- Name: clinic_holidays; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clinic_holidays (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clinic_id uuid NOT NULL,
    holiday_date date NOT NULL,
    reason character varying(200),
    is_recurring boolean DEFAULT false
);


ALTER TABLE public.clinic_holidays OWNER TO postgres;

--
-- Name: clinic_info; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clinic_info (
    id integer NOT NULL,
    key text NOT NULL,
    value text,
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.clinic_info OWNER TO postgres;

--
-- Name: clinic_info_ext; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.clinic_info_ext OWNER TO postgres;

--
-- Name: clinic_info_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.clinic_info_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.clinic_info_id_seq OWNER TO postgres;

--
-- Name: clinic_info_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.clinic_info_id_seq OWNED BY public.clinic_info.id;


--
-- Name: clinic_notifications; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.clinic_notifications OWNER TO postgres;

--
-- Name: clinic_page_sections; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.clinic_page_sections OWNER TO postgres;

--
-- Name: clinic_pages; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.clinic_pages OWNER TO postgres;

--
-- Name: clinic_settings; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.clinic_settings OWNER TO postgres;

--
-- Name: clinical_link_scores; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.clinical_link_scores OWNER TO postgres;

--
-- Name: clinics; Type: TABLE; Schema: public; Owner: postgres
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
    display_order integer DEFAULT 0
);


ALTER TABLE public.clinics OWNER TO postgres;

--
-- Name: common_complaints; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.common_complaints (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    complaint_name character varying(150) NOT NULL,
    category character varying(50) DEFAULT 'general'::character varying,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.common_complaints OWNER TO postgres;

--
-- Name: common_conditions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.common_conditions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    condition_name character varying(100) NOT NULL,
    category character varying(50) DEFAULT 'general'::character varying,
    is_default boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.common_conditions OWNER TO postgres;

--
-- Name: message_log; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.message_log OWNER TO postgres;

--
-- Name: communication_counter_v; Type: VIEW; Schema: public; Owner: postgres
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


ALTER VIEW public.communication_counter_v OWNER TO postgres;

--
-- Name: communication_log; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.communication_log OWNER TO postgres;

--
-- Name: dashboard_widget_prefs; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.dashboard_widget_prefs OWNER TO postgres;

--
-- Name: diagnosis_catalog; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.diagnosis_catalog OWNER TO postgres;

--
-- Name: examination_catalog; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.examination_catalog (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(120) NOT NULL,
    category character varying(40) DEFAULT 'general'::character varying,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.examination_catalog OWNER TO postgres;

--
-- Name: examination_finding_catalog; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.examination_finding_catalog (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    finding_name character varying(100) NOT NULL,
    category character varying(40) DEFAULT 'general'::character varying,
    is_default boolean DEFAULT false,
    usage_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.examination_finding_catalog OWNER TO postgres;

--
-- Name: fee_schedule_overrides; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.fee_schedule_overrides OWNER TO postgres;

--
-- Name: follow_ups; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.follow_ups OWNER TO postgres;

--
-- Name: gallery_images; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.gallery_images OWNER TO postgres;

--
-- Name: illness_library; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.illness_library OWNER TO postgres;

--
-- Name: image_annotations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.image_annotations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    image_id uuid NOT NULL,
    annotation_type character varying(30) NOT NULL,
    annotation_data jsonb NOT NULL,
    added_by uuid,
    added_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.image_annotations OWNER TO postgres;

--
-- Name: kanban_columns; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.kanban_columns OWNER TO postgres;

--
-- Name: lab_order_payments; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.lab_order_payments OWNER TO postgres;

--
-- Name: lab_orders; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.lab_orders OWNER TO postgres;

--
-- Name: lab_orders_serial_no_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.lab_orders_serial_no_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.lab_orders_serial_no_seq OWNER TO postgres;

--
-- Name: lab_orders_serial_no_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.lab_orders_serial_no_seq OWNED BY public.lab_orders.serial_no;


--
-- Name: lab_vendors; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.lab_vendors OWNER TO postgres;

--
-- Name: lab_work_types; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.lab_work_types OWNER TO postgres;

--
-- Name: media; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.media OWNER TO postgres;

--
-- Name: media_gallery; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.media_gallery OWNER TO postgres;

--
-- Name: medicine_catalog; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.medicine_catalog OWNER TO postgres;

--
-- Name: medicine_reminders; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.medicine_reminders OWNER TO postgres;

--
-- Name: message_log_stats_v; Type: VIEW; Schema: public; Owner: postgres
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


ALTER VIEW public.message_log_stats_v OWNER TO postgres;

--
-- Name: message_templates; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.message_templates OWNER TO postgres;

--
-- Name: module_visibility; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.module_visibility OWNER TO postgres;

--
-- Name: patients; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.patients OWNER TO postgres;

--
-- Name: tooth_observations; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.tooth_observations OWNER TO postgres;

--
-- Name: treatment_plans; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.treatment_plans OWNER TO postgres;

--
-- Name: patient_booking_constraints_v; Type: VIEW; Schema: public; Owner: postgres
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


ALTER VIEW public.patient_booking_constraints_v OWNER TO postgres;

--
-- Name: VIEW patient_booking_constraints_v; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW public.patient_booking_constraints_v IS 'Per-patient booking blockers. Statuses corrected for current schema. Used by appointment hub to warn before finalising.';


--
-- Name: patient_credits; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.patient_credits OWNER TO postgres;

--
-- Name: patient_health; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.patient_health OWNER TO postgres;

--
-- Name: patient_images; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.patient_images OWNER TO postgres;

--
-- Name: patient_portal_tokens; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.patient_portal_tokens OWNER TO postgres;

--
-- Name: patient_ratings; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.patient_ratings OWNER TO postgres;

--
-- Name: payment_transactions; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.payment_transactions OWNER TO postgres;

--
-- Name: prescriptions; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.prescriptions OWNER TO postgres;

--
-- Name: patient_summary_v; Type: VIEW; Schema: public; Owner: postgres
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


ALTER VIEW public.patient_summary_v OWNER TO postgres;

--
-- Name: patient_uploads; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.patient_uploads OWNER TO postgres;

--
-- Name: patient_uploads_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.patient_uploads_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.patient_uploads_id_seq OWNER TO postgres;

--
-- Name: patient_uploads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.patient_uploads_id_seq OWNED BY public.patient_uploads.id;


--
-- Name: phone_consultations; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.phone_consultations OWNER TO postgres;

--
-- Name: plan_revisions; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.plan_revisions OWNER TO postgres;

--
-- Name: procedure_catalog; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.procedure_catalog OWNER TO postgres;

--
-- Name: procedure_medicine_map; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.procedure_medicine_map (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    procedure_id uuid NOT NULL,
    medicine_id uuid NOT NULL,
    is_default boolean DEFAULT true
);


ALTER TABLE public.procedure_medicine_map OWNER TO postgres;

--
-- Name: qr_codes; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.qr_codes OWNER TO postgres;

--
-- Name: reminder_log; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.reminder_log OWNER TO postgres;

--
-- Name: reminder_settings; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.reminder_settings OWNER TO postgres;

--
-- Name: reschedule_requests; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.reschedule_requests OWNER TO postgres;

--
-- Name: rewards_redeemed_v; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.rewards_redeemed_v AS
 SELECT clinic_id,
    count(*) AS rewards_redeemed
   FROM public.patient_credits
  WHERE (is_used = true)
  GROUP BY clinic_id;


ALTER VIEW public.rewards_redeemed_v OWNER TO postgres;

--
-- Name: service_catalog; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.service_catalog OWNER TO postgres;

--
-- Name: site_doctors; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.site_doctors OWNER TO postgres;

--
-- Name: site_services; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.site_services OWNER TO postgres;

--
-- Name: site_testimonials; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.site_testimonials OWNER TO postgres;

--
-- Name: site_theme; Type: TABLE; Schema: public; Owner: postgres
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
    google_reviews_url text,
    google_rating text,
    google_review_count text,
    CONSTRAINT site_theme_id_check CHECK ((id = 1))
);


ALTER TABLE public.site_theme OWNER TO postgres;

--
-- Name: site_videos; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.site_videos OWNER TO postgres;

--
-- Name: smile_sessions; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.smile_sessions OWNER TO postgres;

--
-- Name: specialist_earnings; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.specialist_earnings OWNER TO postgres;

--
-- Name: specialist_notifications; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.specialist_notifications OWNER TO postgres;

--
-- Name: specialist_rate_tiers; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.specialist_rate_tiers OWNER TO postgres;

--
-- Name: staff; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.staff OWNER TO postgres;

--
-- Name: to_be_appointed; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.to_be_appointed OWNER TO postgres;

--
-- Name: tooth_clinical_records; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.tooth_clinical_records OWNER TO postgres;

--
-- Name: tooth_conditions; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.tooth_conditions OWNER TO postgres;

--
-- Name: tooth_diagnoses; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.tooth_diagnoses OWNER TO postgres;

--
-- Name: tooth_examinations; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.tooth_examinations OWNER TO postgres;

--
-- Name: tooth_issue_catalog; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tooth_issue_catalog (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    issue_name character varying(80) NOT NULL,
    is_default boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.tooth_issue_catalog OWNER TO postgres;

--
-- Name: tooth_treatments; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.tooth_treatments OWNER TO postgres;

--
-- Name: treatment_plan_items; Type: TABLE; Schema: public; Owner: postgres
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
    price_confirmed boolean DEFAULT false NOT NULL,
    CONSTRAINT treatment_plan_items_status_check CHECK (((status)::text = ANY (ARRAY[('advised'::character varying)::text, ('in_progress'::character varying)::text, ('completed'::character varying)::text, ('cancelled'::character varying)::text])))
);


ALTER TABLE public.treatment_plan_items OWNER TO postgres;

--
-- Name: treatment_sessions; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.treatment_sessions OWNER TO postgres;

--
-- Name: treatment_sittings; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.treatment_sittings OWNER TO postgres;

--
-- Name: treatment_templates; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.treatment_templates OWNER TO postgres;

--
-- Name: v_appointments_bucketed; Type: VIEW; Schema: public; Owner: postgres
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


ALTER VIEW public.v_appointments_bucketed OWNER TO postgres;

--
-- Name: v_daily_revenue; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_daily_revenue AS
 SELECT clinic_id,
    date,
    count(*) AS txn_count,
    sum(amount) AS revenue,
    count(DISTINCT patient_id) AS unique_patients
   FROM public.payment_transactions
  GROUP BY clinic_id, date;


ALTER VIEW public.v_daily_revenue OWNER TO postgres;

--
-- Name: v_daily_revenue_by_mode; Type: VIEW; Schema: public; Owner: postgres
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


ALTER VIEW public.v_daily_revenue_by_mode OWNER TO postgres;

--
-- Name: v_doctor_performance; Type: VIEW; Schema: public; Owner: postgres
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


ALTER VIEW public.v_doctor_performance OWNER TO postgres;

--
-- Name: v_lab_payables; Type: VIEW; Schema: public; Owner: postgres
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


ALTER VIEW public.v_lab_payables OWNER TO postgres;

--
-- Name: VIEW v_lab_payables; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW public.v_lab_payables IS 'Outstanding lab vendor payables: cost minus payments. Excludes cancelled and fully-paid orders.';


--
-- Name: v_monthly_revenue; Type: VIEW; Schema: public; Owner: postgres
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


ALTER VIEW public.v_monthly_revenue OWNER TO postgres;

--
-- Name: v_outstanding_balances; Type: VIEW; Schema: public; Owner: postgres
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


ALTER VIEW public.v_outstanding_balances OWNER TO postgres;

--
-- Name: v_patient_summary; Type: VIEW; Schema: public; Owner: postgres
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


ALTER VIEW public.v_patient_summary OWNER TO postgres;

--
-- Name: v_pending_lab_orders_by_patient; Type: VIEW; Schema: public; Owner: postgres
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


ALTER VIEW public.v_pending_lab_orders_by_patient OWNER TO postgres;

--
-- Name: v_procedure_revenue; Type: VIEW; Schema: public; Owner: postgres
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


ALTER VIEW public.v_procedure_revenue OWNER TO postgres;

--
-- Name: v_specialist_outstanding; Type: VIEW; Schema: public; Owner: postgres
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


ALTER VIEW public.v_specialist_outstanding OWNER TO postgres;

--
-- Name: v_specialist_payables; Type: VIEW; Schema: public; Owner: postgres
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


ALTER VIEW public.v_specialist_payables OWNER TO postgres;

--
-- Name: VIEW v_specialist_payables; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW public.v_specialist_payables IS 'Outstanding specialist payables. Includes unsettled or partially-settled earnings.';


--
-- Name: v_workshop_specialist_work; Type: VIEW; Schema: public; Owner: postgres
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


ALTER VIEW public.v_workshop_specialist_work OWNER TO postgres;

--
-- Name: VIEW v_workshop_specialist_work; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW public.v_workshop_specialist_work IS 'Specialist work tracker: pending → done → verified. Used by Workshop sidebar group.';


--
-- Name: walk_in_patients; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.walk_in_patients OWNER TO postgres;

--
-- Name: workspace_drafts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.workspace_drafts (
    patient_id uuid NOT NULL,
    data jsonb DEFAULT '{}'::jsonb,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.workspace_drafts OWNER TO postgres;

--
-- Name: appointment_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointment_requests ALTER COLUMN id SET DEFAULT nextval('public.appointment_requests_id_seq'::regclass);


--
-- Name: clinic_info id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinic_info ALTER COLUMN id SET DEFAULT nextval('public.clinic_info_id_seq'::regclass);


--
-- Name: lab_orders serial_no; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lab_orders ALTER COLUMN serial_no SET DEFAULT nextval('public.lab_orders_serial_no_seq'::regclass);


--
-- Name: patient_uploads id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_uploads ALTER COLUMN id SET DEFAULT nextval('public.patient_uploads_id_seq'::regclass);


--
-- Data for Name: appointment_call_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.appointment_call_logs VALUES ('e0ee497c-9194-44b8-821f-2affb66dfce3', '5607d539-d841-4ff4-88d7-10ea8b601215', 'd1111111-1111-1111-1111-111111111111', 'confirmed', '2026-06-20 22:41:30.190462', 'confirm', NULL, '2026-06-20 22:41:30.190462');
INSERT INTO public.appointment_call_logs VALUES ('315953d7-c113-44df-9fc6-728ccc67433c', '2a3a29ad-4b20-4a7e-a538-8d668e541d28', 'd1111111-1111-1111-1111-111111111111', 'confirmed', '2026-06-20 22:42:56.290201', 'confirm', NULL, '2026-06-20 22:42:56.290201');
INSERT INTO public.appointment_call_logs VALUES ('06c234cd-13ab-4e91-86a8-d1abdaccf075', '2a3a29ad-4b20-4a7e-a538-8d668e541d28', 'd1111111-1111-1111-1111-111111111111', 'confirmed', '2026-06-20 22:43:16.01103', 'confirm', NULL, '2026-06-20 22:43:16.01103');
INSERT INTO public.appointment_call_logs VALUES ('4d13a438-3493-431c-8982-33e34336278f', '30000000-0000-4000-8000-000000000102', 'd1111111-1111-1111-1111-111111111111', 'refused', '2026-06-20 23:33:47.639896', 'refused', NULL, '2026-06-20 23:33:47.639896');
INSERT INTO public.appointment_call_logs VALUES ('4a91cd47-39fa-492b-aff5-ffcd60cd077e', '30000000-0000-4000-8000-000000000102', 'd1111111-1111-1111-1111-111111111111', 'date_change_pending', '2026-06-20 23:34:34.661749', 'change_date', NULL, '2026-06-20 23:34:34.661749');
INSERT INTO public.appointment_call_logs VALUES ('7362f1d0-7614-4691-906b-58085e6ef0a6', '30000000-0000-4000-8000-000000000102', 'd1111111-1111-1111-1111-111111111111', 'confirmed', '2026-06-20 23:35:07.989266', 'confirm', NULL, '2026-06-20 23:35:07.989266');
INSERT INTO public.appointment_call_logs VALUES ('81afdb85-de49-4ec5-8582-527327a5de04', 'eb71a482-4d0d-4822-b905-fd4459abe57b', 'd1111111-1111-1111-1111-111111111111', 'confirmed', '2026-06-20 23:48:56.688717', 'confirm', NULL, '2026-06-20 23:48:56.688717');
INSERT INTO public.appointment_call_logs VALUES ('4467d488-bebc-4a5c-bdf7-01822f8d9c65', 'eb71a482-4d0d-4822-b905-fd4459abe57b', 'd1111111-1111-1111-1111-111111111111', 'confirmed', '2026-06-20 23:49:25.895292', 'confirm', NULL, '2026-06-20 23:49:25.895292');
INSERT INTO public.appointment_call_logs VALUES ('93fc0ae8-b5eb-4562-8b6a-8a6382a855a0', '30000000-0000-4000-8000-000000000104', 'd2222222-2222-2222-2222-222222222222', 'confirmed', '2026-06-21 00:34:57.781611', 'automated workflow verification', NULL, '2026-06-21 00:34:57.781611');
INSERT INTO public.appointment_call_logs VALUES ('68fc09dd-4590-4902-9ba6-d51616e23cb1', '30000000-0000-4000-8000-000000000102', 'd1111111-1111-1111-1111-111111111111', 'confirmed', '2026-06-21 01:39:52.364362', 'confirm', NULL, '2026-06-21 01:39:52.364362');
INSERT INTO public.appointment_call_logs VALUES ('cdbb77e3-f154-4768-a9a8-830651559956', '702f0116-87b0-4516-a496-4007ec9a4f99', 'd1111111-1111-1111-1111-111111111111', 'confirmed', '2026-06-27 17:38:44.207021', 'confirm', NULL, '2026-06-27 17:38:44.207021');


--
-- Data for Name: appointment_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.appointment_history VALUES ('f85c2cd3-79db-4ee5-b5cf-2cc6abefa537', '702f0116-87b0-4516-a496-4007ec9a4f99', 'converted_from_request', NULL, '{"date": "2026-06-29", "time": "10:00:00", "source": "public_site", "request_id": 3}', 'd2222222-2222-2222-2222-222222222222', '2026-06-26 14:14:46.044101+05:30', 'Converted from public_site/whatsapp request (#3)');
INSERT INTO public.appointment_history VALUES ('964e6ec2-02a6-434f-a726-7294294097e6', '215ecf09-8387-4211-b0ef-a15f086f41c6', 'converted_from_request', NULL, '{"date": "2026-06-26", "time": "10:30:00", "source": "public_site", "request_id": 1}', 'd2222222-2222-2222-2222-222222222222', '2026-06-26 14:15:44.222211+05:30', 'Converted from public_site/whatsapp request (#1)');


--
-- Data for Name: appointment_message_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.appointment_message_logs VALUES ('6add0c28-5f52-4222-ad63-d04c22ef32f3', 'eb71a482-4d0d-4822-b905-fd4459abe57b', '10000000-0000-4000-8000-000000000103', 'd1111111-1111-1111-1111-111111111111', 'whatsapp', 'confirmation', 'Hi Meera Nair, your appointment at Siya Dental Care — Main Branch is confirmed for  at  for Follow-up. Please arrive 10 minutes early. Reply YES to confirm or call +919876500001. - Siya Dental Care — Main Branch', '2026-06-20 23:49:08.954851', 'manually_sent', NULL);


--
-- Data for Name: appointment_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.appointment_requests VALUES (4, 'po', '1111111111', '2026-06-26', NULL, 'Main', 'Service: Smile Makeover', 'confirmed', '2026-06-26 14:09:54.331485+05:30', 'a1111111-1111-1111-1111-111111111111', NULL, 'public_site', '26dba307-2743-4175-9aad-29b1953a8c1d', 'd2222222-2222-2222-2222-222222222222', NULL, 'Smile Makeover');
INSERT INTO public.appointment_requests VALUES (2, 'Test Patient', '9876500001', '2026-06-28', NULL, NULL, 'Service: Cleaning
Notes: From site test', 'rejected', '2026-06-26 14:02:58.707771+05:30', 'a1111111-1111-1111-1111-111111111111', NULL, 'public_site', NULL, 'd2222222-2222-2222-2222-222222222222', 'Not available', NULL);
INSERT INTO public.appointment_requests VALUES (3, 'Wire Test', '9876512345', '2026-06-29', NULL, NULL, NULL, 'confirmed', '2026-06-26 14:04:28.006896+05:30', 'a1111111-1111-1111-1111-111111111111', NULL, 'public_site', '702f0116-87b0-4516-a496-4007ec9a4f99', 'd2222222-2222-2222-2222-222222222222', NULL, NULL);
INSERT INTO public.appointment_requests VALUES (1, 'Test Patient', '9999999999', '2026-06-25', '10:30', 'Main', 'Browser check', 'confirmed', '2026-06-24 13:05:53.540316+05:30', NULL, NULL, 'public_site', '215ecf09-8387-4211-b0ef-a15f086f41c6', 'd2222222-2222-2222-2222-222222222222', NULL, NULL);


--
-- Data for Name: appointment_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.appointment_types VALUES ('6b34e18c-6ada-4c78-9b8d-78d21fc8de91', 'Consultation', 1, true, '2026-06-11 16:44:16.736991');
INSERT INTO public.appointment_types VALUES ('910adf97-be00-41c2-863a-0703eb2414f4', 'Tooth Pain', 2, true, '2026-06-11 16:44:16.736991');
INSERT INTO public.appointment_types VALUES ('e49e13ba-1b77-4df9-b712-ea2f8f580b4a', 'Cleaning', 3, true, '2026-06-11 16:44:16.736991');
INSERT INTO public.appointment_types VALUES ('8508bfcd-3434-4794-9185-a8c942bcdff7', 'RCT', 4, true, '2026-06-11 16:44:16.736991');
INSERT INTO public.appointment_types VALUES ('a9df448a-bacc-4d7d-8589-ae10eda8674f', 'Crown Trial', 5, true, '2026-06-11 16:44:16.736991');
INSERT INTO public.appointment_types VALUES ('3a4b7284-996b-4762-a2b4-46ad2a016e80', 'Crown Cementation', 6, true, '2026-06-11 16:44:16.736991');
INSERT INTO public.appointment_types VALUES ('549c05a1-103b-4916-bcee-8d0eea053743', 'Extraction', 7, true, '2026-06-11 16:44:16.736991');
INSERT INTO public.appointment_types VALUES ('be6a940c-6991-428b-977b-9ebee5ff5c48', 'Implant Review', 8, true, '2026-06-11 16:44:16.736991');
INSERT INTO public.appointment_types VALUES ('63dd5f9f-4abc-4d78-8aa7-e3a5b661cd24', 'Dressing', 9, true, '2026-06-11 16:44:16.736991');
INSERT INTO public.appointment_types VALUES ('e812ae70-6f66-439a-88b4-25c001657e84', 'Orthodontic Review', 10, true, '2026-06-11 16:44:16.736991');
INSERT INTO public.appointment_types VALUES ('da362054-c6fb-4ef6-bf2b-fe972e8acc8f', 'Filling', 11, true, '2026-06-11 16:44:16.736991');
INSERT INTO public.appointment_types VALUES ('9e7c63f8-d174-4220-bd5a-adb72cb7a3c8', 'Other', 99, true, '2026-06-11 16:44:16.736991');


--
-- Data for Name: appointments; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.appointments VALUES ('26dba307-2743-4175-9aad-29b1953a8c1d', '257303ab-e6d0-49d0-9caf-e058550c7edf', 'a1111111-1111-1111-1111-111111111111', NULL, NULL, NULL, '2026-06-26', '10:00:00', NULL, NULL, 'public_site', 'Consultation', 'scheduled', NULL, NULL, NULL, NULL, NULL, '2026-06-26 14:13:23.995913+05:30', '2026-06-26 14:13:23.995913+05:30', NULL, NULL, 30, 'pending_call', NULL, NULL, NULL, NULL, 'scheduled', '[]', 'Consultation', NULL, NULL, NULL, NULL, NULL, NULL, '1111111111', NULL, NULL, NULL, NULL, NULL, false);
INSERT INTO public.appointments VALUES ('215ecf09-8387-4211-b0ef-a15f086f41c6', 'a66056ff-c50f-4987-815f-a0a10af78e60', 'a1111111-1111-1111-1111-111111111111', NULL, NULL, NULL, '2026-06-26', '10:30:00', NULL, NULL, 'public_site', 'Browser check', 'scheduled', NULL, NULL, NULL, NULL, NULL, '2026-06-26 14:15:44.222211+05:30', '2026-06-26 14:15:44.222211+05:30', '2026-06-26', '10:30:00', 30, 'pending_call', NULL, NULL, NULL, NULL, 'scheduled', '[]', 'Consultation', NULL, NULL, NULL, NULL, NULL, NULL, '9999999999', NULL, NULL, NULL, NULL, NULL, false);
INSERT INTO public.appointments VALUES ('702f0116-87b0-4516-a496-4007ec9a4f99', '603dbe2c-3457-41f5-8d10-6b7eaf048f60', 'a1111111-1111-1111-1111-111111111111', NULL, NULL, NULL, '2026-06-27', '10:00:00', NULL, NULL, 'public_site', 'Consultation', 'confirmed', NULL, NULL, NULL, NULL, NULL, '2026-06-26 14:14:46.044101+05:30', '2026-06-27 17:38:32.422654+05:30', '2026-06-29', '10:00:00', 30, 'confirmed', '2026-06-27 17:38:44.195628', 'd1111111-1111-1111-1111-111111111111', NULL, NULL, 'scheduled', '[]', 'Consultation', NULL, NULL, NULL, NULL, NULL, NULL, '9876512345', NULL, NULL, NULL, NULL, NULL, false);
INSERT INTO public.appointments VALUES ('2a3a29ad-4b20-4a7e-a538-8d668e541d28', '10000000-0000-4000-8000-000000000101', 'a1111111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111', NULL, NULL, '2026-06-20', NULL, '2026-06-20', NULL, 'followup', 'Follow-up', 'scheduled', NULL, '2026-06-20 23:56:06.268285+05:30', '2026-06-20 23:56:13.556711+05:30', NULL, NULL, '2026-06-20 22:42:22.22418+05:30', '2026-07-06 17:31:52.580497+05:30', '2026-06-20', NULL, 30, 'confirmed', '2026-06-20 22:43:15.990621', 'd1111111-1111-1111-1111-111111111111', NULL, NULL, 'scheduled', '[]', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false);
INSERT INTO public.appointments VALUES ('eb71a482-4d0d-4822-b905-fd4459abe57b', '10000000-0000-4000-8000-000000000103', 'a1111111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111', NULL, NULL, '2026-06-20', '10:00:00', NULL, NULL, 'followup', 'Follow-up', 'scheduled', NULL, '2026-06-20 23:49:36.954443+05:30', '2026-06-20 23:52:18.036452+05:30', NULL, NULL, '2026-06-20 23:47:00.476725+05:30', '2026-07-06 17:31:55.374929+05:30', NULL, NULL, 30, 'confirmed', '2026-06-20 23:49:25.890498', 'd1111111-1111-1111-1111-111111111111', NULL, NULL, 'scheduled', '[]', 'Follow-up', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false);
INSERT INTO public.appointments VALUES ('30000000-0000-4000-8000-000000000103', '10000000-0000-4000-8000-000000000103', 'a1111111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111', '20000000-0000-4000-8000-000000000103', NULL, '2026-06-20', '15:15:00', '2026-06-20', '15:15:00', 'followup', 'Temporary crown review', 'scheduled', NULL, '2026-06-20 23:35:21.24564+05:30', '2026-06-20 23:36:45.538691+05:30', '2026-06-20 23:47:44.689168+05:30', NULL, '2026-06-20 22:37:56.627141+05:30', '2026-07-06 17:31:58.12081+05:30', '2026-06-20', '15:15:00', 30, 'confirmed', NULL, NULL, NULL, NULL, 'scheduled', '["Loose temporary crown"]', 'Crown', '07e07975-94d7-4c30-8a71-7e75f420092f', '2026-06-20 23:44:39.222465+05:30', 'd1111111-1111-1111-1111-111111111111', 'pending', NULL, '
Assigned: · 1500 · ₹1500', '9876500103', 'confirmed', NULL, NULL, NULL, NULL, true);
INSERT INTO public.appointments VALUES ('5607d539-d841-4ff4-88d7-10ea8b601215', '10000000-0000-4000-8000-000000000101', 'a1111111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111', NULL, NULL, '2026-06-20', NULL, NULL, NULL, 'followup', 'Follow-up', 'scheduled', NULL, '2026-06-20 22:41:35.83619+05:30', '2026-06-20 22:41:46.593677+05:30', '2026-06-20 22:42:22.22418+05:30', NULL, '2026-06-20 22:40:47.484261+05:30', '2026-07-06 17:32:00.628063+05:30', NULL, NULL, 30, 'confirmed', '2026-06-20 22:41:30.176091', 'd1111111-1111-1111-1111-111111111111', NULL, NULL, 'scheduled', '[]', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false);
INSERT INTO public.appointments VALUES ('30000000-0000-4000-8000-000000000101', '10000000-0000-4000-8000-000000000101', 'a1111111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111', '20000000-0000-4000-8000-000000000101', NULL, '2026-06-20', '10:00:00', '2026-06-20', '10:00:00', 'phone', 'RCT consultation', 'scheduled', NULL, '2026-06-20 22:38:53.067075+05:30', '2026-06-20 22:39:11.403788+05:30', '2026-06-20 22:40:47.484261+05:30', NULL, '2026-06-20 22:37:56.627141+05:30', '2026-07-06 17:32:03.191214+05:30', '2026-06-20', '10:00:00', 30, 'confirmed', NULL, NULL, NULL, NULL, 'scheduled', '["Tooth pain"]', 'RCT', '07e07975-94d7-4c30-8a71-7e75f420092f', '2026-06-20 22:37:56.627141+05:30', NULL, 'verified', '2026-06-20 22:39:39.33438+05:30', '
Closed: Work completed by specialist', '9876500101', 'confirmed', NULL, NULL, NULL, NULL, false);
INSERT INTO public.appointments VALUES ('30000000-0000-4000-8000-000000000102', '10000000-0000-4000-8000-000000000102', 'a1111111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111', '20000000-0000-4000-8000-000000000102', NULL, '2026-06-20', NULL, NULL, NULL, 'walkin', 'Scaling consult', 'scheduled', NULL, '2026-06-21 01:39:57.178061+05:30', NULL, NULL, NULL, '2026-06-20 22:37:56.627141+05:30', '2026-07-06 17:32:10.704653+05:30', NULL, NULL, 30, 'confirmed', '2026-06-21 01:39:52.356791', 'd1111111-1111-1111-1111-111111111111', NULL, NULL, 'scheduled', '["Bleeding gums"]', 'Consultation', NULL, NULL, NULL, NULL, NULL, NULL, '9876500102', NULL, NULL, NULL, NULL, NULL, false);
INSERT INTO public.appointments VALUES ('30000000-0000-4000-8000-000000000104', '10000000-0000-4000-8000-000000000104', 'a1111111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111', NULL, NULL, '2026-06-20', '17:00:00', NULL, '17:00:00', 'website', 'New patient consult', 'scheduled', NULL, '2026-06-21 00:40:04.201816+05:30', NULL, NULL, NULL, '2026-06-20 22:37:56.627141+05:30', '2026-07-06 17:32:13.220808+05:30', '2026-06-20', '17:00:00', 30, 'confirmed', '2026-06-21 00:34:57.428254', 'd2222222-2222-2222-2222-222222222222', NULL, NULL, 'scheduled', '["First visit check-up"]', 'Consultation', NULL, NULL, NULL, NULL, NULL, NULL, '9876500104', NULL, NULL, NULL, NULL, NULL, false);


--
-- Data for Name: ar_preview_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.ar_preview_settings VALUES ('caaa679a-f027-4c5f-9c8c-975f8d369338', NULL, '{whitening,alignment}', 60, 'metal', 'natural', true, NULL, '2026-06-16 09:39:11.631736+05:30', '2026-06-18 17:10:59.277573+05:30');


--
-- Data for Name: bot_config; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.bot_config VALUES ('c9b2c9ad-9ed6-4d7c-bc12-3979dab93639', 'b2222222-2222-2222-2222-222222222222', NULL, false, NULL, NULL, false, false, '[{"label": "List upcoming", "action": "list_appointments", "keyword": "appointment"}, {"label": "Book a slot", "action": "request_appointment", "keyword": "book"}, {"label": "Cancel last", "action": "request_cancel", "keyword": "cancel"}, {"label": "Show pending payments", "action": "show_balance", "keyword": "balance"}, {"label": "Past visits", "action": "show_history", "keyword": "history"}]', '2026-06-17 14:02:16.203284+05:30');
INSERT INTO public.bot_config VALUES ('767a2bcc-8dfb-4536-836b-3ecc39f64801', 'a1111111-1111-1111-1111-111111111111', NULL, false, NULL, NULL, false, true, '[{"label": "List upcoming", "action": "list_appointments", "keyword": "appointment"}, {"label": "Book a slot", "action": "request_appointment", "keyword": "book"}, {"label": "Cancel last", "action": "request_cancel", "keyword": "cancel"}, {"label": "Show pending payments", "action": "show_balance", "keyword": "balance"}, {"label": "Past visits", "action": "show_history", "keyword": "history"}]', '2026-06-17 14:03:41.06781+05:30');


--
-- Data for Name: bot_event_log; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: business_hours; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.business_hours VALUES ('8cd786bd-1f92-4c38-a475-0a23bb88342c', 'b2222222-2222-2222-2222-222222222222', 3, false, '09:00:00', '19:00:00', '14:00:00', '15:00:00');
INSERT INTO public.business_hours VALUES ('9842b7aa-7f04-4a8b-ade0-17500864a201', 'a1111111-1111-1111-1111-111111111111', 5, false, '09:00:00', '19:00:00', '14:00:00', '15:00:00');
INSERT INTO public.business_hours VALUES ('b4da9450-f256-4365-adb4-7d118f4c42db', 'b2222222-2222-2222-2222-222222222222', 4, false, '09:00:00', '19:00:00', '14:00:00', '15:00:00');
INSERT INTO public.business_hours VALUES ('13932e8b-aae1-443b-96d1-d7320ac26c90', 'b2222222-2222-2222-2222-222222222222', 1, false, '09:00:00', '19:00:00', '14:00:00', '15:00:00');
INSERT INTO public.business_hours VALUES ('d4364c58-ba9d-427b-a1c3-c83e2cf1a618', 'a1111111-1111-1111-1111-111111111111', 0, false, '09:00:00', '19:00:00', '14:00:00', '15:00:00');
INSERT INTO public.business_hours VALUES ('f3c9e5d8-e50b-42b1-ad0d-c0a68f8cf596', 'a1111111-1111-1111-1111-111111111111', 2, false, '09:00:00', '19:00:00', '14:00:00', '15:00:00');
INSERT INTO public.business_hours VALUES ('9b8e8895-8f42-4abc-9615-eb40fb784353', 'a1111111-1111-1111-1111-111111111111', 4, false, '09:00:00', '19:00:00', '14:00:00', '15:00:00');
INSERT INTO public.business_hours VALUES ('6b5addce-81d0-47c3-8add-98db7005f131', 'a1111111-1111-1111-1111-111111111111', 1, false, '09:00:00', '19:00:00', '14:00:00', '15:00:00');
INSERT INTO public.business_hours VALUES ('77b38a66-556f-453d-a63a-fb0699d33a1e', 'a1111111-1111-1111-1111-111111111111', 3, false, '09:00:00', '19:00:00', '14:00:00', '15:00:00');
INSERT INTO public.business_hours VALUES ('0e44a98e-aec0-4d99-8f3e-2b822aa4a452', 'b2222222-2222-2222-2222-222222222222', 5, false, '09:00:00', '19:00:00', '14:00:00', '15:00:00');
INSERT INTO public.business_hours VALUES ('0d126faa-4fcc-4448-aefd-68fba344d44d', 'b2222222-2222-2222-2222-222222222222', 0, false, '09:00:00', '19:00:00', '14:00:00', '15:00:00');
INSERT INTO public.business_hours VALUES ('cf8376fa-a29e-4716-b924-78b55a7a9577', 'b2222222-2222-2222-2222-222222222222', 2, false, '09:00:00', '19:00:00', '14:00:00', '15:00:00');
INSERT INTO public.business_hours VALUES ('1bfab5d3-f5a1-4957-a26e-d644bd50940d', 'a1111111-1111-1111-1111-111111111111', 6, true, NULL, NULL, NULL, NULL);
INSERT INTO public.business_hours VALUES ('02f6d9fd-d1bc-495a-a272-5907268bffa1', 'b2222222-2222-2222-2222-222222222222', 6, true, NULL, NULL, NULL, NULL);


--
-- Data for Name: clinic_content; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.clinic_content VALUES ('0c21050f-f3aa-49ac-a11c-3dc415e23d15', 'a1111111-1111-1111-1111-111111111111', 'hero', 'Your Perfect Smile Starts Here', 'Expert dental care with a gentle touch — implants, orthodontics, and complete family dentistry under one roof.', NULL, NULL, 1, true, '{}', '2026-06-08 17:16:55.846324+05:30', '2026-06-08 17:16:55.846324+05:30', NULL, NULL, NULL);
INSERT INTO public.clinic_content VALUES ('c6aac987-6afe-4410-a26a-039cb94056da', 'a1111111-1111-1111-1111-111111111111', 'about', 'About Dr. Madhu Edward', 'BDS, Reg. No. OD-28456. Passionate about delivering pain-free, confident smiles to every patient in Rourkela. Specializing in implants and orthodontic care with over a decade of clinical experience.', NULL, NULL, 1, true, '{}', '2026-06-08 17:16:55.846324+05:30', '2026-06-08 17:16:55.846324+05:30', NULL, NULL, NULL);
INSERT INTO public.clinic_content VALUES ('3f10d2ba-6aac-413b-b5e9-8065471dd37f', 'a1111111-1111-1111-1111-111111111111', 'service', 'Dental Implants', 'Permanent tooth replacement that looks and feels natural. Single, multiple, or full-arch implants tailored to your needs.', NULL, NULL, 1, true, '{}', '2026-06-08 17:16:55.846324+05:30', '2026-06-08 17:16:55.846324+05:30', NULL, NULL, NULL);
INSERT INTO public.clinic_content VALUES ('15365453-ac62-47ea-8a72-711483f792e1', 'a1111111-1111-1111-1111-111111111111', 'service', 'Orthodontics & Braces', 'Straighten your teeth with traditional braces, ceramic options, or invisible aligners.', NULL, NULL, 2, true, '{}', '2026-06-08 17:16:55.846324+05:30', '2026-06-08 17:16:55.846324+05:30', NULL, NULL, NULL);
INSERT INTO public.clinic_content VALUES ('7d5693af-0ebb-4f00-8da9-3f26595229c8', 'a1111111-1111-1111-1111-111111111111', 'service', 'Root Canal Treatment', 'Pain-free, single-sitting root canals using modern rotary instrumentation.', NULL, NULL, 3, true, '{}', '2026-06-08 17:16:55.846324+05:30', '2026-06-08 17:16:55.846324+05:30', NULL, NULL, NULL);
INSERT INTO public.clinic_content VALUES ('f3686904-b571-4617-9df9-e85706cf3e01', 'a1111111-1111-1111-1111-111111111111', 'service', 'Teeth Whitening', 'Professional in-clinic whitening for a brighter, confident smile in under an hour.', NULL, NULL, 4, true, '{}', '2026-06-08 17:16:55.846324+05:30', '2026-06-08 17:16:55.846324+05:30', NULL, NULL, NULL);
INSERT INTO public.clinic_content VALUES ('d457cc6d-0c1f-4eca-b635-acec4ea001cb', 'a1111111-1111-1111-1111-111111111111', 'service', 'Pediatric Dentistry', 'Friendly, gentle dental care designed for children of all ages.', NULL, NULL, 5, true, '{}', '2026-06-08 17:16:55.846324+05:30', '2026-06-08 17:16:55.846324+05:30', NULL, NULL, NULL);
INSERT INTO public.clinic_content VALUES ('2d1c69bf-b58c-45f8-897e-2473e9d9fd66', 'a1111111-1111-1111-1111-111111111111', 'service', 'Cosmetic Dentistry', 'Veneers, smile makeovers, and aesthetic restorations.', NULL, NULL, 6, true, '{}', '2026-06-08 17:16:55.846324+05:30', '2026-06-08 17:16:55.846324+05:30', NULL, NULL, NULL);
INSERT INTO public.clinic_content VALUES ('4fb1e111-7024-445c-b486-0d97dd5f466e', 'a1111111-1111-1111-1111-111111111111', 'testimonial', 'Anonymous Patient — Implant', 'Got my implant done at Siya — Dr. Edward made the entire process painless. Highly recommended!', NULL, NULL, 1, true, '{}', '2026-06-08 17:16:55.846324+05:30', '2026-06-08 17:16:55.846324+05:30', NULL, NULL, NULL);
INSERT INTO public.clinic_content VALUES ('caa62b89-9935-4b25-8540-98a27df44a60', 'a1111111-1111-1111-1111-111111111111', 'testimonial', 'Anonymous Patient — Braces', 'Best orthodontic treatment in Rourkela. The clinic is clean, modern, and the staff are wonderful.', NULL, NULL, 2, true, '{}', '2026-06-08 17:16:55.846324+05:30', '2026-06-08 17:16:55.846324+05:30', NULL, NULL, NULL);
INSERT INTO public.clinic_content VALUES ('185a3830-6115-4fe0-b7f9-1e3f5d60becc', 'a1111111-1111-1111-1111-111111111111', 'faq', 'Do you accept walk-in patients?', 'Yes, we accept walk-ins during clinic hours but appointments are recommended to reduce wait time.', NULL, NULL, 1, true, '{}', '2026-06-08 17:16:55.846324+05:30', '2026-06-08 17:16:55.846324+05:30', NULL, NULL, NULL);
INSERT INTO public.clinic_content VALUES ('6cb14eaa-3670-4ecf-9871-eebbb5bb0225', 'a1111111-1111-1111-1111-111111111111', 'faq', 'Is dental treatment painful?', 'We use modern anesthesia and gentle techniques. Most procedures are completely pain-free.', NULL, NULL, 2, true, '{}', '2026-06-08 17:16:55.846324+05:30', '2026-06-08 17:16:55.846324+05:30', NULL, NULL, NULL);
INSERT INTO public.clinic_content VALUES ('ce57b121-1d95-4c21-adf7-86b3cd9c664c', 'a1111111-1111-1111-1111-111111111111', 'faq', 'Do you offer EMI for treatment costs?', 'Yes, we offer flexible payment options including EMI for major treatments like implants and braces.', NULL, NULL, 3, true, '{}', '2026-06-08 17:16:55.846324+05:30', '2026-06-08 17:16:55.846324+05:30', NULL, NULL, NULL);
INSERT INTO public.clinic_content VALUES ('edad47c7-6ad7-419d-8efd-3d5ea6c20bc5', 'a1111111-1111-1111-1111-111111111111', 'faq', 'How long does an implant treatment take?', 'Typically 3-6 months from implant placement to final crown, depending on bone healing.', NULL, NULL, 4, true, '{}', '2026-06-08 17:16:55.846324+05:30', '2026-06-08 17:16:55.846324+05:30', NULL, NULL, NULL);


--
-- Data for Name: clinic_holidays; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: clinic_info; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.clinic_info VALUES (1, 'clinic_name', 'Siya Dental Care', '2026-06-08 15:55:03.403073+05:30');
INSERT INTO public.clinic_info VALUES (2, 'tagline', 'Implant & Orthodontic Centre', '2026-06-08 15:55:03.403073+05:30');
INSERT INTO public.clinic_info VALUES (3, 'doctor_name', 'Dr. Madhu Edward', '2026-06-08 15:55:03.403073+05:30');
INSERT INTO public.clinic_info VALUES (4, 'doctor_qualification', 'BDS, Reg. No. OD-28456', '2026-06-08 15:55:03.403073+05:30');
INSERT INTO public.clinic_info VALUES (5, 'branch1_name', 'Main Branch', '2026-06-08 15:55:03.403073+05:30');
INSERT INTO public.clinic_info VALUES (6, 'branch1_address', 'Rourkela, Odisha', '2026-06-08 15:55:03.403073+05:30');
INSERT INTO public.clinic_info VALUES (7, 'branch1_phone', '', '2026-06-08 15:55:03.403073+05:30');
INSERT INTO public.clinic_info VALUES (9, 'branch2_name', 'Branch 2', '2026-06-08 15:55:03.403073+05:30');
INSERT INTO public.clinic_info VALUES (10, 'branch2_address', 'Rourkela, Odisha', '2026-06-08 15:55:03.403073+05:30');
INSERT INTO public.clinic_info VALUES (11, 'branch2_phone', '', '2026-06-08 15:55:03.403073+05:30');
INSERT INTO public.clinic_info VALUES (13, 'about', 'Expert dental care with a gentle touch. Specializing in implants, orthodontics, and comprehensive family dentistry.', '2026-06-08 15:55:03.403073+05:30');
INSERT INTO public.clinic_info VALUES (8, 'branch1_hours', 'Mon–Sat: 9:00 AM – 7:00 PM', '2026-06-08 15:55:03.403073+05:30');
INSERT INTO public.clinic_info VALUES (12, 'branch2_hours', 'Mon–Sat: 10:00 AM – 5:00 PM', '2026-06-08 15:55:03.403073+05:30');


--
-- Data for Name: clinic_info_ext; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.clinic_info_ext VALUES ('a1111111-1111-1111-1111-111111111111', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '#0E7C7B', '#0A5C5B', 'en', 'A4', true, NULL, NULL, NULL, '{}', '2026-06-15 10:13:34.02512+05:30', NULL);
INSERT INTO public.clinic_info_ext VALUES ('b2222222-2222-2222-2222-222222222222', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '#0E7C7B', '#0A5C5B', 'en', 'A4', true, NULL, NULL, NULL, '{}', '2026-06-15 10:13:34.02512+05:30', NULL);


--
-- Data for Name: clinic_notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.clinic_notifications VALUES ('3127b058-d50a-4d29-8398-a03e6bee81a2', 'a1111111-1111-1111-1111-111111111111', 'patient_arrived', NULL, 'doctor', NULL, '🟢 Aarav Sharma arrived', 'Aarav Sharma is waiting in your queue', '{}', 'high', false, NULL, 'a0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000001', NULL, '2026-06-20 16:37:36.238977', NULL);
INSERT INTO public.clinic_notifications VALUES ('1dfef64d-2c47-46fc-bff6-60b7a87fe554', 'a1111111-1111-1111-1111-111111111111', 'patient_arrived', NULL, 'doctor', NULL, '🟢 Rahul Verma arrived', 'Rahul Verma is waiting in your queue', '{}', 'high', false, NULL, 'a0000003-0000-0000-0000-000000000003', 'b0000003-0000-0000-0000-000000000003', NULL, '2026-06-20 17:59:49.02016', NULL);
INSERT INTO public.clinic_notifications VALUES ('323121a2-2184-4212-aa17-b35056e35383', 'a1111111-1111-1111-1111-111111111111', 'patient_arrived', NULL, 'doctor', NULL, '🟢 Asha Verma arrived', 'Asha Verma is waiting in your queue', '{}', 'high', false, NULL, '10000000-0000-4000-8000-000000000101', '30000000-0000-4000-8000-000000000101', NULL, '2026-06-20 22:38:53.067075', NULL);
INSERT INTO public.clinic_notifications VALUES ('aba4db48-148a-4a73-bba8-6e60f5b238e8', 'a1111111-1111-1111-1111-111111111111', 'payment_to_collect', NULL, 'nurse', 'd1111111-1111-1111-1111-111111111111', '💰 Collect ₹500 — Asha Verma', 'Visit closed by doctor', '{}', 'high', false, NULL, '10000000-0000-4000-8000-000000000101', NULL, 'a2cdc120-b2fd-49a0-b2a7-de77f9381107', '2026-06-20 22:40:33.9048', NULL);
INSERT INTO public.clinic_notifications VALUES ('2fc24fea-d149-41c6-9ba6-02ca1893e37e', 'a1111111-1111-1111-1111-111111111111', 'patient_arrived', NULL, 'doctor', NULL, '🟢 Asha Verma arrived', 'Asha Verma is waiting in your queue', '{}', 'high', false, NULL, '10000000-0000-4000-8000-000000000101', '5607d539-d841-4ff4-88d7-10ea8b601215', NULL, '2026-06-20 22:41:35.83619', NULL);
INSERT INTO public.clinic_notifications VALUES ('b222d431-c5ed-423b-b6f9-a43e2d06b821', 'a1111111-1111-1111-1111-111111111111', 'payment_to_collect', NULL, 'nurse', 'd1111111-1111-1111-1111-111111111111', '💰 Collect ₹100 — Asha Verma', 'Visit closed by doctor', '{}', 'high', false, NULL, '10000000-0000-4000-8000-000000000101', NULL, '479069ee-e38a-499f-94e8-9907a208e07a', '2026-06-20 22:42:11.99367', NULL);
INSERT INTO public.clinic_notifications VALUES ('c899436a-e314-4f3b-9eb3-b14d70440572', 'a1111111-1111-1111-1111-111111111111', 'patient_arrived', NULL, 'doctor', NULL, '🟢 Asha Verma arrived', 'Asha Verma is waiting in your queue', '{}', 'high', false, NULL, '10000000-0000-4000-8000-000000000101', '2a3a29ad-4b20-4a7e-a538-8d668e541d28', NULL, '2026-06-20 22:43:17.120847', NULL);
INSERT INTO public.clinic_notifications VALUES ('c588f69f-4c38-4622-9434-3171174fcef5', 'a1111111-1111-1111-1111-111111111111', 'patient_arrived', NULL, 'doctor', NULL, '🟢 Meera Nair arrived', 'Meera Nair is waiting in your queue', '{}', 'high', false, NULL, '10000000-0000-4000-8000-000000000103', '30000000-0000-4000-8000-000000000103', NULL, '2026-06-20 23:35:21.24564', NULL);
INSERT INTO public.clinic_notifications VALUES ('bf4484df-4bae-452b-b9e5-3e90fd847593', 'a1111111-1111-1111-1111-111111111111', 'payment_to_collect', NULL, 'nurse', 'd1111111-1111-1111-1111-111111111111', '💰 Collect ₹500 — Meera Nair', 'Visit closed by doctor', '{}', 'high', false, NULL, '10000000-0000-4000-8000-000000000103', NULL, 'ed98d664-efe0-4473-8f32-7db50ab4011a', '2026-06-20 23:47:00.476725', NULL);
INSERT INTO public.clinic_notifications VALUES ('0ae9875f-f55d-4a0d-b4cf-1a2b02437f9f', 'a1111111-1111-1111-1111-111111111111', 'patient_arrived', NULL, 'doctor', NULL, '🟢 Meera Nair arrived', 'Meera Nair is waiting in your queue', '{}', 'high', false, NULL, '10000000-0000-4000-8000-000000000103', 'eb71a482-4d0d-4822-b905-fd4459abe57b', NULL, '2026-06-20 23:49:36.954443', NULL);
INSERT INTO public.clinic_notifications VALUES ('d4285d6b-676a-4fbd-8a8b-c95b319ce8a4', 'a1111111-1111-1111-1111-111111111111', 'patient_arrived', NULL, 'doctor', NULL, '🟢 Asha Verma arrived', 'Asha Verma is waiting in your queue', '{}', 'high', false, NULL, '10000000-0000-4000-8000-000000000101', '2a3a29ad-4b20-4a7e-a538-8d668e541d28', NULL, '2026-06-20 23:56:06.268285', NULL);
INSERT INTO public.clinic_notifications VALUES ('8539c96c-0532-483d-a71d-f43da7c769f6', 'a1111111-1111-1111-1111-111111111111', 'patient_arrived', NULL, 'doctor', NULL, '🟢 Arjun Rao arrived', 'Arjun Rao is waiting in your queue', '{}', 'high', false, NULL, '10000000-0000-4000-8000-000000000104', '30000000-0000-4000-8000-000000000104', NULL, '2026-06-21 00:40:04.201816', NULL);
INSERT INTO public.clinic_notifications VALUES ('0c8156ea-b0ab-4aac-b28e-b1bf3549f1e6', 'a1111111-1111-1111-1111-111111111111', 'patient_arrived', NULL, 'doctor', NULL, '🟢 Rohan Gupta arrived', 'Rohan Gupta is waiting in your queue', '{}', 'high', false, NULL, '10000000-0000-4000-8000-000000000102', '30000000-0000-4000-8000-000000000102', NULL, '2026-06-21 01:39:57.178061', NULL);


--
-- Data for Name: clinic_page_sections; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.clinic_page_sections VALUES ('c1f6fbc3-45b1-4364-8b09-d66e3eb1d2be', 'e76fa229-d015-49c9-aed0-7ef75d97b290', 'slideshow', 2, '{"slides": [], "autoplay": true, "interval": 5000}', true, '2026-06-17 14:02:16.203284+05:30');
INSERT INTO public.clinic_page_sections VALUES ('589e4e58-0de2-4233-99f1-0805b8da3d74', 'e76fa229-d015-49c9-aed0-7ef75d97b290', 'map', 7, '{"address": "Sector 5, Rourkela, Odisha", "embed_url": ""}', true, '2026-06-17 14:02:16.203284+05:30');
INSERT INTO public.clinic_page_sections VALUES ('654d0ea7-637e-4c55-a431-f739ea7ac0ac', 'e76fa229-d015-49c9-aed0-7ef75d97b290', 'cta_block', 6, '{"cta_link": "https://wa.me/918895050000", "cta_text": "WhatsApp Us", "headline": "Ready for a Brighter Smile?", "subheadline": "Book your appointment today"}', true, '2026-06-17 14:02:16.203284+05:30');
INSERT INTO public.clinic_page_sections VALUES ('c617b4bf-63fc-45bf-ba29-124f229cb4c7', '63270569-0be1-4c81-90d0-4b2236e484f1', 'testimonial', 5, '{"items": [], "title": "Our Patients Say"}', true, '2026-06-17 14:02:16.203284+05:30');
INSERT INTO public.clinic_page_sections VALUES ('eed0d7a4-3eff-455a-b528-d1b39a44e29e', '63270569-0be1-4c81-90d0-4b2236e484f1', 'slideshow', 2, '{"slides": [], "autoplay": true, "interval": 5000}', true, '2026-06-17 14:02:16.203284+05:30');
INSERT INTO public.clinic_page_sections VALUES ('a692e026-1537-4a25-b780-8e2835bedd3a', '63270569-0be1-4c81-90d0-4b2236e484f1', 'map', 7, '{"address": "Sector 5, Rourkela, Odisha", "embed_url": ""}', true, '2026-06-17 14:02:16.203284+05:30');
INSERT INTO public.clinic_page_sections VALUES ('9896b9c1-72a5-430d-bd03-646a6b61d619', '63270569-0be1-4c81-90d0-4b2236e484f1', 'cta_block', 6, '{"cta_link": "https://wa.me/918895050000", "cta_text": "WhatsApp Us", "headline": "Ready for a Brighter Smile?", "subheadline": "Book your appointment today"}', true, '2026-06-17 14:02:16.203284+05:30');
INSERT INTO public.clinic_page_sections VALUES ('163ad08c-e821-488d-a8a7-b76d86a8d870', 'e76fa229-d015-49c9-aed0-7ef75d97b290', 'testimonial', 5, '{"items": [], "title": "Our Patients Say"}', true, '2026-06-17 14:02:16.203284+05:30');
INSERT INTO public.clinic_page_sections VALUES ('7829bbfa-aa6d-488f-9f60-4b75fe79989d', '63270569-0be1-4c81-90d0-4b2236e484f1', 'hero', 1, '{"cta_link": "#contact", "cta_text": "Book Appointment", "headline": "Modern Dental Care, Trusted Hands", "subheadline": "Two branches in Rourkela. Expert care, gentle approach.", "background_image": "/uploads/hero-default.jpg"}', true, '2026-06-17 14:02:16.203284+05:30');
INSERT INTO public.clinic_page_sections VALUES ('cbb44aee-5246-46b0-bff7-a8c00b0ac205', '63270569-0be1-4c81-90d0-4b2236e484f1', 'doctor_card', 4, '{"bio": "Expert dental practitioner with years of experience in restorative and cosmetic dentistry.", "name": "Dr. Madhu Edward", "image": "/uploads/doctor.jpg", "credentials": "BDS"}', true, '2026-06-17 14:02:16.203284+05:30');
INSERT INTO public.clinic_page_sections VALUES ('6fe59880-ebf5-4f8d-82a8-309639acf44f', 'e76fa229-d015-49c9-aed0-7ef75d97b290', 'service_grid', 3, '{"title": "What We Do", "services": [{"desc": "Painless, single-sitting", "icon": "🦷", "name": "Root Canal"}, {"desc": "PFM, Zirconia", "icon": "👑", "name": "Crowns & Bridges"}, {"desc": "Veneers, whitening", "icon": "✨", "name": "Smile Design"}, {"desc": "Permanent solutions", "icon": "🔩", "name": "Implants"}, {"desc": "Child-friendly", "icon": "👶", "name": "Kids Dentistry"}, {"desc": "Wisdom teeth", "icon": "⚕️", "name": "Oral Surgery"}]}', true, '2026-06-17 14:02:16.203284+05:30');
INSERT INTO public.clinic_page_sections VALUES ('a834a3e9-a18e-4f1d-9a4b-39302da31d08', 'e76fa229-d015-49c9-aed0-7ef75d97b290', 'hero', 1, '{"cta_link": "#contact", "cta_text": "Book Appointment", "headline": "Modern Dental Care, Trusted Hands", "subheadline": "Two branches in Rourkela. Expert care, gentle approach.", "background_image": "/uploads/hero-default.jpg"}', true, '2026-06-17 14:02:16.203284+05:30');
INSERT INTO public.clinic_page_sections VALUES ('1354b6ab-8357-403f-95c5-72500ff2335a', '63270569-0be1-4c81-90d0-4b2236e484f1', 'service_grid', 3, '{"title": "What We Do", "services": [{"desc": "Painless, single-sitting", "icon": "🦷", "name": "Root Canal"}, {"desc": "PFM, Zirconia", "icon": "👑", "name": "Crowns & Bridges"}, {"desc": "Veneers, whitening", "icon": "✨", "name": "Smile Design"}, {"desc": "Permanent solutions", "icon": "🔩", "name": "Implants"}, {"desc": "Child-friendly", "icon": "👶", "name": "Kids Dentistry"}, {"desc": "Wisdom teeth", "icon": "⚕️", "name": "Oral Surgery"}]}', true, '2026-06-17 14:02:16.203284+05:30');
INSERT INTO public.clinic_page_sections VALUES ('ba6ca737-3e67-4575-ba4b-99c0a68671ca', 'e76fa229-d015-49c9-aed0-7ef75d97b290', 'doctor_card', 4, '{"bio": "Expert dental practitioner with years of experience in restorative and cosmetic dentistry.", "name": "Dr. Madhu Edward", "image": "/uploads/doctor.jpg", "credentials": "BDS"}', true, '2026-06-17 14:02:16.203284+05:30');


--
-- Data for Name: clinic_pages; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.clinic_pages VALUES ('63270569-0be1-4c81-90d0-4b2236e484f1', 'a1111111-1111-1111-1111-111111111111', 'home', 'Siya Dental Care', 'Modern dental care in Rourkela. Expert RCT, crowns, implants, smile design.', true, 1, '2026-06-17 14:02:16.203284+05:30');
INSERT INTO public.clinic_pages VALUES ('1c53e538-1e76-4ba0-a9d7-a908b3ca764e', 'a1111111-1111-1111-1111-111111111111', 'about', 'About Us', 'About Dr. Madhu Edward and Siya Dental Care.', true, 2, '2026-06-17 14:02:16.203284+05:30');
INSERT INTO public.clinic_pages VALUES ('b2828ecd-0c7d-407b-ac69-d0ae58b824ee', 'a1111111-1111-1111-1111-111111111111', 'services', 'Our Services', 'Comprehensive dental services from cleanings to implants.', true, 3, '2026-06-17 14:02:16.203284+05:30');
INSERT INTO public.clinic_pages VALUES ('d8bf61cb-1d29-4d42-a2db-8c9cd59ba3e8', 'a1111111-1111-1111-1111-111111111111', 'gallery', 'Smile Gallery', 'Real smile transformations from our patients.', true, 4, '2026-06-17 14:02:16.203284+05:30');
INSERT INTO public.clinic_pages VALUES ('2be96e98-9321-46f2-9f50-11d4495df0d3', 'a1111111-1111-1111-1111-111111111111', 'contact', 'Contact', 'Visit us at Rourkela. Two branches.', true, 5, '2026-06-17 14:02:16.203284+05:30');
INSERT INTO public.clinic_pages VALUES ('e76fa229-d015-49c9-aed0-7ef75d97b290', 'b2222222-2222-2222-2222-222222222222', 'home', 'Siya Dental Care', 'Modern dental care in Rourkela. Expert RCT, crowns, implants, smile design.', true, 1, '2026-06-17 14:02:16.203284+05:30');
INSERT INTO public.clinic_pages VALUES ('2bb8e96d-058d-4d75-bb1d-18d9726b4c4f', 'b2222222-2222-2222-2222-222222222222', 'about', 'About Us', 'About Dr. Madhu Edward and Siya Dental Care.', true, 2, '2026-06-17 14:02:16.203284+05:30');
INSERT INTO public.clinic_pages VALUES ('598137a2-98d1-412a-8cc9-0081fc5be8e7', 'b2222222-2222-2222-2222-222222222222', 'services', 'Our Services', 'Comprehensive dental services from cleanings to implants.', true, 3, '2026-06-17 14:02:16.203284+05:30');
INSERT INTO public.clinic_pages VALUES ('40399be2-4300-49d9-97c5-7899d77a5f3e', 'b2222222-2222-2222-2222-222222222222', 'gallery', 'Smile Gallery', 'Real smile transformations from our patients.', true, 4, '2026-06-17 14:02:16.203284+05:30');
INSERT INTO public.clinic_pages VALUES ('d722e863-36b5-4c47-959c-88da428c6aac', 'b2222222-2222-2222-2222-222222222222', 'contact', 'Contact', 'Visit us at Rourkela. Two branches.', true, 5, '2026-06-17 14:02:16.203284+05:30');


--
-- Data for Name: clinic_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.clinic_settings VALUES ('a1111111-1111-1111-1111-111111111111', 'click2chat', NULL, NULL, NULL, NULL, NULL, true, true, false, 'manual_confirm', true, 24, 5, 100.00, 'auto_apply', NULL, NULL, 'test', false, 100.00, 10, '{}', '2026-06-15 09:45:29.484512+05:30', NULL, 'self_hosted', NULL, NULL);
INSERT INTO public.clinic_settings VALUES ('b2222222-2222-2222-2222-222222222222', 'click2chat', NULL, NULL, NULL, NULL, NULL, true, true, false, 'manual_confirm', true, 24, 5, 100.00, 'auto_apply', NULL, NULL, 'test', false, 100.00, 10, '{}', '2026-06-15 09:45:29.484512+05:30', NULL, 'self_hosted', NULL, NULL);


--
-- Data for Name: clinical_link_scores; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.clinical_link_scores VALUES ('a584a963-bb1f-408d-a513-898a566a761d', 'exam_diag', 'Pain on palpation positive', 'Reversible pulpitis', NULL, 5, '2026-06-12 18:37:21.996868+05:30');
INSERT INTO public.clinical_link_scores VALUES ('6b920e4a-b3aa-4c5a-9bcf-e71ffd451e84', 'exam_diag', 'TOP positive', 'Irreversible pulpitis', NULL, 5, '2026-06-12 18:37:21.996868+05:30');
INSERT INTO public.clinical_link_scores VALUES ('fe30aa2d-d42c-46af-b1d5-f598a12fe291', 'exam_diag', 'TOP Negative', 'Reversible pulpitis', NULL, 3, '2026-06-12 18:37:21.996868+05:30');
INSERT INTO public.clinical_link_scores VALUES ('8de74f9a-344a-4151-bf38-66eb87b60e7e', 'exam_diag', 'Sensitivity on airblow positive', 'Reversible pulpitis', NULL, 4, '2026-06-12 18:37:21.996868+05:30');
INSERT INTO public.clinical_link_scores VALUES ('469af795-3870-499f-9553-cb76e903e70b', 'exam_diag', 'Bleeding on probing', 'Gingivitis', NULL, 6, '2026-06-12 18:37:21.996868+05:30');
INSERT INTO public.clinical_link_scores VALUES ('c29135db-b7da-4ae9-abd2-53ac9689d799', 'diag_medicine', 'Reversible Pulpitis', 'Ibuprofen 400mg', NULL, 5, '2026-06-12 18:37:22.063216+05:30');
INSERT INTO public.clinical_link_scores VALUES ('ef21a3fe-2aae-40ea-97c5-341fad3f0f5f', 'diag_medicine', 'Reversible Pulpitis', 'Paracetamol 500mg', NULL, 4, '2026-06-12 18:37:22.063216+05:30');
INSERT INTO public.clinical_link_scores VALUES ('978edca5-7148-4f5a-9fbc-621aaec15235', 'diag_medicine', 'Irreversible Pulpitis', 'Amoxicillin 500mg', NULL, 6, '2026-06-12 18:37:22.063216+05:30');
INSERT INTO public.clinical_link_scores VALUES ('55396f44-6248-482d-96f3-a8b389a9d437', 'diag_medicine', 'Irreversible Pulpitis', 'Ibuprofen 400mg', NULL, 5, '2026-06-12 18:37:22.063216+05:30');
INSERT INTO public.clinical_link_scores VALUES ('3066fd1e-9ee6-4c89-b6a8-dcdd9c02130f', 'diag_medicine', 'Necrotic Pulp', 'Amoxicillin 500mg', NULL, 5, '2026-06-12 18:37:22.063216+05:30');
INSERT INTO public.clinical_link_scores VALUES ('83ce578d-bb73-43cf-a498-14d036a9ab93', 'diag_medicine', 'Necrotic Pulp', 'Metronidazole 400mg', NULL, 4, '2026-06-12 18:37:22.063216+05:30');
INSERT INTO public.clinical_link_scores VALUES ('82abb169-69b6-40e6-b736-2ac5a4a30299', 'diag_medicine', 'Periapical Abscess', 'Amoxicillin 500mg', NULL, 7, '2026-06-12 18:37:22.063216+05:30');
INSERT INTO public.clinical_link_scores VALUES ('b35cb656-bff2-4b78-b692-e7e2a8a48f85', 'diag_medicine', 'Periapical Abscess', 'Metronidazole 400mg', NULL, 6, '2026-06-12 18:37:22.063216+05:30');
INSERT INTO public.clinical_link_scores VALUES ('89a2c56e-6483-4cbd-85f7-5d2ba667fef6', 'diag_medicine', 'Periapical Abscess', 'Ibuprofen 400mg', NULL, 5, '2026-06-12 18:37:22.063216+05:30');
INSERT INTO public.clinical_link_scores VALUES ('e58cfc46-479b-4378-a2eb-7fad9347f007', 'diag_medicine', 'Gingivitis', 'Chlorhexidine Mouthwash 0.2%', NULL, 6, '2026-06-12 18:37:22.063216+05:30');
INSERT INTO public.clinical_link_scores VALUES ('e7c86c70-8f1a-4440-830c-e01beb329cd5', 'diag_medicine', 'Periodontitis', 'Amoxicillin 500mg', NULL, 4, '2026-06-12 18:37:22.063216+05:30');
INSERT INTO public.clinical_link_scores VALUES ('3260dd18-8e6e-4ba1-abb0-b287ca6ce605', 'diag_medicine', 'Periodontitis', 'Metronidazole 400mg', NULL, 4, '2026-06-12 18:37:22.063216+05:30');
INSERT INTO public.clinical_link_scores VALUES ('2307336d-3bbe-4bd7-ad1a-d23d4f018f66', 'diag_medicine', 'Periodontitis', 'Chlorhexidine Mouthwash 0.2%', NULL, 5, '2026-06-12 18:37:22.063216+05:30');
INSERT INTO public.clinical_link_scores VALUES ('cfcd80cf-713e-47b9-a550-310bd36c7cbb', 'treat_med', 'Root Canal Treatment', 'Amoxicillin 500mg', NULL, 5, '2026-06-12 18:37:22.063216+05:30');
INSERT INTO public.clinical_link_scores VALUES ('bec1c6b2-4646-4e0f-8211-1e000c8acd52', 'treat_med', 'Root Canal Treatment', 'Ibuprofen 400mg', NULL, 5, '2026-06-12 18:37:22.063216+05:30');
INSERT INTO public.clinical_link_scores VALUES ('3b73db79-ab13-44d4-9198-81afd67e5695', 'treat_med', 'Extraction', 'Amoxicillin 500mg', NULL, 6, '2026-06-12 18:37:22.063216+05:30');
INSERT INTO public.clinical_link_scores VALUES ('a04c0639-5271-49e5-9704-3a84eb188e2c', 'treat_med', 'Extraction', 'Ibuprofen 400mg', NULL, 5, '2026-06-12 18:37:22.063216+05:30');
INSERT INTO public.clinical_link_scores VALUES ('109e1048-db6b-42dc-9449-0ff8d991dae9', 'treat_med', 'Extraction', 'Paracetamol 500mg', NULL, 4, '2026-06-12 18:37:22.063216+05:30');
INSERT INTO public.clinical_link_scores VALUES ('c09c661f-e031-4138-9ce0-3d5f8b9bb78f', 'treat_med', 'Surgical Extraction', 'Amoxicillin 500mg', NULL, 6, '2026-06-12 18:37:22.063216+05:30');
INSERT INTO public.clinical_link_scores VALUES ('78e6f426-aa0c-405c-8534-cf6a3d97703b', 'treat_med', 'Surgical Extraction', 'Metronidazole 400mg', NULL, 4, '2026-06-12 18:37:22.063216+05:30');
INSERT INTO public.clinical_link_scores VALUES ('b4e040cb-688d-4a32-a724-1ca15b5a70dd', 'treat_med', 'Surgical Extraction', 'Ibuprofen 400mg', NULL, 5, '2026-06-12 18:37:22.063216+05:30');
INSERT INTO public.clinical_link_scores VALUES ('530cca8d-537b-4417-899d-63676afd5f0f', 'treat_med', 'Incision and Drainage', 'Amoxicillin 500mg', NULL, 5, '2026-06-12 18:37:22.063216+05:30');
INSERT INTO public.clinical_link_scores VALUES ('5d915312-7eba-45bf-94aa-2b9fe8a54f0e', 'treat_med', 'Incision and Drainage', 'Metronidazole 400mg', NULL, 5, '2026-06-12 18:37:22.063216+05:30');
INSERT INTO public.clinical_link_scores VALUES ('bd52740c-db74-4d2f-bfa7-9c3161e1a011', 'treat_med', 'Scaling', 'Chlorhexidine Mouthwash 0.2%', NULL, 6, '2026-06-12 18:37:22.063216+05:30');
INSERT INTO public.clinical_link_scores VALUES ('39f82114-18dd-45ec-8735-e45d103f03c4', 'treat_med', 'Crown Cementation', 'Ibuprofen 400mg', NULL, 3, '2026-06-12 18:37:22.063216+05:30');
INSERT INTO public.clinical_link_scores VALUES ('abd44500-930c-4372-a77f-864ba734a05a', 'treat_med', 'Impaction Surgery', 'Amoxicillin 500mg', NULL, 6, '2026-06-12 18:37:22.063216+05:30');
INSERT INTO public.clinical_link_scores VALUES ('a7ac9467-0414-4703-a3b4-be403365a8e4', 'treat_med', 'Impaction Surgery', 'Metronidazole 400mg', NULL, 5, '2026-06-12 18:37:22.063216+05:30');
INSERT INTO public.clinical_link_scores VALUES ('f5d27e7b-5a6d-43e4-a87f-47f743523f57', 'treat_med', 'Impaction Surgery', 'Ibuprofen 400mg', NULL, 5, '2026-06-12 18:37:22.063216+05:30');
INSERT INTO public.clinical_link_scores VALUES ('d5927a61-cb5d-4003-b99c-ed2f6b43ec10', 'treat_med', 'Impaction Surgery', 'Chlorhexidine Mouthwash 0.2%', NULL, 4, '2026-06-12 18:37:22.063216+05:30');
INSERT INTO public.clinical_link_scores VALUES ('61cda0e8-1fee-4447-88e8-f7c79c00b781', 'exam_diag', 'Secondary Caries', 'Gingivitis', 'a1111111-1111-1111-1111-111111111111', 4, '2026-06-18 16:43:26.11202+05:30');
INSERT INTO public.clinical_link_scores VALUES ('579a17d3-50cb-43e0-9876-7c6a3d8cbe36', 'diag_treatment', 'Gingivitis', 'Scaling', 'a1111111-1111-1111-1111-111111111111', 2, '2026-06-18 16:43:54.303791+05:30');
INSERT INTO public.clinical_link_scores VALUES ('a6a52522-2bdf-4ded-ad26-b7b75c1e69f1', 'diag_treatment', 'Calculus, Calculus', 'Root Canal (RCT)', 'a1111111-1111-1111-1111-111111111111', 1, '2026-06-13 15:04:44.001728+05:30');
INSERT INTO public.clinical_link_scores VALUES ('54c9cf79-455c-42cd-98a4-778b0c9f1ae6', 'diag_treatment', 'Gingivitis', 'Filling - Composite', 'a1111111-1111-1111-1111-111111111111', 4, '2026-06-18 16:43:57.766198+05:30');
INSERT INTO public.clinical_link_scores VALUES ('2ec71377-14e2-4619-8f6b-8773dbc81e9d', 'exam_diag', 'Deep Caries', 'Deep Caries', 'a1111111-1111-1111-1111-111111111111', 8, '2026-06-18 16:44:13.26254+05:30');
INSERT INTO public.clinical_link_scores VALUES ('3227c415-2b55-43d9-9a14-59e960addfeb', 'diag_medicine', 'Deep Caries', 'Chlorhexidine Mouthwash 0.2%', 'a1111111-1111-1111-1111-111111111111', 1, '2026-06-18 14:01:38.119998+05:30');
INSERT INTO public.clinical_link_scores VALUES ('9a5be22b-5ba0-47b1-a647-4afcafac5d03', 'treat_med', 'Bridge (per unit)', 'Chlorhexidine Mouthwash 0.2%', 'a1111111-1111-1111-1111-111111111111', 1, '2026-06-18 14:01:38.119998+05:30');
INSERT INTO public.clinical_link_scores VALUES ('12acdc2f-e9d4-4c79-817e-fb51f4dcf91e', 'diag_treatment', 'Impacted Tooth', 'Filling - Composite', 'a1111111-1111-1111-1111-111111111111', 2, '2026-06-18 16:43:13.532135+05:30');
INSERT INTO public.clinical_link_scores VALUES ('27679fba-6bf6-445d-80e9-7d1dafb7f6c9', 'exam_diag', 'Deep Caries', 'Gingivitis', 'a1111111-1111-1111-1111-111111111111', 2, '2026-06-18 16:47:41.830032+05:30');
INSERT INTO public.clinical_link_scores VALUES ('507fbc28-1963-4953-bf63-3b4d4b3f4baf', 'diag_treatment', 'Deep Caries', 'Flap Surgery', 'a1111111-1111-1111-1111-111111111111', 2, '2026-06-20 14:01:49.732046+05:30');
INSERT INTO public.clinical_link_scores VALUES ('0a665e8d-51d2-4981-908c-521870524a1f', 'diag_treatment', 'Specialist workflow verification', 'Specialist flow verification', 'a1111111-1111-1111-1111-111111111111', 1, '2026-06-20 17:59:55.269947+05:30');
INSERT INTO public.clinical_link_scores VALUES ('b8e77ff0-0072-457a-985e-ef8201b84b6b', 'treat_med', 'Flap Surgery', 'Aceclofenac+Paracetamol', 'a1111111-1111-1111-1111-111111111111', 1, '2026-06-22 23:36:04.720318+05:30');
INSERT INTO public.clinical_link_scores VALUES ('cc173d59-853c-4a7e-9476-cfdd910dc9d4', 'exam_diag', 'Deep Caries', 'Calculus', 'a1111111-1111-1111-1111-111111111111', 4, '2026-06-20 23:38:26.013514+05:30');
INSERT INTO public.clinical_link_scores VALUES ('71b9e560-1f65-46f6-a003-9c744bb0bc65', 'exam_diag', 'Caries', 'Deep Caries', 'a1111111-1111-1111-1111-111111111111', 8, '2026-06-21 00:43:16.872171+05:30');
INSERT INTO public.clinical_link_scores VALUES ('e8798195-f0f6-48ad-9534-0da781167b8a', 'exam_diag', 'Erosion', 'Deep Caries', 'a1111111-1111-1111-1111-111111111111', 2, '2026-06-21 00:43:16.876024+05:30');
INSERT INTO public.clinical_link_scores VALUES ('0775f81f-f4f0-4e5c-97c3-8024d2a11a78', 'diag_treatment', 'Calculus, Deep Caries', 'Filling', 'a1111111-1111-1111-1111-111111111111', 1, '2026-06-21 00:43:29.956431+05:30');
INSERT INTO public.clinical_link_scores VALUES ('097f46e5-035f-44d9-a931-6961b2082ba9', 'treat_med', 'Root Canal (RCT)', 'Aceclofenac+Paracetamol', 'a1111111-1111-1111-1111-111111111111', 1, '2026-06-22 23:36:04.720715+05:30');
INSERT INTO public.clinical_link_scores VALUES ('9e26c0f1-401e-4634-bc95-96e0ce7f992a', 'diag_treatment', 'Deep Caries', 'Filling', 'a1111111-1111-1111-1111-111111111111', 3, '2026-06-21 00:43:30.025161+05:30');
INSERT INTO public.clinical_link_scores VALUES ('f557578e-67eb-4f18-8d2e-af5cf2537067', 'treat_med', 'Filling', 'Aceclofenac+Paracetamol', 'a1111111-1111-1111-1111-111111111111', 2, '2026-06-22 23:36:04.719935+05:30');
INSERT INTO public.clinical_link_scores VALUES ('86c767bb-c9e7-4cba-bf6c-67eeb99ac860', 'diag_treatment', 'Calculus', 'Filling', 'a1111111-1111-1111-1111-111111111111', 1, '2026-06-21 00:43:30.024515+05:30');
INSERT INTO public.clinical_link_scores VALUES ('e523a0b1-ea92-454a-8007-97ecb80848b5', 'treat_med', 'RCT', 'Aceclofenac+Paracetamol', 'a1111111-1111-1111-1111-111111111111', 2, '2026-06-22 23:36:04.715617+05:30');
INSERT INTO public.clinical_link_scores VALUES ('f9be6e77-69c9-4a98-8e5d-eeeca7000ac2', 'diag_treatment', 'Calculus', 'Scaling', 'a1111111-1111-1111-1111-111111111111', 16, '2026-07-06 19:39:57.957987+05:30');
INSERT INTO public.clinical_link_scores VALUES ('b599d040-2604-4e93-b407-aeb4f3947535', 'diag_treatment', 'Calculus', 'Root Canal (RCT)', 'a1111111-1111-1111-1111-111111111111', 10, '2026-07-06 13:30:46.090368+05:30');
INSERT INTO public.clinical_link_scores VALUES ('c4e241b5-25c7-4cbe-af69-6abdfc9041ea', 'exam_diag', 'Food Impaction', 'Deep Caries', 'a1111111-1111-1111-1111-111111111111', 2, '2026-07-06 14:16:45.329057+05:30');
INSERT INTO public.clinical_link_scores VALUES ('12aba74c-e258-4aa9-b82a-d363d8e43295', 'diag_treatment', 'Calculus', 'Flap Surgery', 'a1111111-1111-1111-1111-111111111111', 22, '2026-07-06 14:41:27.873103+05:30');
INSERT INTO public.clinical_link_scores VALUES ('a27a888a-479a-4817-877e-592b29e0c187', 'diag_treatment', 'Deep Caries', 'Complete Denture', 'a1111111-1111-1111-1111-111111111111', 6, '2026-07-06 14:16:47.177579+05:30');
INSERT INTO public.clinical_link_scores VALUES ('72ed3857-8829-4b9f-91fe-bdec0d0222fc', 'diag_treatment', 'Deep Caries', 'Crown - Zirconia', 'a1111111-1111-1111-1111-111111111111', 2, '2026-07-06 14:16:52.623559+05:30');
INSERT INTO public.clinical_link_scores VALUES ('60b52ee0-287d-4b37-9f18-b875cb8fd2d2', 'diag_treatment', 'Deep Caries', 'Dressing', 'a1111111-1111-1111-1111-111111111111', 2, '2026-07-06 14:16:55.132214+05:30');
INSERT INTO public.clinical_link_scores VALUES ('2cc044d3-68f6-4a94-9cb4-714f8d5c8604', 'diag_treatment', 'Deep Caries', 'RCT', 'a1111111-1111-1111-1111-111111111111', 8, '2026-07-06 20:07:17.375827+05:30');
INSERT INTO public.clinical_link_scores VALUES ('90e79896-d68d-4e48-9e99-2affc08deada', 'exam_diag', 'Deep Caries', 'Impacted Tooth', 'a1111111-1111-1111-1111-111111111111', 8, '2026-07-10 17:40:40.328343+05:30');
INSERT INTO public.clinical_link_scores VALUES ('48355ca2-63d4-4bc7-addb-cefd632132b4', 'treat_med', 'Scaling', 'Clotrimazole Paint', 'a1111111-1111-1111-1111-111111111111', 1, '2026-07-06 19:42:55.579816+05:30');
INSERT INTO public.clinical_link_scores VALUES ('8660b1cb-d87d-4187-93dc-4cd86aee5ff5', 'treat_med', 'Crown - Zirconia', 'Clotrimazole Paint', 'a1111111-1111-1111-1111-111111111111', 1, '2026-07-06 19:42:55.580482+05:30');
INSERT INTO public.clinical_link_scores VALUES ('4e92cc3d-a484-40ec-8a07-c5bba802152e', 'treat_med', 'Complete Denture', 'Clotrimazole Paint', 'a1111111-1111-1111-1111-111111111111', 1, '2026-07-06 19:42:55.580173+05:30');
INSERT INTO public.clinical_link_scores VALUES ('21cb2809-d6b6-4b9a-9374-190fc5c92c0a', 'treat_med', 'Dressing', 'Clotrimazole Paint', 'a1111111-1111-1111-1111-111111111111', 1, '2026-07-06 19:42:55.580899+05:30');
INSERT INTO public.clinical_link_scores VALUES ('182aed8e-0b36-4959-9bbe-64bc16cc7eae', 'treat_med', 'Flap Surgery', 'Clotrimazole Paint', 'a1111111-1111-1111-1111-111111111111', 1, '2026-07-06 19:42:55.581443+05:30');
INSERT INTO public.clinical_link_scores VALUES ('69d63c3d-b847-43c4-866d-33f1f68f5e12', 'diag_treatment', 'Deep Caries', 'Filling - GIC', 'a1111111-1111-1111-1111-111111111111', 1, '2026-07-06 20:04:13.676753+05:30');
INSERT INTO public.clinical_link_scores VALUES ('17334418-978b-4363-becb-f0cca9f7c1fa', 'diag_treatment', 'Deep Caries', 'Extraction - Surgical', 'a1111111-1111-1111-1111-111111111111', 2, '2026-07-07 15:33:13.386187+05:30');
INSERT INTO public.clinical_link_scores VALUES ('52538a02-4ef8-4d22-8e9a-732689eaeae3', 'diag_treatment', 'Deep Caries', 'Filling - Composite', 'a1111111-1111-1111-1111-111111111111', 1, '2026-07-07 15:33:29.360562+05:30');
INSERT INTO public.clinical_link_scores VALUES ('b05fc652-fdc5-4d5e-9b60-9af49a1bc324', 'diag_treatment', 'Impacted Tooth', 'Extraction', 'a1111111-1111-1111-1111-111111111111', 2, '2026-07-10 17:40:43.405477+05:30');
INSERT INTO public.clinical_link_scores VALUES ('bac007f9-59bf-4baa-a260-a26defbe0f13', 'exam_diag', 'Caries', 'Calculus', 'a1111111-1111-1111-1111-111111111111', 111, '2026-07-06 19:39:53.435129+05:30');
INSERT INTO public.clinical_link_scores VALUES ('76abe1f7-ce9f-4a00-bcea-08d5419d49a1', 'diag_treatment', 'Calculus, Calculus, Calculus, Calculus, Calculus, Calculus, Calculus, Calculus', 'Scaling', 'a1111111-1111-1111-1111-111111111111', 1, '2026-07-06 19:39:57.836182+05:30');


--
-- Data for Name: clinics; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.clinics VALUES ('a1111111-1111-1111-1111-111111111111', 'Siya Dental Care — Main Branch', 'Main', 'Udit Nagar, Rourkela, Odisha - 769012', NULL, '+919876500001', '+919876500001', '{"sun": "Closed", "mon_sat": "10:00 AM â€“ 1:00 PM, 4:00 PM â€“ 8:00 PM"}', NULL, 'Dr. Madhu Edward', 'BDS', 'OD-28456', NULL, true, '2026-06-08 15:50:32.978312+05:30', '2026-06-08 15:50:32.978312+05:30', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, 0);
INSERT INTO public.clinics VALUES ('b2222222-2222-2222-2222-222222222222', 'Siya Dental Care — Sector 2', 'Sector 2', 'Sector 2, Near SBI Main Branch, Rourkela, Odisha', NULL, '+919876500002', '+919876500001', '{"sun": "Closed", "mon_sat": "10:00 AM â€“ 2:00 PM, 5:00 PM â€“ 9:00 PM"}', NULL, 'Dr. Madhu Edward', 'BDS', 'OD-28456', NULL, true, '2026-06-08 15:50:32.978312+05:30', '2026-06-08 15:50:32.978312+05:30', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, 0);


--
-- Data for Name: common_complaints; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.common_complaints VALUES ('248c56f7-c785-493c-b763-87890c50c669', 'Toothache', 'general', '2026-06-10 19:08:58.159837');
INSERT INTO public.common_complaints VALUES ('67fd07a2-63ca-4544-8e2e-944e1f652177', 'Sensitivity to hot/cold', 'general', '2026-06-10 19:08:58.169249');
INSERT INTO public.common_complaints VALUES ('a641ba9b-e16d-43f4-bbcd-054cc3773c9e', 'Bleeding gums', 'general', '2026-06-10 19:08:58.169686');
INSERT INTO public.common_complaints VALUES ('a86e29be-8d53-40ad-b757-8fc8351cbb05', 'Swelling', 'general', '2026-06-10 19:08:58.169983');
INSERT INTO public.common_complaints VALUES ('4b753778-1fad-4b22-ae67-4e2242981b2c', 'Bad breath', 'general', '2026-06-10 19:08:58.170281');
INSERT INTO public.common_complaints VALUES ('64f3cc37-1997-49f1-a5bf-e9856d8ecd3e', 'Broken tooth', 'general', '2026-06-10 19:08:58.170586');
INSERT INTO public.common_complaints VALUES ('151aaed5-ec97-4c9d-be87-54e1ff47178e', 'Loose tooth', 'general', '2026-06-10 19:08:58.170862');
INSERT INTO public.common_complaints VALUES ('db4c8137-5777-4547-989e-284643c1eb52', 'Pain while chewing', 'general', '2026-06-10 19:08:58.171133');
INSERT INTO public.common_complaints VALUES ('03ea9e34-d50e-429c-8073-67b2cc08bbbd', 'Food lodgement', 'general', '2026-06-10 19:08:58.171379');
INSERT INTO public.common_complaints VALUES ('fac550e6-e123-491b-8ca5-41be317083a7', 'Cavity', 'general', '2026-06-10 19:08:58.171619');
INSERT INTO public.common_complaints VALUES ('33f1be31-9101-4900-ae21-3e0552e1093b', 'Discoloured tooth', 'general', '2026-06-10 19:08:58.17188');
INSERT INTO public.common_complaints VALUES ('1b912959-fd47-4e01-a328-ca7b899f7d62', 'Wisdom tooth pain', 'general', '2026-06-10 19:08:58.172117');
INSERT INTO public.common_complaints VALUES ('7891f128-3dc9-4f19-ba2d-75ee9447c2cb', 'Clicking jaw', 'general', '2026-06-10 19:08:58.17235');
INSERT INTO public.common_complaints VALUES ('e4941b27-a861-42b6-ab6b-357df0ca31fd', 'Dry socket', 'general', '2026-06-10 19:08:58.172601');
INSERT INTO public.common_complaints VALUES ('bb2112ea-ec10-4158-ac0f-50693463d7e0', 'Mouth ulcer', 'general', '2026-06-10 19:08:58.172854');


--
-- Data for Name: common_conditions; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.common_conditions VALUES ('f782b65c-f01a-4a80-bc92-43b7d6f84196', 'Diabetes', 'systemic', true, '2026-06-10 09:26:28.332029');
INSERT INTO public.common_conditions VALUES ('8bd633c6-69e1-425c-ab4b-762ef35c040a', 'Hypertension', 'systemic', true, '2026-06-10 09:26:28.332029');
INSERT INTO public.common_conditions VALUES ('36bf5e88-5193-430f-b80e-2a88aefdb495', 'Thyroid Disorder', 'systemic', true, '2026-06-10 09:26:28.332029');
INSERT INTO public.common_conditions VALUES ('3ff4368f-1d8e-4e04-ae91-7a13c580cb43', 'Asthma', 'systemic', true, '2026-06-10 09:26:28.332029');
INSERT INTO public.common_conditions VALUES ('0c7c298e-cf4e-474a-a4d1-9c495cfd6f68', 'Heart Disease', 'systemic', true, '2026-06-10 09:26:28.332029');
INSERT INTO public.common_conditions VALUES ('6d491ff7-c6ce-4271-b46e-14595beac2d4', 'Pregnancy', 'systemic', true, '2026-06-10 09:26:28.332029');
INSERT INTO public.common_conditions VALUES ('99c910ce-2d72-41cf-8c5b-49680b0e5b91', 'Epilepsy', 'systemic', true, '2026-06-10 09:26:28.332029');
INSERT INTO public.common_conditions VALUES ('1f7708f6-5d8d-4c60-b346-3552b491481a', 'Hepatitis B', 'systemic', true, '2026-06-10 09:26:28.332029');
INSERT INTO public.common_conditions VALUES ('a2878827-8b96-43de-8415-4824316825b4', 'HIV', 'systemic', true, '2026-06-10 09:26:28.332029');
INSERT INTO public.common_conditions VALUES ('a2bc08c5-21fc-4725-9ac3-1e79d7b08df8', 'Bleeding Disorder', 'systemic', true, '2026-06-10 09:26:28.332029');
INSERT INTO public.common_conditions VALUES ('56759afc-853b-4ebb-b62f-7ea8c422130c', 'Drug Allergy', 'allergy', true, '2026-06-10 09:26:28.332029');
INSERT INTO public.common_conditions VALUES ('16bb41fa-f398-4a04-a164-c342a0aa046d', 'Latex Allergy', 'allergy', true, '2026-06-10 09:26:28.332029');
INSERT INTO public.common_conditions VALUES ('f05b632d-59be-4c4d-8481-a78072454f35', 'Penicillin Allergy', 'allergy', true, '2026-06-10 09:26:28.332029');
INSERT INTO public.common_conditions VALUES ('de647957-5edb-47ea-a9d3-7576cb7a0b2e', 'Anesthesia Allergy', 'allergy', true, '2026-06-10 09:26:28.332029');
INSERT INTO public.common_conditions VALUES ('7481f908-1a37-4944-9d09-ceed1e7d8945', 'Bruxism', 'dental', true, '2026-06-10 09:26:28.332029');
INSERT INTO public.common_conditions VALUES ('a7aeb3f4-8018-47f5-95e5-a009b572fda8', 'TMJ Disorder', 'dental', true, '2026-06-10 09:26:28.332029');
INSERT INTO public.common_conditions VALUES ('d255958d-0924-49d9-8c06-b799030afd1e', 'Dry Mouth', 'dental', true, '2026-06-10 09:26:28.332029');
INSERT INTO public.common_conditions VALUES ('1923712a-f12f-43ff-9fee-a6748f01cc2e', 'Periodontal Disease', 'dental', true, '2026-06-10 09:26:28.332029');


--
-- Data for Name: communication_log; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: dashboard_widget_prefs; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.dashboard_widget_prefs VALUES ('f69ba04e-0251-456f-9251-c4a1ffac0298', 'a1111111-1111-1111-1111-111111111111', NULL, 'today_summary', true, 1, '{}', '2026-06-18 09:45:22.255809+05:30');
INSERT INTO public.dashboard_widget_prefs VALUES ('2ec23855-c613-457d-865d-3f5f5a574d59', 'a1111111-1111-1111-1111-111111111111', NULL, 'revenue_pulse', true, 2, '{}', '2026-06-18 09:45:22.255809+05:30');
INSERT INTO public.dashboard_widget_prefs VALUES ('e91a7723-6d02-4225-89f1-3e2138bbed04', 'a1111111-1111-1111-1111-111111111111', NULL, 'appt_funnel', true, 3, '{}', '2026-06-18 09:45:22.255809+05:30');
INSERT INTO public.dashboard_widget_prefs VALUES ('5630e9da-6cbf-4b0b-abab-925761436119', 'a1111111-1111-1111-1111-111111111111', NULL, 'lab_pipeline', true, 4, '{}', '2026-06-18 09:45:22.255809+05:30');
INSERT INTO public.dashboard_widget_prefs VALUES ('21a2f9c5-fc24-4ad8-b851-c47c4869a90b', 'a1111111-1111-1111-1111-111111111111', NULL, 'outstanding_aging', true, 5, '{}', '2026-06-18 09:45:22.255809+05:30');
INSERT INTO public.dashboard_widget_prefs VALUES ('fbcc68fe-aff8-4d87-8ad2-5731c8bda5f1', 'a1111111-1111-1111-1111-111111111111', NULL, 'followup_alerts', true, 6, '{}', '2026-06-18 09:45:22.255809+05:30');
INSERT INTO public.dashboard_widget_prefs VALUES ('c040cfe2-c024-42da-ae49-d4cce178c28c', 'a1111111-1111-1111-1111-111111111111', NULL, 'no_show_30d', true, 7, '{}', '2026-06-18 09:45:22.255809+05:30');
INSERT INTO public.dashboard_widget_prefs VALUES ('1d417da6-4452-4159-b4bd-b255805ef8d7', 'a1111111-1111-1111-1111-111111111111', NULL, 'top_procedures', true, 8, '{}', '2026-06-18 09:45:22.255809+05:30');
INSERT INTO public.dashboard_widget_prefs VALUES ('d23d5201-ea16-4e7a-9dde-6cb38fe06e03', 'a1111111-1111-1111-1111-111111111111', NULL, 'reschedule_queue', true, 9, '{}', '2026-06-18 09:45:22.255809+05:30');
INSERT INTO public.dashboard_widget_prefs VALUES ('8efe8274-1747-4270-9059-48e135c1a8f5', 'a1111111-1111-1111-1111-111111111111', NULL, 'bot_pulse', true, 10, '{}', '2026-06-18 09:45:22.255809+05:30');
INSERT INTO public.dashboard_widget_prefs VALUES ('969e1f7c-1b3c-46b1-95df-0ab1e67c3ea6', 'a1111111-1111-1111-1111-111111111111', NULL, 'reminders_health', true, 11, '{}', '2026-06-18 09:45:22.255809+05:30');
INSERT INTO public.dashboard_widget_prefs VALUES ('e69d524c-cee9-40fe-a75a-76453403de93', 'b2222222-2222-2222-2222-222222222222', NULL, 'today_summary', true, 1, '{}', '2026-06-18 09:45:22.255809+05:30');
INSERT INTO public.dashboard_widget_prefs VALUES ('3836759b-9ae3-4f0a-a47e-045264586a63', 'b2222222-2222-2222-2222-222222222222', NULL, 'revenue_pulse', true, 2, '{}', '2026-06-18 09:45:22.255809+05:30');
INSERT INTO public.dashboard_widget_prefs VALUES ('d6ff01f0-ad55-4eec-b9d5-8047889ac939', 'b2222222-2222-2222-2222-222222222222', NULL, 'appt_funnel', true, 3, '{}', '2026-06-18 09:45:22.255809+05:30');
INSERT INTO public.dashboard_widget_prefs VALUES ('d17b2b22-7e0f-4843-abad-7bae0a486a96', 'b2222222-2222-2222-2222-222222222222', NULL, 'lab_pipeline', true, 4, '{}', '2026-06-18 09:45:22.255809+05:30');
INSERT INTO public.dashboard_widget_prefs VALUES ('a17309bf-558c-44cd-8c3d-b17ae92a02b5', 'b2222222-2222-2222-2222-222222222222', NULL, 'outstanding_aging', true, 5, '{}', '2026-06-18 09:45:22.255809+05:30');
INSERT INTO public.dashboard_widget_prefs VALUES ('ac181c79-069d-4fe0-9626-58e722e41903', 'b2222222-2222-2222-2222-222222222222', NULL, 'followup_alerts', true, 6, '{}', '2026-06-18 09:45:22.255809+05:30');
INSERT INTO public.dashboard_widget_prefs VALUES ('d090e32e-f921-47d4-b7d1-0dd692aab61f', 'b2222222-2222-2222-2222-222222222222', NULL, 'no_show_30d', true, 7, '{}', '2026-06-18 09:45:22.255809+05:30');
INSERT INTO public.dashboard_widget_prefs VALUES ('f4b3ea8b-b20f-450f-9269-dab168439d96', 'b2222222-2222-2222-2222-222222222222', NULL, 'top_procedures', true, 8, '{}', '2026-06-18 09:45:22.255809+05:30');
INSERT INTO public.dashboard_widget_prefs VALUES ('c87b7279-a4c3-4768-89fd-820f92dde9e7', 'b2222222-2222-2222-2222-222222222222', NULL, 'reschedule_queue', true, 9, '{}', '2026-06-18 09:45:22.255809+05:30');
INSERT INTO public.dashboard_widget_prefs VALUES ('f554ced4-4935-47d9-8716-61bdce84c0c4', 'b2222222-2222-2222-2222-222222222222', NULL, 'bot_pulse', true, 10, '{}', '2026-06-18 09:45:22.255809+05:30');
INSERT INTO public.dashboard_widget_prefs VALUES ('33526b17-1fb5-4b0d-926f-043c0d5d6ff7', 'b2222222-2222-2222-2222-222222222222', NULL, 'reminders_health', true, 11, '{}', '2026-06-18 09:45:22.255809+05:30');


--
-- Data for Name: diagnosis_catalog; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.diagnosis_catalog VALUES ('3b07e313-714e-48f3-83ba-87c2dd0d78da', 'Gingivitis', '["Scaling", "Oral Hygiene Review"]', true, 0, '2026-06-12 09:20:23.240728', 'Gingivitis', true);
INSERT INTO public.diagnosis_catalog VALUES ('95f65197-bf9e-43d4-a9ec-0304b9a8dbae', 'Periodontitis', '["Scaling", "Root Planing", "Periodontal Review"]', true, 0, '2026-06-12 09:20:23.240728', 'Periodontitis', true);
INSERT INTO public.diagnosis_catalog VALUES ('ddedd968-d836-471b-b762-dd2d2125a025', 'Reversible Pulpitis', '["Filling", "Observation"]', true, 0, '2026-06-12 09:20:23.240728', 'Reversible Pulpitis', true);
INSERT INTO public.diagnosis_catalog VALUES ('c8386faf-d59a-4b38-8a36-3c0c559d1e44', 'Irreversible Pulpitis', '["RCT", "Extraction"]', true, 0, '2026-06-12 09:20:23.240728', 'Irreversible Pulpitis', true);
INSERT INTO public.diagnosis_catalog VALUES ('a17ad577-e2d0-4b1e-b60b-db6a5a3385cd', 'Necrotic Pulp', '["RCT", "Extraction"]', true, 0, '2026-06-12 09:20:23.240728', 'Necrotic Pulp', true);
INSERT INTO public.diagnosis_catalog VALUES ('93d8ef49-092b-46fc-9a63-6221ea02f805', 'Periapical Abscess', '["RCT", "Extraction", "Drainage"]', true, 0, '2026-06-12 09:20:23.240728', 'Periapical Abscess', true);
INSERT INTO public.diagnosis_catalog VALUES ('df2e1017-a381-4d84-963d-9b7c5e65544b', 'Deep Caries', '["Filling", "RCT"]', true, 0, '2026-06-12 09:20:23.240728', 'Deep Caries', true);
INSERT INTO public.diagnosis_catalog VALUES ('a9715557-8576-4bac-a080-d04c47f15e63', 'Impacted Tooth', '["Extraction"]', true, 0, '2026-06-12 09:20:23.240728', 'Impacted Tooth', true);
INSERT INTO public.diagnosis_catalog VALUES ('11b45626-9a50-4351-b888-da81fd90da8c', 'Missing Tooth', '["Implant", "Bridge", "Denture"]', true, 0, '2026-06-12 09:20:23.240728', 'Missing Tooth', true);
INSERT INTO public.diagnosis_catalog VALUES ('97a23cd6-9380-413d-8f64-4095d75d7112', 'Calculus', '["Scaling"]', true, 0, '2026-06-12 09:20:23.240728', 'Calculus', true);


--
-- Data for Name: examination_catalog; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.examination_catalog VALUES ('ec428e87-58b9-430f-9b4f-eeace110786b', 'TOP Positive', 'vitality', true, '2026-06-12 09:20:23.414149');
INSERT INTO public.examination_catalog VALUES ('6260a552-29f2-48d6-ac1a-e523a552fe80', 'TOP Negative', 'vitality', true, '2026-06-12 09:20:23.414149');
INSERT INTO public.examination_catalog VALUES ('9283f328-afd9-429f-a08e-55ca4c7e61ed', 'Air Blow Sensitive', 'vitality', true, '2026-06-12 09:20:23.414149');
INSERT INTO public.examination_catalog VALUES ('f72560d6-04b1-4067-8722-14db96da5f07', 'Cold Test Positive', 'vitality', true, '2026-06-12 09:20:23.414149');
INSERT INTO public.examination_catalog VALUES ('5bd9b83f-a84f-4da4-b33c-37d0375191d2', 'Cold Test Negative', 'vitality', true, '2026-06-12 09:20:23.414149');
INSERT INTO public.examination_catalog VALUES ('b516e776-e610-4070-8f47-ef345eb970cf', 'Heat Test Positive', 'vitality', true, '2026-06-12 09:20:23.414149');
INSERT INTO public.examination_catalog VALUES ('b4d07a5d-a614-45cf-9356-d2e1c7e78a58', 'Heat Test Negative', 'vitality', true, '2026-06-12 09:20:23.414149');
INSERT INTO public.examination_catalog VALUES ('24e2d307-c028-4ef8-9907-95a64efc313b', 'Electric Pulp Test Positive', 'vitality', true, '2026-06-12 09:20:23.414149');
INSERT INTO public.examination_catalog VALUES ('d67e2692-58d3-4d72-b18f-d2c3ef6d605d', 'Electric Pulp Test Negative', 'vitality', true, '2026-06-12 09:20:23.414149');
INSERT INTO public.examination_catalog VALUES ('03f7b9de-4570-4586-99f4-c1c3ce484986', 'Tenderness Present', 'periapical', true, '2026-06-12 09:20:23.414149');
INSERT INTO public.examination_catalog VALUES ('e55e05fc-cc91-4317-9d98-824b7b4c7a8a', 'Tenderness Absent', 'periapical', true, '2026-06-12 09:20:23.414149');
INSERT INTO public.examination_catalog VALUES ('1b58ff35-a11b-4846-a046-720a1c0ad037', 'Swelling Present', 'periapical', true, '2026-06-12 09:20:23.414149');
INSERT INTO public.examination_catalog VALUES ('8c0f936b-2f1d-41d6-9df0-25b8ffdaf85f', 'Sinus Tract Present', 'periapical', true, '2026-06-12 09:20:23.414149');
INSERT INTO public.examination_catalog VALUES ('477002bc-8fcb-4f39-a245-8ea139101fb5', 'Mobility Grade 1', 'mobility', true, '2026-06-12 09:20:23.414149');
INSERT INTO public.examination_catalog VALUES ('9ce1f486-f313-4d52-8306-91add7d9e72e', 'Mobility Grade 2', 'mobility', true, '2026-06-12 09:20:23.414149');
INSERT INTO public.examination_catalog VALUES ('2d097d3d-723e-4d63-b6c7-f913dc947c5d', 'Mobility Grade 3', 'mobility', true, '2026-06-12 09:20:23.414149');
INSERT INTO public.examination_catalog VALUES ('a8f7a24e-9dcc-4af9-a123-51ec6fa5cc74', 'Caries', 'caries', true, '2026-06-12 09:20:23.414149');
INSERT INTO public.examination_catalog VALUES ('e745cde0-1bca-42ab-a9bb-c981cc7425a7', 'Deep Caries', 'caries', true, '2026-06-12 09:20:23.414149');
INSERT INTO public.examination_catalog VALUES ('04d5760d-0a40-41e5-a1ee-252467269832', 'Secondary Caries', 'caries', true, '2026-06-12 09:20:23.414149');
INSERT INTO public.examination_catalog VALUES ('1040e83c-67b4-4cdd-ba84-5aff4074baf5', 'Fracture', 'trauma', true, '2026-06-12 09:20:23.414149');
INSERT INTO public.examination_catalog VALUES ('a7895cca-497a-4f3d-ac17-8d7a33a7e5c8', 'Crack Line', 'trauma', true, '2026-06-12 09:20:23.414149');
INSERT INTO public.examination_catalog VALUES ('29a83f2f-524b-4ab4-b3e6-c189e7054ec1', 'Chipped', 'trauma', true, '2026-06-12 09:20:23.414149');
INSERT INTO public.examination_catalog VALUES ('93c7e079-972a-4916-9ae9-bb9ec439b10c', 'Missing Tooth', 'other', true, '2026-06-12 09:20:23.414149');
INSERT INTO public.examination_catalog VALUES ('965dc8a5-92de-48eb-8687-71d415339266', 'Impacted', 'other', true, '2026-06-12 09:20:23.414149');
INSERT INTO public.examination_catalog VALUES ('19a7a3a2-9a21-4397-9966-12afce999d02', 'Partially Erupted', 'other', true, '2026-06-12 09:20:23.414149');
INSERT INTO public.examination_catalog VALUES ('b2014671-53b7-4f97-a2d7-76478ed7380a', 'Attrition', 'other', true, '2026-06-12 09:20:23.414149');
INSERT INTO public.examination_catalog VALUES ('1242b144-88b5-420e-ab4c-82b331a27b6c', 'Abrasion', 'other', true, '2026-06-12 09:20:23.414149');
INSERT INTO public.examination_catalog VALUES ('52d0b5ad-b927-4d38-985c-971fe46ba0f0', 'Erosion', 'other', true, '2026-06-12 09:20:23.414149');
INSERT INTO public.examination_catalog VALUES ('6087b5e9-8078-4595-94e6-3634aa072d1e', 'Discoloration', 'other', true, '2026-06-12 09:20:23.414149');
INSERT INTO public.examination_catalog VALUES ('51459f0a-a643-4581-92a6-7a0f1c1df41c', 'Calculus', 'periodontal', true, '2026-06-12 09:20:23.414149');
INSERT INTO public.examination_catalog VALUES ('62a84caf-b50f-4517-902d-375a50499660', 'Gingival Recession', 'periodontal', true, '2026-06-12 09:20:23.414149');
INSERT INTO public.examination_catalog VALUES ('091aeac8-7f72-487e-b25a-24428aabd7d9', 'Pocket > 4mm', 'periodontal', true, '2026-06-12 09:20:23.414149');
INSERT INTO public.examination_catalog VALUES ('a575e93b-982b-4d32-ad89-69c45cd483a0', 'Bleeding on Probing', 'periodontal', true, '2026-06-12 09:20:23.414149');
INSERT INTO public.examination_catalog VALUES ('768f6159-ba11-4026-bfb7-e358fd1a2410', 'Food Impaction', 'other', true, '2026-06-12 09:20:23.414149');


--
-- Data for Name: examination_finding_catalog; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.examination_finding_catalog VALUES ('7c9e41fc-88da-4942-a6c1-8d15172907ca', 'TOP Positive', 'percussion', true, 0, '2026-06-12 09:20:23.240728');
INSERT INTO public.examination_finding_catalog VALUES ('3b6b9850-cead-4299-81bc-784b463a3ada', 'TOP Negative', 'percussion', true, 0, '2026-06-12 09:20:23.240728');
INSERT INTO public.examination_finding_catalog VALUES ('f0ce0cdb-93b1-4cf8-987b-7c339712eaec', 'Air Blow Sensitive', 'sensitivity', true, 0, '2026-06-12 09:20:23.240728');
INSERT INTO public.examination_finding_catalog VALUES ('3c94a32b-79ff-45db-bfdd-5eab4c96497f', 'Air Blow Negative', 'sensitivity', true, 0, '2026-06-12 09:20:23.240728');
INSERT INTO public.examination_finding_catalog VALUES ('07f893a0-0b5d-4455-a196-1d4a2155037c', 'Cold Test Positive', 'pulp_test', true, 0, '2026-06-12 09:20:23.240728');
INSERT INTO public.examination_finding_catalog VALUES ('2306df63-069c-41f7-97c0-ec176cfa5481', 'Cold Test Negative', 'pulp_test', true, 0, '2026-06-12 09:20:23.240728');
INSERT INTO public.examination_finding_catalog VALUES ('d1bf07b2-bfcb-4b51-bd41-bb1c7a56b9b6', 'Heat Test Positive', 'pulp_test', true, 0, '2026-06-12 09:20:23.240728');
INSERT INTO public.examination_finding_catalog VALUES ('af260368-2033-401a-a49f-690427445ee0', 'Heat Test Negative', 'pulp_test', true, 0, '2026-06-12 09:20:23.240728');
INSERT INTO public.examination_finding_catalog VALUES ('ccc8b013-ffeb-4aa2-a06b-e1d21f1a6b41', 'Tenderness Present', 'clinical', true, 0, '2026-06-12 09:20:23.240728');
INSERT INTO public.examination_finding_catalog VALUES ('dcdb932c-ac65-4a6e-ad1b-057cfe647755', 'Swelling Present', 'clinical', true, 0, '2026-06-12 09:20:23.240728');
INSERT INTO public.examination_finding_catalog VALUES ('969594a7-b152-4390-b2a0-af3614675440', 'Mobility Grade 1', 'periodontal', true, 0, '2026-06-12 09:20:23.240728');
INSERT INTO public.examination_finding_catalog VALUES ('c2b05adc-02f8-41cf-ba67-25897fc345b6', 'Mobility Grade 2', 'periodontal', true, 0, '2026-06-12 09:20:23.240728');
INSERT INTO public.examination_finding_catalog VALUES ('67f4638d-45a3-44e7-bd17-f17918f31ab6', 'Mobility Grade 3', 'periodontal', true, 0, '2026-06-12 09:20:23.240728');
INSERT INTO public.examination_finding_catalog VALUES ('4ff5386f-c3aa-4840-8167-141d934a51c2', 'Caries', 'clinical', true, 0, '2026-06-12 09:20:23.240728');
INSERT INTO public.examination_finding_catalog VALUES ('9c277019-c009-47f2-986e-eb968418fbc7', 'Deep Caries', 'clinical', true, 0, '2026-06-12 09:20:23.240728');
INSERT INTO public.examination_finding_catalog VALUES ('238ddd13-dfac-4adf-bd50-538c2da97616', 'Fracture', 'clinical', true, 0, '2026-06-12 09:20:23.240728');
INSERT INTO public.examination_finding_catalog VALUES ('0ee814b3-f756-40c2-815b-b411b7d57f9c', 'Missing Tooth', 'clinical', true, 0, '2026-06-12 09:20:23.240728');


--
-- Data for Name: fee_schedule_overrides; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: follow_ups; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: gallery_images; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: illness_library; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.illness_library VALUES ('ad3b2a54-d82e-425d-88de-c95175fef8f6', NULL, 'Dental caries (Class I)', NULL, 'caries', 'mild', 'Composite filling', true);
INSERT INTO public.illness_library VALUES ('9935d249-10cb-4392-a887-66760356e8ef', NULL, 'Dental caries (Class II)', NULL, 'caries', 'moderate', 'Composite filling', true);
INSERT INTO public.illness_library VALUES ('8968f4d1-eda5-46be-80f7-0f0ce0303da0', NULL, 'Dental caries (Class III/IV)', NULL, 'caries', 'moderate', 'Aesthetic composite', true);
INSERT INTO public.illness_library VALUES ('e1dfb223-bba8-4ffb-b23b-0ce44f07c4a8', NULL, 'Dental caries (Class V)', NULL, 'caries', 'mild', 'GIC filling', true);
INSERT INTO public.illness_library VALUES ('5fdbe11b-2f79-458b-9220-1c6e481ddcd1', NULL, 'Pulpitis — reversible', NULL, 'pulpal', 'moderate', 'Sedative dressing', true);
INSERT INTO public.illness_library VALUES ('8e45cdb4-4481-47bb-8985-dd408b653d63', NULL, 'Pulpitis — irreversible', NULL, 'pulpal', 'severe', 'RCT', true);
INSERT INTO public.illness_library VALUES ('c5d65a73-4464-4325-9843-b1c32d6a96ae', NULL, 'Periapical abscess', NULL, 'pulpal', 'urgent', 'RCT + drainage', true);
INSERT INTO public.illness_library VALUES ('6e92c23e-7222-46a3-9732-707bc1b53e80', NULL, 'Chronic apical periodontitis', NULL, 'pulpal', 'severe', 'RCT', true);
INSERT INTO public.illness_library VALUES ('c7f22584-cafe-452e-8c15-c0d37539e083', NULL, 'Gingivitis', NULL, 'gingival', 'mild', 'Scaling + OHI', true);
INSERT INTO public.illness_library VALUES ('5807aac3-3b59-49fa-afd8-e57c208aacf5', NULL, 'Chronic periodontitis', NULL, 'periodontal', 'moderate', 'Scaling + root planing', true);
INSERT INTO public.illness_library VALUES ('191ad8b7-e540-4fd9-86b4-4de09ba5e6e5', NULL, 'Aggressive periodontitis', NULL, 'periodontal', 'severe', 'Flap surgery', true);
INSERT INTO public.illness_library VALUES ('99eed1bf-7233-4d03-b85d-1234153a4652', NULL, 'Bruxism', NULL, 'occlusal', 'watch', 'Night guard', true);
INSERT INTO public.illness_library VALUES ('d8d18b03-860e-4165-abe0-7ee3add8a607', NULL, 'Attrition', NULL, 'occlusal', 'watch', 'Occlusal adjustment', true);
INSERT INTO public.illness_library VALUES ('7d3223b7-cc39-42d2-9b3a-e4f70104a426', NULL, 'Abrasion', NULL, 'occlusal', 'mild', 'Restoration', true);
INSERT INTO public.illness_library VALUES ('d71ab329-01cb-4924-a885-2e30f8841e34', NULL, 'Tooth fracture — enamel', NULL, 'trauma', 'mild', 'Composite repair', true);
INSERT INTO public.illness_library VALUES ('fd95b89c-602e-427d-951f-1b56f8056b5b', NULL, 'Tooth fracture — dentin', NULL, 'trauma', 'moderate', 'Composite + monitoring', true);
INSERT INTO public.illness_library VALUES ('6dff6e8d-7ace-46a0-8e13-d7307a418a3a', NULL, 'Tooth fracture — pulpal', NULL, 'trauma', 'urgent', 'RCT or extraction', true);
INSERT INTO public.illness_library VALUES ('c95393d5-c17b-4e98-93db-b6076d270c96', NULL, 'Impacted wisdom tooth', NULL, 'developmental', 'watch', 'Surgical extraction', true);
INSERT INTO public.illness_library VALUES ('ed550f60-821c-4309-911a-6227df2585d6', NULL, 'Hypoplasia', NULL, 'developmental', 'info', 'Aesthetic restoration', true);
INSERT INTO public.illness_library VALUES ('648f7b42-7278-4f02-8697-793a087cef16', NULL, 'Aphthous ulcer', NULL, 'oral_lesion', 'mild', 'Topical anaesthetic + reassurance', true);
INSERT INTO public.illness_library VALUES ('22d94989-b89f-435c-9221-b6e1af81fa39', NULL, 'Oral candidiasis', NULL, 'oral_lesion', 'moderate', 'Antifungal', true);
INSERT INTO public.illness_library VALUES ('1bef8d05-a782-49be-9cab-83bd2a44931a', NULL, 'Leukoplakia', NULL, 'oral_lesion', 'severe', 'Biopsy required', true);


--
-- Data for Name: image_annotations; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: kanban_columns; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.kanban_columns VALUES ('477ffa6f-0fef-494d-b252-7a26df569b42', 'a1111111-1111-1111-1111-111111111111', '💡 Proposed', 'proposed', 1, '#94A3B8', true);
INSERT INTO public.kanban_columns VALUES ('7d52c860-598a-49ac-ad3f-8d121ac894a3', 'a1111111-1111-1111-1111-111111111111', '📋 Planned', 'planned', 2, '#3B82F6', true);
INSERT INTO public.kanban_columns VALUES ('c91b66ce-923c-40ee-88d6-39d7d6dbf6cc', 'a1111111-1111-1111-1111-111111111111', '🦷 In Progress', 'in_progress', 3, '#F59E0B', true);
INSERT INTO public.kanban_columns VALUES ('71a603a5-e00d-4acc-b0d2-69ffb978641f', 'a1111111-1111-1111-1111-111111111111', '✓ Completed', 'completed', 4, '#10B981', true);
INSERT INTO public.kanban_columns VALUES ('6a4b9595-3e32-42c5-9ee8-21b813a43241', 'b2222222-2222-2222-2222-222222222222', '💡 Proposed', 'proposed', 1, '#94A3B8', true);
INSERT INTO public.kanban_columns VALUES ('5a53a21f-58b7-47d7-a46b-8d5a8eb00387', 'b2222222-2222-2222-2222-222222222222', '📋 Planned', 'planned', 2, '#3B82F6', true);
INSERT INTO public.kanban_columns VALUES ('2b32bdd8-7367-46bd-9549-e3abd2681d13', 'b2222222-2222-2222-2222-222222222222', '🦷 In Progress', 'in_progress', 3, '#F59E0B', true);
INSERT INTO public.kanban_columns VALUES ('745ee837-f025-49b5-99a7-0d3ebf92c59f', 'b2222222-2222-2222-2222-222222222222', '✓ Completed', 'completed', 4, '#10B981', true);


--
-- Data for Name: lab_order_payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.lab_order_payments VALUES ('96008fbd-679c-4901-9e80-42c3fcfb30c5', 'd67f2a0d-f2ae-4874-8ed3-47fcf10174ec', 500.00, '2026-06-20', 'upi', NULL, 'Paid on lab receipt', 'd1111111-1111-1111-1111-111111111111', '2026-06-20 22:53:59.033826+05:30');


--
-- Data for Name: lab_orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.lab_orders VALUES ('e4017d2e-2cf4-4301-aa99-7b5c9f57e3fb', 5, 'a1111111-1111-1111-1111-111111111111', '10000000-0000-4000-8000-000000000103', '30000000-0000-4000-8000-000000000103', NULL, '3648bf13-6c1f-483b-b05c-ff993691c474', 'Lab Work', '[]', NULL, '2026-06-20', '2026-06-27', '2026-06-20', 'received', 0.00, NULL, NULL, NULL, NULL, 'd1111111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111', '2026-06-20 23:45:07.65214+05:30', '2026-06-20 23:48:27.033983+05:30', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.lab_orders VALUES ('6b0acee0-39ef-4454-b479-be18f6d56efd', 4, 'a1111111-1111-1111-1111-111111111111', '10000000-0000-4000-8000-000000000101', NULL, '7b8627a9-1738-4de2-8efa-f235afa5bb86', 'e53cff14-95a4-4f53-a1a0-1ad822f5aab1', 'Zirconia Crown', '[42]', NULL, NULL, '2026-06-28', '2026-06-20', 'fitted', 1800.00, NULL, NULL, 'nurse confirmed order', NULL, 'd1111111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111', '2026-06-20 23:19:01.827672+05:30', '2026-06-21 00:33:30.981908+05:30', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.lab_orders VALUES ('d67f2a0d-f2ae-4874-8ed3-47fcf10174ec', 3, 'a1111111-1111-1111-1111-111111111111', '10000000-0000-4000-8000-000000000101', '5607d539-d841-4ff4-88d7-10ea8b601215', NULL, 'e53cff14-95a4-4f53-a1a0-1ad822f5aab1', 'Crown (PFM)', '[14]', NULL, '2026-06-20', '2026-06-27', '2026-06-20', 'fitted', 500.00, NULL, NULL, NULL, NULL, 'd1111111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111', '2026-06-20 22:42:04.150061+05:30', '2026-06-21 01:40:52.871432+05:30', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.lab_orders VALUES ('4180a385-af51-4ea1-a2ac-aafd26b20f69', 6, 'a1111111-1111-1111-1111-111111111111', '10000000-0000-4000-8000-000000000102', NULL, NULL, 'e53cff14-95a4-4f53-a1a0-1ad822f5aab1', 'Crown (PFM)', '[]', NULL, NULL, NULL, '2026-06-22', 'received', 0.00, NULL, NULL, '', NULL, 'd1111111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111', '2026-06-22 22:27:53.904416+05:30', '2026-06-22 22:41:38.173398+05:30', NULL, NULL, NULL, NULL, NULL, NULL);


--
-- Data for Name: lab_vendors; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.lab_vendors VALUES ('e53cff14-95a4-4f53-a1a0-1ad822f5aab1', 'Bharat Dental Lab', 'Ramesh Kumar', '+919439123456', '+919439123456', NULL, 'Bisra Road, Rourkela', NULL, '["Crown", "Bridge", "RPD"]', 0.0, true, true, 'Default sample vendor — edit/delete in Settings → Labs', 'a1111111-1111-1111-1111-111111111111', '2026-06-19 13:02:05.392981+05:30', '2026-06-19 13:02:05.392981+05:30');
INSERT INTO public.lab_vendors VALUES ('3648bf13-6c1f-483b-b05c-ff993691c474', 'Pearl Ceramic Works', 'Anita Patnaik', '+919437998877', '+919437998877', NULL, 'Civil Township, Rourkela', NULL, '["Crown", "Veneer", "Implant"]', 0.0, false, true, 'Default sample vendor — edit/delete in Settings → Labs', 'a1111111-1111-1111-1111-111111111111', '2026-06-19 13:02:05.392981+05:30', '2026-06-19 13:02:05.392981+05:30');
INSERT INTO public.lab_vendors VALUES ('12559812-2f3b-40c2-b1ed-f0dc772a4a8e', 'Bharat Dental Lab', 'Ramesh Kumar', '+919439123456', '+919439123456', NULL, 'Bisra Road, Rourkela', NULL, '["Crown", "Bridge", "RPD"]', 0.0, true, true, 'Default sample vendor — edit/delete in Settings → Labs', 'b2222222-2222-2222-2222-222222222222', '2026-06-19 13:02:05.392981+05:30', '2026-06-19 13:02:05.392981+05:30');
INSERT INTO public.lab_vendors VALUES ('33d020dd-4ae6-458b-a029-2248b3d93b45', 'Pearl Ceramic Works', 'Anita Patnaik', '+919437998877', '+919437998877', NULL, 'Civil Township, Rourkela', NULL, '["Crown", "Veneer", "Implant"]', 0.0, false, true, 'Default sample vendor — edit/delete in Settings → Labs', 'b2222222-2222-2222-2222-222222222222', '2026-06-19 13:02:05.392981+05:30', '2026-06-19 13:02:05.392981+05:30');
INSERT INTO public.lab_vendors VALUES ('d89043d0-15e7-45f8-9b72-0d669afef975', 'tt', NULL, '', '', '', '', NULL, '[]', 0.0, false, false, NULL, 'a1111111-1111-1111-1111-111111111111', '2026-06-19 14:31:17.841875+05:30', '2026-06-19 14:31:17.841875+05:30');


--
-- Data for Name: lab_work_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.lab_work_types VALUES ('23535f25-8b1c-4b36-b64d-b863b0ad44cc', 'Crown (Full Ceramic)', 'Prosthetic', 10, 6000.00, true, 3, '2026-06-13 09:13:21.861097+05:30', NULL, 0, NULL, 'seed');
INSERT INTO public.lab_work_types VALUES ('ed99ca8e-95d9-4ebb-83d5-62888d0b201d', 'Bridge (3-unit PFM)', 'Prosthetic', 10, 4500.00, true, 4, '2026-06-13 09:13:21.861097+05:30', NULL, 0, NULL, 'seed');
INSERT INTO public.lab_work_types VALUES ('48002b9f-fbbd-48e6-989b-ce74cefafaeb', 'RPD (Acrylic)', 'Prosthetic', 14, 4000.00, true, 5, '2026-06-13 09:13:21.861097+05:30', NULL, 0, NULL, 'seed');
INSERT INTO public.lab_work_types VALUES ('7af44ea5-4dc9-409e-afc8-d65301a6b48d', 'RPD (Cobalt-Chrome)', 'Prosthetic', 21, 12000.00, true, 6, '2026-06-13 09:13:21.861097+05:30', NULL, 0, NULL, 'seed');
INSERT INTO public.lab_work_types VALUES ('b8b6201b-4666-48f0-96f2-c04e3b102a84', 'Complete Denture', 'Prosthetic', 21, 8000.00, true, 7, '2026-06-13 09:13:21.861097+05:30', NULL, 0, NULL, 'seed');
INSERT INTO public.lab_work_types VALUES ('187b91d2-9494-4146-8409-45b96cf32b07', 'Implant Abutment + Crown', 'Prosthetic', 14, 12000.00, true, 8, '2026-06-13 09:13:21.861097+05:30', NULL, 0, NULL, 'seed');
INSERT INTO public.lab_work_types VALUES ('ff8aea9b-be72-4e00-a516-57955102aaee', 'Night Guard', 'Orthodontic', 10, 2500.00, true, 9, '2026-06-13 09:13:21.861097+05:30', NULL, 0, NULL, 'seed');
INSERT INTO public.lab_work_types VALUES ('4238dd0a-baca-4ef5-8465-72b97f766641', 'Bleaching Tray', 'Orthodontic', 5, 1500.00, true, 10, '2026-06-13 09:13:21.861097+05:30', NULL, 0, NULL, 'seed');
INSERT INTO public.lab_work_types VALUES ('1502bea6-457c-47f5-aa9d-690705c85972', 'Surgical Stent', 'Surgical', 7, 1500.00, true, 11, '2026-06-13 09:13:21.861097+05:30', NULL, 0, NULL, 'seed');
INSERT INTO public.lab_work_types VALUES ('c9a3bd1d-0b10-4515-9aa4-1fbe1ad4c2e4', 'PFM Crown', 'crown', 5, 2500.00, true, 10, '2026-06-19 13:02:05.392981+05:30', NULL, 0, NULL, 'seed');
INSERT INTO public.lab_work_types VALUES ('02e71633-ee2e-4327-ac00-60bac97e7c46', 'Inlay/Onlay', 'inlay', 7, 3500.00, true, 80, '2026-06-19 13:02:05.392981+05:30', NULL, 0, NULL, 'seed');
INSERT INTO public.lab_work_types VALUES ('28e49faa-ab20-4587-a397-24caa8f497c6', 'Zirconia Crown', 'crown', 7, 6000.00, true, 20, '2026-06-19 13:02:05.392981+05:30', NULL, 0, NULL, 'seed');
INSERT INTO public.lab_work_types VALUES ('11f15c8c-2ef2-439b-86a7-58cdf12451f0', 'Implant abutment', 'implant', 14, 8000.00, true, 90, '2026-06-19 13:02:05.392981+05:30', NULL, 0, NULL, 'seed');
INSERT INTO public.lab_work_types VALUES ('394d9ef9-4fe5-4ba3-b233-91442bccfeb3', 'Veneer (porcelain)', 'veneer', 7, 5500.00, true, 70, '2026-06-19 13:02:05.392981+05:30', NULL, 0, NULL, 'seed');
INSERT INTO public.lab_work_types VALUES ('7094a88d-66d5-4da9-babd-5469e269ca66', 'Bridge (3-unit Zr)', 'bridge', 8, 16000.00, true, 40, '2026-06-19 13:02:05.392981+05:30', NULL, 0, NULL, 'seed');
INSERT INTO public.lab_work_types VALUES ('07517f17-f1d1-40be-be26-58141b05a118', 'CPD', 'denture', 10, 7000.00, true, 60, '2026-06-19 13:02:05.392981+05:30', NULL, 0, NULL, 'seed');
INSERT INTO public.lab_work_types VALUES ('07a3c3e0-c4cd-45bc-ab47-fcaa8ab71012', 'Crown (Zirconia)', 'Prosthetic', 7, 4500.00, true, 2, '2026-06-13 09:13:21.861097+05:30', NULL, 1, '2026-06-20 14:31:37.200875+05:30', 'seed');
INSERT INTO public.lab_work_types VALUES ('fa68b968-29e8-428d-a00c-11ebaf0d1f0c', 'Crown (PFM)', 'Prosthetic', 7, 1500.00, true, 1, '2026-06-13 09:13:21.861097+05:30', NULL, 3, '2026-06-20 22:42:04.202168+05:30', 'seed');


--
-- Data for Name: media; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: media_gallery; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: medicine_catalog; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.medicine_catalog VALUES ('10000000-0000-4000-8000-000000000001', 'Amoxicillin', 'Antibiotic', '["250mg", "500mg"]', '500mg', '1 capsule', '["Three times daily", "Twice daily"]', 'Three times daily', '5 days', 'After meals. Complete full course.', NULL, true, 0, '2026-06-04 19:16:25.890933+05:30', '2026-06-04 19:16:25.890933+05:30', 'manual', NULL, 0, NULL);
INSERT INTO public.medicine_catalog VALUES ('10000000-0000-4000-8000-000000000002', 'Augmentin (Amox+Clav)', 'Antibiotic', '["375mg", "625mg", "1g"]', '625mg', '1 tablet', '["Twice daily", "Three times daily"]', 'Twice daily', '5 days', 'After meals. Complete full course.', NULL, true, 0, '2026-06-04 19:16:25.890933+05:30', '2026-06-04 19:16:25.890933+05:30', 'manual', NULL, 0, NULL);
INSERT INTO public.medicine_catalog VALUES ('10000000-0000-4000-8000-000000000003', 'Azithromycin', 'Antibiotic', '["250mg", "500mg"]', '500mg', '1 tablet', '["Once daily"]', 'Once daily', '3 days', '1 hour before meals.', NULL, true, 0, '2026-06-04 19:16:25.890933+05:30', '2026-06-04 19:16:25.890933+05:30', 'manual', NULL, 0, NULL);
INSERT INTO public.medicine_catalog VALUES ('10000000-0000-4000-8000-000000000004', 'Metronidazole', 'Antibiotic', '["200mg", "400mg"]', '400mg', '1 tablet', '["Three times daily", "Twice daily"]', 'Three times daily', '5 days', 'After meals. Avoid alcohol.', NULL, true, 0, '2026-06-04 19:16:25.890933+05:30', '2026-06-04 19:16:25.890933+05:30', 'manual', NULL, 0, NULL);
INSERT INTO public.medicine_catalog VALUES ('10000000-0000-4000-8000-000000000005', 'Clindamycin', 'Antibiotic', '["150mg", "300mg"]', '300mg', '1 capsule', '["Three times daily", "Four times daily"]', 'Three times daily', '7 days', 'After meals with water.', NULL, true, 0, '2026-06-04 19:16:25.890933+05:30', '2026-06-04 19:16:25.890933+05:30', 'manual', NULL, 0, NULL);
INSERT INTO public.medicine_catalog VALUES ('10000000-0000-4000-8000-000000000006', 'Doxycycline', 'Antibiotic', '["100mg"]', '100mg', '1 capsule', '["Twice daily", "Once daily"]', 'Twice daily', '5 days', 'After meals. No lying down 30 min.', NULL, true, 0, '2026-06-04 19:16:25.890933+05:30', '2026-06-04 19:16:25.890933+05:30', 'manual', NULL, 0, NULL);
INSERT INTO public.medicine_catalog VALUES ('10000000-0000-4000-8000-000000000007', 'Ibuprofen', 'Painkiller', '["200mg", "400mg", "600mg"]', '400mg', '1 tablet', '["Three times daily", "Twice daily", "As needed (SOS)"]', 'Three times daily', '3 days', 'After meals. Not on empty stomach.', NULL, true, 0, '2026-06-04 19:16:25.890933+05:30', '2026-06-04 19:16:25.890933+05:30', 'manual', NULL, 0, NULL);
INSERT INTO public.medicine_catalog VALUES ('10000000-0000-4000-8000-000000000009', 'Paracetamol', 'Painkiller', '["500mg", "650mg"]', '650mg', '1 tablet', '["Three times daily", "As needed (SOS)"]', 'As needed (SOS)', '3 days', 'Max 4 tablets/day.', NULL, true, 0, '2026-06-04 19:16:25.890933+05:30', '2026-06-04 19:16:25.890933+05:30', 'manual', NULL, 0, NULL);
INSERT INTO public.medicine_catalog VALUES ('10000000-0000-4000-8000-000000000010', 'Ketorolac', 'Painkiller', '["10mg"]', '10mg', '1 tablet', '["Three times daily", "As needed (SOS)"]', 'As needed (SOS)', '2 days', 'After meals. Short-term only.', NULL, true, 0, '2026-06-04 19:16:25.890933+05:30', '2026-06-04 19:16:25.890933+05:30', 'manual', NULL, 0, NULL);
INSERT INTO public.medicine_catalog VALUES ('10000000-0000-4000-8000-000000000011', 'Diclofenac', 'Painkiller', '["50mg"]', '50mg', '1 tablet', '["Twice daily", "Three times daily"]', 'Twice daily', '3 days', 'After meals.', NULL, true, 0, '2026-06-04 19:16:25.890933+05:30', '2026-06-04 19:16:25.890933+05:30', 'manual', NULL, 0, NULL);
INSERT INTO public.medicine_catalog VALUES ('10000000-0000-4000-8000-000000000012', 'Pantoprazole', 'Antacid', '["40mg"]', '40mg', '1 tablet', '["Once daily before breakfast", "Twice daily"]', 'Before breakfast', '5 days', 'Empty stomach, 30 min before food.', NULL, true, 0, '2026-06-04 19:16:25.890933+05:30', '2026-06-04 19:16:25.890933+05:30', 'manual', NULL, 0, NULL);
INSERT INTO public.medicine_catalog VALUES ('10000000-0000-4000-8000-000000000013', 'Ranitidine', 'Antacid', '["150mg"]', '150mg', '1 tablet', '["Twice daily"]', 'Twice daily', '5 days', 'Before meals.', NULL, true, 0, '2026-06-04 19:16:25.890933+05:30', '2026-06-04 19:16:25.890933+05:30', 'manual', NULL, 0, NULL);
INSERT INTO public.medicine_catalog VALUES ('10000000-0000-4000-8000-000000000014', 'Chlorhexidine Mouthwash', 'Mouthwash', '["0.2%"]', '0.2%', '15ml', '["Twice daily", "Three times daily"]', 'Twice daily', '7 days', 'Swish 30 sec and spit. No food 30 min.', NULL, true, 0, '2026-06-04 19:16:25.890933+05:30', '2026-06-04 19:16:25.890933+05:30', 'manual', NULL, 0, NULL);
INSERT INTO public.medicine_catalog VALUES ('10000000-0000-4000-8000-000000000015', 'Benzydamine Mouthwash', 'Mouthwash', '["0.15%"]', '0.15%', '15ml', '["Three times daily"]', 'Three times daily', '5 days', 'Swish and spit. Do not dilute.', NULL, true, 0, '2026-06-04 19:16:25.890933+05:30', '2026-06-04 19:16:25.890933+05:30', 'manual', NULL, 0, NULL);
INSERT INTO public.medicine_catalog VALUES ('10000000-0000-4000-8000-000000000016', 'Lignocaine Gel 2%', 'Topical', '["2%"]', '2%', 'Apply small amount', '["Three times daily", "As needed"]', 'Three times daily', '3 days', 'On affected area. No food 30 min.', NULL, true, 0, '2026-06-04 19:16:25.890933+05:30', '2026-06-04 19:16:25.890933+05:30', 'manual', NULL, 0, NULL);
INSERT INTO public.medicine_catalog VALUES ('10000000-0000-4000-8000-000000000017', 'Triamcinolone Paste', 'Topical Steroid', '["0.1%"]', '0.1%', 'Apply small amount', '["Three times daily"]', 'Three times daily', '5 days', 'On ulcer after meals & bedtime.', NULL, true, 0, '2026-06-04 19:16:25.890933+05:30', '2026-06-04 19:16:25.890933+05:30', 'manual', NULL, 0, NULL);
INSERT INTO public.medicine_catalog VALUES ('10000000-0000-4000-8000-000000000018', 'Clotrimazole Paint', 'Antifungal', '["1%"]', '1%', 'Apply with cotton', '["Three times daily"]', 'Three times daily', '7 days', 'On affected area after meals.', NULL, true, 0, '2026-06-04 19:16:25.890933+05:30', '2026-06-04 19:16:25.890933+05:30', 'manual', NULL, 0, NULL);
INSERT INTO public.medicine_catalog VALUES ('10000000-0000-4000-8000-000000000019', 'Desensitizing Toothpaste', 'Oral Care', '["5% KNO3"]', '5% KNO3', 'Pea-sized', '["Twice daily"]', 'Twice daily', 'Ongoing', 'Brush gently 2 min. Apply on sensitive teeth.', NULL, true, 0, '2026-06-04 19:16:25.890933+05:30', '2026-06-04 19:16:25.890933+05:30', 'manual', NULL, 0, NULL);
INSERT INTO public.medicine_catalog VALUES ('10000000-0000-4000-8000-000000000020', 'Warm Saline Gargle', 'Home Remedy', '["1 tsp salt"]', '1 tsp salt', '1 glass', '["3-4 times daily"]', '3-4 times daily', '5 days', 'Lukewarm water. Gargle 30 seconds.', NULL, true, 0, '2026-06-04 19:16:25.890933+05:30', '2026-06-04 19:16:25.890933+05:30', 'manual', NULL, 0, NULL);
INSERT INTO public.medicine_catalog VALUES ('10000000-0000-4000-8000-000000000021', 'Prednisolone', 'Steroid', '["5mg", "10mg", "20mg"]', '10mg', '1 tablet', '["Once daily morning"]', 'Once daily morning', '5 days (tapering)', 'After breakfast. Do not stop abruptly.', NULL, true, 0, '2026-06-04 19:16:25.890933+05:30', '2026-06-04 19:16:25.890933+05:30', 'manual', NULL, 0, NULL);
INSERT INTO public.medicine_catalog VALUES ('10000000-0000-4000-8000-000000000022', 'Cetirizine', 'Anti-allergy', '["10mg"]', '10mg', '1 tablet', '["Once daily at bedtime"]', 'At bedtime', '5 days', 'May cause drowsiness.', NULL, true, 0, '2026-06-04 19:16:25.890933+05:30', '2026-06-04 19:16:25.890933+05:30', 'manual', NULL, 0, NULL);
INSERT INTO public.medicine_catalog VALUES ('10000000-0000-4000-8000-000000000023', 'Ice Pack', 'Home Remedy', '["External"]', 'External', '15-20 min', '["Every 2-3 hours"]', 'Every 2-3 hours', 'First 24 hours', 'On cheek. Towel between ice and skin.', NULL, true, 0, '2026-06-04 19:16:25.890933+05:30', '2026-06-04 19:16:25.890933+05:30', 'manual', NULL, 0, NULL);
INSERT INTO public.medicine_catalog VALUES ('44bf9b37-49e4-4780-a79d-0b22c029e0f0', 'TMP M2', 'Antibiotic', '["250mg"]', '250mg', '1', '["BD"]', 'BD', '3d', 'After food', '', true, 0, '2026-06-19 10:15:01.083005+05:30', '2026-06-19 10:15:01.083007+05:30', 'manual', NULL, 0, NULL);
INSERT INTO public.medicine_catalog VALUES ('10000000-0000-4000-8000-000000000008', 'Aceclofenac+Paracetamol', 'Painkiller', '["100+325mg", "100+500mg"]', '100+325mg', '1 tablet', '["Twice daily", "Three times daily"]', 'Twice daily', '3 days', 'After meals..', NULL, true, 0, '2026-06-04 19:16:25.890933+05:30', '2026-06-22 22:25:07.438012+05:30', 'manual', NULL, 1, '2026-06-17 14:03:41.232376+05:30');
INSERT INTO public.medicine_catalog VALUES ('98a2e6a8-0e44-4a3e-8fe1-9567050518f3', 'a', 'Antibiotic', '[""]', '', '', '[""]', '', '', '', '', true, 0, '2026-06-22 22:25:14.029353+05:30', '2026-06-22 22:25:14.029356+05:30', 'manual', NULL, 0, NULL);


--
-- Data for Name: medicine_reminders; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: message_log; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.message_log VALUES ('8f68b9c0-4aea-421e-a09c-8abf10279336', 'a1111111-1111-1111-1111-111111111111', 'lab_received', 'patient', 'a0000001-0000-0000-0000-000000000001', 'Aarav Sharma', '919810000001', 'Hi Aarav Sharma, your PFM Crown is ready! Please book a fitting appointment: https://wa.me/919876500001?text=Hi%2C%20my%20PFM Crown%20is%20ready%2C%20I%27d%20like%20to%20book%20a%20fitting or call +919876500001.', NULL, NULL, 'aa146f94-c927-4340-8666-c71910eb288c', NULL, 'manual_pending', 'click2chat', 'out', 'event', NULL, NULL, NULL, '2026-06-20 16:37:31.000896+05:30', NULL, '2026-06-20 16:37:30.994635+05:30', NULL);
INSERT INTO public.message_log VALUES ('c7e5c240-f18c-42db-bc9e-accda0be20cc', 'a1111111-1111-1111-1111-111111111111', 'lab_received', 'patient', 'a0000001-0000-0000-0000-000000000001', 'Aarav Sharma', '919810000001', 'Hi Aarav Sharma, your PFM Crown is ready! Please book a fitting appointment: https://wa.me/919876500001?text=Hi%2C%20my%20PFM Crown%20is%20ready%2C%20I%27d%20like%20to%20book%20a%20fitting or call +919876500001.', NULL, NULL, 'aa146f94-c927-4340-8666-c71910eb288c', NULL, 'manual_pending', 'click2chat', 'out', 'event', NULL, NULL, NULL, '2026-06-20 16:37:31.015831+05:30', NULL, '2026-06-20 16:37:31.010888+05:30', 'd2222222-2222-2222-2222-222222222222');
INSERT INTO public.message_log VALUES ('8963ffd3-f5a4-4ee7-912e-99c0630c45df', 'a1111111-1111-1111-1111-111111111111', 'lab_received', 'patient', '10000000-0000-4000-8000-000000000101', 'Asha Verma', '919876500101', 'Hi Asha Verma, your Crown (PFM) is ready! Please book a fitting appointment: https://wa.me/919876500001?text=Hi%2C%20my%20Crown (PFM)%20is%20ready%2C%20I%27d%20like%20to%20book%20a%20fitting or call +919876500001.', NULL, NULL, 'd67f2a0d-f2ae-4874-8ed3-47fcf10174ec', NULL, 'manual_pending', 'click2chat', 'out', 'event', NULL, NULL, NULL, '2026-06-20 22:42:44.591176+05:30', NULL, '2026-06-20 22:42:44.578424+05:30', NULL);
INSERT INTO public.message_log VALUES ('f8fbe89d-5a79-45ae-9ec5-99bf3b2e0b6f', 'a1111111-1111-1111-1111-111111111111', 'lab_received', 'patient', '10000000-0000-4000-8000-000000000101', 'Asha Verma', '919876500101', 'Hi Asha Verma, your Crown (PFM) is ready! Please book a fitting appointment: https://wa.me/919876500001?text=Hi%2C%20my%20Crown (PFM)%20is%20ready%2C%20I%27d%20like%20to%20book%20a%20fitting or call +919876500001.', NULL, NULL, 'd67f2a0d-f2ae-4874-8ed3-47fcf10174ec', NULL, 'manual_pending', 'click2chat', 'out', 'event', NULL, NULL, NULL, '2026-06-20 22:42:44.618413+05:30', NULL, '2026-06-20 22:42:44.614508+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.message_log VALUES ('1e84d572-7694-45dd-8eb0-93cf4e928ffb', 'a1111111-1111-1111-1111-111111111111', 'lab_received', 'patient', '10000000-0000-4000-8000-000000000103', 'Meera Nair', '919876500103', 'Hi Meera Nair, your Lab Work is ready! Please book a fitting appointment: https://wa.me/919876500001?text=Hi%2C%20my%20Lab Work%20is%20ready%2C%20I%27d%20like%20to%20book%20a%20fitting or call +919876500001.', NULL, NULL, 'e4017d2e-2cf4-4301-aa99-7b5c9f57e3fb', NULL, 'manual_pending', 'click2chat', 'out', 'event', NULL, NULL, NULL, '2026-06-20 23:48:27.046336+05:30', NULL, '2026-06-20 23:48:27.039789+05:30', NULL);
INSERT INTO public.message_log VALUES ('001fd843-84e4-4e54-807d-6a9e782c4943', 'a1111111-1111-1111-1111-111111111111', 'lab_received', 'patient', '10000000-0000-4000-8000-000000000101', 'Asha Verma', '919876500101', 'Hi Asha Verma, your Zirconia Crown is ready! Please book a fitting appointment: https://wa.me/919876500001?text=Hi%2C%20my%20Zirconia Crown%20is%20ready%2C%20I%27d%20like%20to%20book%20a%20fitting or call +919876500001.', NULL, NULL, '6b0acee0-39ef-4454-b479-be18f6d56efd', NULL, 'manual_pending', 'click2chat', 'out', 'event', NULL, NULL, NULL, '2026-06-20 23:56:04.946482+05:30', NULL, '2026-06-20 23:56:04.940324+05:30', NULL);
INSERT INTO public.message_log VALUES ('949bf1fd-2808-470c-944c-cd0d16843541', 'a1111111-1111-1111-1111-111111111111', NULL, 'patient', '10000000-0000-4000-8000-000000000102', 'Rohan Gupta', '919876500102', 'Hi {patient_name}, this is a test from Siya Dental.', NULL, NULL, NULL, NULL, 'manual_pending', 'click2chat', 'out', 'manual', NULL, NULL, NULL, '2026-06-22 22:24:14.985271+05:30', NULL, '2026-06-22 22:24:14.983154+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.message_log VALUES ('c675f77f-b88c-4fc9-aa63-5fbee277f0e0', 'a1111111-1111-1111-1111-111111111111', NULL, 'patient', '10000000-0000-4000-8000-000000000102', 'Test', '919876500102', 'Hi {patient_name}!', NULL, NULL, NULL, NULL, 'manual_pending', 'click2chat', 'out', 'manual', NULL, NULL, NULL, '2026-06-22 22:24:36.205896+05:30', NULL, '2026-06-22 22:24:36.205191+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.message_log VALUES ('1fea5e27-9867-4cc0-ba67-c08dbf902f4d', 'a1111111-1111-1111-1111-111111111111', NULL, 'patient', '10000000-0000-4000-8000-000000000102', 'Test', '919876500102', 'Hi Rohan!', NULL, NULL, NULL, NULL, 'manual_pending', 'click2chat', 'out', 'manual', NULL, NULL, NULL, '2026-06-22 22:25:18.71065+05:30', NULL, '2026-06-22 22:25:18.709112+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.message_log VALUES ('0ce708e3-f923-4b37-97d5-36eabb18d343', 'a1111111-1111-1111-1111-111111111111', 'lab_received', 'patient', '10000000-0000-4000-8000-000000000102', 'Rohan Gupta', '919876500102', 'Hi Rohan Gupta, your Crown (PFM) is ready! Please book a fitting appointment: https://wa.me/919876500001?text=Hi%2C%20my%20Crown (PFM)%20is%20ready%2C%20I%27d%20like%20to%20book%20a%20fitting or call +919876500001.', NULL, NULL, '4180a385-af51-4ea1-a2ac-aafd26b20f69', NULL, 'manual_pending', 'click2chat', 'out', 'event', NULL, NULL, NULL, '2026-06-22 22:41:38.184595+05:30', NULL, '2026-06-22 22:41:38.177472+05:30', NULL);
INSERT INTO public.message_log VALUES ('7040c783-eba0-4b1e-930d-32efc45aeb40', 'a1111111-1111-1111-1111-111111111111', 'arrival_confirmation', 'patient', 'a0000001-0000-0000-0000-000000000001', 'Aarav Sharma', '919810000001', 'Hi Aarav Sharma, we''ve marked you as arrived at Siya Dental Care — Main Branch. Estimated wait: 10 min. Dr. Dr. Madhu Edward will see you shortly.', 'b0000001-0000-0000-0000-000000000001', NULL, NULL, NULL, 'manual_pending', 'click2chat', 'out', 'manual', NULL, NULL, NULL, '2026-06-20 16:37:36.267632+05:30', NULL, '2026-06-20 16:37:36.238977+05:30', NULL);
INSERT INTO public.message_log VALUES ('5f47c13e-6f3f-471d-9c39-725548a75a37', 'a1111111-1111-1111-1111-111111111111', 'arrival_confirmation', 'patient', 'a0000003-0000-0000-0000-000000000003', 'Rahul Verma', '919810000003', 'Hi Rahul Verma, we''ve marked you as arrived at Siya Dental Care — Main Branch. Estimated wait: 10 min. Dr. Dr. Madhu Edward will see you shortly.', 'b0000003-0000-0000-0000-000000000003', NULL, NULL, NULL, 'manual_pending', 'click2chat', 'out', 'manual', NULL, NULL, NULL, '2026-06-20 17:59:49.071915+05:30', NULL, '2026-06-20 17:59:49.02016+05:30', NULL);
INSERT INTO public.message_log VALUES ('80e9d603-a53c-4bad-8c7b-fdfce3f3caaf', 'a1111111-1111-1111-1111-111111111111', 'arrival_confirmation', 'patient', '10000000-0000-4000-8000-000000000101', 'Asha Verma', '919876501101', 'Hi Asha Verma, we''ve marked you as arrived at Siya Dental Care — Main Branch. Estimated wait: 10 min. Dr. Dr. Madhu Edward will see you shortly.', '30000000-0000-4000-8000-000000000101', NULL, NULL, NULL, 'manual_pending', 'click2chat', 'out', 'manual', NULL, NULL, NULL, '2026-06-20 22:38:53.090782+05:30', NULL, '2026-06-20 22:38:53.067075+05:30', NULL);
INSERT INTO public.message_log VALUES ('b3cb4926-8b11-4ed4-b9d4-a87308168989', 'a1111111-1111-1111-1111-111111111111', 'appointment_rescheduled', 'patient', '10000000-0000-4000-8000-000000000101', 'Asha Verma', '919876501101', 'Hi Asha Verma, your appointment at Siya Dental Care — Main Branch has been rescheduled from None  to *20 Jun 2026 at *. — Dr. Dr. Madhu Edward', '5607d539-d841-4ff4-88d7-10ea8b601215', NULL, NULL, NULL, 'manual_pending', 'click2chat', 'out', 'event', NULL, NULL, NULL, '2026-06-20 22:41:24.813043+05:30', NULL, '2026-06-20 22:41:24.788351+05:30', NULL);
INSERT INTO public.message_log VALUES ('a5ec3f30-6fdf-4d3c-9ff6-13f965250cea', 'a1111111-1111-1111-1111-111111111111', 'arrival_confirmation', 'patient', '10000000-0000-4000-8000-000000000101', 'Asha Verma', '919876501101', 'Hi Asha Verma, we''ve marked you as arrived at Siya Dental Care — Main Branch. Estimated wait: 10 min. Dr. Dr. Madhu Edward will see you shortly.', '5607d539-d841-4ff4-88d7-10ea8b601215', NULL, NULL, NULL, 'manual_pending', 'click2chat', 'out', 'manual', NULL, NULL, NULL, '2026-06-20 22:41:35.867065+05:30', NULL, '2026-06-20 22:41:35.83619+05:30', NULL);
INSERT INTO public.message_log VALUES ('26839ac5-ce8f-491c-baf7-a2c1fbd19309', 'a1111111-1111-1111-1111-111111111111', 'appointment_rescheduled', 'patient', '10000000-0000-4000-8000-000000000101', 'Asha Verma', '919876501101', 'Hi Asha Verma, your appointment at Siya Dental Care — Main Branch has been rescheduled from None  to *20 Jun 2026 at *. — Dr. Dr. Madhu Edward', '2a3a29ad-4b20-4a7e-a538-8d668e541d28', NULL, NULL, NULL, 'manual_pending', 'click2chat', 'out', 'event', NULL, NULL, NULL, '2026-06-20 22:42:59.411549+05:30', NULL, '2026-06-20 22:42:59.393743+05:30', NULL);
INSERT INTO public.message_log VALUES ('f17f4a86-6930-4ea5-b6b5-dc923f70d88c', 'a1111111-1111-1111-1111-111111111111', 'arrival_confirmation', 'patient', '10000000-0000-4000-8000-000000000101', 'Asha Verma', '919876501101', 'Hi Asha Verma, we''ve marked you as arrived at Siya Dental Care — Main Branch. Estimated wait: 10 min. Dr. Dr. Madhu Edward will see you shortly.', '2a3a29ad-4b20-4a7e-a538-8d668e541d28', NULL, NULL, NULL, 'manual_pending', 'click2chat', 'out', 'manual', NULL, NULL, NULL, '2026-06-20 22:43:17.13546+05:30', NULL, '2026-06-20 22:43:17.120847+05:30', NULL);
INSERT INTO public.message_log VALUES ('7aff68d9-9ce4-46b3-971b-449d2f365495', 'a1111111-1111-1111-1111-111111111111', 'appointment_rescheduled', 'patient', '10000000-0000-4000-8000-000000000102', 'Rohan Gupta', '919876500102', 'Hi Rohan Gupta, your appointment at Siya Dental Care — Main Branch has been rescheduled from 21 Jun 12:30 to *20 Jun 2026 at 12:30*. — Dr. Dr. Madhu Edward', '30000000-0000-4000-8000-000000000102', NULL, NULL, NULL, 'manual_pending', 'click2chat', 'out', 'event', NULL, NULL, NULL, '2026-06-20 23:32:10.385321+05:30', NULL, '2026-06-20 23:32:10.343413+05:30', NULL);
INSERT INTO public.message_log VALUES ('c25b16b0-9395-4788-b2ed-ef672a79fae2', 'a1111111-1111-1111-1111-111111111111', 'arrival_confirmation', 'patient', '10000000-0000-4000-8000-000000000103', 'Meera Nair', '919876501103', 'Hi Meera Nair, we''ve marked you as arrived at Siya Dental Care — Main Branch. Estimated wait: 10 min. Dr. Dr. Madhu Edward will see you shortly.', '30000000-0000-4000-8000-000000000103', NULL, NULL, NULL, 'manual_pending', 'click2chat', 'out', 'manual', NULL, NULL, NULL, '2026-06-20 23:35:21.264986+05:30', NULL, '2026-06-20 23:35:21.24564+05:30', NULL);
INSERT INTO public.message_log VALUES ('15676396-5d6c-4e60-8df8-12053e3f1483', 'a1111111-1111-1111-1111-111111111111', 'specialist_assigned', 'specialist', '07e07975-94d7-4c30-8a71-7e75f420092f', 'SS', '919876599991', 'Hi Dr. SS, you''ve been assigned a Crown case at Siya Dental Care — Main Branch on 20 Jun at 15:15. Patient: MN, . Chief complaint: Temporary crown review.', '30000000-0000-4000-8000-000000000103', NULL, NULL, NULL, 'manual_pending', 'click2chat', 'out', 'event', NULL, NULL, NULL, '2026-06-20 23:44:39.23906+05:30', NULL, '2026-06-20 23:44:39.230797+05:30', NULL);
INSERT INTO public.message_log VALUES ('109df60e-d8da-4b95-8066-5021b9df4c1f', 'a1111111-1111-1111-1111-111111111111', 'appointment_rescheduled', 'patient', '10000000-0000-4000-8000-000000000103', 'Meera Nair', '919876501103', 'Hi Meera Nair, your appointment at Siya Dental Care — Main Branch has been rescheduled from 21 Jun 10:00 to *20 Jun 2026 at 10:00*. — Dr. Dr. Madhu Edward', 'eb71a482-4d0d-4822-b905-fd4459abe57b', NULL, NULL, NULL, 'manual_pending', 'click2chat', 'out', 'event', NULL, NULL, NULL, '2026-06-20 23:49:01.926472+05:30', NULL, '2026-06-20 23:49:01.909339+05:30', NULL);
INSERT INTO public.message_log VALUES ('ff6beb00-8aa0-4bfe-8618-d24b9b35de4c', 'a1111111-1111-1111-1111-111111111111', 'arrival_confirmation', 'patient', '10000000-0000-4000-8000-000000000103', 'Meera Nair', '919876501103', 'Hi Meera Nair, we''ve marked you as arrived at Siya Dental Care — Main Branch. Estimated wait: 10 min. Dr. Dr. Madhu Edward will see you shortly.', 'eb71a482-4d0d-4822-b905-fd4459abe57b', NULL, NULL, NULL, 'manual_pending', 'click2chat', 'out', 'manual', NULL, NULL, NULL, '2026-06-20 23:49:36.968316+05:30', NULL, '2026-06-20 23:49:36.954443+05:30', NULL);
INSERT INTO public.message_log VALUES ('90ef63f8-2a17-46a7-b14d-73a31abb4a7b', 'a1111111-1111-1111-1111-111111111111', 'arrival_confirmation', 'patient', '10000000-0000-4000-8000-000000000101', 'Asha Verma', '919876501101', 'Hi Asha Verma, we''ve marked you as arrived at Siya Dental Care — Main Branch. Estimated wait: 10 min. Dr. Dr. Madhu Edward will see you shortly.', '2a3a29ad-4b20-4a7e-a538-8d668e541d28', NULL, NULL, NULL, 'manual_pending', 'click2chat', 'out', 'manual', NULL, NULL, NULL, '2026-06-20 23:56:06.287119+05:30', NULL, '2026-06-20 23:56:06.268285+05:30', NULL);
INSERT INTO public.message_log VALUES ('aa9f0f8e-b7e6-462e-b8a3-e86529fbe63a', 'a1111111-1111-1111-1111-111111111111', 'arrival_confirmation', 'patient', '10000000-0000-4000-8000-000000000104', 'Arjun Rao', '919876500104', 'Hi Arjun Rao, we''ve marked you as arrived at Siya Dental Care — Main Branch. Estimated wait: 10 min. Dr. Dr. Madhu Edward will see you shortly.', '30000000-0000-4000-8000-000000000104', NULL, NULL, NULL, 'manual_pending', 'click2chat', 'out', 'manual', NULL, NULL, NULL, '2026-06-21 00:40:04.329467+05:30', NULL, '2026-06-21 00:40:04.201816+05:30', NULL);
INSERT INTO public.message_log VALUES ('63b51441-158f-4b41-b99a-7f55bbfae8be', 'a1111111-1111-1111-1111-111111111111', 'appointment_rescheduled', 'patient', '10000000-0000-4000-8000-000000000102', 'Rohan Gupta', '919876500102', 'Hi Rohan Gupta, your appointment at Siya Dental Care — Main Branch has been rescheduled from None  to *20 Jun 2026 at *. — Dr. Dr. Madhu Edward', '30000000-0000-4000-8000-000000000102', NULL, NULL, NULL, 'manual_pending', 'click2chat', 'out', 'event', NULL, NULL, NULL, '2026-06-21 01:39:42.117771+05:30', NULL, '2026-06-21 01:39:42.084405+05:30', NULL);
INSERT INTO public.message_log VALUES ('86dd1024-b1a5-4646-a732-834c828d3052', 'a1111111-1111-1111-1111-111111111111', 'arrival_confirmation', 'patient', '10000000-0000-4000-8000-000000000102', 'Rohan Gupta', '919876500102', 'Hi Rohan Gupta, we''ve marked you as arrived at Siya Dental Care — Main Branch. Estimated wait: 10 min. Dr. Dr. Madhu Edward will see you shortly.', '30000000-0000-4000-8000-000000000102', NULL, NULL, NULL, 'manual_pending', 'click2chat', 'out', 'manual', NULL, NULL, NULL, '2026-06-21 01:39:57.203483+05:30', NULL, '2026-06-21 01:39:57.178061+05:30', NULL);
INSERT INTO public.message_log VALUES ('bd2e8424-9f7a-46a1-b73b-5b35ff321108', 'a1111111-1111-1111-1111-111111111111', 'appointment_rescheduled', 'patient', '603dbe2c-3457-41f5-8d10-6b7eaf048f60', 'Wire Test', '919876512345', 'Hi Wire Test, your appointment at Siya Dental Care — Main Branch has been rescheduled from 29 Jun 10:00 to *27 Jun 2026 at 10:00*. — Dr. the doctor', '702f0116-87b0-4516-a496-4007ec9a4f99', NULL, NULL, NULL, 'manual_pending', 'click2chat', 'out', 'event', NULL, NULL, NULL, '2026-06-27 17:38:32.459786+05:30', NULL, '2026-06-27 17:38:32.422654+05:30', NULL);


--
-- Data for Name: message_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.message_templates VALUES ('d544c3fe-94f9-412b-aa4b-714dd44c166a', NULL, 'appointment_confirmation', 'appointment', 'Appointment booked', 'Hi {patient_name}, your appointment at {clinic_name} is confirmed for {date} at {time}. See you soon! — Dr. {doctor_name}', NULL, 'en', true, '2026-06-15 09:45:29.484512+05:30');
INSERT INTO public.message_templates VALUES ('7a9a61ca-4461-491c-9d9b-127e121d84cb', NULL, 'reminder_24h', 'appointment', 'Reminder — 24h before', 'Hi {patient_name}, this is a reminder of your dental appointment tomorrow ({date}) at {time}. Reply YES to confirm, NO to reschedule. — {clinic_name}', NULL, 'en', true, '2026-06-15 09:45:29.484512+05:30');
INSERT INTO public.message_templates VALUES ('1017fb39-4659-415c-8c18-db5fec268a00', NULL, 'reminder_2h', 'appointment', 'Reminder — 2h before', 'Hi {patient_name}, your appointment is in 2 hours ({time}). The clinic is at {clinic_address}. See you soon!', NULL, 'en', true, '2026-06-15 09:45:29.484512+05:30');
INSERT INTO public.message_templates VALUES ('816c8ff8-5589-41cb-ba39-0e22ec3cc284', NULL, 'reminder_30m', 'appointment', 'Reminder — 30 min before', 'Hi {patient_name}, your appointment is in 30 minutes. We''re at {clinic_address}.', NULL, 'en', true, '2026-06-15 09:45:29.484512+05:30');
INSERT INTO public.message_templates VALUES ('4ef6b7ba-12e6-40d3-bcd1-cd95d368251c', NULL, 'receipt', 'billing', 'Payment receipt', 'Hi {patient_name}, receipt for your visit on {date}: ₹{amount} ({mode}). Balance: ₹{balance}. Thank you! — {clinic_name}', NULL, 'en', true, '2026-06-15 09:45:29.484512+05:30');
INSERT INTO public.message_templates VALUES ('d87c01fe-8dd8-42b4-878f-27a486b8894a', NULL, 'rating_ask', 'feedback', 'Ask for rating', 'Hi {patient_name}, how was your visit at {clinic_name} on {visit_date}? Rate us 1–5 stars here: {rating_link}\n\nLeave a rating and get ₹{discount} off your next visit! 🎁', NULL, 'en', true, '2026-06-15 09:45:29.484512+05:30');
INSERT INTO public.message_templates VALUES ('66a0918f-b5ec-461b-af19-c3b9d9b0a023', NULL, 'rating_retry', 'feedback', 'Rating reminder', 'Hi {patient_name}, we''d love your feedback on your recent visit! Rate us here for a ₹{discount} credit: {rating_link}', NULL, 'en', true, '2026-06-15 09:45:29.484512+05:30');
INSERT INTO public.message_templates VALUES ('5c0acfeb-8eed-4e3e-b981-679ac8d47226', NULL, 'lab_received', 'lab', 'Lab work received', 'Hi {patient_name}, your {work_type} is ready! Please book a fitting appointment: {booking_link} or call {clinic_phone}.', NULL, 'en', true, '2026-06-15 09:45:29.484512+05:30');
INSERT INTO public.message_templates VALUES ('00da8bfc-df6d-4ca5-92b1-63cbf2dd5d95', NULL, 'lab_to_vendor', 'lab', 'Lab order to vendor', 'Hi {vendor_name}, new {work_type} order for patient {patient_initials}, teeth {teeth}, shade {shade}. Expected by {expected_date}. — {clinic_name}', NULL, 'en', true, '2026-06-15 09:45:29.484512+05:30');
INSERT INTO public.message_templates VALUES ('66cecc0c-9289-48fa-b2ba-fe8b670fed49', NULL, 'specialist_assigned', 'specialist', 'Specialist assignment', 'Hi Dr. {specialist_name}, you''ve been assigned a {appointment_type} case at {clinic_name} on {date} at {time}. Patient: {patient_initials}, {patient_age}{patient_gender}. Chief complaint: {complaint}.', NULL, 'en', true, '2026-06-15 09:45:29.484512+05:30');
INSERT INTO public.message_templates VALUES ('86c4abf5-5a2f-4ba0-9d85-607306b79d76', NULL, 'specialist_to_patient', 'specialist', 'Specialist intro to patient', 'Hi {patient_name}, Dr. {specialist_name} (specialist in {specialization}) will see you for your appointment on {date} at {time} at {clinic_name}.', NULL, 'en', true, '2026-06-15 09:45:29.484512+05:30');
INSERT INTO public.message_templates VALUES ('65e06e8f-8e91-49d4-9269-dccb8ff1dc57', NULL, 'doctor_daily_summary', 'doctor', 'Daily summary to doctor', 'Dr. {doctor_name}, today: {visits_count} visits · ₹{collected} collected · {pending_count} pay-pending · {tomorrow_count} appointments tomorrow.', NULL, 'en', true, '2026-06-15 09:45:29.484512+05:30');
INSERT INTO public.message_templates VALUES ('11a9c1e5-50de-487c-99f5-2d2a714b6462', NULL, 'phone_consult_confirmation', 'phone_consult', 'Phone consult booked', 'Hi {patient_name}, your ₹{fee} phone consultation is confirmed. Dr. {doctor_name} will call you on {phone} within {duration_min} minutes from now. Prescription will be sent via WhatsApp.', NULL, 'en', true, '2026-06-15 09:45:29.484512+05:30');
INSERT INTO public.message_templates VALUES ('ef27520e-46d3-4519-a59b-b22f4512bf3a', NULL, 'phone_consult_rx', 'phone_consult', 'Phone consult Rx', 'Hi {patient_name}, here is your prescription from today''s phone consultation with Dr. {doctor_name}:\n\n{rx_text}\n\nDownload PDF: {rx_pdf}\n\nFollow-up: {followup_date}', NULL, 'en', true, '2026-06-15 09:45:29.484512+05:30');
INSERT INTO public.message_templates VALUES ('fbf0b35d-cf80-4b67-96e2-db049fba3b4f', NULL, 'appointment_rescheduled', 'appointment', 'Appointment rescheduled', 'Hi {patient_name}, your appointment at {clinic_name} has been rescheduled from {old_date} {old_time} to *{new_date} at {new_time}*. — Dr. {doctor_name}', NULL, 'en', true, '2026-06-15 09:58:44.458335+05:30');
INSERT INTO public.message_templates VALUES ('54744e73-ea03-47bd-b89b-e99bdf8197bb', NULL, 'appointment_cancelled', 'appointment', 'Appointment cancelled', 'Hi {patient_name}, your appointment at {clinic_name} on {date} at {time} has been cancelled. Please call {clinic_phone} to rebook. We''re sorry for any inconvenience.', NULL, 'en', true, '2026-06-15 09:58:44.458335+05:30');
INSERT INTO public.message_templates VALUES ('dd545770-5118-4ce6-a60f-7e4f760b06ef', NULL, 'arrival_confirmation', 'appointment', 'Arrival confirmed', 'Hi {patient_name}, we''ve marked you as arrived at {clinic_name}. Estimated wait: {wait_minutes} min. Dr. {doctor_name} will see you shortly.', NULL, 'en', true, '2026-06-15 09:58:44.458335+05:30');
INSERT INTO public.message_templates VALUES ('fdd3a9a9-61dd-4e35-bb2e-045865772456', NULL, 'thank_you_visit', 'appointment', 'Thank you (post-visit)', 'Thank you {patient_name} for visiting {clinic_name} today! Take care and reach out anytime at {clinic_phone}. — Dr. {doctor_name}', NULL, 'en', true, '2026-06-15 09:58:44.458335+05:30');
INSERT INTO public.message_templates VALUES ('dbbe9eef-d696-4bef-bdc9-d6a16e7a6fea', NULL, 'reward_earned', 'feedback', 'Reward earned', 'Hi {patient_name}, your ₹{amount} reward credit is now active! Use it on your next visit at {clinic_name}. Valid until {expires_at}.', NULL, 'en', true, '2026-06-15 09:58:44.458335+05:30');
INSERT INTO public.message_templates VALUES ('c9ab7d27-3441-443f-91b4-2902edeb4efe', NULL, 'followup_scheduled', 'followup', 'Follow-up scheduled', 'Hi {patient_name}, your follow-up at {clinic_name} is scheduled for *{followup_date}*. Purpose: {purpose}. We''ll send a reminder closer to the date.', NULL, 'en', true, '2026-06-15 09:58:44.458335+05:30');
INSERT INTO public.message_templates VALUES ('844d3ca7-d77a-4948-973b-09576524c84b', NULL, 'followup_reminder_3d', 'followup', 'Follow-up reminder (3 days)', 'Hi {patient_name}, friendly reminder: your follow-up at {clinic_name} is in 3 days on {followup_date}. Purpose: {purpose}.', NULL, 'en', true, '2026-06-15 09:58:44.458335+05:30');
INSERT INTO public.message_templates VALUES ('a36bd26e-d235-4594-84b2-286a3fdc44c3', NULL, 'followup_reminder_1d', 'followup', 'Follow-up reminder (1 day)', 'Hi {patient_name}, your follow-up is *tomorrow* ({followup_date}) at {clinic_name}. Reply YES to confirm.', NULL, 'en', true, '2026-06-15 09:58:44.458335+05:30');
INSERT INTO public.message_templates VALUES ('b09d8bdb-2b4f-4902-be47-4c74a67b65e0', NULL, 'followup_due_today', 'followup', 'Follow-up today', 'Hi {patient_name}, your follow-up at {clinic_name} is *today*. Purpose: {purpose}. Please come by {time}.', NULL, 'en', true, '2026-06-15 09:58:44.458335+05:30');
INSERT INTO public.message_templates VALUES ('77240a46-48fb-4bc4-9840-660eb44a87c5', NULL, 'recall_reminder', 'followup', 'Recall reminder (missed)', 'Hi {patient_name}, we noticed you missed your scheduled follow-up. Your dental health matters! Please call {clinic_phone} to reschedule.', NULL, 'en', true, '2026-06-15 09:58:44.458335+05:30');
INSERT INTO public.message_templates VALUES ('fd72d4b0-84db-453d-936e-308b145c5b03', NULL, 'lab_order_placed', 'lab', 'Lab order placed', 'Hi {vendor_name}, new {work_type} order from {clinic_name}. Patient: {patient_code}, Teeth: {teeth}, Shade: {shade}. Due: *{due_date}*. — Dr. {doctor_name}', NULL, 'en', true, '2026-06-15 09:58:44.458335+05:30');
INSERT INTO public.message_templates VALUES ('dcf55b84-f152-4676-a805-33168297cb48', NULL, 'lab_order_modified', 'lab', 'Lab order modified', 'Hi {vendor_name}, order #{order_id} ({work_type}, patient {patient_code}) has been modified. New requirements: {changes}. Updated due: {due_date}.', NULL, 'en', true, '2026-06-15 09:58:44.458335+05:30');
INSERT INTO public.message_templates VALUES ('8c44b0d9-5492-448c-9c2d-cd4962cc0de5', NULL, 'lab_due_tomorrow', 'lab', 'Lab due tomorrow', 'Hi {vendor_name}, reminder: {work_type} for patient {patient_code} (order #{order_id}) is due *tomorrow* ({due_date}). Please confirm.', NULL, 'en', true, '2026-06-15 09:58:44.458335+05:30');
INSERT INTO public.message_templates VALUES ('c5edbeaf-45e9-493a-91e3-883cb8ca7320', NULL, 'lab_due_today', 'lab', 'Lab due today', 'Hi {vendor_name}, {work_type} for {patient_code} (order #{order_id}) is *due today*. Please deliver by EOD.', NULL, 'en', true, '2026-06-15 09:58:44.458335+05:30');
INSERT INTO public.message_templates VALUES ('3c4f44d0-8ce2-4989-bd43-240551b214af', NULL, 'lab_overdue', 'lab', 'Lab overdue', 'Hi {vendor_name}, {work_type} for {patient_code} (order #{order_id}) was due on {due_date} — *now {days_overdue} day(s) overdue*. Please update.', NULL, 'en', true, '2026-06-15 09:58:44.458335+05:30');
INSERT INTO public.message_templates VALUES ('f8f648e4-4c34-4031-ac2e-fba6f13bad67', NULL, 'lab_trial_appointment', 'lab', 'Lab trial fitting', 'Hi {vendor_name}, trial fitting for patient {patient_code} ({work_type}) scheduled at {clinic_name} on *{trial_date}* at {trial_time}.', NULL, 'en', true, '2026-06-15 09:58:44.458335+05:30');
INSERT INTO public.message_templates VALUES ('6163dcc1-1efa-443d-a4b7-ad0623607459', NULL, 'lab_case_complete', 'lab', 'Lab case completed', 'Thank you {vendor_name}! {work_type} for {patient_code} (order #{order_id}) has been received and fitted. Invoice will follow.', NULL, 'en', true, '2026-06-15 09:58:44.458335+05:30');
INSERT INTO public.message_templates VALUES ('071ef974-40dd-4ac0-89e4-397b5e9b9d26', NULL, 'specialist_morning_digest', 'specialist', 'Specialist morning digest', 'Good morning Dr. {specialist_name}! Today''s cases at {clinic_name}:\n\n{case_list}\n\nTotal: {case_count} patient(s). Have a great day!', NULL, 'en', true, '2026-06-15 09:58:44.458335+05:30');
INSERT INTO public.message_templates VALUES ('e7947b09-013b-4abc-bc9a-2574173d9847', NULL, 'specialist_reminder_1d', 'specialist', 'Specialist reminder (1 day)', 'Hi Dr. {specialist_name}, you have {case_count} case(s) tomorrow at {clinic_name}. Patients: {patient_list}. Please confirm attendance.', NULL, 'en', true, '2026-06-15 09:58:44.458335+05:30');
INSERT INTO public.message_templates VALUES ('29863ce1-f04b-414d-8641-84dcb907263c', NULL, 'specialist_case_completed', 'specialist', 'Case completed (to doctor)', 'Dr. {doctor_name}, Dr. {specialist_name} completed case for *{patient_name}* on {date}. Treatment: {treatment_summary}. Rate tier: {rate_tier}.', NULL, 'en', true, '2026-06-15 09:58:44.458335+05:30');
INSERT INTO public.message_templates VALUES ('013405fa-2969-45e0-a324-a4a46fa62cb1', NULL, 'specialist_thank_you', 'specialist', 'Specialist thank you (EOD)', 'Thank you Dr. {specialist_name} for {case_count} case(s) today at {clinic_name}. Total earning: ₹{total_amount}. Settlement will follow as scheduled.', NULL, 'en', true, '2026-06-15 09:58:44.458335+05:30');
INSERT INTO public.message_templates VALUES ('ea42b7d4-5030-4e7b-8377-18a87fd89a1e', NULL, 'doctor_daily_digest', 'doctor', 'Doctor morning digest', 'Good morning Dr. {doctor_name}! Today at {clinic_name}:\n• Appointments: {appointment_count}\n• New patients: {new_patient_count}\n• Follow-ups: {followup_count}\n• Specialist cases: {specialist_count}\n• Pending payments: ₹{pending_amount}\n• Lab deliveries due: {lab_due_count}', NULL, 'en', true, '2026-06-15 09:58:44.458335+05:30');
INSERT INTO public.message_templates VALUES ('6ef92e07-080b-408e-866a-f48c1510581a', NULL, 'nurse_daily_digest', 'nurse', 'Nurse morning digest', 'Good morning! Today at {clinic_name}:\n• Patients booked: {appointment_count}\n• New: {new_patient_count}\n• Follow-ups: {followup_count}\n• Specialist visits: {specialist_count}\n• Lab deliveries today: {lab_due_count}\n• Pending payments to collect: ₹{pending_amount}', NULL, 'en', true, '2026-06-15 09:58:44.458335+05:30');
INSERT INTO public.message_templates VALUES ('1e447c10-9a67-4d6d-b5d5-23c231c53733', NULL, 'high_priority_alert', 'doctor', 'High-priority patient alert', '⚠️ Dr. {doctor_name}, high-priority patient: *{patient_name}*. Reason: {reason}. Please review.', NULL, 'en', true, '2026-06-15 09:58:44.458335+05:30');
INSERT INTO public.message_templates VALUES ('ebec6a6d-fb3c-4a1e-a01c-741aa374bb7a', NULL, 'lab_delay_alert', 'doctor', 'Lab delay alert', '🔴 Dr. {doctor_name}, lab delay: {work_type} for *{patient_name}* (vendor: {vendor_name}) is {days_overdue} day(s) overdue. Original due: {due_date}.', NULL, 'en', true, '2026-06-15 09:58:44.458335+05:30');
INSERT INTO public.message_templates VALUES ('5837287c-db35-421e-8a83-9771b7719c85', NULL, 'failed_reminder_alert', 'nurse', 'Failed reminder alert', '⚠️ Reminder to {patient_name} ({patient_phone}) failed: {error}. Please follow up manually.', NULL, 'en', true, '2026-06-15 09:58:44.458335+05:30');
INSERT INTO public.message_templates VALUES ('8aae1b5b-85bf-4eab-8dd9-a5ca7125da15', NULL, 'treatment_approval_required', 'doctor', 'Treatment needs approval', 'Dr. {doctor_name}, treatment plan for *{patient_name}* (₹{amount}, {procedure_count} procedures) needs your approval.', NULL, 'en', true, '2026-06-15 09:58:44.458335+05:30');


--
-- Data for Name: module_visibility; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.module_visibility VALUES ('f007b05d-b72c-4c42-8821-cc6c3bd1f4f2', 'b2222222-2222-2222-2222-222222222222', 'dashboard', 'doctor', true, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('63f2d3cd-344b-489f-af53-af807f491c1c', 'b2222222-2222-2222-2222-222222222222', 'dashboard', 'admin', true, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('3184c664-14c0-4b32-8fb8-6cfd4face290', 'b2222222-2222-2222-2222-222222222222', 'dashboard', 'receptionist', true, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('03d59360-d36c-4dfe-b30d-87abf15eef26', 'b2222222-2222-2222-2222-222222222222', 'appointments', 'doctor', true, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('f098214c-e148-4d55-ae33-e05c618f4702', 'b2222222-2222-2222-2222-222222222222', 'appointments', 'admin', true, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('e45a89d9-2cac-486a-b1bc-ed88661683d0', 'b2222222-2222-2222-2222-222222222222', 'appointments', 'receptionist', true, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('ec7bde94-9753-44bb-8c9b-056b4ed172c0', 'b2222222-2222-2222-2222-222222222222', 'appointments', 'specialist', false, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('7d164277-ab90-4f9d-a153-6516466aa51b', 'b2222222-2222-2222-2222-222222222222', 'patients', 'doctor', true, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('207b8953-fa52-4f06-9030-225d2d563468', 'b2222222-2222-2222-2222-222222222222', 'patients', 'admin', true, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('5dad7269-7cf5-4671-9553-f58d95a36e26', 'b2222222-2222-2222-2222-222222222222', 'patients', 'receptionist', true, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('b125faed-1eeb-44dd-823a-fe54095d5735', 'b2222222-2222-2222-2222-222222222222', 'queue', 'doctor', true, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('090d4a83-b44b-42ca-970b-a0c7edb4fac1', 'b2222222-2222-2222-2222-222222222222', 'queue', 'admin', true, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('20e74eb8-4d8f-4051-ae4a-af4c2043bc9b', 'b2222222-2222-2222-2222-222222222222', 'queue', 'receptionist', true, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('05533ac0-5966-43ab-9b5f-6ca8bcb63931', 'b2222222-2222-2222-2222-222222222222', 'kanban', 'doctor', true, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('f51478e1-bc8d-4ec6-80ed-291eb6e85bed', 'b2222222-2222-2222-2222-222222222222', 'kanban', 'admin', true, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('f2f0c750-d913-46ba-b8d8-6069686cf1da', 'b2222222-2222-2222-2222-222222222222', 'kanban', 'receptionist', false, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('6e9acdbd-b2dd-440b-be68-cb4373d0c45e', 'b2222222-2222-2222-2222-222222222222', 'kanban', 'specialist', false, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('422a013d-a7b3-497a-811a-2f3c647b159f', 'b2222222-2222-2222-2222-222222222222', 'billing', 'doctor', true, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('2a69fcb2-96a4-4d69-bfe6-5a49bc77be79', 'b2222222-2222-2222-2222-222222222222', 'billing', 'admin', true, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('5700a2cc-b904-4817-b766-939b1e870965', 'b2222222-2222-2222-2222-222222222222', 'billing', 'receptionist', true, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('e3cc2358-4b46-45b4-9661-cf79ee2cff41', 'b2222222-2222-2222-2222-222222222222', 'billing', 'specialist', false, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('0f2d6459-b0b1-491a-a9c6-dac54a37c9b8', 'b2222222-2222-2222-2222-222222222222', 'medicines', 'doctor', true, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('5b550da3-4ccb-483d-b00c-053fb7667bf6', 'b2222222-2222-2222-2222-222222222222', 'medicines', 'admin', true, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('fe2e9f74-7d27-4a7a-8d10-7bdc4991ebab', 'b2222222-2222-2222-2222-222222222222', 'medicines', 'receptionist', false, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('3ee89cf0-d070-45c1-8ca5-a5f9ee5b585a', 'b2222222-2222-2222-2222-222222222222', 'medicines', 'specialist', false, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('c1717e29-7a08-438a-b2b1-6003760858c6', 'b2222222-2222-2222-2222-222222222222', 'procedures', 'doctor', true, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('8e9d6811-b805-4e8f-a07c-8e00088c4d4e', 'b2222222-2222-2222-2222-222222222222', 'procedures', 'admin', true, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('dee9101b-0873-409c-83f1-b4f19576f6c9', 'b2222222-2222-2222-2222-222222222222', 'procedures', 'receptionist', false, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('a1559618-02ac-4568-8999-43a4d79bda16', 'b2222222-2222-2222-2222-222222222222', 'procedures', 'specialist', false, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('79d67f3d-a3f0-44b1-ad28-491d0873b201', 'b2222222-2222-2222-2222-222222222222', 'lab', 'doctor', true, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('0230347b-282d-41d5-bc84-02d49d1526ba', 'b2222222-2222-2222-2222-222222222222', 'lab', 'admin', true, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('e3d10926-77c3-4cca-93a2-66e7e9864cff', 'b2222222-2222-2222-2222-222222222222', 'lab', 'receptionist', true, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('1d21ae31-e55e-4a7b-a105-f0ac8be76ed0', 'b2222222-2222-2222-2222-222222222222', 'counters', 'doctor', true, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('de3dca15-936c-4e0a-8295-d6700d86092a', 'b2222222-2222-2222-2222-222222222222', 'counters', 'admin', true, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('5863ccd7-bde3-40d0-980b-f2f422b5a01b', 'b2222222-2222-2222-2222-222222222222', 'counters', 'receptionist', false, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('7612640e-2ae3-4175-a10c-0adcb3b3b04c', 'b2222222-2222-2222-2222-222222222222', 'counters', 'specialist', false, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('23ec8918-3375-4bd1-8cd7-fe0d3d2290b8', 'b2222222-2222-2222-2222-222222222222', 'specialists', 'doctor', true, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('b876735b-7593-48ad-9313-29ea2e16edb7', 'b2222222-2222-2222-2222-222222222222', 'specialists', 'admin', true, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('072bedae-6566-451f-abe7-41c20224f198', 'b2222222-2222-2222-2222-222222222222', 'specialists', 'receptionist', false, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('3e24259d-03c3-48d1-9b4d-04c06669da19', 'b2222222-2222-2222-2222-222222222222', 'specialists', 'specialist', false, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('0e67e91d-2735-4a1e-b57b-838b28ef63b8', 'b2222222-2222-2222-2222-222222222222', 'staff', 'doctor', true, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('96838c53-92f9-4de2-986e-a9fac1065d87', 'b2222222-2222-2222-2222-222222222222', 'staff', 'admin', true, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('27062d71-da52-4b8f-8703-b4cf4645ce00', 'b2222222-2222-2222-2222-222222222222', 'staff', 'receptionist', false, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('a582f5e1-671d-4c40-b1a5-6d2eb705de08', 'b2222222-2222-2222-2222-222222222222', 'staff', 'specialist', false, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('c855cde3-6959-4354-8f9e-0da4910be203', 'b2222222-2222-2222-2222-222222222222', 'gallery', 'doctor', true, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('ff371d51-c49a-494c-88ee-ade040a8901a', 'b2222222-2222-2222-2222-222222222222', 'gallery', 'admin', true, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('8f25ef80-4129-4857-9d2d-037b3f3aac31', 'b2222222-2222-2222-2222-222222222222', 'gallery', 'receptionist', false, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('8eb92377-8e2c-4367-8d7e-a9b2f71f367a', 'b2222222-2222-2222-2222-222222222222', 'gallery', 'specialist', false, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('a7bd5f25-9f52-43fa-abe6-dc8dfc43f102', 'b2222222-2222-2222-2222-222222222222', 'website', 'doctor', true, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('12f21b8b-5827-448c-8f77-89b661222b53', 'b2222222-2222-2222-2222-222222222222', 'website', 'admin', true, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('c698c573-58f1-4ab9-8ac6-bed6bccee525', 'b2222222-2222-2222-2222-222222222222', 'website', 'receptionist', false, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('608f74a1-5edb-4dbd-87ee-4b2391962d0d', 'b2222222-2222-2222-2222-222222222222', 'website', 'specialist', false, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('10741532-9406-46e1-a1a7-8563ad61ea3b', 'b2222222-2222-2222-2222-222222222222', 'consult', 'doctor', true, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('1ce0bdaa-a364-4087-b979-634d4abb001d', 'b2222222-2222-2222-2222-222222222222', 'consult', 'admin', true, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('0100a308-6cc0-46e0-af8c-8762f26b5dd4', 'b2222222-2222-2222-2222-222222222222', 'consult', 'receptionist', false, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('009a51ec-6a69-43eb-843c-061c3fc2ae3b', 'b2222222-2222-2222-2222-222222222222', 'consult', 'specialist', false, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('d2be865a-dc90-4944-9a80-a215b1a58112', 'b2222222-2222-2222-2222-222222222222', 'messages', 'doctor', true, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('ac95308c-35be-4752-ab12-ad5989d6886f', 'b2222222-2222-2222-2222-222222222222', 'messages', 'admin', true, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('010a0e5a-61f6-4b75-8224-c218302621e8', 'b2222222-2222-2222-2222-222222222222', 'messages', 'receptionist', true, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('358d3f70-aa8e-4141-b9ef-adf3449ca966', 'b2222222-2222-2222-2222-222222222222', 'messages', 'specialist', false, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('65ceb63b-f339-48f2-ae8f-5e3cffb14f2b', 'b2222222-2222-2222-2222-222222222222', 'bulkwa', 'doctor', true, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('1c53783a-12ba-4be0-bef5-9869a4fa43f6', 'b2222222-2222-2222-2222-222222222222', 'bulkwa', 'admin', true, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('89bd3be3-2f63-4f98-a0a9-5b80f4f67455', 'b2222222-2222-2222-2222-222222222222', 'bulkwa', 'receptionist', false, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('3c906aeb-25c0-4684-954f-ad854b276266', 'b2222222-2222-2222-2222-222222222222', 'bulkwa', 'specialist', false, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('f7076e87-cb81-41b2-8148-8c87f11f102d', 'b2222222-2222-2222-2222-222222222222', 'settings', 'doctor', true, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('b7c4aa36-5545-46b5-a83a-74c769f3f581', 'b2222222-2222-2222-2222-222222222222', 'settings', 'admin', true, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('f4d1b8d2-cf35-4f94-9f6a-8ac3b6c5fe64', 'b2222222-2222-2222-2222-222222222222', 'settings', 'receptionist', false, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('9459bd5e-a222-423c-86b9-8ebe508bdc71', 'b2222222-2222-2222-2222-222222222222', 'settings', 'specialist', false, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('0e6c3a13-1e0d-449e-894b-2ac7c9f117b3', 'a1111111-1111-1111-1111-111111111111', 'mypractice', 'specialist', true, '2026-06-20 09:44:51.841404+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('ed0b74d3-bb43-4035-8bd5-6ae8737b859d', 'a1111111-1111-1111-1111-111111111111', 'mypractice', 'doctor', false, '2026-06-20 09:44:51.841404+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('6dca3c5f-8c3d-4b35-9a7b-be926c05ea00', 'a1111111-1111-1111-1111-111111111111', 'mypractice', 'admin', false, '2026-06-20 09:44:51.841404+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('43d10a5a-4464-4b81-80f6-97a47895c38b', 'a1111111-1111-1111-1111-111111111111', 'mypractice', 'receptionist', false, '2026-06-20 09:44:51.841404+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('cde23692-7e31-4bd2-8c64-4f19f02b14c0', 'a1111111-1111-1111-1111-111111111111', 'workshop', 'specialist', false, '2026-06-20 09:44:51.841404+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('377a9385-b9ea-461d-bff9-ddb0c17ef0dd', 'a1111111-1111-1111-1111-111111111111', 'revenue', 'specialist', false, '2026-06-20 09:44:51.841404+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('8c461225-9e9e-45d8-9777-ef148acc624a', 'a1111111-1111-1111-1111-111111111111', 'archived', 'specialist', false, '2026-06-20 09:44:51.841404+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('0fa08f5a-f029-4f3e-bc28-c2f974cb6e05', 'b2222222-2222-2222-2222-222222222222', 'mypractice', 'specialist', true, '2026-06-20 09:44:51.841404+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('21fc9cdd-b144-4476-bb9e-77e5a8090886', 'b2222222-2222-2222-2222-222222222222', 'mypractice', 'doctor', false, '2026-06-20 09:44:51.841404+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('e17bc312-3cd5-4a29-a2e0-f38c3915d687', 'b2222222-2222-2222-2222-222222222222', 'mypractice', 'admin', false, '2026-06-20 09:44:51.841404+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('1d5a421d-a431-4b03-ad35-db17ca4cf9de', 'b2222222-2222-2222-2222-222222222222', 'mypractice', 'receptionist', false, '2026-06-20 09:44:51.841404+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('4a150604-1cda-4c3d-aeba-f506e232afbc', 'b2222222-2222-2222-2222-222222222222', 'workshop', 'specialist', false, '2026-06-20 09:44:51.841404+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('330d87a5-accd-4f57-acd3-1285adaf25ff', 'b2222222-2222-2222-2222-222222222222', 'revenue', 'specialist', false, '2026-06-20 09:44:51.841404+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('36d3e120-522c-4a4a-b7ca-cf2dad7d5dd6', 'b2222222-2222-2222-2222-222222222222', 'archived', 'specialist', false, '2026-06-20 09:44:51.841404+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('c8ca0d16-c0e3-44bb-b544-d77f4735e1d6', 'b2222222-2222-2222-2222-222222222222', 'dashboard', 'specialist', true, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('a36bcf5d-068a-44cd-92fc-3a2323a111fd', 'b2222222-2222-2222-2222-222222222222', 'queue', 'specialist', true, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('cb27d5d9-f049-4911-8c03-f400dbaac2a7', 'b2222222-2222-2222-2222-222222222222', 'patients', 'specialist', true, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('91f1bb54-651d-4450-8b62-67771404f4bd', 'b2222222-2222-2222-2222-222222222222', 'lab', 'specialist', true, '2026-06-19 13:02:05.632527+05:30', NULL);
INSERT INTO public.module_visibility VALUES ('ddae95e9-4e02-4392-a2de-686c93085de9', 'a1111111-1111-1111-1111-111111111111', 'dashboard', 'doctor', true, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('8b442579-4ccd-47b5-803c-64a629a8c584', 'a1111111-1111-1111-1111-111111111111', 'appointments', 'doctor', true, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('c5e8c982-3a10-4806-b090-92647927d5b2', 'a1111111-1111-1111-1111-111111111111', 'patients', 'doctor', true, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('8dd39105-953c-48b4-9f3c-3cf6f8cdd2c9', 'a1111111-1111-1111-1111-111111111111', 'queue', 'doctor', true, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('84fea5eb-cdca-443d-949d-ac3544485273', 'a1111111-1111-1111-1111-111111111111', 'kanban', 'doctor', true, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('ec1b1381-b809-4fba-9111-37efd362b94f', 'a1111111-1111-1111-1111-111111111111', 'billing', 'doctor', true, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('9d45a5ce-f497-41fd-bac6-adacef744523', 'a1111111-1111-1111-1111-111111111111', 'medicines', 'doctor', true, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('4bfc6875-b36e-444a-8867-a8751f6e0282', 'a1111111-1111-1111-1111-111111111111', 'procedures', 'doctor', true, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('3ad1a727-fa59-45ed-90ef-231fde7a9dc8', 'a1111111-1111-1111-1111-111111111111', 'lab', 'doctor', true, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('a835d74f-aeae-4e46-940c-5204a4af80b5', 'a1111111-1111-1111-1111-111111111111', 'counters', 'doctor', true, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('e1f58e1b-0821-4684-81bf-6d5f588870cb', 'a1111111-1111-1111-1111-111111111111', 'specialists', 'doctor', true, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('7f1c53f9-cb6e-4d2d-8d5e-7a0f94025f4c', 'a1111111-1111-1111-1111-111111111111', 'staff', 'doctor', true, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('69dd5202-855e-44ec-845b-3c3a7a75a7e1', 'a1111111-1111-1111-1111-111111111111', 'gallery', 'doctor', true, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('2d8887dd-7ce2-4fc6-bbc6-7196df3724e7', 'a1111111-1111-1111-1111-111111111111', 'website', 'doctor', true, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('3530b4b7-0bbc-40dd-bb76-3cb666ca0d67', 'a1111111-1111-1111-1111-111111111111', 'consult', 'doctor', true, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('99ee23e7-00b0-4361-89f3-4d149a5c4d11', 'a1111111-1111-1111-1111-111111111111', 'messages', 'doctor', true, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('102c2312-42b4-4830-8aa7-604df2f6e537', 'a1111111-1111-1111-1111-111111111111', 'bulkwa', 'doctor', true, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('ef1cfe24-12bd-4362-96b2-70450eb6576d', 'a1111111-1111-1111-1111-111111111111', 'settings', 'doctor', true, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('d543d447-b482-47a4-96bb-bb4c6e792621', 'a1111111-1111-1111-1111-111111111111', 'dashboard', 'admin', true, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('f3264bb2-f3bd-401c-b588-db02b06e3a69', 'a1111111-1111-1111-1111-111111111111', 'appointments', 'admin', true, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('036cb4c8-a9b8-4a9b-b802-fa6a64c02fc4', 'a1111111-1111-1111-1111-111111111111', 'patients', 'admin', true, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('fdd0e8da-422a-4305-b0a6-9236c733a422', 'a1111111-1111-1111-1111-111111111111', 'queue', 'admin', true, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('b3f6d19d-1c95-4c4e-a005-397e16ca5a2a', 'a1111111-1111-1111-1111-111111111111', 'kanban', 'admin', true, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('c18403a7-663b-4cb4-ad75-2c5f61681398', 'a1111111-1111-1111-1111-111111111111', 'billing', 'admin', true, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('ac0e030b-9dfa-4d58-b3e4-06ea2503fc66', 'a1111111-1111-1111-1111-111111111111', 'medicines', 'admin', true, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('591032ba-cf24-45bb-82fe-ffba9014c9d4', 'a1111111-1111-1111-1111-111111111111', 'procedures', 'admin', true, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('f0bf2b1e-53ec-41f2-9177-fac2d657bc64', 'a1111111-1111-1111-1111-111111111111', 'lab', 'admin', true, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('bd1a152c-a3db-4eb3-8105-03af07c11c21', 'a1111111-1111-1111-1111-111111111111', 'counters', 'admin', true, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('0152453d-7a6f-4677-875d-9fdf357422e6', 'a1111111-1111-1111-1111-111111111111', 'specialists', 'admin', true, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('ae713e33-aa50-4380-9157-c89d0fd5790f', 'a1111111-1111-1111-1111-111111111111', 'staff', 'admin', true, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('4976b8fb-ba38-4f7e-856e-202c581bbc13', 'a1111111-1111-1111-1111-111111111111', 'gallery', 'admin', true, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('ea05ca45-f266-475f-b02e-aec762f38296', 'a1111111-1111-1111-1111-111111111111', 'website', 'admin', true, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('09b7d5f8-18f1-4244-aef5-d75674fd4d8d', 'a1111111-1111-1111-1111-111111111111', 'consult', 'admin', true, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('c51fd7ee-9b8b-4671-a3d8-d6b013cd11c0', 'a1111111-1111-1111-1111-111111111111', 'messages', 'admin', true, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('80a01e6d-beea-48ae-a8fc-f1fdb5250606', 'a1111111-1111-1111-1111-111111111111', 'bulkwa', 'admin', true, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('c9887ff4-2fda-4698-9f3e-46cefe438cd5', 'a1111111-1111-1111-1111-111111111111', 'settings', 'admin', true, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('242037a8-fcda-47e8-9f7d-621196d96d6e', 'a1111111-1111-1111-1111-111111111111', 'dashboard', 'receptionist', false, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('900d92b7-f0f0-48de-bd38-3b8b8cdd04d7', 'a1111111-1111-1111-1111-111111111111', 'appointments', 'receptionist', true, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('32be5996-2a03-472d-bc40-658a594371a9', 'a1111111-1111-1111-1111-111111111111', 'patients', 'receptionist', false, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('2c1a931b-ef1e-43c8-a90d-ae60230629c9', 'a1111111-1111-1111-1111-111111111111', 'queue', 'receptionist', false, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('6d47ef00-632b-4049-b7a8-1411a972420d', 'a1111111-1111-1111-1111-111111111111', 'kanban', 'receptionist', false, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('3dfda049-7d33-42ad-9edc-0b29c5befef2', 'a1111111-1111-1111-1111-111111111111', 'billing', 'receptionist', false, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('8729d3a2-00f4-4551-b744-392e19e386a4', 'a1111111-1111-1111-1111-111111111111', 'medicines', 'receptionist', false, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('7c2d6b5c-d73f-44d0-8bbb-1923caef0a03', 'a1111111-1111-1111-1111-111111111111', 'procedures', 'receptionist', false, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('6993a64f-24dd-4c9c-8b7e-16202a090214', 'a1111111-1111-1111-1111-111111111111', 'lab', 'receptionist', true, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('70499588-1075-4d17-9588-8f93adb288f1', 'a1111111-1111-1111-1111-111111111111', 'counters', 'receptionist', false, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('fcbcfe57-6678-45e8-b103-59b95ba16720', 'a1111111-1111-1111-1111-111111111111', 'specialists', 'receptionist', false, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('6eaeef59-5b23-49fd-a84b-e5a4097eabad', 'a1111111-1111-1111-1111-111111111111', 'staff', 'receptionist', false, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('bcf6258e-a927-444a-b124-29dfdd552fc7', 'a1111111-1111-1111-1111-111111111111', 'gallery', 'receptionist', false, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('1e1efb03-02e6-4cf8-9583-63591ae5459d', 'a1111111-1111-1111-1111-111111111111', 'website', 'receptionist', false, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('4217fb4b-2477-47f9-97c7-6c0aab891c94', 'a1111111-1111-1111-1111-111111111111', 'consult', 'receptionist', false, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('82c74758-6065-49a6-a7e4-026b75718890', 'a1111111-1111-1111-1111-111111111111', 'messages', 'receptionist', false, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('8872471c-a9c7-4aae-840e-70826c1a6a87', 'a1111111-1111-1111-1111-111111111111', 'bulkwa', 'receptionist', false, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('cad01fd4-216c-480a-b4a2-2692ec945164', 'a1111111-1111-1111-1111-111111111111', 'settings', 'receptionist', false, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('1482304d-eb36-4a74-89d7-53887bb60da8', 'a1111111-1111-1111-1111-111111111111', 'dashboard', 'specialist', false, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('ed5d0597-983c-4b13-a3a1-4496b02d29ba', 'a1111111-1111-1111-1111-111111111111', 'appointments', 'specialist', false, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('3f3b9437-b3bd-49c9-88f3-62b56fa0963b', 'a1111111-1111-1111-1111-111111111111', 'patients', 'specialist', true, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('453a5bd0-b644-4c2d-9731-227e12424aff', 'a1111111-1111-1111-1111-111111111111', 'queue', 'specialist', true, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('478e7f9f-6127-49a1-8144-2013e43907cc', 'a1111111-1111-1111-1111-111111111111', 'kanban', 'specialist', false, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('668c9e3b-cc98-4de0-92b7-c4e8fc4b7645', 'a1111111-1111-1111-1111-111111111111', 'billing', 'specialist', false, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('7b02270e-2950-45b2-b23e-5065d54c8856', 'a1111111-1111-1111-1111-111111111111', 'medicines', 'specialist', false, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('2b75e07c-bac9-4035-82d0-822258235e53', 'a1111111-1111-1111-1111-111111111111', 'procedures', 'specialist', false, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('05bc3b5d-2021-4d28-bae3-8474f8937d61', 'a1111111-1111-1111-1111-111111111111', 'lab', 'specialist', false, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('d0fdb16c-a99f-4ef3-ba10-779fc944f368', 'a1111111-1111-1111-1111-111111111111', 'counters', 'specialist', false, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('626c5116-26fb-4c5d-90a2-112563bcbf52', 'a1111111-1111-1111-1111-111111111111', 'specialists', 'specialist', false, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('036cc17d-f633-4062-ac50-8770c3e6f899', 'a1111111-1111-1111-1111-111111111111', 'staff', 'specialist', false, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('cb9ea2e3-f6e6-4b11-b7fa-0a062dd7dfcf', 'a1111111-1111-1111-1111-111111111111', 'gallery', 'specialist', false, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('d3ef6290-dfae-4868-ab7e-1dd6e0efc5dd', 'a1111111-1111-1111-1111-111111111111', 'website', 'specialist', false, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('0ba3f84d-de1b-43e5-8619-75df5e746da2', 'a1111111-1111-1111-1111-111111111111', 'consult', 'specialist', false, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('a04476ba-2026-4237-be46-6d3cd44f3d27', 'a1111111-1111-1111-1111-111111111111', 'messages', 'specialist', false, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('efc44a26-e197-4477-bfec-a20229c65529', 'a1111111-1111-1111-1111-111111111111', 'bulkwa', 'specialist', false, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.module_visibility VALUES ('d2de184c-a6d0-474b-a599-3b8758b4e980', 'a1111111-1111-1111-1111-111111111111', 'settings', 'specialist', false, '2026-06-21 11:16:38.238511+05:30', 'd1111111-1111-1111-1111-111111111111');


--
-- Data for Name: patient_credits; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: patient_health; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.patient_health VALUES ('34755979-1ee5-40a6-a3a2-c852313dba75', '10000000-0000-4000-8000-000000000101', false, false, false, false, false, false, false, false, false, '', '', '', false, false, '', '2026-06-20 22:37:56.619243+05:30');
INSERT INTO public.patient_health VALUES ('f02b8a36-491d-418a-88a7-b4c56599234b', '10000000-0000-4000-8000-000000000102', true, false, false, false, false, false, false, false, false, '', '', 'Metformin', false, false, '', '2026-06-20 22:37:56.619243+05:30');
INSERT INTO public.patient_health VALUES ('9504e379-1219-4e78-8020-53ed6d6bf3ae', '10000000-0000-4000-8000-000000000103', false, true, false, false, false, false, false, false, false, 'Penicillin', '', 'Amlodipine', false, false, '', '2026-06-20 22:37:56.619243+05:30');
INSERT INTO public.patient_health VALUES ('a4387de7-55b1-4af5-8646-b535f0fea4d1', '10000000-0000-4000-8000-000000000104', false, false, false, false, false, false, false, false, false, '', '', '', false, false, '', '2026-06-20 22:37:56.619243+05:30');


--
-- Data for Name: patient_images; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: patient_portal_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.patient_portal_tokens VALUES ('4c155a01-600e-47d4-a53e-99a3909d8f5e', '10000000-0000-4000-8000-000000000102', 'KAKncL829Imm7NrNiG3Bhni10U9F8KcWP1Re2zvgMMo', '2026-07-22 16:51:26.315209+05:30', 0, NULL, '2026-06-22 22:21:26.31724+05:30');


--
-- Data for Name: patient_ratings; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: patient_uploads; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: patients; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.patients VALUES ('10000000-0000-4000-8000-000000000102', 'Rohan Gupta', '9876500102', 35, 'Male', NULL, NULL, 'a1111111-1111-1111-1111-111111111111', 0, '{}', '2026-06-20 22:37:56.401044+05:30', '2026-06-20 22:37:56.401044+05:30', true, false, NULL, false, '["Diabetes"]', NULL, NULL);
INSERT INTO public.patients VALUES ('10000000-0000-4000-8000-000000000104', 'Arjun Rao', '9876500104', 24, 'Male', NULL, NULL, 'a1111111-1111-1111-1111-111111111111', 0, '{}', '2026-06-20 22:37:56.401044+05:30', '2026-06-20 22:37:56.401044+05:30', true, false, NULL, false, '[]', NULL, NULL);
INSERT INTO public.patients VALUES ('10000000-0000-4000-8000-000000000101', 'Asha Verma', '9876500101', 29, 'Female', NULL, NULL, 'a1111111-1111-1111-1111-111111111111', 3, '{}', '2026-06-20 22:37:56.401044+05:30', '2026-06-20 22:37:56.401044+05:30', true, false, NULL, false, '["Sensitive teeth"]', NULL, '9876501101');
INSERT INTO public.patients VALUES ('10000000-0000-4000-8000-000000000103', 'Meera Nair', '9876500103', 41, 'Female', NULL, NULL, 'a1111111-1111-1111-1111-111111111111', 4, '{}', '2026-06-20 22:37:56.401044+05:30', '2026-06-20 22:37:56.401044+05:30', true, false, NULL, false, '["Hypertension"]', '', '9876501103');
INSERT INTO public.patients VALUES ('257303ab-e6d0-49d0-9caf-e058550c7edf', 'po', '1111111111', NULL, NULL, NULL, NULL, 'a1111111-1111-1111-1111-111111111111', 0, '{}', '2026-06-26 14:13:23.995913+05:30', '2026-06-26 14:13:23.995913+05:30', true, false, NULL, false, '[]', NULL, NULL);
INSERT INTO public.patients VALUES ('603dbe2c-3457-41f5-8d10-6b7eaf048f60', 'Wire Test', '9876512345', NULL, NULL, NULL, NULL, 'a1111111-1111-1111-1111-111111111111', 0, '{}', '2026-06-26 14:14:46.044101+05:30', '2026-06-26 14:14:46.044101+05:30', true, false, NULL, false, '[]', NULL, NULL);
INSERT INTO public.patients VALUES ('a66056ff-c50f-4987-815f-a0a10af78e60', 'Test Patient', '9999999999', NULL, NULL, NULL, NULL, 'a1111111-1111-1111-1111-111111111111', 0, '{}', '2026-06-26 14:15:44.222211+05:30', '2026-06-26 14:15:44.222211+05:30', true, false, NULL, false, '[]', NULL, NULL);


--
-- Data for Name: payment_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.payment_transactions VALUES ('e62ab2cd-b596-46ec-9605-3a7c8ee77fa3', '10000000-0000-4000-8000-000000000101', NULL, NULL, 'a1111111-1111-1111-1111-111111111111', 500.00, 'card', NULL, NULL, NULL, false, '2026-06-20', '2026-06-20 22:40:47.484261+05:30', NULL, NULL);
INSERT INTO public.payment_transactions VALUES ('1aceac96-7aa9-4e35-8ccb-18b28c7ef050', '10000000-0000-4000-8000-000000000101', NULL, NULL, 'a1111111-1111-1111-1111-111111111111', 100.00, 'card', NULL, NULL, NULL, false, '2026-06-20', '2026-06-20 22:42:22.22418+05:30', NULL, NULL);
INSERT INTO public.payment_transactions VALUES ('12fa4468-9222-4469-9fec-06d2a0ce27f8', '10000000-0000-4000-8000-000000000103', NULL, NULL, 'a1111111-1111-1111-1111-111111111111', 500.00, 'cash', NULL, NULL, NULL, false, '2026-06-20', '2026-06-20 23:47:44.689168+05:30', NULL, NULL);


--
-- Data for Name: phone_consultations; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: plan_revisions; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.plan_revisions VALUES ('2e6f2471-2fbf-4ff5-87d2-ecd4374f1931', '61eb2c08-1283-4f7d-b43c-fed25b06407c', 1, 'Added Specialist flow verification Specialist work — ₹0', '{"action": "add", "item_id": "c3a950cd-72dd-4a2c-97e8-21fdaf02f46a"}', '07e07975-94d7-4c30-8a71-7e75f420092f', '2026-06-20 17:59:55.269947');
INSERT INTO public.plan_revisions VALUES ('56f9ea36-2ce6-4259-bc27-482e88e16580', '20000000-0000-4000-8000-000000000101', 1, 'Added Bridge (per unit) 42 — ₹5,000', '{"action": "add", "item_id": "7b8627a9-1738-4de2-8efa-f235afa5bb86"}', '07e07975-94d7-4c30-8a71-7e75f420092f', '2026-06-20 22:39:34.55124');
INSERT INTO public.plan_revisions VALUES ('fc2a76ec-309e-4d65-805c-a3ba5720f5cb', '20000000-0000-4000-8000-000000000103', 1, 'Added Scaling 12 — ₹0', '{"action": "add", "item_id": "7ba33b0d-e332-4fbc-bce6-704542edbe2a"}', 'd1111111-1111-1111-1111-111111111111', '2026-06-20 23:38:58.007886');
INSERT INTO public.plan_revisions VALUES ('c4688de3-ca5f-4667-99fb-6d90c9f102c4', '20000000-0000-4000-8000-000000000103', 2, 'Added Scaling 11 — ₹0', '{"action": "add", "item_id": "dfc2ffcd-177a-4b5e-8998-d2540152a91e"}', 'd1111111-1111-1111-1111-111111111111', '2026-06-20 23:39:07.518449');
INSERT INTO public.plan_revisions VALUES ('a651b42d-af26-41eb-a0db-dd83b5267df8', '20000000-0000-4000-8000-000000000103', 3, 'Updated Bridge (per unit) 12 (rate ₹5,000, teeth 12)', '{"action": "edit", "item_id": "7ba33b0d-e332-4fbc-bce6-704542edbe2a"}', 'd1111111-1111-1111-1111-111111111111', '2026-06-20 23:40:01.399346');
INSERT INTO public.plan_revisions VALUES ('2606005b-b88f-42b3-a84c-62dbfc0c670a', '20000000-0000-4000-8000-000000000103', 4, 'Removed Scaling 11', '{"action": "delete", "item_id": "dfc2ffcd-177a-4b5e-8998-d2540152a91e"}', 'd1111111-1111-1111-1111-111111111111', '2026-06-20 23:40:24.422086');
INSERT INTO public.plan_revisions VALUES ('6c5689d8-6736-4e5a-a1cb-90264b3071db', '20000000-0000-4000-8000-000000000103', 5, 'Added Bridge (per unit) 11 — ₹5,000', '{"action": "add", "item_id": "e45dda86-03bf-4882-951a-a7a38548b9eb"}', 'd1111111-1111-1111-1111-111111111111', '2026-06-20 23:40:39.115034');
INSERT INTO public.plan_revisions VALUES ('eb59ff4a-fe67-41d3-ae79-f66a6bb3de07', '20000000-0000-4000-8000-000000000103', 6, 'Duplicated Bridge (per unit) 12', '{"action": "duplicate", "item_id": "ab36bd0a-0aef-4770-bc8e-38aa0619fa6a"}', 'd1111111-1111-1111-1111-111111111111', '2026-06-20 23:40:48.915835');
INSERT INTO public.plan_revisions VALUES ('907a1fed-a355-4989-8f70-0073eed1b2cf', '20000000-0000-4000-8000-000000000103', 7, 'Updated Crown - PFM 12 (teeth 12)', '{"action": "edit", "item_id": "ab36bd0a-0aef-4770-bc8e-38aa0619fa6a"}', 'd1111111-1111-1111-1111-111111111111', '2026-06-20 23:41:01.90721');
INSERT INTO public.plan_revisions VALUES ('a74190e8-0b72-41ea-b1a0-0aade78a67a3', '20000000-0000-4000-8000-000000000103', 8, 'Visit: Tooth Preparation (Bridge (per unit) 11); Impression (Bridge (per unit) 11)', '{"session_id": "ed98d664-efe0-4473-8f32-7db50ab4011a"}', 'd1111111-1111-1111-1111-111111111111', '2026-06-20 23:47:00.476725');
INSERT INTO public.plan_revisions VALUES ('ecf7b5c3-ea0e-430f-90ad-156b10211bc3', '20000000-0000-4000-8000-000000000102', 1, 'Added RCT 28 — ₹0', '{"action": "add", "item_id": "6a6d36e6-cb2c-4d2c-b2ef-3d07fbef737a"}', 'd1111111-1111-1111-1111-111111111111', '2026-06-21 00:43:21.664884');
INSERT INTO public.plan_revisions VALUES ('5df6dd7e-9bbb-4f42-8bac-26cd55515721', '20000000-0000-4000-8000-000000000102', 2, 'Added Filling 11 — ₹0', '{"action": "add", "item_id": "a9c40434-4308-4553-a208-1333941f43fb"}', 'd1111111-1111-1111-1111-111111111111', '2026-06-21 00:43:29.956431');
INSERT INTO public.plan_revisions VALUES ('c3aa1821-3352-41d2-bccd-e724949d9725', '20000000-0000-4000-8000-000000000102', 3, 'Added Flap Surgery 12 — ₹5,000', '{"action": "add", "item_id": "92e3947b-b68c-425a-9943-98bdf961ec03"}', 'd1111111-1111-1111-1111-111111111111', '2026-06-22 22:40:48.422771');
INSERT INTO public.plan_revisions VALUES ('e980979d-ee1c-46ce-baa7-b3ba16267384', '20000000-0000-4000-8000-000000000102', 4, 'Added Root Canal (RCT) 12 — ₹5,000', '{"action": "add", "item_id": "a99f187d-c151-44d7-98b7-104b41a2cbc6"}', 'd1111111-1111-1111-1111-111111111111', '2026-06-22 22:40:52.202579');
INSERT INTO public.plan_revisions VALUES ('4249c9a1-86ba-4c3b-8f04-b89550ec22b1', '550b58b6-4578-4209-b119-33692846a430', 1, 'Added Root Canal (RCT) 33 — ₹5,000', '{"action": "add", "item_id": "84c9d3d7-525a-4ca4-9b2c-0afd251f71d3"}', 'd1111111-1111-1111-1111-111111111111', '2026-07-06 13:30:46.050012');
INSERT INTO public.plan_revisions VALUES ('37cfdafb-f8e4-41c2-a27f-c5af4f59ca78', '550b58b6-4578-4209-b119-33692846a430', 2, 'Added Scaling 33 — ₹0', '{"action": "add", "item_id": "8f9ea39e-2e29-43b5-861d-33268ffe8daa"}', 'd1111111-1111-1111-1111-111111111111', '2026-07-06 13:31:29.536116');
INSERT INTO public.plan_revisions VALUES ('ad05a216-60aa-4e02-8710-8d942c54ea69', '550b58b6-4578-4209-b119-33692846a430', 3, 'Added Flap Surgery 33 — ₹5,000', '{"action": "add", "item_id": "1ef79770-9387-4d22-9221-4724cc69e438"}', 'd1111111-1111-1111-1111-111111111111', '2026-07-06 13:31:34.227035');
INSERT INTO public.plan_revisions VALUES ('6142bd42-d806-438a-845f-e0ecb18791a4', '550b58b6-4578-4209-b119-33692846a430', 4, 'Added Braces - Metal 32 — ₹35,000', '{"action": "add", "item_id": "1e0d53fb-2355-47ef-ac50-b514209a960a"}', 'd1111111-1111-1111-1111-111111111111', '2026-07-06 13:52:18.637523');
INSERT INTO public.plan_revisions VALUES ('b1c41ba3-281d-486d-92f4-7a3d16c069dd', '550b58b6-4578-4209-b119-33692846a430', 5, 'Removed Braces - Metal 32', '{"action": "delete", "item_id": "1e0d53fb-2355-47ef-ac50-b514209a960a"}', 'd1111111-1111-1111-1111-111111111111', '2026-07-06 13:53:05.701503');
INSERT INTO public.plan_revisions VALUES ('6e75dfb1-9cb4-4fa4-9d74-67fb7a8b85ac', '550b58b6-4578-4209-b119-33692846a430', 6, 'Added Complete Denture 21 — ₹10,000', '{"action": "add", "item_id": "92749342-a2c3-47f0-9e23-b3f607a70523"}', 'd1111111-1111-1111-1111-111111111111', '2026-07-06 14:16:47.15974');
INSERT INTO public.plan_revisions VALUES ('eeb31a31-adc3-483b-b38a-cbfd414495b0', '550b58b6-4578-4209-b119-33692846a430', 7, 'Added Crown - Zirconia 21 — ₹10,000', '{"action": "add", "item_id": "42f1dd81-38a1-46d1-982d-497aea0d8d22"}', 'd1111111-1111-1111-1111-111111111111', '2026-07-06 14:16:52.530466');
INSERT INTO public.plan_revisions VALUES ('ac11780e-2b80-40d0-83ba-e6e5f2ca8747', '550b58b6-4578-4209-b119-33692846a430', 8, 'Added Dressing 21 — ₹300', '{"action": "add", "item_id": "ad671553-2ab2-487f-9f7e-a68cbcd6f9a1"}', 'd1111111-1111-1111-1111-111111111111', '2026-07-06 14:16:55.114016');
INSERT INTO public.plan_revisions VALUES ('6ed33d33-a84a-44c0-ad56-301dfa6f7b22', '550b58b6-4578-4209-b119-33692846a430', 9, 'Added Flap Surgery 22 — ₹5,000', '{"action": "add", "item_id": "9e5ac1bf-2d82-4125-9ca7-741898d1542b"}', 'd1111111-1111-1111-1111-111111111111', '2026-07-06 14:41:27.846696');
INSERT INTO public.plan_revisions VALUES ('bd69c785-e4ec-457d-9105-4670273bd08a', '550b58b6-4578-4209-b119-33692846a430', 10, 'Updated Root Canal (RCT) 13,33 (rate ₹10,000, teeth 13,33)', '{"action": "edit", "item_id": "84c9d3d7-525a-4ca4-9b2c-0afd251f71d3"}', 'd1111111-1111-1111-1111-111111111111', '2026-07-06 14:51:03.649529');
INSERT INTO public.plan_revisions VALUES ('f0be7f70-d330-47b5-a98b-9627d69fe651', '550b58b6-4578-4209-b119-33692846a430', 11, 'Updated Root Canal (RCT) 13 (rate ₹5,000, teeth 13)', '{"action": "edit", "item_id": "84c9d3d7-525a-4ca4-9b2c-0afd251f71d3"}', 'd1111111-1111-1111-1111-111111111111', '2026-07-06 14:51:10.89774');
INSERT INTO public.plan_revisions VALUES ('87ebe2e8-66c5-4dac-baea-d51b5c64cbfa', '550b58b6-4578-4209-b119-33692846a430', 12, 'Updated Root Canal (RCT) 13', '{"action": "edit", "item_id": "84c9d3d7-525a-4ca4-9b2c-0afd251f71d3"}', 'd1111111-1111-1111-1111-111111111111', '2026-07-06 15:34:31.501336');
INSERT INTO public.plan_revisions VALUES ('bf463ae8-75b6-4124-ab7a-b189076ad924', '550b58b6-4578-4209-b119-33692846a430', 13, 'Updated Root Canal (RCT) 13 (marked completed)', '{"action": "edit", "item_id": "84c9d3d7-525a-4ca4-9b2c-0afd251f71d3"}', 'd1111111-1111-1111-1111-111111111111', '2026-07-06 15:34:33.017214');
INSERT INTO public.plan_revisions VALUES ('6478b90e-aba2-4a4a-8008-c135a8dc048f', '550b58b6-4578-4209-b119-33692846a430', 14, 'Updated Root Canal (RCT) 13', '{"action": "edit", "item_id": "84c9d3d7-525a-4ca4-9b2c-0afd251f71d3"}', 'd1111111-1111-1111-1111-111111111111', '2026-07-06 15:34:33.817082');
INSERT INTO public.plan_revisions VALUES ('c51f5f41-8a90-4483-b5cd-be04ce2200f2', '550b58b6-4578-4209-b119-33692846a430', 15, 'Updated Root Canal (RCT) 13', '{"action": "edit", "item_id": "84c9d3d7-525a-4ca4-9b2c-0afd251f71d3"}', 'd1111111-1111-1111-1111-111111111111', '2026-07-06 15:34:49.522683');
INSERT INTO public.plan_revisions VALUES ('f7d37851-05a0-4d0a-ac55-3d397b38c8ac', '550b58b6-4578-4209-b119-33692846a430', 16, 'Updated Scaling 33', '{"action": "edit", "item_id": "8f9ea39e-2e29-43b5-861d-33268ffe8daa"}', 'd1111111-1111-1111-1111-111111111111', '2026-07-06 17:31:06.718068');
INSERT INTO public.plan_revisions VALUES ('c0d66da1-f9cb-46ae-bcd5-15746f176876', '550b58b6-4578-4209-b119-33692846a430', 17, 'Removed Flap Surgery 33', '{"action": "delete", "item_id": "1ef79770-9387-4d22-9221-4724cc69e438"}', 'd1111111-1111-1111-1111-111111111111', '2026-07-06 18:52:16.659433');
INSERT INTO public.plan_revisions VALUES ('3c72a60b-2f4e-4eb1-92e1-45b380e6a699', '550b58b6-4578-4209-b119-33692846a430', 18, 'Updated Crown - Zirconia 21', '{"action": "edit", "item_id": "42f1dd81-38a1-46d1-982d-497aea0d8d22"}', 'd1111111-1111-1111-1111-111111111111', '2026-07-06 19:13:58.671281');
INSERT INTO public.plan_revisions VALUES ('693adc76-31c0-45e0-ba96-d4000198dd8a', '550b58b6-4578-4209-b119-33692846a430', 19, 'Updated Dressing 21', '{"action": "edit", "item_id": "ad671553-2ab2-487f-9f7e-a68cbcd6f9a1"}', 'd1111111-1111-1111-1111-111111111111', '2026-07-06 19:14:00.586829');
INSERT INTO public.plan_revisions VALUES ('28bc0511-e294-47bd-9187-d9f58aa1d057', '550b58b6-4578-4209-b119-33692846a430', 20, 'Updated Crown - Zirconia 21 (marked completed)', '{"action": "edit", "item_id": "42f1dd81-38a1-46d1-982d-497aea0d8d22"}', 'd1111111-1111-1111-1111-111111111111', '2026-07-06 19:14:01.76866');
INSERT INTO public.plan_revisions VALUES ('0dfe9b97-f330-4393-9660-17af15e151eb', '550b58b6-4578-4209-b119-33692846a430', 21, 'Updated Dressing 21 (marked completed)', '{"action": "edit", "item_id": "ad671553-2ab2-487f-9f7e-a68cbcd6f9a1"}', 'd1111111-1111-1111-1111-111111111111', '2026-07-06 19:14:02.425731');
INSERT INTO public.plan_revisions VALUES ('718d5e42-2b23-4702-abc7-253fa42ae049', '550b58b6-4578-4209-b119-33692846a430', 22, 'Updated Crown - Zirconia 21', '{"action": "edit", "item_id": "42f1dd81-38a1-46d1-982d-497aea0d8d22"}', 'd1111111-1111-1111-1111-111111111111', '2026-07-06 19:14:03.400619');
INSERT INTO public.plan_revisions VALUES ('3560a2b0-dec9-4b2d-a6fb-159257d87f31', '550b58b6-4578-4209-b119-33692846a430', 23, 'Updated Dressing 21', '{"action": "edit", "item_id": "ad671553-2ab2-487f-9f7e-a68cbcd6f9a1"}', 'd1111111-1111-1111-1111-111111111111', '2026-07-06 19:14:03.992632');
INSERT INTO public.plan_revisions VALUES ('652eff35-3601-4ba2-b29b-29b04fe359e7', '550b58b6-4578-4209-b119-33692846a430', 24, 'Added Scaling 18,17,16,15,14,13,12,11 — ₹0', '{"action": "add", "item_id": "7cbed7af-86fe-428c-bc39-3d3494d3b889"}', 'd1111111-1111-1111-1111-111111111111', '2026-07-06 19:39:57.836182');
INSERT INTO public.plan_revisions VALUES ('d40dcc7d-60ef-481c-875c-c9145e6cedeb', '550b58b6-4578-4209-b119-33692846a430', 25, 'Removed Scaling 18,17,16,15,14,13,12,11', '{"action": "delete", "item_id": "7cbed7af-86fe-428c-bc39-3d3494d3b889"}', 'd1111111-1111-1111-1111-111111111111', '2026-07-06 19:40:19.008476');
INSERT INTO public.plan_revisions VALUES ('5c62d458-892f-4804-92ca-30ac259c4c1d', '550b58b6-4578-4209-b119-33692846a430', 26, 'Removed Root Canal (RCT) 13', '{"action": "delete", "item_id": "84c9d3d7-525a-4ca4-9b2c-0afd251f71d3"}', 'd1111111-1111-1111-1111-111111111111', '2026-07-06 19:40:35.946562');
INSERT INTO public.plan_revisions VALUES ('976f5c9c-b8c1-493e-81b6-6a6ea2eeab68', '550b58b6-4578-4209-b119-33692846a430', 27, 'Added Filling - GIC 21 — ₹600', '{"action": "add", "item_id": "88016439-0fb1-45bf-adf1-ba04687b2d24"}', 'd1111111-1111-1111-1111-111111111111', '2026-07-06 20:04:13.676753');
INSERT INTO public.plan_revisions VALUES ('f0fdb484-a0db-439c-94af-cfd5f8754ed6', '550b58b6-4578-4209-b119-33692846a430', 30, 'Updated Crown - Zirconia 21 (marked completed)', '{"action": "edit", "item_id": "42f1dd81-38a1-46d1-982d-497aea0d8d22"}', 'd1111111-1111-1111-1111-111111111111', '2026-07-06 20:05:12.412811');
INSERT INTO public.plan_revisions VALUES ('cec580c3-fcf7-4140-b769-3b7b7e4e0e7f', '550b58b6-4578-4209-b119-33692846a430', 37, 'Updated Complete Denture 21', '{"action": "edit", "item_id": "92749342-a2c3-47f0-9e23-b3f607a70523"}', 'd1111111-1111-1111-1111-111111111111', '2026-07-06 20:16:50.893993');
INSERT INTO public.plan_revisions VALUES ('14bdf67f-40f1-408c-a9e2-578e5c06aeff', '550b58b6-4578-4209-b119-33692846a430', 40, 'Updated Flap Surgery 22', '{"action": "edit", "item_id": "9e5ac1bf-2d82-4125-9ca7-741898d1542b"}', 'd1111111-1111-1111-1111-111111111111', '2026-07-06 20:17:04.450495');
INSERT INTO public.plan_revisions VALUES ('3f9bde91-b7e5-4720-b0d7-2f9145af98a2', '550b58b6-4578-4209-b119-33692846a430', 28, 'Removed Filling - GIC 21', '{"action": "delete", "item_id": "88016439-0fb1-45bf-adf1-ba04687b2d24"}', 'd1111111-1111-1111-1111-111111111111', '2026-07-06 20:04:19.759785');
INSERT INTO public.plan_revisions VALUES ('2be90676-f028-4742-aae7-7c8b1bad1ea2', '550b58b6-4578-4209-b119-33692846a430', 31, 'Updated Crown - Zirconia 21', '{"action": "edit", "item_id": "42f1dd81-38a1-46d1-982d-497aea0d8d22"}', 'd1111111-1111-1111-1111-111111111111', '2026-07-06 20:05:13.930607');
INSERT INTO public.plan_revisions VALUES ('63a7c305-3956-4c47-b24c-873bf494fedf', '550b58b6-4578-4209-b119-33692846a430', 33, 'Updated RCT 21', '{"action": "edit", "item_id": "3cb851f6-5980-41dd-8c49-f433fb70a6b6"}', 'd1111111-1111-1111-1111-111111111111', '2026-07-06 20:07:33.529846');
INSERT INTO public.plan_revisions VALUES ('0c5b1735-6972-4e60-9417-dea86274ec26', '550b58b6-4578-4209-b119-33692846a430', 35, 'Updated RCT 21', '{"action": "edit", "item_id": "3cb851f6-5980-41dd-8c49-f433fb70a6b6"}', 'd1111111-1111-1111-1111-111111111111', '2026-07-06 20:09:37.243711');
INSERT INTO public.plan_revisions VALUES ('5076d7fa-d0fa-4ef3-8a71-5b8cc24581fa', '550b58b6-4578-4209-b119-33692846a430', 41, 'Updated Scaling 33 (rate ₹10)', '{"action": "edit", "item_id": "8f9ea39e-2e29-43b5-861d-33268ffe8daa"}', 'd1111111-1111-1111-1111-111111111111', '2026-07-06 20:17:10.374233');
INSERT INTO public.plan_revisions VALUES ('dadd0d31-f3bd-4afa-ab27-4917078cbad8', '550b58b6-4578-4209-b119-33692846a430', 29, 'Updated Crown - Zirconia 21', '{"action": "edit", "item_id": "42f1dd81-38a1-46d1-982d-497aea0d8d22"}', 'd1111111-1111-1111-1111-111111111111', '2026-07-06 20:05:11.629171');
INSERT INTO public.plan_revisions VALUES ('b3d6f5dd-a21b-4c47-bba8-e4b2b366c715', '550b58b6-4578-4209-b119-33692846a430', 32, 'Added RCT 21 — ₹0', '{"action": "add", "item_id": "3cb851f6-5980-41dd-8c49-f433fb70a6b6"}', 'd1111111-1111-1111-1111-111111111111', '2026-07-06 20:07:17.347936');
INSERT INTO public.plan_revisions VALUES ('00f3734d-f120-489d-80a4-52a71556b1c9', '550b58b6-4578-4209-b119-33692846a430', 34, 'Updated RCT 21', '{"action": "edit", "item_id": "3cb851f6-5980-41dd-8c49-f433fb70a6b6"}', 'd1111111-1111-1111-1111-111111111111', '2026-07-06 20:09:33.628218');
INSERT INTO public.plan_revisions VALUES ('84d59e63-0952-4a47-b60d-016088bfc900', '550b58b6-4578-4209-b119-33692846a430', 42, 'Updated RCT 21 (rate ₹10)', '{"action": "edit", "item_id": "3cb851f6-5980-41dd-8c49-f433fb70a6b6"}', 'd1111111-1111-1111-1111-111111111111', '2026-07-06 20:17:19.227437');
INSERT INTO public.plan_revisions VALUES ('bbdbdf69-4387-4822-82a0-94cdfd1bd7e4', '550b58b6-4578-4209-b119-33692846a430', 36, 'Updated RCT 21', '{"action": "edit", "item_id": "3cb851f6-5980-41dd-8c49-f433fb70a6b6"}', 'd1111111-1111-1111-1111-111111111111', '2026-07-06 20:09:51.317199');
INSERT INTO public.plan_revisions VALUES ('2051ed58-c1e5-4a9c-b753-b49cb973a47f', '550b58b6-4578-4209-b119-33692846a430', 38, 'Updated Crown - Zirconia 21', '{"action": "edit", "item_id": "42f1dd81-38a1-46d1-982d-497aea0d8d22"}', 'd1111111-1111-1111-1111-111111111111', '2026-07-06 20:16:52.930396');
INSERT INTO public.plan_revisions VALUES ('bb0cdcb2-5498-484b-816c-dae5123f8650', '550b58b6-4578-4209-b119-33692846a430', 39, 'Updated Dressing 21', '{"action": "edit", "item_id": "ad671553-2ab2-487f-9f7e-a68cbcd6f9a1"}', 'd1111111-1111-1111-1111-111111111111', '2026-07-06 20:16:55.307785');
INSERT INTO public.plan_revisions VALUES ('1fe8a9fe-7a98-464a-847e-bd86194f54b0', '550b58b6-4578-4209-b119-33692846a430', 43, 'Updated Scaling 33', '{"action": "edit", "item_id": "8f9ea39e-2e29-43b5-861d-33268ffe8daa"}', 'd1111111-1111-1111-1111-111111111111', '2026-07-06 20:17:35.660434');
INSERT INTO public.plan_revisions VALUES ('8a96fbed-b528-4773-a81b-d0fe579577ec', '550b58b6-4578-4209-b119-33692846a430', 44, 'Updated Flap Surgery 22', '{"action": "edit", "item_id": "9e5ac1bf-2d82-4125-9ca7-741898d1542b"}', 'd1111111-1111-1111-1111-111111111111', '2026-07-06 20:17:37.270838');
INSERT INTO public.plan_revisions VALUES ('7b297dd4-9cdc-4e38-895f-531199f13168', '550b58b6-4578-4209-b119-33692846a430', 45, 'Updated RCT 21', '{"action": "edit", "item_id": "3cb851f6-5980-41dd-8c49-f433fb70a6b6"}', 'd1111111-1111-1111-1111-111111111111', '2026-07-06 20:17:39.023843');
INSERT INTO public.plan_revisions VALUES ('25d32ec6-dafa-4396-9420-0ae5552f9edc', '550b58b6-4578-4209-b119-33692846a430', 46, 'Updated Dressing 21', '{"action": "edit", "item_id": "ad671553-2ab2-487f-9f7e-a68cbcd6f9a1"}', 'd1111111-1111-1111-1111-111111111111', '2026-07-06 20:17:39.891648');
INSERT INTO public.plan_revisions VALUES ('04d1829c-3484-4679-bbf9-31bce20af6e1', '550b58b6-4578-4209-b119-33692846a430', 47, 'Updated Crown - Zirconia 21', '{"action": "edit", "item_id": "42f1dd81-38a1-46d1-982d-497aea0d8d22"}', 'd1111111-1111-1111-1111-111111111111', '2026-07-06 20:17:40.659584');
INSERT INTO public.plan_revisions VALUES ('253c19c9-9fc4-4aa8-bc74-91223762c92e', '550b58b6-4578-4209-b119-33692846a430', 48, 'Updated Complete Denture 21', '{"action": "edit", "item_id": "92749342-a2c3-47f0-9e23-b3f607a70523"}', 'd1111111-1111-1111-1111-111111111111', '2026-07-06 20:17:41.433915');
INSERT INTO public.plan_revisions VALUES ('bc07ff81-cd96-4ebd-b4e1-c9ec42a0d9aa', '550b58b6-4578-4209-b119-33692846a430', 49, 'Added Extraction - Surgical 21 — ₹3,000', '{"action": "add", "item_id": "495069bd-4ce6-4f29-9e4e-031d98c9e410"}', 'd1111111-1111-1111-1111-111111111111', '2026-07-07 15:33:05.08937');
INSERT INTO public.plan_revisions VALUES ('316ba10e-9eeb-4ee2-b880-cfa676c4079f', '550b58b6-4578-4209-b119-33692846a430', 50, 'Added Extraction - Surgical 21 — ₹3,000', '{"action": "add", "item_id": "2ce2cd19-db20-4426-9e50-efc6bade0df2"}', 'd1111111-1111-1111-1111-111111111111', '2026-07-07 15:33:13.386187');
INSERT INTO public.plan_revisions VALUES ('4d7864a8-76d0-4ab7-9bd3-14cfa4b8106d', '550b58b6-4578-4209-b119-33692846a430', 51, 'Added Filling - Composite 21 — ₹1,200', '{"action": "add", "item_id": "30dbdfa1-647f-4af3-abe0-6bac29e4a85c"}', 'd1111111-1111-1111-1111-111111111111', '2026-07-07 15:33:29.360562');
INSERT INTO public.plan_revisions VALUES ('4071e144-fc01-4af5-846a-904f63847e8b', '550b58b6-4578-4209-b119-33692846a430', 52, 'Updated Filling - Composite 21', '{"action": "edit", "item_id": "30dbdfa1-647f-4af3-abe0-6bac29e4a85c"}', 'd1111111-1111-1111-1111-111111111111', '2026-07-07 15:34:09.636563');
INSERT INTO public.plan_revisions VALUES ('b1ff1ed5-48fa-4725-a941-9b2633ce9b2d', '550b58b6-4578-4209-b119-33692846a430', 53, 'Added Smoke Test Treatment 11 — ₹1', '{"action": "add", "item_id": "4f490f84-2e52-4051-bdbb-dcf5246d9d19"}', 'd1111111-1111-1111-1111-111111111111', '2026-07-07 15:34:21.860953');
INSERT INTO public.plan_revisions VALUES ('713c779f-31cd-4322-a66f-396441ee3ce2', '550b58b6-4578-4209-b119-33692846a430', 54, 'Removed Smoke Test Treatment 11', '{"action": "delete", "item_id": "4f490f84-2e52-4051-bdbb-dcf5246d9d19"}', 'd1111111-1111-1111-1111-111111111111', '2026-07-07 15:34:21.904433');
INSERT INTO public.plan_revisions VALUES ('0d37aaf7-dd8f-4679-9de9-03db807bda1e', '550b58b6-4578-4209-b119-33692846a430', 55, 'Updated Filling - Composite 21', '{"action": "edit", "item_id": "30dbdfa1-647f-4af3-abe0-6bac29e4a85c"}', 'd1111111-1111-1111-1111-111111111111', '2026-07-07 18:00:46.85486');
INSERT INTO public.plan_revisions VALUES ('3467f535-15a8-4efd-9a58-389d03b6fc53', '550b58b6-4578-4209-b119-33692846a430', 56, 'Updated Filling - Composite 21', '{"action": "edit", "item_id": "30dbdfa1-647f-4af3-abe0-6bac29e4a85c"}', 'd1111111-1111-1111-1111-111111111111', '2026-07-07 18:00:49.707706');
INSERT INTO public.plan_revisions VALUES ('cdb08656-4c95-4d32-be1f-dee92ae93ed4', '550b58b6-4578-4209-b119-33692846a430', 57, 'Updated Filling - Composite 21', '{"action": "edit", "item_id": "30dbdfa1-647f-4af3-abe0-6bac29e4a85c"}', 'd1111111-1111-1111-1111-111111111111', '2026-07-07 18:00:53.443515');
INSERT INTO public.plan_revisions VALUES ('2dd17ba1-bda8-4bd0-a5ae-7933521f5687', '550b58b6-4578-4209-b119-33692846a430', 58, 'Updated Filling - Composite 21 (marked completed)', '{"action": "edit", "item_id": "30dbdfa1-647f-4af3-abe0-6bac29e4a85c"}', 'd1111111-1111-1111-1111-111111111111', '2026-07-07 18:00:54.403098');
INSERT INTO public.plan_revisions VALUES ('6dd06bb8-6bd9-422a-99c0-04b87e816cc6', '550b58b6-4578-4209-b119-33692846a430', 59, 'Updated Filling - Composite 21', '{"action": "edit", "item_id": "30dbdfa1-647f-4af3-abe0-6bac29e4a85c"}', 'd1111111-1111-1111-1111-111111111111', '2026-07-07 18:00:56.612395');
INSERT INTO public.plan_revisions VALUES ('ed27829d-2197-4fcf-b98d-ebbdfa999ecd', '550b58b6-4578-4209-b119-33692846a430', 60, 'Added Extraction 23 — ₹0', '{"action": "add", "item_id": "a38da722-da27-430e-a130-03ec55824d91"}', 'd1111111-1111-1111-1111-111111111111', '2026-07-10 17:40:43.209253');
INSERT INTO public.plan_revisions VALUES ('893fab79-251c-494f-b321-008136bff927', '550b58b6-4578-4209-b119-33692846a430', 61, 'Removed Filling - Composite 21', '{"action": "delete", "item_id": "30dbdfa1-647f-4af3-abe0-6bac29e4a85c"}', 'd1111111-1111-1111-1111-111111111111', '2026-07-10 17:41:49.923553');
INSERT INTO public.plan_revisions VALUES ('ceb35d95-9521-4621-bee1-2960936ce6d2', '550b58b6-4578-4209-b119-33692846a430', 62, 'Updated Crown - Zirconia 21 (discount ₹500)', '{"action": "edit", "item_id": "42f1dd81-38a1-46d1-982d-497aea0d8d22"}', 'd1111111-1111-1111-1111-111111111111', '2026-07-10 17:42:04.233243');
INSERT INTO public.plan_revisions VALUES ('968c0d1d-f7c0-48da-92c1-0456f1ac5596', '550b58b6-4578-4209-b119-33692846a430', 63, 'Updated Extraction 23 (rate ₹500)', '{"action": "edit", "item_id": "a38da722-da27-430e-a130-03ec55824d91"}', 'd1111111-1111-1111-1111-111111111111', '2026-07-10 17:42:20.597313');


--
-- Data for Name: prescriptions; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.prescriptions VALUES ('2cc8e70c-d66c-477c-8c6c-e47d71cb490b', '30000000-0000-4000-8000-000000000101', '20000000-0000-4000-8000-000000000101', '10000000-0000-4000-8000-000000000101', 'd1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 1, NULL, NULL, '[]', NULL, NULL, NULL, NULL, false, NULL, '2026-06-20 22:40:33.9048+05:30', 'Tooth pain', '[]', NULL);
INSERT INTO public.prescriptions VALUES ('d681ede0-bd91-4be8-9f30-06f0a92ff1c2', '5607d539-d841-4ff4-88d7-10ea8b601215', '20000000-0000-4000-8000-000000000101', '10000000-0000-4000-8000-000000000101', 'd1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 2, NULL, NULL, '[]', NULL, NULL, NULL, NULL, false, NULL, '2026-06-20 22:42:11.99367+05:30', 'Tooth pain', '[]', NULL);
INSERT INTO public.prescriptions VALUES ('2ac2ce69-8914-4ffd-91f7-0694560fcb18', '30000000-0000-4000-8000-000000000103', '20000000-0000-4000-8000-000000000103', '10000000-0000-4000-8000-000000000103', 'd1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 1, NULL, NULL, '[{"dose": "1 tab", "name": "", "duration": "5 days", "strength": "", "frequency": "1-0-1", "instructions": ""}]', 'Clean under bridge with floss threader', NULL, '2026-06-21', NULL, false, NULL, '2026-06-20 23:47:00.476725+05:30', 'Loose temporary crown', '[]', NULL);


--
-- Data for Name: procedure_catalog; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.procedure_catalog VALUES ('20000000-0000-4000-8000-000000000002', 'X-Ray (IOPA)', 'Diagnostic', 150.00, 300.00, 200.00, NULL, '[]', true, 0, '2026-06-04 19:16:25.892998+05:30', '2026-06-04 19:16:25.892998+05:30', false, '[]', 0, 'manual', false, NULL);
INSERT INTO public.procedure_catalog VALUES ('20000000-0000-4000-8000-000000000003', 'X-Ray (OPG)', 'Diagnostic', 400.00, 800.00, 500.00, NULL, '[]', true, 0, '2026-06-04 19:16:25.892998+05:30', '2026-06-04 19:16:25.892998+05:30', false, '[]', 0, 'manual', false, NULL);
INSERT INTO public.procedure_catalog VALUES ('20000000-0000-4000-8000-000000000005', 'Fluoride Application', 'Preventive', 300.00, 600.00, 400.00, 180, '["No eating/drinking 30 min"]', true, 0, '2026-06-04 19:16:25.892998+05:30', '2026-06-04 19:16:25.892998+05:30', false, '[]', 0, 'manual', false, NULL);
INSERT INTO public.procedure_catalog VALUES ('20000000-0000-4000-8000-000000000010', 'Pulpotomy', 'Endodontics', 1000.00, 2500.00, 1500.00, 7, '["Avoid hard food on treated side"]', true, 0, '2026-06-04 19:16:25.892998+05:30', '2026-06-04 19:16:25.892998+05:30', false, '[]', 0, 'manual', false, NULL);
INSERT INTO public.procedure_catalog VALUES ('20000000-0000-4000-8000-000000000018', 'Abscess Drainage', 'Surgery', 500.00, 1500.00, 800.00, 3, '["Continue warm saline", "Complete antibiotic course"]', true, 0, '2026-06-04 19:16:25.892998+05:30', '2026-06-04 19:16:25.892998+05:30', false, '[]', 0, 'manual', false, NULL);
INSERT INTO public.procedure_catalog VALUES ('20000000-0000-4000-8000-000000000027', 'Space Maintainer', 'Pediatric', 1500.00, 3000.00, 2000.00, 30, '["Dont play with appliance"]', true, 0, '2026-06-04 19:16:25.892998+05:30', '2026-06-04 19:16:25.892998+05:30', false, '[]', 0, 'manual', false, NULL);
INSERT INTO public.procedure_catalog VALUES ('20000000-0000-4000-8000-000000000028', 'Sealant', 'Preventive', 500.00, 1000.00, 700.00, 180, '["Avoid sticky food 24 hrs"]', true, 0, '2026-06-04 19:16:25.892998+05:30', '2026-06-04 19:16:25.892998+05:30', false, '[]', 0, 'manual', false, NULL);
INSERT INTO public.procedure_catalog VALUES ('20000000-0000-4000-8000-000000000011', 'Crown - PFM', 'Prosthodontics', 3000.00, 6000.00, 4000.00, 7, '["Temporary crown - avoid sticky food"]', true, 0, '2026-06-08 16:42:02.378576+05:30', '2026-06-08 16:42:02.378576+05:30', true, '["Tooth Preparation", "Impression", "Crown Trial", "Crown Cementation"]', 0, 'manual', true, 'Crown (PFM)');
INSERT INTO public.procedure_catalog VALUES ('20000000-0000-4000-8000-000000000020', 'Implant Crown', 'Implantology', 10000.00, 25000.00, 15000.00, 7, '["Avoid hard food initially"]', true, 0, '2026-06-04 19:16:25.892998+05:30', '2026-06-04 19:16:25.892998+05:30', true, '["Tooth Preparation", "Impression", "Crown Trial", "Crown Cementation"]', 0, 'manual', true, 'Implant Abutment + Crown');
INSERT INTO public.procedure_catalog VALUES ('20000000-0000-4000-8000-000000000019', 'Dental Implant', 'Implantology', 25000.00, 50000.00, 35000.00, 14, '["No chewing implant side 2 weeks", "Soft diet 1 week", "Follow-ups critical"]', true, 0, '2026-06-04 19:16:25.892998+05:30', '2026-06-04 19:16:25.892998+05:30', true, '["Implant Placement", "Healing Cap", "Impression", "Crown Placement"]', 0, 'manual', true, 'Implant Abutment + Crown');
INSERT INTO public.procedure_catalog VALUES ('20000000-0000-4000-8000-000000000009', 'RCT Re-treatment', 'Endodontics', 5000.00, 12000.00, 7000.00, 7, '["Multiple visits needed"]', true, 0, '2026-06-04 19:16:25.892998+05:30', '2026-06-04 19:16:25.892998+05:30', true, '["Access Opening", "BMP", "Obturation", "Post & Core", "Crown Preparation", "Crown Cementation"]', 0, 'manual', false, NULL);
INSERT INTO public.procedure_catalog VALUES ('20000000-0000-4000-8000-000000000016', 'Extraction - Simple', 'Surgery', 500.00, 1500.00, 800.00, 7, '["Bite gauze 30 min", "No spitting/straw 24 hrs", "Cold compress 24 hrs", "Warm saline next day", "Soft diet 2 days"]', true, 0, '2026-06-08 16:42:02.378576+05:30', '2026-06-08 16:42:02.378576+05:30', true, '["Extraction Completed", "Suturing", "Suture Removal"]', 0, 'manual', false, NULL);
INSERT INTO public.procedure_catalog VALUES ('20000000-0000-4000-8000-000000000024', 'Veneer (per tooth)', 'Cosmetic', 5000.00, 15000.00, 8000.00, 7, '["Avoid biting hard objects"]', true, 0, '2026-06-04 19:16:25.892998+05:30', '2026-06-04 19:16:25.892998+05:30', true, '["Tooth Preparation", "Impression", "Veneer Trial", "Veneer Cementation"]', 0, 'manual', false, NULL);
INSERT INTO public.procedure_catalog VALUES ('20000000-0000-4000-8000-000000000004', 'Scaling & Polishing', 'Preventive', 500.00, 1500.00, 1000.00, 180, '["Avoid eating 1 hour after", "Mild sensitivity normal 2-3 days", "Use soft bristle brush"]', true, 0, '2026-06-04 19:16:25.892998+05:30', '2026-06-04 19:16:25.892998+05:30', false, '["Scaling Completed", "Polishing"]', 0, 'manual', false, NULL);
INSERT INTO public.procedure_catalog VALUES ('20000000-0000-4000-8000-000000000025', 'Deep Cleaning / SRP', 'Periodontics', 1000.00, 3000.00, 1500.00, 14, '["Sensitivity normal 1 week"]', true, 0, '2026-06-04 19:16:25.892998+05:30', '2026-06-04 19:16:25.892998+05:30', false, '["Scaling Completed", "Polishing"]', 0, 'manual', false, NULL);
INSERT INTO public.procedure_catalog VALUES ('f53b6ed2-e640-4866-8cfe-9996bc44f8c4', 'TMP P2', 'Endodontics', 1000.00, 1500.00, 1200.00, 7, '["Soft diet"]', true, 0, '2026-06-19 10:15:01.097992+05:30', '2026-06-19 10:15:01.097994+05:30', false, '[]', 0, 'manual', false, NULL);
INSERT INTO public.procedure_catalog VALUES ('20000000-0000-4000-8000-000000000023', 'Teeth Whitening', 'Cosmetic', 5000.00, 15000.00, 8000.00, NULL, '["Avoid colored food/drinks 48 hrs", "Sensitivity 1-2 days normal"]', true, 0, '2026-06-04 19:16:25.892998+05:30', '2026-06-04 19:16:25.892998+05:30', false, '["Whitening Session"]', 0, 'manual', false, NULL);
INSERT INTO public.procedure_catalog VALUES ('20000000-0000-4000-8000-000000000022', 'Braces - Ceramic', 'Orthodontics', 35000.00, 70000.00, 50000.00, 30, '["Avoid staining food (tea, coffee, turmeric)"]', true, 0, '2026-06-08 16:42:02.378576+05:30', '2026-06-08 16:42:02.378576+05:30', false, '["Adjustment Done", "Wire Change"]', 0, 'manual', false, NULL);
INSERT INTO public.procedure_catalog VALUES ('df4d9e9b-7b4d-4676-b60d-690963fe76ec', 'Implant Consultation', 'General', 350.00, 750.00, 500.00, NULL, '[]', true, 0, '2026-06-11 16:44:17.008134+05:30', '2026-06-11 16:44:17.008134+05:30', false, '["Consultation Done"]', 0, 'spec_seed', false, NULL);
INSERT INTO public.procedure_catalog VALUES ('82027f64-3d57-4bc3-a316-0fae5bc68e2f', 'Oral Hygiene Review', 'General', 140.00, 300.00, 200.00, NULL, '[]', true, 0, '2026-06-11 16:44:17.008134+05:30', '2026-06-11 16:44:17.008134+05:30', false, '["Review Done"]', 0, 'spec_seed', false, NULL);
INSERT INTO public.procedure_catalog VALUES ('20000000-0000-4000-8000-000000000015', 'Partial Denture', 'Prosthodontics', 3000.00, 10000.00, 6000.00, 3, '["Remove at night", "Clean daily"]', true, 0, '2026-06-04 19:16:25.892998+05:30', '2026-06-04 19:16:25.892998+05:30', false, '["Impression", "Bite Registration", "Try-in", "Denture Delivery"]', 0, 'manual', true, 'RPD (Acrylic)');
INSERT INTO public.procedure_catalog VALUES ('20000000-0000-4000-8000-000000000001', 'Consultation', 'Diagnostic', 200.00, 500.00, 300.00, NULL, '[]', true, 0, '2026-06-04 19:16:25.892998+05:30', '2026-06-04 19:16:25.892998+05:30', false, '["Consultation Done"]', 2, 'manual', false, NULL);
INSERT INTO public.procedure_catalog VALUES ('20000000-0000-4000-8000-000000000013', 'Bridge (per unit)', 'Prosthodontics', 3000.00, 10000.00, 5000.00, 7, '["Clean under bridge with floss threader"]', true, 0, '2026-06-04 19:16:25.892998+05:30', '2026-06-04 19:16:25.892998+05:30', true, '["Tooth Preparation", "Impression", "Bridge Trial", "Bridge Cementation"]', 5, 'manual', true, 'Bridge (3-unit PFM)');
INSERT INTO public.procedure_catalog VALUES ('428da199-0a36-468f-8a95-527d9d7e1b1c', 'a', 'Diagnostic', 0.00, 0.00, 999.00, NULL, '[]', true, 0, '2026-06-22 22:24:56.664997+05:30', '2026-06-22 22:31:30.395867+05:30', false, '[]', 0, 'manual', false, NULL);
INSERT INTO public.procedure_catalog VALUES ('20000000-0000-4000-8000-000000000008', 'Root Canal (RCT)', 'Endodontics', 3000.00, 8000.00, 5000.00, 7, '["Dont chew treated side until crown", "Discomfort 2-3 days normal", "Complete antibiotic course", "Crown within 2 weeks"]', true, 0, '2026-06-04 19:16:25.892998+05:30', '2026-06-04 19:16:25.892998+05:30', true, '["Access Opening", "BMP", "Obturation", "Post & Core", "Crown Preparation", "Crown Cementation"]', 8, 'manual', false, NULL);
INSERT INTO public.procedure_catalog VALUES ('20000000-0000-4000-8000-000000000006', 'Filling - GIC', 'Restorative', 500.00, 1000.00, 600.00, NULL, '["Avoid chewing on filled side 2 hrs", "Mild sensitivity normal"]', true, 0, '2026-06-08 16:42:02.378576+05:30', '2026-06-08 16:42:02.378576+05:30', true, '["Filling Completed"]', 1, 'manual', false, NULL);
INSERT INTO public.procedure_catalog VALUES ('20000000-0000-4000-8000-000000000021', 'Braces - Metal', 'Orthodontics', 25000.00, 50000.00, 35000.00, 30, '["Discomfort 3-5 days normal", "Use ortho wax", "Avoid hard/sticky food"]', true, 0, '2026-06-08 16:42:02.378576+05:30', '2026-06-08 16:42:02.378576+05:30', false, '["Adjustment Done", "Wire Change"]', 1, 'manual', false, NULL);
INSERT INTO public.procedure_catalog VALUES ('20000000-0000-4000-8000-000000000014', 'Complete Denture', 'Prosthodontics', 5000.00, 15000.00, 10000.00, 3, '["Practice speaking", "Start soft food", "Remove at night"]', true, 0, '2026-06-04 19:16:25.892998+05:30', '2026-06-04 19:16:25.892998+05:30', false, '["Impression", "Bite Registration", "Try-in", "Denture Delivery"]', 3, 'manual', true, 'Complete Denture');
INSERT INTO public.procedure_catalog VALUES ('20000000-0000-4000-8000-000000000012', 'Crown - Zirconia', 'Prosthodontics', 6000.00, 15000.00, 10000.00, 7, '["Temporary crown - avoid sticky food"]', true, 0, '2026-06-08 16:42:02.378576+05:30', '2026-06-08 16:42:02.378576+05:30', true, '["Tooth Preparation", "Impression", "Crown Trial", "Crown Cementation"]', 1, 'manual', true, 'Crown (PFM)');
INSERT INTO public.procedure_catalog VALUES ('cfaac738-ecec-4fbc-b951-5838680f471b', 'Dressing', 'Tooth-Based', 210.00, 450.00, 300.00, NULL, '[]', true, 0, '2026-06-11 16:44:17.008134+05:30', '2026-06-11 16:44:17.008134+05:30', true, '["Dressing Done"]', 1, 'spec_seed', false, NULL);
INSERT INTO public.procedure_catalog VALUES ('20000000-0000-4000-8000-000000000026', 'Flap Surgery', 'Periodontics', 3000.00, 8000.00, 5000.00, 7, '["No brushing surgical area 1 week", "Soft diet 3 days"]', true, 0, '2026-06-04 19:16:25.892998+05:30', '2026-06-04 19:16:25.892998+05:30', false, '[]', 12, 'manual', false, NULL);
INSERT INTO public.procedure_catalog VALUES ('20000000-0000-4000-8000-000000000007', 'Filling - Composite', 'Restorative', 800.00, 2000.00, 1200.00, NULL, '["Avoid eating 2 hours", "Avoid hot/cold food 24 hrs"]', true, 0, '2026-06-08 16:42:02.378576+05:30', '2026-06-08 16:42:02.378576+05:30', true, '["Filling Completed"]', 7, 'manual', false, NULL);
INSERT INTO public.procedure_catalog VALUES ('20000000-0000-4000-8000-000000000017', 'Extraction - Surgical', 'Surgery', 2000.00, 5000.00, 3000.00, 7, '["Bite gauze 45 min", "Ice pack 24 hrs", "No spitting/straw", "Soft diet 3-4 days", "Swelling 2-3 days normal"]', true, 0, '2026-06-08 16:42:02.378576+05:30', '2026-06-08 16:42:02.378576+05:30', true, '["Extraction Completed", "Suturing", "Suture Removal"]', 2, 'manual', false, NULL);


--
-- Data for Name: procedure_medicine_map; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.procedure_medicine_map VALUES ('82b73805-e399-4c58-bfe8-57f3f2a59220', '20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000014', true);
INSERT INTO public.procedure_medicine_map VALUES ('9185e429-e6a3-423d-b06e-94e76a8b5246', '20000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000001', true);
INSERT INTO public.procedure_medicine_map VALUES ('703fca9d-8a64-4500-a988-2771129a3a4c', '20000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000007', true);
INSERT INTO public.procedure_medicine_map VALUES ('898a5289-9b4a-453a-b1d4-08c2af21281a', '20000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000012', true);
INSERT INTO public.procedure_medicine_map VALUES ('f555fc3b-14e6-4273-a232-f1fc1e612a2e', '20000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000014', true);
INSERT INTO public.procedure_medicine_map VALUES ('71d98cea-c027-4146-ad29-8586f04afff2', '20000000-0000-4000-8000-000000000009', '10000000-0000-4000-8000-000000000002', true);
INSERT INTO public.procedure_medicine_map VALUES ('ad24ae86-ed4a-4d3f-a336-d9c228034f9d', '20000000-0000-4000-8000-000000000009', '10000000-0000-4000-8000-000000000007', true);
INSERT INTO public.procedure_medicine_map VALUES ('c2cba890-bca3-4699-8596-3c975a364192', '20000000-0000-4000-8000-000000000009', '10000000-0000-4000-8000-000000000012', true);
INSERT INTO public.procedure_medicine_map VALUES ('16c9bb5b-d92b-4493-813f-117c26f134e6', '20000000-0000-4000-8000-000000000018', '10000000-0000-4000-8000-000000000002', true);
INSERT INTO public.procedure_medicine_map VALUES ('8603c47a-dde6-4bb4-aa55-6e0beebf0ad6', '20000000-0000-4000-8000-000000000018', '10000000-0000-4000-8000-000000000004', true);
INSERT INTO public.procedure_medicine_map VALUES ('6345a080-13b2-47bb-b601-794c5ca3dbb1', '20000000-0000-4000-8000-000000000018', '10000000-0000-4000-8000-000000000007', true);
INSERT INTO public.procedure_medicine_map VALUES ('977a7827-b6f8-4b5c-922a-6939ddb078c3', '20000000-0000-4000-8000-000000000018', '10000000-0000-4000-8000-000000000012', true);
INSERT INTO public.procedure_medicine_map VALUES ('5c415acf-a577-4656-899e-b0ddcf13bab8', '20000000-0000-4000-8000-000000000018', '10000000-0000-4000-8000-000000000020', true);
INSERT INTO public.procedure_medicine_map VALUES ('888a7d93-ad03-44af-b6f8-229c3783d638', '20000000-0000-4000-8000-000000000019', '10000000-0000-4000-8000-000000000002', true);
INSERT INTO public.procedure_medicine_map VALUES ('1fecf269-a2cd-4641-8470-d6881f289fb7', '20000000-0000-4000-8000-000000000019', '10000000-0000-4000-8000-000000000007', true);
INSERT INTO public.procedure_medicine_map VALUES ('1d7059ac-7d5e-4444-8eae-04857c3ce623', '20000000-0000-4000-8000-000000000019', '10000000-0000-4000-8000-000000000012', true);
INSERT INTO public.procedure_medicine_map VALUES ('4e32680a-ac25-49b9-afa4-594086f7ca49', '20000000-0000-4000-8000-000000000019', '10000000-0000-4000-8000-000000000014', true);
INSERT INTO public.procedure_medicine_map VALUES ('7503aeeb-9a1b-4819-b7e2-be243cca308a', '20000000-0000-4000-8000-000000000023', '10000000-0000-4000-8000-000000000019', true);
INSERT INTO public.procedure_medicine_map VALUES ('9f78e7e5-df64-43fd-bee8-d05ed6d9c9b4', '20000000-0000-4000-8000-000000000025', '10000000-0000-4000-8000-000000000014', true);
INSERT INTO public.procedure_medicine_map VALUES ('953b2ce1-fd28-4c62-bf2b-c936827e2919', '20000000-0000-4000-8000-000000000025', '10000000-0000-4000-8000-000000000004', true);
INSERT INTO public.procedure_medicine_map VALUES ('3697ac92-7a16-4824-b793-efb263a83caa', '20000000-0000-4000-8000-000000000026', '10000000-0000-4000-8000-000000000002', true);
INSERT INTO public.procedure_medicine_map VALUES ('4ee0b284-2a0e-4b96-8ec0-faf9baf72724', '20000000-0000-4000-8000-000000000026', '10000000-0000-4000-8000-000000000004', true);
INSERT INTO public.procedure_medicine_map VALUES ('759c2961-c96c-4085-8952-1e47aee673b9', '20000000-0000-4000-8000-000000000026', '10000000-0000-4000-8000-000000000007', true);
INSERT INTO public.procedure_medicine_map VALUES ('f178a40a-f2bb-4ebe-8971-211f17cd391b', '20000000-0000-4000-8000-000000000026', '10000000-0000-4000-8000-000000000012', true);
INSERT INTO public.procedure_medicine_map VALUES ('a31ff90e-13a4-4408-8553-0e1a2ecd089a', '20000000-0000-4000-8000-000000000026', '10000000-0000-4000-8000-000000000014', true);
INSERT INTO public.procedure_medicine_map VALUES ('61c1f3e9-8f30-4a42-86d6-26e2872ea90a', 'f53b6ed2-e640-4866-8cfe-9996bc44f8c4', '44bf9b37-49e4-4780-a79d-0b22c029e0f0', true);


--
-- Data for Name: qr_codes; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: reminder_log; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: reminder_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.reminder_settings VALUES ('e83c6400-8903-488e-aa70-1695917d718b', 'b2222222-2222-2222-2222-222222222222', true, false, true, '09:00:00', true, false, true, '10:00:00', false, false, false, false, false, '08:00:00', true, '07:00:00', '2026-06-17 13:29:36.39001+05:30');
INSERT INTO public.reminder_settings VALUES ('c6099179-bb6e-4275-aff0-ca9e27810721', 'a1111111-1111-1111-1111-111111111111', true, false, true, '10:00:00', false, false, true, '10:00:00', false, false, false, false, false, '08:00:00', true, '07:00:00', '2026-06-17 13:43:54.030902+05:30');


--
-- Data for Name: reschedule_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: service_catalog; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.service_catalog VALUES ('992c534c-1943-481e-9148-35eac2a69f6c', 'a1111111-1111-1111-1111-111111111111', 'consultation', 'New consultation', NULL, 30, 500.00, NULL, false, false, 1, true, '2026-06-15 10:13:34.02512+05:30');
INSERT INTO public.service_catalog VALUES ('e0d279b3-f41a-4521-9eb1-a5462e8c4dd2', 'a1111111-1111-1111-1111-111111111111', 'consultation', 'Follow-up consultation', NULL, 15, 200.00, NULL, false, false, 1, true, '2026-06-15 10:13:34.02512+05:30');
INSERT INTO public.service_catalog VALUES ('7c6b6e21-2666-4cce-9e6c-2e16b87f7414', 'a1111111-1111-1111-1111-111111111111', 'diagnostic', 'IOPA X-ray', NULL, 5, 200.00, NULL, false, false, 1, true, '2026-06-15 10:13:34.02512+05:30');
INSERT INTO public.service_catalog VALUES ('804d7f81-e89c-422d-a5de-4e65ff956b15', 'a1111111-1111-1111-1111-111111111111', 'diagnostic', 'OPG', NULL, 10, 600.00, NULL, false, false, 1, true, '2026-06-15 10:13:34.02512+05:30');
INSERT INTO public.service_catalog VALUES ('5c7d75e6-427f-44d3-b93f-d8d711458a4a', 'a1111111-1111-1111-1111-111111111111', 'diagnostic', 'CBCT scan', NULL, 15, 3500.00, NULL, false, false, 1, true, '2026-06-15 10:13:34.02512+05:30');
INSERT INTO public.service_catalog VALUES ('786276b2-55c8-4a8a-b81e-5a074a1163b5', 'a1111111-1111-1111-1111-111111111111', 'preventive', 'Scaling & polishing', NULL, 30, 1500.00, NULL, false, false, 1, true, '2026-06-15 10:13:34.02512+05:30');
INSERT INTO public.service_catalog VALUES ('f13fda72-2157-4d28-9c05-df819b919f44', 'a1111111-1111-1111-1111-111111111111', 'preventive', 'Fluoride application', NULL, 15, 800.00, NULL, false, false, 1, true, '2026-06-15 10:13:34.02512+05:30');
INSERT INTO public.service_catalog VALUES ('f05dbf54-9cb8-471b-83c2-4c4f244e8b8d', 'a1111111-1111-1111-1111-111111111111', 'restorative', 'Composite filling — small', NULL, 30, 1200.00, NULL, false, false, 1, true, '2026-06-15 10:13:34.02512+05:30');
INSERT INTO public.service_catalog VALUES ('a8d28bba-d486-46f4-946c-5607463eae5c', 'a1111111-1111-1111-1111-111111111111', 'restorative', 'Composite filling — large', NULL, 45, 2000.00, NULL, false, false, 1, true, '2026-06-15 10:13:34.02512+05:30');
INSERT INTO public.service_catalog VALUES ('0a7ef360-50b8-4593-a204-076ed8c169b9', 'a1111111-1111-1111-1111-111111111111', 'restorative', 'GIC filling', NULL, 30, 800.00, NULL, false, false, 1, true, '2026-06-15 10:13:34.02512+05:30');
INSERT INTO public.service_catalog VALUES ('e73a68cc-39b0-487b-83bf-68c09062674f', 'a1111111-1111-1111-1111-111111111111', 'endodontic', 'RCT — Anterior', NULL, 60, 4500.00, NULL, false, false, 2, true, '2026-06-15 10:13:34.02512+05:30');
INSERT INTO public.service_catalog VALUES ('70e98c02-38d2-4974-9cc7-a6088a0ab658', 'a1111111-1111-1111-1111-111111111111', 'endodontic', 'RCT — Premolar', NULL, 75, 5500.00, NULL, false, false, 2, true, '2026-06-15 10:13:34.02512+05:30');
INSERT INTO public.service_catalog VALUES ('24e3e9a8-f56e-4f54-a097-3a77afff9500', 'a1111111-1111-1111-1111-111111111111', 'endodontic', 'RCT — Molar', NULL, 90, 6500.00, NULL, false, false, 2, true, '2026-06-15 10:13:34.02512+05:30');
INSERT INTO public.service_catalog VALUES ('8b3e0992-414a-4da7-acca-6267415aeaf2', 'a1111111-1111-1111-1111-111111111111', 'endodontic', 'RCT re-treatment', NULL, 120, 8500.00, NULL, false, false, 3, true, '2026-06-15 10:13:34.02512+05:30');
INSERT INTO public.service_catalog VALUES ('a9e6d1eb-b732-43d2-8d80-9751b30af4c0', 'a1111111-1111-1111-1111-111111111111', 'oral_surgery', 'Extraction — simple', NULL, 20, 1500.00, NULL, false, false, 1, true, '2026-06-15 10:13:34.02512+05:30');
INSERT INTO public.service_catalog VALUES ('a95597a2-6e32-4a13-a8ea-1284be688c74', 'a1111111-1111-1111-1111-111111111111', 'oral_surgery', 'Extraction — surgical', NULL, 60, 4500.00, NULL, false, false, 1, true, '2026-06-15 10:13:34.02512+05:30');
INSERT INTO public.service_catalog VALUES ('fc933ae6-40bf-45a3-b7ab-732af5e249f1', 'a1111111-1111-1111-1111-111111111111', 'oral_surgery', 'Wisdom tooth extraction', NULL, 90, 7500.00, NULL, false, false, 1, true, '2026-06-15 10:13:34.02512+05:30');
INSERT INTO public.service_catalog VALUES ('73bd6542-11a6-48e4-8df2-edd8c6cec80b', 'a1111111-1111-1111-1111-111111111111', 'prosthodontic', 'PFM Crown', NULL, 60, 6500.00, NULL, true, false, 3, true, '2026-06-15 10:13:34.02512+05:30');
INSERT INTO public.service_catalog VALUES ('7646e55f-5ce6-445f-8ba1-774b9c51a01c', 'a1111111-1111-1111-1111-111111111111', 'prosthodontic', 'Zirconia Crown', NULL, 60, 12000.00, NULL, true, false, 3, true, '2026-06-15 10:13:34.02512+05:30');
INSERT INTO public.service_catalog VALUES ('9e3d78b0-00af-47e2-8bcf-388f454e7907', 'a1111111-1111-1111-1111-111111111111', 'prosthodontic', 'Complete Denture', NULL, 120, 18000.00, NULL, true, false, 4, true, '2026-06-15 10:13:34.02512+05:30');
INSERT INTO public.service_catalog VALUES ('176a7916-c70f-4408-bc89-f704bbb99676', 'a1111111-1111-1111-1111-111111111111', 'prosthodontic', 'Partial Denture', NULL, 90, 9500.00, NULL, true, false, 3, true, '2026-06-15 10:13:34.02512+05:30');
INSERT INTO public.service_catalog VALUES ('811d6512-4139-4597-84c5-5aa155ce5e53', 'a1111111-1111-1111-1111-111111111111', 'prosthodontic', 'Implant — single', NULL, 120, 35000.00, NULL, true, false, 4, true, '2026-06-15 10:13:34.02512+05:30');
INSERT INTO public.service_catalog VALUES ('cb7f8d7c-5750-48f0-a90f-dabea1c574a6', 'a1111111-1111-1111-1111-111111111111', 'cosmetic', 'Veneer (per tooth)', NULL, 60, 8500.00, NULL, true, false, 2, true, '2026-06-15 10:13:34.02512+05:30');
INSERT INTO public.service_catalog VALUES ('f40231f2-f9f1-4035-8d87-abfde004be29', 'a1111111-1111-1111-1111-111111111111', 'cosmetic', 'Teeth whitening', NULL, 90, 6500.00, NULL, false, false, 1, true, '2026-06-15 10:13:34.02512+05:30');
INSERT INTO public.service_catalog VALUES ('aa645bb6-a3aa-4b4e-8ae3-03f0247aec6f', 'a1111111-1111-1111-1111-111111111111', 'orthodontic', 'Ortho consult + records', NULL, 60, 2500.00, NULL, false, false, 1, true, '2026-06-15 10:13:34.02512+05:30');
INSERT INTO public.service_catalog VALUES ('651a3a78-9aca-4cfc-8a67-f27ba8c7be2d', 'a1111111-1111-1111-1111-111111111111', 'orthodontic', 'Metal braces (full course)', NULL, 30, 35000.00, NULL, false, false, 18, true, '2026-06-15 10:13:34.02512+05:30');
INSERT INTO public.service_catalog VALUES ('87c69d3e-47c1-4c82-9e6a-1ea7906e4e16', 'a1111111-1111-1111-1111-111111111111', 'orthodontic', 'Clear aligners', NULL, 30, 75000.00, NULL, true, false, 12, true, '2026-06-15 10:13:34.02512+05:30');
INSERT INTO public.service_catalog VALUES ('01806134-ecf4-471a-9f7f-39c1504ed1e8', 'a1111111-1111-1111-1111-111111111111', 'pediatric', 'Pediatric exam', NULL, 20, 500.00, NULL, false, false, 1, true, '2026-06-15 10:13:34.02512+05:30');
INSERT INTO public.service_catalog VALUES ('3c1b3431-9c97-4bcb-ba8e-07ce8fd8773c', 'a1111111-1111-1111-1111-111111111111', 'pediatric', 'Pulpectomy (milk tooth)', NULL, 45, 2500.00, NULL, false, false, 1, true, '2026-06-15 10:13:34.02512+05:30');
INSERT INTO public.service_catalog VALUES ('de184e12-dec2-4896-8461-6d2c51a1eea8', 'a1111111-1111-1111-1111-111111111111', 'periodontal', 'Curettage (per quadrant)', NULL, 30, 2500.00, NULL, false, false, 4, true, '2026-06-15 10:13:34.02512+05:30');
INSERT INTO public.service_catalog VALUES ('8a4596ac-b159-4817-a669-21496e1c5ae8', 'a1111111-1111-1111-1111-111111111111', 'periodontal', 'Flap surgery (per quadrant)', NULL, 60, 6500.00, NULL, false, false, 4, true, '2026-06-15 10:13:34.02512+05:30');
INSERT INTO public.service_catalog VALUES ('ff814cae-e1fb-46ed-b72c-f80f49d150a6', 'b2222222-2222-2222-2222-222222222222', 'consultation', 'New consultation', NULL, 30, 500.00, NULL, false, false, 1, true, '2026-06-15 10:13:34.02512+05:30');
INSERT INTO public.service_catalog VALUES ('1da4da00-751e-40d2-baf7-0bda6270bd89', 'b2222222-2222-2222-2222-222222222222', 'consultation', 'Follow-up consultation', NULL, 15, 200.00, NULL, false, false, 1, true, '2026-06-15 10:13:34.02512+05:30');
INSERT INTO public.service_catalog VALUES ('9325269e-6b3d-4cd3-a3fd-66dee9ef080b', 'b2222222-2222-2222-2222-222222222222', 'diagnostic', 'IOPA X-ray', NULL, 5, 200.00, NULL, false, false, 1, true, '2026-06-15 10:13:34.02512+05:30');
INSERT INTO public.service_catalog VALUES ('fe660a63-106d-4a93-b2d7-88d30ae5f48b', 'b2222222-2222-2222-2222-222222222222', 'diagnostic', 'OPG', NULL, 10, 600.00, NULL, false, false, 1, true, '2026-06-15 10:13:34.02512+05:30');
INSERT INTO public.service_catalog VALUES ('bac11e61-ec15-4b28-a256-a027474f598c', 'b2222222-2222-2222-2222-222222222222', 'diagnostic', 'CBCT scan', NULL, 15, 3500.00, NULL, false, false, 1, true, '2026-06-15 10:13:34.02512+05:30');
INSERT INTO public.service_catalog VALUES ('897f1c38-45c0-49dd-8822-d6be763126af', 'b2222222-2222-2222-2222-222222222222', 'preventive', 'Scaling & polishing', NULL, 30, 1500.00, NULL, false, false, 1, true, '2026-06-15 10:13:34.02512+05:30');
INSERT INTO public.service_catalog VALUES ('e9b04a9b-4a60-4f3a-8492-3f16d7e644a0', 'b2222222-2222-2222-2222-222222222222', 'preventive', 'Fluoride application', NULL, 15, 800.00, NULL, false, false, 1, true, '2026-06-15 10:13:34.02512+05:30');
INSERT INTO public.service_catalog VALUES ('a84a6d64-1b0b-4e7e-b466-b5b281c8988e', 'b2222222-2222-2222-2222-222222222222', 'restorative', 'Composite filling — small', NULL, 30, 1200.00, NULL, false, false, 1, true, '2026-06-15 10:13:34.02512+05:30');
INSERT INTO public.service_catalog VALUES ('a6ac5b82-d55f-492f-8e59-77a238d2f6d2', 'b2222222-2222-2222-2222-222222222222', 'restorative', 'Composite filling — large', NULL, 45, 2000.00, NULL, false, false, 1, true, '2026-06-15 10:13:34.02512+05:30');
INSERT INTO public.service_catalog VALUES ('a5f08e94-7d3a-4a36-858c-18ae59704b51', 'b2222222-2222-2222-2222-222222222222', 'restorative', 'GIC filling', NULL, 30, 800.00, NULL, false, false, 1, true, '2026-06-15 10:13:34.02512+05:30');
INSERT INTO public.service_catalog VALUES ('80861588-4e74-4d79-8073-1fe6aaf578b6', 'b2222222-2222-2222-2222-222222222222', 'endodontic', 'RCT — Anterior', NULL, 60, 4500.00, NULL, false, false, 2, true, '2026-06-15 10:13:34.02512+05:30');
INSERT INTO public.service_catalog VALUES ('0d4fb364-a15c-48e3-afff-3577ca9c7208', 'b2222222-2222-2222-2222-222222222222', 'endodontic', 'RCT — Premolar', NULL, 75, 5500.00, NULL, false, false, 2, true, '2026-06-15 10:13:34.02512+05:30');
INSERT INTO public.service_catalog VALUES ('e2cdbd36-4d93-4cd2-807b-ec0bb601d05a', 'b2222222-2222-2222-2222-222222222222', 'endodontic', 'RCT — Molar', NULL, 90, 6500.00, NULL, false, false, 2, true, '2026-06-15 10:13:34.02512+05:30');
INSERT INTO public.service_catalog VALUES ('5939824f-69a1-4b93-bbd4-9bb3f80c6c6e', 'b2222222-2222-2222-2222-222222222222', 'endodontic', 'RCT re-treatment', NULL, 120, 8500.00, NULL, false, false, 3, true, '2026-06-15 10:13:34.02512+05:30');
INSERT INTO public.service_catalog VALUES ('26913d29-cb1e-4d59-bf6b-f42dda0bf24a', 'b2222222-2222-2222-2222-222222222222', 'oral_surgery', 'Extraction — simple', NULL, 20, 1500.00, NULL, false, false, 1, true, '2026-06-15 10:13:34.02512+05:30');
INSERT INTO public.service_catalog VALUES ('cf0d651f-8c57-4347-94d9-312296c96560', 'b2222222-2222-2222-2222-222222222222', 'oral_surgery', 'Extraction — surgical', NULL, 60, 4500.00, NULL, false, false, 1, true, '2026-06-15 10:13:34.02512+05:30');
INSERT INTO public.service_catalog VALUES ('a83b1e89-c4e2-4e8f-a3b8-38dea5f3d9c6', 'b2222222-2222-2222-2222-222222222222', 'oral_surgery', 'Wisdom tooth extraction', NULL, 90, 7500.00, NULL, false, false, 1, true, '2026-06-15 10:13:34.02512+05:30');
INSERT INTO public.service_catalog VALUES ('c572fb7c-4565-4630-9fda-6c9db872f43c', 'b2222222-2222-2222-2222-222222222222', 'prosthodontic', 'PFM Crown', NULL, 60, 6500.00, NULL, true, false, 3, true, '2026-06-15 10:13:34.02512+05:30');
INSERT INTO public.service_catalog VALUES ('f135141f-71ad-4262-8eb1-0c079210c8cd', 'b2222222-2222-2222-2222-222222222222', 'prosthodontic', 'Zirconia Crown', NULL, 60, 12000.00, NULL, true, false, 3, true, '2026-06-15 10:13:34.02512+05:30');
INSERT INTO public.service_catalog VALUES ('39a18172-a146-44ee-aaeb-67a3ec6bd137', 'b2222222-2222-2222-2222-222222222222', 'prosthodontic', 'Complete Denture', NULL, 120, 18000.00, NULL, true, false, 4, true, '2026-06-15 10:13:34.02512+05:30');
INSERT INTO public.service_catalog VALUES ('355ef9d9-6c26-4c69-acf9-37bae01bd158', 'b2222222-2222-2222-2222-222222222222', 'prosthodontic', 'Partial Denture', NULL, 90, 9500.00, NULL, true, false, 3, true, '2026-06-15 10:13:34.02512+05:30');
INSERT INTO public.service_catalog VALUES ('734503fd-39a7-4053-9ffb-2393bea9d9f4', 'b2222222-2222-2222-2222-222222222222', 'prosthodontic', 'Implant — single', NULL, 120, 35000.00, NULL, true, false, 4, true, '2026-06-15 10:13:34.02512+05:30');
INSERT INTO public.service_catalog VALUES ('ed565b86-d876-485d-a271-2030f5297eac', 'b2222222-2222-2222-2222-222222222222', 'cosmetic', 'Veneer (per tooth)', NULL, 60, 8500.00, NULL, true, false, 2, true, '2026-06-15 10:13:34.02512+05:30');
INSERT INTO public.service_catalog VALUES ('dbc61a6c-41de-40d6-a71e-c1952be94710', 'b2222222-2222-2222-2222-222222222222', 'cosmetic', 'Teeth whitening', NULL, 90, 6500.00, NULL, false, false, 1, true, '2026-06-15 10:13:34.02512+05:30');
INSERT INTO public.service_catalog VALUES ('1971cf80-75e9-4e6c-93ca-494bdc74d4ab', 'b2222222-2222-2222-2222-222222222222', 'orthodontic', 'Ortho consult + records', NULL, 60, 2500.00, NULL, false, false, 1, true, '2026-06-15 10:13:34.02512+05:30');
INSERT INTO public.service_catalog VALUES ('350b98a2-3364-4a12-864d-6e0c09dac49d', 'b2222222-2222-2222-2222-222222222222', 'orthodontic', 'Metal braces (full course)', NULL, 30, 35000.00, NULL, false, false, 18, true, '2026-06-15 10:13:34.02512+05:30');
INSERT INTO public.service_catalog VALUES ('b325ac08-f97f-4fc3-909b-d3a072910dc7', 'b2222222-2222-2222-2222-222222222222', 'orthodontic', 'Clear aligners', NULL, 30, 75000.00, NULL, true, false, 12, true, '2026-06-15 10:13:34.02512+05:30');
INSERT INTO public.service_catalog VALUES ('697a4d9b-113b-48c4-a240-7366f85af29b', 'b2222222-2222-2222-2222-222222222222', 'pediatric', 'Pediatric exam', NULL, 20, 500.00, NULL, false, false, 1, true, '2026-06-15 10:13:34.02512+05:30');
INSERT INTO public.service_catalog VALUES ('989e4888-35fc-44ef-a092-59e6e8ef2ce8', 'b2222222-2222-2222-2222-222222222222', 'pediatric', 'Pulpectomy (milk tooth)', NULL, 45, 2500.00, NULL, false, false, 1, true, '2026-06-15 10:13:34.02512+05:30');
INSERT INTO public.service_catalog VALUES ('5066f27f-b429-4ef5-8ac2-ec0bf7ca64b3', 'b2222222-2222-2222-2222-222222222222', 'periodontal', 'Curettage (per quadrant)', NULL, 30, 2500.00, NULL, false, false, 4, true, '2026-06-15 10:13:34.02512+05:30');
INSERT INTO public.service_catalog VALUES ('34b11905-5224-493b-a80e-38d3daecbace', 'b2222222-2222-2222-2222-222222222222', 'periodontal', 'Flap surgery (per quadrant)', NULL, 60, 6500.00, NULL, false, false, 4, true, '2026-06-15 10:13:34.02512+05:30');


--
-- Data for Name: site_doctors; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: site_services; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.site_services VALUES ('2966414f-dc6c-4230-8fee-75c4a968e2c5', 'Smile Makeover', 'Veneers, whitening & cosmetic dentistry', NULL, '✨', NULL, NULL, NULL, NULL, NULL, NULL, true, true, 1, '2026-06-12 14:34:44.946042');
INSERT INTO public.site_services VALUES ('3f4fb936-c40c-46e1-9af2-00aa8f19bbee', 'Root Canal Treatment', 'Pain-free RCT with rotary endodontics', NULL, '🦷', NULL, NULL, NULL, NULL, NULL, NULL, true, true, 2, '2026-06-12 14:34:44.946042');
INSERT INTO public.site_services VALUES ('99866f32-4e92-4c46-a8ed-8c6d119a0792', 'Dental Implants', 'Replace missing teeth permanently', NULL, '💎', NULL, NULL, NULL, NULL, NULL, NULL, true, true, 3, '2026-06-12 14:34:44.946042');
INSERT INTO public.site_services VALUES ('5c0b8fc6-6439-43ef-a25c-a3efad9e8e9f', 'Orthodontics & Aligners', 'Braces and invisible aligners', NULL, '🪥', NULL, NULL, NULL, NULL, NULL, NULL, false, true, 4, '2026-06-12 14:34:44.946042');
INSERT INTO public.site_services VALUES ('73a1bb03-62ec-4d5d-92fa-e03b6c23180a', 'Pediatric Dentistry', 'Gentle care for children', NULL, '👶', NULL, NULL, NULL, NULL, NULL, NULL, false, true, 5, '2026-06-12 14:34:44.946042');
INSERT INTO public.site_services VALUES ('9bb1c281-3990-4ab7-8a83-88a02fb4be5d', 'Oral Surgery', 'Wisdom teeth, extractions & more', NULL, '🔬', NULL, NULL, NULL, NULL, NULL, NULL, false, true, 6, '2026-06-12 14:34:44.946042');


--
-- Data for Name: site_testimonials; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: site_theme; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.site_theme VALUES (1, '#0E7C7B', '#06B6D4', '#22D3EE', '#0F172A', NULL, NULL, 'Siya Dental Car', 'Modern dentistry. Compassionate care.', NULL, NULL, NULL, NULL, NULL, NULL, '2026-06-26 14:45:03.925439', NULL, '4.9', '120+');


--
-- Data for Name: site_videos; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: smile_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: specialist_earnings; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.specialist_earnings VALUES ('d4911d7a-e012-4bc0-94c6-311459780176', '07e07975-94d7-4c30-8a71-7e75f420092f', '30000000-0000-4000-8000-000000000101', '10000000-0000-4000-8000-000000000101', 'a1111111-1111-1111-1111-111111111111', 1000.00, 'Verified by doctor', '2026-06-20', false, NULL, NULL, NULL, NULL, NULL, NULL, 'd1111111-1111-1111-1111-111111111111', '2026-06-20 22:48:09.399856+05:30', '2026-06-20 22:48:09.399856+05:30', NULL, NULL, 'verified', '2026-06-20 22:48:09.399856+05:30', 'd1111111-1111-1111-1111-111111111111');


--
-- Data for Name: specialist_notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.specialist_notifications VALUES ('12af520e-3a39-455a-97fd-1617933c26b0', '30000000-0000-4000-8000-000000000101', '07e07975-94d7-4c30-8a71-7e75f420092f', 'specialist', 'patient_in_queue', 'manual', 'Asha Verma is now in the queue and waiting', '2026-06-20 22:38:53.067075+05:30', NULL);
INSERT INTO public.specialist_notifications VALUES ('f6a883f9-b814-4da4-a969-82ab546ac030', '30000000-0000-4000-8000-000000000101', '07e07975-94d7-4c30-8a71-7e75f420092f', 'senior_doctor', 'session_closed', 'in_app', 'Specialist SS closed session for Asha Verma', '2026-06-20 22:39:39.33438+05:30', '07e07975-94d7-4c30-8a71-7e75f420092f');
INSERT INTO public.specialist_notifications VALUES ('c4a48122-bd72-4e73-a758-7b13b90bc825', '30000000-0000-4000-8000-000000000103', '07e07975-94d7-4c30-8a71-7e75f420092f', 'specialist', 'assigned', 'manual', 'You have been assigned a patient on 2026-06-20 at 15:15:00', '2026-06-20 23:44:39.222465+05:30', 'd1111111-1111-1111-1111-111111111111');
INSERT INTO public.specialist_notifications VALUES ('718948b0-36c5-43ca-9538-febe22cc7da6', '30000000-0000-4000-8000-000000000103', '07e07975-94d7-4c30-8a71-7e75f420092f', 'specialist', 'call_confirm', 'manual', 'Specialist call outcome for Meera Nair: [confirmed]', '2026-06-20 23:48:47.345992+05:30', 'd1111111-1111-1111-1111-111111111111');


--
-- Data for Name: specialist_rate_tiers; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.specialist_rate_tiers VALUES ('0042f2d6-9448-4863-a906-39334fa50287', 'a1111111-1111-1111-1111-111111111111', '07e07975-94d7-4c30-8a71-7e75f420092f', 'standard', '1500', 1500.00, true, '2026-06-20 23:44:26.755762+05:30', 2, '2026-06-20 23:44:39.204445+05:30', '1500', 'inline');


--
-- Data for Name: staff; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.staff VALUES ('d2222222-2222-2222-2222-222222222222', 'a1111111-1111-1111-1111-111111111111', 'Nurse Priya', 'nurse', '+919876500003', NULL, '$2b$12$TtWSv6BqEk7Xc/QJAW65cOGbJe4rj6w9nkB4Zgpusn.f2.8m5G/Uy', true, '2026-06-08 15:50:32.983493+05:30', NULL, NULL, NULL, NULL, NULL, '{}', NULL, false, NULL, NULL);
INSERT INTO public.staff VALUES ('d1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'Dr. Monika', 'doctor', '+919876500001', NULL, '$2b$12$hzazzf60Ct9jNnV4k/4APOqg1ThfXbyKzJ17j5e9EJqpL1PuRGSVi', true, '2026-06-08 15:50:32.983493+05:30', NULL, NULL, NULL, NULL, NULL, '{}', NULL, false, NULL, NULL);
INSERT INTO public.staff VALUES ('07e07975-94d7-4c30-8a71-7e75f420092f', 'a1111111-1111-1111-1111-111111111111', 'Shefali', 'specialist', '+919876599991', NULL, '$2b$12$W5On1VI8cA1o4DBEbIEuuODD1TGxIv8xMb9DuWxRtk31hnfi..qai', true, '2026-06-19 15:13:06.351684+05:30', NULL, NULL, NULL, NULL, NULL, '{}', 'Endodontist', true, 1500.00, '+919876599991');


--
-- Data for Name: to_be_appointed; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: tooth_clinical_records; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: tooth_conditions; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: tooth_diagnoses; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.tooth_diagnoses VALUES ('f3568bb4-5a9d-4615-b52e-0e4f621d23ad', '10000000-0000-4000-8000-000000000103', 11, 'Calculus', NULL, 'd1111111-1111-1111-1111-111111111111', '2026-06-20 23:38:25.994776', true);
INSERT INTO public.tooth_diagnoses VALUES ('863d7506-74b6-4e94-a381-68b639c715a8', '10000000-0000-4000-8000-000000000103', 12, 'Calculus', NULL, 'd1111111-1111-1111-1111-111111111111', '2026-06-20 23:38:40.228445', true);
INSERT INTO public.tooth_diagnoses VALUES ('bf36cd14-8424-4aa0-934d-812986b3e1cb', '10000000-0000-4000-8000-000000000102', 11, 'Calculus', NULL, 'd1111111-1111-1111-1111-111111111111', '2026-06-21 00:43:07.706518', true);
INSERT INTO public.tooth_diagnoses VALUES ('dead1b9a-8904-49f4-8773-a27460e08372', '10000000-0000-4000-8000-000000000102', 11, 'Deep Caries', NULL, 'd1111111-1111-1111-1111-111111111111', '2026-06-21 00:43:10.264591', true);
INSERT INTO public.tooth_diagnoses VALUES ('ac5c74e7-ee5b-4fab-8084-5c55e499b417', '10000000-0000-4000-8000-000000000102', 28, 'Deep Caries', NULL, 'd1111111-1111-1111-1111-111111111111', '2026-06-21 00:43:16.851033', true);
INSERT INTO public.tooth_diagnoses VALUES ('e8b595f5-b930-423f-9211-2e887c53d07d', '10000000-0000-4000-8000-000000000102', 12, 'Calculus', NULL, 'd1111111-1111-1111-1111-111111111111', '2026-06-22 22:40:45.940736', true);
INSERT INTO public.tooth_diagnoses VALUES ('4f5a3520-959b-4aa1-901a-9d7cf74b7782', '257303ab-e6d0-49d0-9caf-e058550c7edf', 33, 'Calculus', NULL, 'd1111111-1111-1111-1111-111111111111', '2026-07-06 13:30:42.794257', true);
INSERT INTO public.tooth_diagnoses VALUES ('56190605-0d65-45dd-8e41-90a1c0c57302', '257303ab-e6d0-49d0-9caf-e058550c7edf', 21, 'Deep Caries', NULL, 'd1111111-1111-1111-1111-111111111111', '2026-07-06 14:16:45.301255', true);
INSERT INTO public.tooth_diagnoses VALUES ('7d6ddc78-7c57-4068-a298-94e88b663210', '257303ab-e6d0-49d0-9caf-e058550c7edf', 22, 'Calculus', NULL, 'd1111111-1111-1111-1111-111111111111', '2026-07-06 14:41:25.546984', true);
INSERT INTO public.tooth_diagnoses VALUES ('5ad7d240-0e3b-437c-9cd0-861a30accb82', '257303ab-e6d0-49d0-9caf-e058550c7edf', 25, 'Calculus', NULL, 'd1111111-1111-1111-1111-111111111111', '2026-07-06 15:57:50.612971', false);
INSERT INTO public.tooth_diagnoses VALUES ('809613ce-b18b-4df8-b052-5653fee7a85c', '257303ab-e6d0-49d0-9caf-e058550c7edf', 18, 'Calculus', NULL, 'd1111111-1111-1111-1111-111111111111', '2026-07-06 19:39:53.228201', false);
INSERT INTO public.tooth_diagnoses VALUES ('91fb1122-a84c-49c4-805b-a4f077d22dc7', '257303ab-e6d0-49d0-9caf-e058550c7edf', 17, 'Calculus', NULL, 'd1111111-1111-1111-1111-111111111111', '2026-07-06 19:39:53.264943', false);
INSERT INTO public.tooth_diagnoses VALUES ('fdea2865-1e45-4c48-9e98-182c691c1afd', '257303ab-e6d0-49d0-9caf-e058550c7edf', 16, 'Calculus', NULL, 'd1111111-1111-1111-1111-111111111111', '2026-07-06 19:39:53.283782', false);
INSERT INTO public.tooth_diagnoses VALUES ('119706eb-0fa2-470c-b901-e84851c78aa7', '257303ab-e6d0-49d0-9caf-e058550c7edf', 15, 'Calculus', NULL, 'd1111111-1111-1111-1111-111111111111', '2026-07-06 19:39:53.303312', false);
INSERT INTO public.tooth_diagnoses VALUES ('f2e92156-6fd7-4050-a959-e02d05cf0866', '257303ab-e6d0-49d0-9caf-e058550c7edf', 14, 'Calculus', NULL, 'd1111111-1111-1111-1111-111111111111', '2026-07-06 19:39:53.325286', false);
INSERT INTO public.tooth_diagnoses VALUES ('1c744baa-2864-4d03-8971-8bcd3e07a9b2', '257303ab-e6d0-49d0-9caf-e058550c7edf', 13, 'Calculus', NULL, 'd1111111-1111-1111-1111-111111111111', '2026-07-06 19:39:53.342605', false);
INSERT INTO public.tooth_diagnoses VALUES ('482df304-5d4e-46bc-8a5c-cd9a709e324f', '257303ab-e6d0-49d0-9caf-e058550c7edf', 12, 'Calculus', NULL, 'd1111111-1111-1111-1111-111111111111', '2026-07-06 19:39:53.364226', false);
INSERT INTO public.tooth_diagnoses VALUES ('a30bd91d-ff96-4f4c-ae2c-3b8a6cfb8801', '257303ab-e6d0-49d0-9caf-e058550c7edf', 11, 'Calculus', NULL, 'd1111111-1111-1111-1111-111111111111', '2026-07-06 19:39:53.378454', false);
INSERT INTO public.tooth_diagnoses VALUES ('e2402999-0645-43bb-86d9-a70fc970c6ec', '257303ab-e6d0-49d0-9caf-e058550c7edf', 23, 'Impacted Tooth', NULL, 'd1111111-1111-1111-1111-111111111111', '2026-07-10 17:40:40.297876', true);


--
-- Data for Name: tooth_examinations; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.tooth_examinations VALUES ('a1d4ea3f-34f9-42a1-9a85-a93429c32f64', '10000000-0000-4000-8000-000000000103', 12, 'Caries', NULL, 'd1111111-1111-1111-1111-111111111111', '2026-06-20 23:37:54.534727', true);
INSERT INTO public.tooth_examinations VALUES ('4aadccbc-f51a-4536-a270-0fb761c98e9a', '10000000-0000-4000-8000-000000000103', 11, 'Deep Caries', NULL, 'd1111111-1111-1111-1111-111111111111', '2026-06-20 23:38:01.448549', true);
INSERT INTO public.tooth_examinations VALUES ('187a3f51-6df0-4ce9-82ba-3fd0ab8558ed', '10000000-0000-4000-8000-000000000102', 11, 'Caries', NULL, 'd1111111-1111-1111-1111-111111111111', '2026-06-21 00:43:04.682499', true);
INSERT INTO public.tooth_examinations VALUES ('ff2e23fb-6726-4724-9976-9c55db73d2da', '10000000-0000-4000-8000-000000000102', 28, 'Caries', NULL, 'd1111111-1111-1111-1111-111111111111', '2026-06-21 00:43:13.4804', true);
INSERT INTO public.tooth_examinations VALUES ('dc6b0f2f-4a1c-413e-9ddc-906a701568a7', '10000000-0000-4000-8000-000000000102', 28, 'Erosion', NULL, 'd1111111-1111-1111-1111-111111111111', '2026-06-21 00:43:15.125349', true);
INSERT INTO public.tooth_examinations VALUES ('2c622833-4f3a-4cdd-b4e8-c108e4a3ef15', '10000000-0000-4000-8000-000000000102', 12, 'Caries', NULL, 'd1111111-1111-1111-1111-111111111111', '2026-06-22 22:40:43.558763', true);
INSERT INTO public.tooth_examinations VALUES ('6c34730a-45cf-49e7-a54c-bbc914cccb5c', '10000000-0000-4000-8000-000000000102', 13, 'Mobility Grade 2', NULL, 'd1111111-1111-1111-1111-111111111111', '2026-06-22 23:35:27.488618', true);
INSERT INTO public.tooth_examinations VALUES ('a022f736-fbf1-475c-8963-9a5594cc728d', '257303ab-e6d0-49d0-9caf-e058550c7edf', 33, 'Caries', NULL, 'd1111111-1111-1111-1111-111111111111', '2026-07-06 13:30:40.146159', true);
INSERT INTO public.tooth_examinations VALUES ('65177804-77ac-4db2-854b-8d69f684a1bf', '257303ab-e6d0-49d0-9caf-e058550c7edf', 21, 'Food Impaction', NULL, 'd1111111-1111-1111-1111-111111111111', '2026-07-06 14:16:43.893578', true);
INSERT INTO public.tooth_examinations VALUES ('31f3006e-0d14-4810-b534-d00cab88b254', '257303ab-e6d0-49d0-9caf-e058550c7edf', 22, 'Caries', NULL, 'd1111111-1111-1111-1111-111111111111', '2026-07-06 14:41:23.594151', true);
INSERT INTO public.tooth_examinations VALUES ('9d53cf56-7b70-4224-a863-3397d553b182', '257303ab-e6d0-49d0-9caf-e058550c7edf', 25, 'Caries', NULL, 'd1111111-1111-1111-1111-111111111111', '2026-07-06 15:57:48.783791', false);
INSERT INTO public.tooth_examinations VALUES ('65c4973c-68b4-4c59-b97e-b0e7b6cfdfae', '257303ab-e6d0-49d0-9caf-e058550c7edf', 21, 'Caries', NULL, 'd1111111-1111-1111-1111-111111111111', '2026-07-06 19:09:53.489901', true);
INSERT INTO public.tooth_examinations VALUES ('43428d26-06d7-45f1-b493-68d1dd99469d', '257303ab-e6d0-49d0-9caf-e058550c7edf', 22, 'Caries', NULL, 'd1111111-1111-1111-1111-111111111111', '2026-07-06 19:09:53.519022', true);
INSERT INTO public.tooth_examinations VALUES ('49ad724a-7ad3-4679-8f79-d4dafa13e788', '257303ab-e6d0-49d0-9caf-e058550c7edf', 23, 'Caries', NULL, 'd1111111-1111-1111-1111-111111111111', '2026-07-06 19:09:53.53592', false);
INSERT INTO public.tooth_examinations VALUES ('9b47c349-b554-409c-9f6c-60973a31ee29', '257303ab-e6d0-49d0-9caf-e058550c7edf', 14, 'Caries', NULL, 'd1111111-1111-1111-1111-111111111111', '2026-07-06 19:09:52.471845', false);
INSERT INTO public.tooth_examinations VALUES ('8a99bb4a-0ca5-4a49-841b-52e5eac001db', '257303ab-e6d0-49d0-9caf-e058550c7edf', 18, 'Caries', NULL, 'd1111111-1111-1111-1111-111111111111', '2026-07-06 19:09:52.219026', false);
INSERT INTO public.tooth_examinations VALUES ('58536771-fe2d-4ba2-92bd-93cd99a7e1cd', '257303ab-e6d0-49d0-9caf-e058550c7edf', 17, 'Caries', NULL, 'd1111111-1111-1111-1111-111111111111', '2026-07-06 19:09:52.360192', false);
INSERT INTO public.tooth_examinations VALUES ('788375d0-3f63-4b13-9f76-bdcd33d356d5', '257303ab-e6d0-49d0-9caf-e058550c7edf', 16, 'Caries', NULL, 'd1111111-1111-1111-1111-111111111111', '2026-07-06 19:09:52.403853', false);
INSERT INTO public.tooth_examinations VALUES ('2ad83f9f-7b01-4a82-89af-8aa9c42b2ffc', '257303ab-e6d0-49d0-9caf-e058550c7edf', 15, 'Caries', NULL, 'd1111111-1111-1111-1111-111111111111', '2026-07-06 19:09:52.438233', false);
INSERT INTO public.tooth_examinations VALUES ('a1a626f9-9fdf-4403-af05-404d99efeaef', '257303ab-e6d0-49d0-9caf-e058550c7edf', 12, 'Caries', NULL, 'd1111111-1111-1111-1111-111111111111', '2026-07-06 19:09:53.45722', false);
INSERT INTO public.tooth_examinations VALUES ('4446e78b-74bb-4f6a-9bc1-934ea1c12d45', '257303ab-e6d0-49d0-9caf-e058550c7edf', 11, 'Caries', NULL, 'd1111111-1111-1111-1111-111111111111', '2026-07-06 19:09:53.475253', false);
INSERT INTO public.tooth_examinations VALUES ('a95d543a-c566-49f5-8edd-b7cd4eaacff6', '257303ab-e6d0-49d0-9caf-e058550c7edf', 23, 'Caries', NULL, 'd1111111-1111-1111-1111-111111111111', '2026-07-06 19:06:16.04179', false);
INSERT INTO public.tooth_examinations VALUES ('383b6cb2-f08f-4a31-a013-b2216be592d4', '257303ab-e6d0-49d0-9caf-e058550c7edf', 24, 'Caries', NULL, 'd1111111-1111-1111-1111-111111111111', '2026-07-06 19:09:53.545937', false);
INSERT INTO public.tooth_examinations VALUES ('49fa8698-3c9a-4d79-8adf-2837b0ebd1b8', '257303ab-e6d0-49d0-9caf-e058550c7edf', 25, 'Caries', NULL, 'd1111111-1111-1111-1111-111111111111', '2026-07-06 19:09:53.555217', false);
INSERT INTO public.tooth_examinations VALUES ('9e550071-3560-4247-b7c0-c35168e13c05', '257303ab-e6d0-49d0-9caf-e058550c7edf', 26, 'Caries', NULL, 'd1111111-1111-1111-1111-111111111111', '2026-07-06 19:09:53.565322', false);
INSERT INTO public.tooth_examinations VALUES ('8a1a0be8-64b0-43cc-92dc-63c7fee933dd', '257303ab-e6d0-49d0-9caf-e058550c7edf', 27, 'Caries', NULL, 'd1111111-1111-1111-1111-111111111111', '2026-07-06 19:09:53.575645', false);
INSERT INTO public.tooth_examinations VALUES ('cfb2a525-07bb-49b7-a4f0-0d36e02d5621', '257303ab-e6d0-49d0-9caf-e058550c7edf', 28, 'Caries', NULL, 'd1111111-1111-1111-1111-111111111111', '2026-07-06 19:09:53.586225', false);
INSERT INTO public.tooth_examinations VALUES ('a92d44d9-4c12-4507-a918-da222d94a75d', '257303ab-e6d0-49d0-9caf-e058550c7edf', 18, 'Caries', NULL, 'd1111111-1111-1111-1111-111111111111', '2026-07-06 19:39:49.482224', false);
INSERT INTO public.tooth_examinations VALUES ('33a37221-31d9-418e-8572-ae8318efd934', '257303ab-e6d0-49d0-9caf-e058550c7edf', 17, 'Caries', NULL, 'd1111111-1111-1111-1111-111111111111', '2026-07-06 19:39:49.495622', false);
INSERT INTO public.tooth_examinations VALUES ('b8d5a52b-9963-49e0-bb93-aa7a5723c8a1', '257303ab-e6d0-49d0-9caf-e058550c7edf', 16, 'Caries', NULL, 'd1111111-1111-1111-1111-111111111111', '2026-07-06 19:39:49.505505', false);
INSERT INTO public.tooth_examinations VALUES ('383907cc-2816-45fb-8b56-ff52c1b6808a', '257303ab-e6d0-49d0-9caf-e058550c7edf', 15, 'Caries', NULL, 'd1111111-1111-1111-1111-111111111111', '2026-07-06 19:39:49.514646', false);
INSERT INTO public.tooth_examinations VALUES ('5ede302b-6fb0-4100-a77f-acf92d6803b8', '257303ab-e6d0-49d0-9caf-e058550c7edf', 14, 'Caries', NULL, 'd1111111-1111-1111-1111-111111111111', '2026-07-06 19:39:49.524522', false);
INSERT INTO public.tooth_examinations VALUES ('1b7aa745-3aad-432a-88f0-28c24b9bc05f', '257303ab-e6d0-49d0-9caf-e058550c7edf', 13, 'Caries', NULL, 'd1111111-1111-1111-1111-111111111111', '2026-07-06 19:09:53.439913', false);
INSERT INTO public.tooth_examinations VALUES ('b63d2b13-20b0-4762-a2ec-708ac4510abc', '257303ab-e6d0-49d0-9caf-e058550c7edf', 13, 'Caries', NULL, 'd1111111-1111-1111-1111-111111111111', '2026-07-06 19:39:49.535412', false);
INSERT INTO public.tooth_examinations VALUES ('251a6660-85aa-4d07-b5d3-0257093e1105', '257303ab-e6d0-49d0-9caf-e058550c7edf', 12, 'Caries', NULL, 'd1111111-1111-1111-1111-111111111111', '2026-07-06 19:39:49.546441', false);
INSERT INTO public.tooth_examinations VALUES ('ab1025ac-0222-4a68-98f3-7567f64270e4', '257303ab-e6d0-49d0-9caf-e058550c7edf', 11, 'Caries', NULL, 'd1111111-1111-1111-1111-111111111111', '2026-07-06 19:39:49.555366', false);
INSERT INTO public.tooth_examinations VALUES ('12e79e80-2367-43e2-9fd0-2bfbc77916ce', '257303ab-e6d0-49d0-9caf-e058550c7edf', 23, 'Deep Caries', NULL, 'd1111111-1111-1111-1111-111111111111', '2026-07-10 17:40:37.792207', true);


--
-- Data for Name: tooth_issue_catalog; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.tooth_issue_catalog VALUES ('29b5b766-d092-44fe-91b4-b01f28378210', 'Caries', true, '2026-06-11 16:44:17.008134');
INSERT INTO public.tooth_issue_catalog VALUES ('e0f3a593-41df-4649-bd0e-c033b3ddebc0', 'Deep Caries', true, '2026-06-11 16:44:17.008134');
INSERT INTO public.tooth_issue_catalog VALUES ('d15ff3e9-6e0f-4f7c-a642-2d090ad82697', 'Fracture', true, '2026-06-11 16:44:17.008134');
INSERT INTO public.tooth_issue_catalog VALUES ('528b590c-b356-4503-9e50-02ad3f5ae29f', 'Missing Tooth', true, '2026-06-11 16:44:17.008134');
INSERT INTO public.tooth_issue_catalog VALUES ('6f99e74a-b9f7-4a69-bacb-26f25c50c8a1', 'Pain', true, '2026-06-11 16:44:17.008134');
INSERT INTO public.tooth_issue_catalog VALUES ('ec6e2bf9-9ed5-494f-8157-9aa862880ef8', 'Sensitivity', true, '2026-06-11 16:44:17.008134');
INSERT INTO public.tooth_issue_catalog VALUES ('6fce0256-34c0-4799-9c47-5892000274f5', 'Swelling', true, '2026-06-11 16:44:17.008134');
INSERT INTO public.tooth_issue_catalog VALUES ('aad3fd3a-6742-4443-b05c-b85341b031f2', 'Mobility', true, '2026-06-11 16:44:17.008134');
INSERT INTO public.tooth_issue_catalog VALUES ('8bc69f3e-1161-4337-99b5-049796a79023', 'Bleeding Gums', true, '2026-06-11 16:44:17.008134');
INSERT INTO public.tooth_issue_catalog VALUES ('47a521d3-cf15-4baa-92c1-bfe6e5600aa1', 'Other', true, '2026-06-11 16:44:17.008134');


--
-- Data for Name: tooth_observations; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: tooth_treatments; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.tooth_treatments VALUES ('971d3db1-18af-4b3d-970d-85a8413a0852', '10000000-0000-4000-8000-000000000101', 42, '20000000-0000-4000-8000-000000000101', NULL, 'Bridge (per unit)', NULL, 'planned', NULL, '2026-06-20 22:39:34.55124', NULL, NULL, NULL, '7b8627a9-1738-4de2-8efa-f235afa5bb86', 'bridge');
INSERT INTO public.tooth_treatments VALUES ('d8db2cd1-d6a7-461d-a2e5-fd0c958dabc3', '10000000-0000-4000-8000-000000000103', 12, '20000000-0000-4000-8000-000000000103', NULL, 'Bridge (per unit)', NULL, 'planned', NULL, '2026-06-20 23:40:01.399346', NULL, NULL, NULL, '7ba33b0d-e332-4fbc-bce6-704542edbe2a', 'bridge');
INSERT INTO public.tooth_treatments VALUES ('80c40aa1-41eb-42bb-a9e9-eee4cfa108b5', '10000000-0000-4000-8000-000000000103', 12, '20000000-0000-4000-8000-000000000103', NULL, 'Crown - PFM', NULL, 'planned', NULL, '2026-06-20 23:41:01.90721', NULL, NULL, NULL, 'ab36bd0a-0aef-4770-bc8e-38aa0619fa6a', 'crown');
INSERT INTO public.tooth_treatments VALUES ('996c4760-0919-4b48-8fbe-705196e0f677', '10000000-0000-4000-8000-000000000103', 11, '20000000-0000-4000-8000-000000000103', NULL, 'Bridge (per unit)', NULL, 'in_progress', NULL, '2026-06-20 23:40:39.115034', NULL, NULL, NULL, 'e45dda86-03bf-4882-951a-a7a38548b9eb', 'bridge');
INSERT INTO public.tooth_treatments VALUES ('74237bff-5d81-45d0-a4d4-4cdaacd78d36', '10000000-0000-4000-8000-000000000102', 28, '20000000-0000-4000-8000-000000000102', NULL, 'RCT', NULL, 'planned', NULL, '2026-06-21 00:43:21.664884', NULL, NULL, NULL, '6a6d36e6-cb2c-4d2c-b2ef-3d07fbef737a', 'rct');
INSERT INTO public.tooth_treatments VALUES ('e9c3707e-b16d-4994-9cf9-b1d7a7574565', '10000000-0000-4000-8000-000000000102', 11, '20000000-0000-4000-8000-000000000102', NULL, 'Filling', NULL, 'planned', NULL, '2026-06-21 00:43:29.956431', NULL, NULL, NULL, 'a9c40434-4308-4553-a208-1333941f43fb', 'filling');
INSERT INTO public.tooth_treatments VALUES ('10f3bd4f-81d3-40c7-aebc-f7e2de17d6a7', '10000000-0000-4000-8000-000000000102', 12, '20000000-0000-4000-8000-000000000102', NULL, 'Flap Surgery', NULL, 'planned', NULL, '2026-06-22 22:40:48.422771', NULL, NULL, NULL, '92e3947b-b68c-425a-9943-98bdf961ec03', 'other');
INSERT INTO public.tooth_treatments VALUES ('7196dcde-936e-47e2-85f7-68bdbd707ebf', '10000000-0000-4000-8000-000000000102', 12, '20000000-0000-4000-8000-000000000102', NULL, 'Root Canal (RCT)', NULL, 'planned', NULL, '2026-06-22 22:40:52.202579', NULL, NULL, NULL, 'a99f187d-c151-44d7-98b7-104b41a2cbc6', 'rct');
INSERT INTO public.tooth_treatments VALUES ('426f5d4d-b689-4d0c-b36d-52a4cbbecd4a', '257303ab-e6d0-49d0-9caf-e058550c7edf', 33, '550b58b6-4578-4209-b119-33692846a430', NULL, 'Scaling', NULL, 'planned', NULL, '2026-07-06 20:17:35.660434', NULL, NULL, NULL, '8f9ea39e-2e29-43b5-861d-33268ffe8daa', 'scaling');
INSERT INTO public.tooth_treatments VALUES ('fa7be0cc-92d4-46ee-a364-cc993bb32255', '257303ab-e6d0-49d0-9caf-e058550c7edf', 22, '550b58b6-4578-4209-b119-33692846a430', NULL, 'Flap Surgery', NULL, 'planned', NULL, '2026-07-06 20:17:37.270838', NULL, NULL, NULL, '9e5ac1bf-2d82-4125-9ca7-741898d1542b', 'other');
INSERT INTO public.tooth_treatments VALUES ('af54aee7-dc75-436b-a2da-8bff82476f61', '257303ab-e6d0-49d0-9caf-e058550c7edf', 21, '550b58b6-4578-4209-b119-33692846a430', NULL, 'RCT', NULL, 'planned', NULL, '2026-07-06 20:17:39.023843', NULL, NULL, NULL, '3cb851f6-5980-41dd-8c49-f433fb70a6b6', 'rct');
INSERT INTO public.tooth_treatments VALUES ('eb2d7de3-8734-4ec3-9f16-ae66774cd893', '257303ab-e6d0-49d0-9caf-e058550c7edf', 21, '550b58b6-4578-4209-b119-33692846a430', NULL, 'Dressing', NULL, 'planned', NULL, '2026-07-06 20:17:39.891648', NULL, NULL, NULL, 'ad671553-2ab2-487f-9f7e-a68cbcd6f9a1', 'other');
INSERT INTO public.tooth_treatments VALUES ('ae53e61d-2399-40bf-bde5-cb58ee73d69c', '257303ab-e6d0-49d0-9caf-e058550c7edf', 21, '550b58b6-4578-4209-b119-33692846a430', NULL, 'Complete Denture', NULL, 'planned', NULL, '2026-07-06 20:17:41.433915', NULL, NULL, NULL, '92749342-a2c3-47f0-9e23-b3f607a70523', 'other');
INSERT INTO public.tooth_treatments VALUES ('e114981c-9e30-4fe4-af9e-e52e121244bc', '257303ab-e6d0-49d0-9caf-e058550c7edf', 21, '550b58b6-4578-4209-b119-33692846a430', NULL, 'Extraction - Surgical', NULL, 'planned', NULL, '2026-07-07 15:33:05.08937', NULL, NULL, NULL, '495069bd-4ce6-4f29-9e4e-031d98c9e410', 'extraction');
INSERT INTO public.tooth_treatments VALUES ('d7c04b51-5735-4f2e-90d1-c6121d17ecae', '257303ab-e6d0-49d0-9caf-e058550c7edf', 21, '550b58b6-4578-4209-b119-33692846a430', NULL, 'Extraction - Surgical', NULL, 'planned', NULL, '2026-07-07 15:33:13.386187', NULL, NULL, NULL, '2ce2cd19-db20-4426-9e50-efc6bade0df2', 'extraction');
INSERT INTO public.tooth_treatments VALUES ('b39c787e-b91e-4af4-a213-a543778a5c0d', '257303ab-e6d0-49d0-9caf-e058550c7edf', 21, '550b58b6-4578-4209-b119-33692846a430', NULL, 'Crown - Zirconia', NULL, 'planned', NULL, '2026-07-10 17:42:04.233243', NULL, NULL, NULL, '42f1dd81-38a1-46d1-982d-497aea0d8d22', 'crown');
INSERT INTO public.tooth_treatments VALUES ('1e5b1a0c-9156-4a0b-b499-21e1473f4de7', '257303ab-e6d0-49d0-9caf-e058550c7edf', 23, '550b58b6-4578-4209-b119-33692846a430', NULL, 'Extraction', NULL, 'planned', NULL, '2026-07-10 17:42:20.597313', NULL, NULL, NULL, 'a38da722-da27-430e-a130-03ec55824d91', 'extraction');


--
-- Data for Name: treatment_plan_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.treatment_plan_items VALUES ('dfc2ffcd-177a-4b5e-8998-d2540152a91e', '20000000-0000-4000-8000-000000000103', NULL, 'Scaling', '11', 0.00, NULL, 'cancelled', NULL, '2026-06-20 23:39:07.518449+05:30', NULL, NULL, NULL, '[11]', NULL, 0.00, 0.00, 0.00, 0.00, '[]', '2026-06-20 23:40:24.422086', '[]', 'Calculus', 'Deep Caries', false, NULL, 'routine', NULL, false);
INSERT INTO public.treatment_plan_items VALUES ('6a6d36e6-cb2c-4d2c-b2ef-3d07fbef737a', '20000000-0000-4000-8000-000000000102', NULL, 'RCT', '28', 0.00, NULL, 'advised', NULL, '2026-06-21 00:43:21.664884+05:30', NULL, NULL, NULL, '[28]', NULL, 0.00, 0.00, 0.00, 0.00, '[]', '2026-06-21 00:43:21.664884', '[]', 'Deep Caries', 'Caries, Erosion', false, NULL, 'routine', NULL, false);
INSERT INTO public.treatment_plan_items VALUES ('a9c40434-4308-4553-a208-1333941f43fb', '20000000-0000-4000-8000-000000000102', NULL, 'Filling', '11', 0.00, NULL, 'advised', NULL, '2026-06-21 00:43:29.956431+05:30', NULL, NULL, NULL, '[11]', NULL, 0.00, 0.00, 0.00, 0.00, '[]', '2026-06-21 00:43:29.956431', '[]', 'Calculus, Deep Caries', 'Caries', false, NULL, 'routine', NULL, false);
INSERT INTO public.treatment_plan_items VALUES ('7cbed7af-86fe-428c-bc39-3d3494d3b889', '550b58b6-4578-4209-b119-33692846a430', NULL, 'Scaling', '18', 0.00, NULL, 'cancelled', NULL, '2026-07-06 19:39:57.836182+05:30', NULL, NULL, NULL, '[18, 17, 16, 15, 14, 13, 12, 11]', NULL, 0.00, 0.00, 0.00, 0.00, '[]', '2026-07-06 19:40:19.008476', '[]', 'Calculus, Calculus, Calculus, Calculus, Calculus, Calculus, Calculus, Calculus', 'Caries, Caries, Caries, Caries, Caries, Caries, Caries, Caries, Caries', false, NULL, 'routine', NULL, false);
INSERT INTO public.treatment_plan_items VALUES ('7ba33b0d-e332-4fbc-bce6-704542edbe2a', '20000000-0000-4000-8000-000000000103', NULL, 'Bridge (per unit)', '12', 0.00, NULL, 'advised', NULL, '2026-06-20 23:38:58.007886+05:30', NULL, NULL, NULL, '[12]', NULL, 5000.00, 5000.00, 0.00, 5000.00, '[]', '2026-06-20 23:40:01.399346', '[]', 'Calculus', 'Caries', false, NULL, 'routine', NULL, true);
INSERT INTO public.treatment_plan_items VALUES ('ab36bd0a-0aef-4770-bc8e-38aa0619fa6a', '20000000-0000-4000-8000-000000000103', NULL, 'Crown - PFM', '12', 0.00, NULL, 'advised', NULL, '2026-06-20 23:40:48.915835+05:30', NULL, NULL, NULL, '[12]', NULL, 4000.00, 5000.00, 0.00, 5000.00, '[]', '2026-06-20 23:41:01.90721', '[]', NULL, NULL, false, NULL, 'routine', NULL, true);
INSERT INTO public.treatment_plan_items VALUES ('e45dda86-03bf-4882-951a-a7a38548b9eb', '20000000-0000-4000-8000-000000000103', '20000000-0000-4000-8000-000000000013', 'Bridge (per unit)', '11', 0.00, NULL, 'advised', NULL, '2026-06-20 23:40:39.115034+05:30', NULL, NULL, NULL, '[11]', NULL, 5000.00, 5000.00, 0.00, 5000.00, '["Tooth Preparation", "Impression"]', '2026-06-20 23:47:00.476725', '[]', NULL, NULL, false, NULL, 'routine', NULL, true);
INSERT INTO public.treatment_plan_items VALUES ('7b8627a9-1738-4de2-8efa-f235afa5bb86', '20000000-0000-4000-8000-000000000101', '20000000-0000-4000-8000-000000000013', 'Bridge (per unit)', '42', 0.00, NULL, 'advised', NULL, '2026-06-20 22:39:34.55124+05:30', NULL, NULL, NULL, '[42]', NULL, 5000.00, 5000.00, 0.00, 5000.00, '[]', '2026-06-21 00:33:30.981908', '[]', NULL, NULL, true, 'approved', 'routine', NULL, true);
INSERT INTO public.treatment_plan_items VALUES ('92e3947b-b68c-425a-9943-98bdf961ec03', '20000000-0000-4000-8000-000000000102', '20000000-0000-4000-8000-000000000026', 'Flap Surgery', '12', 0.00, NULL, 'advised', NULL, '2026-06-22 22:40:48.422771+05:30', NULL, NULL, NULL, '[12]', NULL, 5000.00, 5000.00, 0.00, 5000.00, '[]', '2026-06-22 22:40:48.422771', '[]', 'Calculus', 'Caries', false, NULL, 'routine', NULL, true);
INSERT INTO public.treatment_plan_items VALUES ('a99f187d-c151-44d7-98b7-104b41a2cbc6', '20000000-0000-4000-8000-000000000102', '20000000-0000-4000-8000-000000000008', 'Root Canal (RCT)', '12', 0.00, NULL, 'advised', NULL, '2026-06-22 22:40:52.202579+05:30', NULL, NULL, NULL, '[12]', NULL, 5000.00, 5000.00, 0.00, 5000.00, '[]', '2026-06-22 22:40:52.202579', '[]', 'Calculus', 'Caries', false, NULL, 'routine', NULL, true);
INSERT INTO public.treatment_plan_items VALUES ('1e0d53fb-2355-47ef-ac50-b514209a960a', '550b58b6-4578-4209-b119-33692846a430', '20000000-0000-4000-8000-000000000021', 'Braces - Metal', '32', 0.00, NULL, 'cancelled', NULL, '2026-07-06 13:52:18.637523+05:30', NULL, NULL, NULL, '[32]', NULL, 35000.00, 35000.00, 0.00, 35000.00, '[]', '2026-07-06 13:53:05.701503', '[]', '', '', false, NULL, 'routine', NULL, true);
INSERT INTO public.treatment_plan_items VALUES ('84c9d3d7-525a-4ca4-9b2c-0afd251f71d3', '550b58b6-4578-4209-b119-33692846a430', '20000000-0000-4000-8000-000000000008', 'Root Canal (RCT)', '13', 0.00, NULL, 'cancelled', NULL, '2026-07-06 13:30:46.050012+05:30', NULL, NULL, NULL, '[13]', NULL, 5000.00, 5000.00, 0.00, 5000.00, '[]', '2026-07-06 19:40:35.946562', '[]', 'Calculus', 'Caries', false, NULL, 'routine', NULL, true);
INSERT INTO public.treatment_plan_items VALUES ('88016439-0fb1-45bf-adf1-ba04687b2d24', '550b58b6-4578-4209-b119-33692846a430', '20000000-0000-4000-8000-000000000006', 'Filling - GIC', '21', 0.00, NULL, 'cancelled', NULL, '2026-07-06 20:04:13.676753+05:30', NULL, NULL, NULL, '[21]', NULL, 600.00, 600.00, 0.00, 600.00, '[]', '2026-07-06 20:04:19.759785', '[]', 'Deep Caries', 'Food Impaction, Caries', false, NULL, 'routine', NULL, true);
INSERT INTO public.treatment_plan_items VALUES ('8f9ea39e-2e29-43b5-861d-33268ffe8daa', '550b58b6-4578-4209-b119-33692846a430', NULL, 'Scaling', '33', 0.00, NULL, 'advised', '', '2026-07-06 13:31:29.536116+05:30', NULL, NULL, NULL, '[33]', NULL, 10.00, 10.00, 0.00, 10.00, '[]', '2026-07-06 20:17:35.660434', '[]', 'Calculus', 'Caries', false, NULL, 'routine', NULL, true);
INSERT INTO public.treatment_plan_items VALUES ('1ef79770-9387-4d22-9221-4724cc69e438', '550b58b6-4578-4209-b119-33692846a430', '20000000-0000-4000-8000-000000000026', 'Flap Surgery', '33', 0.00, NULL, 'cancelled', NULL, '2026-07-06 13:31:34.227035+05:30', NULL, NULL, NULL, '[33]', NULL, 5000.00, 5000.00, 0.00, 5000.00, '[]', '2026-07-06 18:52:16.659433', '[]', 'Calculus', 'Caries', false, NULL, 'routine', NULL, true);
INSERT INTO public.treatment_plan_items VALUES ('9e5ac1bf-2d82-4125-9ca7-741898d1542b', '550b58b6-4578-4209-b119-33692846a430', '20000000-0000-4000-8000-000000000026', 'Flap Surgery', '22', 0.00, NULL, 'advised', '', '2026-07-06 14:41:27.846696+05:30', NULL, NULL, NULL, '[22]', NULL, 5000.00, 5000.00, 0.00, 5000.00, '[]', '2026-07-06 20:17:37.270838', '[]', 'Calculus', 'Caries', false, NULL, 'routine', NULL, true);
INSERT INTO public.treatment_plan_items VALUES ('3cb851f6-5980-41dd-8c49-f433fb70a6b6', '550b58b6-4578-4209-b119-33692846a430', NULL, 'RCT', '21', 0.00, NULL, 'advised', '', '2026-07-06 20:07:17.347936+05:30', NULL, NULL, NULL, '[21]', NULL, 10.00, 10.00, 0.00, 10.00, '[]', '2026-07-06 20:17:39.023843', '[]', 'Deep Caries', 'Food Impaction, Caries', false, NULL, 'routine', NULL, true);
INSERT INTO public.treatment_plan_items VALUES ('ad671553-2ab2-487f-9f7e-a68cbcd6f9a1', '550b58b6-4578-4209-b119-33692846a430', 'cfaac738-ecec-4fbc-b951-5838680f471b', 'Dressing', '21', 0.00, NULL, 'advised', '', '2026-07-06 14:16:55.114016+05:30', NULL, NULL, NULL, '[21]', NULL, 300.00, 300.00, 0.00, 300.00, '[]', '2026-07-06 20:17:39.891648', '[]', 'Deep Caries', 'Food Impaction', false, NULL, 'routine', NULL, true);
INSERT INTO public.treatment_plan_items VALUES ('92749342-a2c3-47f0-9e23-b3f607a70523', '550b58b6-4578-4209-b119-33692846a430', '20000000-0000-4000-8000-000000000014', 'Complete Denture', '21', 0.00, NULL, 'advised', '', '2026-07-06 14:16:47.15974+05:30', NULL, NULL, NULL, '[21]', NULL, 10000.00, 10000.00, 0.00, 10000.00, '[]', '2026-07-06 20:17:41.433915', '[]', 'Deep Caries', 'Food Impaction', false, NULL, 'routine', NULL, true);
INSERT INTO public.treatment_plan_items VALUES ('495069bd-4ce6-4f29-9e4e-031d98c9e410', '550b58b6-4578-4209-b119-33692846a430', '20000000-0000-4000-8000-000000000017', 'Extraction - Surgical', '21', 0.00, NULL, 'advised', NULL, '2026-07-07 15:33:05.08937+05:30', NULL, NULL, NULL, '[21]', NULL, 3000.00, 3000.00, 0.00, 3000.00, '[]', '2026-07-07 15:33:05.08937', '[]', 'Deep Caries', 'Food Impaction, Caries', false, NULL, 'routine', NULL, true);
INSERT INTO public.treatment_plan_items VALUES ('2ce2cd19-db20-4426-9e50-efc6bade0df2', '550b58b6-4578-4209-b119-33692846a430', '20000000-0000-4000-8000-000000000017', 'Extraction - Surgical', '21', 0.00, NULL, 'advised', NULL, '2026-07-07 15:33:13.386187+05:30', NULL, NULL, NULL, '[21]', NULL, 3000.00, 3000.00, 0.00, 3000.00, '[]', '2026-07-07 15:33:13.386187', '[]', 'Deep Caries', 'Food Impaction, Caries', false, NULL, 'routine', NULL, true);
INSERT INTO public.treatment_plan_items VALUES ('4f490f84-2e52-4051-bdbb-dcf5246d9d19', '550b58b6-4578-4209-b119-33692846a430', NULL, 'Smoke Test Treatment', '11', 0.00, NULL, 'cancelled', NULL, '2026-07-07 15:34:21.860953+05:30', NULL, NULL, NULL, '[11]', NULL, 1.00, 1.00, 0.00, 1.00, '[]', '2026-07-07 15:34:21.904433', '[]', NULL, NULL, false, NULL, 'routine', NULL, true);
INSERT INTO public.treatment_plan_items VALUES ('30dbdfa1-647f-4af3-abe0-6bac29e4a85c', '550b58b6-4578-4209-b119-33692846a430', '20000000-0000-4000-8000-000000000007', 'Filling - Composite', '21', 0.00, NULL, 'cancelled', '', '2026-07-07 15:33:29.360562+05:30', NULL, NULL, NULL, '[21]', NULL, 1200.00, 1200.00, 0.00, 1200.00, '[]', '2026-07-10 17:41:49.923553', '[]', 'Deep Caries', 'Food Impaction, Caries', false, NULL, 'routine', NULL, true);
INSERT INTO public.treatment_plan_items VALUES ('42f1dd81-38a1-46d1-982d-497aea0d8d22', '550b58b6-4578-4209-b119-33692846a430', '20000000-0000-4000-8000-000000000012', 'Crown - Zirconia', '21', 0.00, NULL, 'advised', '', '2026-07-06 14:16:52.530466+05:30', NULL, NULL, NULL, '[21]', NULL, 10000.00, 10000.00, 500.00, 9500.00, '[]', '2026-07-10 17:42:04.233243', '[]', 'Deep Caries', 'Food Impaction', false, NULL, 'routine', NULL, true);
INSERT INTO public.treatment_plan_items VALUES ('a38da722-da27-430e-a130-03ec55824d91', '550b58b6-4578-4209-b119-33692846a430', NULL, 'Extraction', '23', 0.00, NULL, 'advised', '', '2026-07-10 17:40:43.209253+05:30', NULL, NULL, NULL, '[23]', NULL, 500.00, 500.00, 0.00, 500.00, '[]', '2026-07-10 17:42:20.597313', '[]', 'Impacted Tooth', 'Deep Caries', false, NULL, 'routine', NULL, true);


--
-- Data for Name: treatment_plans; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.treatment_plans VALUES ('20000000-0000-4000-8000-000000000101', '10000000-0000-4000-8000-000000000101', 'a1111111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111', 'RCT Upper Molar', 'Pain in upper right molar', 'Deep caries requiring RCT', 5000.00, 0.00, 0.00, 5000.00, 0.00, 4500.00, 2, 0, 'treatment_started', NULL, NULL, NULL, '2026-06-20 22:37:56.623683+05:30', '2026-06-20 22:39:34.55124+05:30', '[]', 'RCT Upper Molar', false, NULL, 0);
INSERT INTO public.treatment_plans VALUES ('20000000-0000-4000-8000-000000000103', '10000000-0000-4000-8000-000000000103', 'a1111111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111', 'Crown Follow-up', 'Loose temporary crown', 'Temporary crown review and recementation', 15000.00, 0.00, 0.00, 15000.00, 0.00, 1000.00, 2, 2, 'in_progress', NULL, NULL, NULL, '2026-06-20 22:37:56.623683+05:30', '2026-06-20 23:47:00.476725+05:30', '[]', 'Crown Follow-up', false, NULL, 0);
INSERT INTO public.treatment_plans VALUES ('20000000-0000-4000-8000-000000000102', '10000000-0000-4000-8000-000000000102', 'a1111111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111', 'Scaling Consultation', 'Bleeding gums', 'Generalized gingivitis', 10000.00, 0.00, 0.00, 10000.00, 0.00, 1500.00, 1, 0, 'treatment_advised', NULL, NULL, NULL, '2026-06-20 22:37:56.623683+05:30', '2026-06-22 22:40:52.202579+05:30', '[]', 'Scaling Consultation', false, NULL, 0);
INSERT INTO public.treatment_plans VALUES ('550b58b6-4578-4209-b119-33692846a430', '257303ab-e6d0-49d0-9caf-e058550c7edf', 'a1111111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111', 'Treatment Plan — 06 Jul 2026', NULL, NULL, 31320.00, 0.00, 0.00, 31320.00, 0.00, 0.00, 1, 0, 'treatment_advised', NULL, NULL, NULL, '2026-07-06 13:30:46.050012+05:30', '2026-07-10 17:42:20.597313+05:30', '[]', NULL, false, NULL, 0);


--
-- Data for Name: treatment_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.treatment_sessions VALUES ('a2cdc120-b2fd-49a0-b2a7-de77f9381107', '10000000-0000-4000-8000-000000000101', 'd1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', '30000000-0000-4000-8000-000000000101', NULL, NULL, NULL, '2026-06-20 22:40:33.9048', '2026-06-20 22:40:33.9048', '[]', NULL, NULL, 500.00, NULL, false, 'completed', NULL, '2026-06-20 22:40:47.484261', 'd1111111-1111-1111-1111-111111111111', 500.00, 0.00, '[]', '2026-06-20 22:40:33.9048', 0.00, NULL);
INSERT INTO public.treatment_sessions VALUES ('479069ee-e38a-499f-94e8-9907a208e07a', '10000000-0000-4000-8000-000000000101', 'd1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', '5607d539-d841-4ff4-88d7-10ea8b601215', NULL, NULL, NULL, '2026-06-20 22:41:46.582534', '2026-06-20 22:42:11.99367', '[]', NULL, NULL, 100.00, NULL, false, 'completed', NULL, '2026-06-20 22:42:22.22418', 'd1111111-1111-1111-1111-111111111111', 100.00, 0.00, '[]', '2026-06-20 22:41:46.582534', 0.00, NULL);
INSERT INTO public.treatment_sessions VALUES ('cbf099e0-d194-4f65-829f-4228e5e69569', '10000000-0000-4000-8000-000000000101', 'd1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', '2a3a29ad-4b20-4a7e-a538-8d668e541d28', NULL, NULL, NULL, '2026-06-20 22:43:22.090277', NULL, '[]', NULL, NULL, 0.00, NULL, false, 'in_progress', NULL, NULL, NULL, 0.00, 0.00, '[]', '2026-06-20 22:43:22.090277', 0.00, NULL);
INSERT INTO public.treatment_sessions VALUES ('ed98d664-efe0-4473-8f32-7db50ab4011a', '10000000-0000-4000-8000-000000000103', 'd1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', '30000000-0000-4000-8000-000000000103', NULL, NULL, NULL, '2026-06-20 23:36:45.502521', '2026-06-20 23:47:00.476725', '[{"step": "Tooth Preparation", "teeth": [11], "item_id": "e45dda86-03bf-4882-951a-a7a38548b9eb", "treatment": "Bridge (per unit)", "item_completed": false}, {"step": "Impression", "teeth": [11], "item_id": "e45dda86-03bf-4882-951a-a7a38548b9eb", "treatment": "Bridge (per unit)", "item_completed": false}]', NULL, NULL, 500.00, NULL, false, 'completed', NULL, '2026-06-20 23:47:44.689168', 'd1111111-1111-1111-1111-111111111111', 500.00, 0.00, '[]', '2026-06-20 23:36:45.502521', 0.00, NULL);
INSERT INTO public.treatment_sessions VALUES ('57ba63cb-76c0-4707-9808-c6683793e2e8', '10000000-0000-4000-8000-000000000103', 'd1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'eb71a482-4d0d-4822-b905-fd4459abe57b', NULL, NULL, NULL, '2026-06-20 23:52:17.683759', NULL, '[]', NULL, NULL, 0.00, NULL, false, 'in_progress', NULL, NULL, NULL, 0.00, 0.00, '[]', '2026-06-20 23:52:17.683759', 0.00, NULL);
INSERT INTO public.treatment_sessions VALUES ('7750f8f6-5740-4176-94a9-672877837626', '10000000-0000-4000-8000-000000000101', 'd1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', '2a3a29ad-4b20-4a7e-a538-8d668e541d28', NULL, NULL, NULL, '2026-06-20 23:56:13.538804', NULL, '[]', NULL, NULL, 0.00, NULL, false, 'in_progress', NULL, NULL, NULL, 0.00, 0.00, '[]', '2026-06-20 23:56:13.538804', 0.00, NULL);


--
-- Data for Name: treatment_sittings; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: treatment_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.treatment_templates VALUES ('23595535-593e-4aca-a14d-feee1089dd26', 'a1111111-1111-1111-1111-111111111111', 'RCT + Crown', 'Single-tooth RCT followed by Zirconia crown', '[{"discount": 0, "doctor_rate": 4500, "suggested_rate": 4500, "treatment_name": "RCT", "teeth_placeholder": true}, {"discount": 0, "doctor_rate": 3500, "suggested_rate": 3500, "treatment_name": "Crown", "teeth_placeholder": true}]', 0, NULL, '2026-06-12 09:20:22.955498', true, 'RCT + Crown', NULL, 1, NULL, '[]', '[]', NULL, '2026-06-17 13:29:36.39001+05:30');
INSERT INTO public.treatment_templates VALUES ('e4fac3c8-4edb-4282-8cc8-5327f2c85ac5', 'a1111111-1111-1111-1111-111111111111', 'Full Mouth Scaling + Polish', 'Routine cleaning package', '[{"discount": 0, "area_label": "Full Mouth", "doctor_rate": 1200, "suggested_rate": 1200, "treatment_name": "Scaling"}]', 0, NULL, '2026-06-12 09:20:22.955498', true, 'Full Mouth Scaling + Polish', NULL, 1, NULL, '[]', '[]', NULL, '2026-06-17 13:29:36.39001+05:30');
INSERT INTO public.treatment_templates VALUES ('13c39e51-2607-447b-a5f5-8e7d11fdd835', 'a1111111-1111-1111-1111-111111111111', 'Orthodontic Review (6-week)', 'Routine ortho adjustment', '[{"discount": 0, "doctor_rate": 500, "suggested_rate": 500, "treatment_name": "Orthodontic Review"}]', 0, NULL, '2026-06-12 09:20:22.955498', true, 'Orthodontic Review (6-week)', NULL, 1, NULL, '[]', '[]', NULL, '2026-06-17 13:29:36.39001+05:30');
INSERT INTO public.treatment_templates VALUES ('7f59607d-a44c-4d1b-82bf-96e560121b54', 'a1111111-1111-1111-1111-111111111111', 'Emergency Pain Management', 'Pain relief + diagnosis', '[{"discount": 0, "doctor_rate": 300, "suggested_rate": 300, "treatment_name": "Consultation"}, {"discount": 0, "doctor_rate": 300, "suggested_rate": 300, "treatment_name": "Dressing", "teeth_placeholder": true}]', 0, NULL, '2026-06-12 09:20:22.955498', true, 'Emergency Pain Management', NULL, 1, NULL, '[]', '[]', NULL, '2026-06-17 13:29:36.39001+05:30');
INSERT INTO public.treatment_templates VALUES ('0e6ccdd2-0f5c-46e5-bc69-09a95c4c4da0', 'a1111111-1111-1111-1111-111111111111', 'Single-Sitting RCT', 'Single visit RCT', '[]', 0, NULL, '2026-06-17 13:29:36.39001', true, 'Single-Sitting RCT', 'endodontic', 1, 4500.00, '[{"notes": "Full procedure", "sitting_no": 1, "procedure_name": "Access + BMP + Obturation"}]', '[]', 'Soft diet for 24 hrs.', '2026-06-17 13:29:36.39001+05:30');
INSERT INTO public.treatment_templates VALUES ('3dfa13ce-21e7-4cb0-bc99-96be4cbe9018', 'a1111111-1111-1111-1111-111111111111', 'Composite Filling', 'Direct composite restoration', '[]', 0, NULL, '2026-06-17 13:29:36.39001', true, 'Composite Filling', 'restorative', 1, 1200.00, '[{"notes": "Shade match", "sitting_no": 1, "procedure_name": "Cavity Prep + Composite Fill"}]', '[]', 'Avoid hot/cold for 24 hrs.', '2026-06-17 13:29:36.39001+05:30');
INSERT INTO public.treatment_templates VALUES ('4abbff2f-e9f9-48c5-ac3b-ef568ce20d51', 'a1111111-1111-1111-1111-111111111111', 'Crown (PFM, 2-sitting)', 'Tooth preparation + cementation', '[]', 0, NULL, '2026-06-17 13:29:36.39001', true, 'Crown (PFM, 2-sitting)', 'prosthetic', 2, 8000.00, '[{"notes": "Temp crown", "sitting_no": 1, "procedure_name": "Tooth Preparation + Impression"}, {"notes": "Occlusion check", "sitting_no": 2, "procedure_name": "Crown Cementation"}]', '[]', 'Soft diet 24 hrs.', '2026-06-17 13:29:36.39001+05:30');
INSERT INTO public.treatment_templates VALUES ('a0c66b6c-a228-4f30-be8f-4e30fc2f2db2', 'a1111111-1111-1111-1111-111111111111', 'Scaling + Polishing', 'Full mouth scaling', '[]', 0, NULL, '2026-06-17 13:29:36.39001', true, 'Scaling + Polishing', 'periodontic', 1, 1500.00, '[{"notes": "Both arches", "sitting_no": 1, "procedure_name": "Ultrasonic Scaling + Polishing"}]', '[]', 'Salt water rinse 3x/day.', '2026-06-17 13:29:36.39001+05:30');
INSERT INTO public.treatment_templates VALUES ('1725fa9f-8725-4f83-8a39-ed8cb2b1fbc3', 'a1111111-1111-1111-1111-111111111111', 'Extraction (Simple)', 'Simple extraction', '[]', 0, NULL, '2026-06-17 13:29:36.39001', true, 'Extraction (Simple)', 'surgical', 1, 1000.00, '[{"notes": "LA, post-op instructions", "sitting_no": 1, "procedure_name": "Simple Extraction"}]', '[]', 'Bite on gauze 30 min.', '2026-06-17 13:29:36.39001+05:30');
INSERT INTO public.treatment_templates VALUES ('23b92679-485f-4c8c-973f-0033de4c8470', 'a1111111-1111-1111-1111-111111111111', 'Wisdom Tooth Extraction', 'Surgical 3rd molar removal', '[]', 0, NULL, '2026-06-17 13:29:36.39001', true, 'Wisdom Tooth Extraction', 'surgical', 1, 4000.00, '[{"notes": "LA, flap if needed", "sitting_no": 1, "procedure_name": "Surgical Extraction + Suturing"}]', '[]', 'Ice pack first day.', '2026-06-17 13:29:36.39001+05:30');
INSERT INTO public.treatment_templates VALUES ('4a1c8ad6-02e0-437d-9a6a-61a34f29d29a', 'a1111111-1111-1111-1111-111111111111', 'Zirconia Crown (2-sitting)', 'Premium crown', '[]', 0, NULL, '2026-06-17 13:29:36.39001', true, 'Zirconia Crown (2-sitting)', 'prosthetic', 2, 14000.00, '[{"notes": "Temp crown", "sitting_no": 1, "procedure_name": "Tooth Preparation + Digital Impression"}, {"notes": "Occlusion adjustment", "sitting_no": 2, "procedure_name": "Zirconia Crown Cementation"}]', '[]', 'Avoid biting hard items on crown.', '2026-06-17 13:29:36.39001+05:30');
INSERT INTO public.treatment_templates VALUES ('99f1e6ac-d725-4b13-a42d-53c23f22e719', 'b2222222-2222-2222-2222-222222222222', 'Root Canal Treatment (3-sitting)', 'Standard RCT protocol', '[]', 0, NULL, '2026-06-17 13:29:36.39001', true, 'Root Canal Treatment (3-sitting)', 'endodontic', 3, 5500.00, '[{"notes": "Local anesthesia", "sitting_no": 1, "procedure_name": "Access Opening + Working Length"}, {"notes": "Intracanal medicament", "sitting_no": 2, "procedure_name": "BMP + Cleaning"}, {"notes": "Final seal", "sitting_no": 3, "procedure_name": "Obturation"}]', '[]', 'Avoid hard food on treated tooth.', '2026-06-17 13:29:36.39001+05:30');
INSERT INTO public.treatment_templates VALUES ('ada563a3-39b8-4047-9af0-be6fef8f2452', 'a1111111-1111-1111-1111-111111111111', 'Root Canal Treatment (3-sitting)', 'Standard RCT protocol', '[]', 5, NULL, '2026-06-17 13:29:36.39001', true, 'Root Canal Treatment (3-sitting)', 'endodontic', 3, 5500.00, '[{"notes": "Local anesthesia", "sitting_no": 1, "procedure_name": "Access Opening + Working Length"}, {"notes": "Intracanal medicament", "sitting_no": 2, "procedure_name": "BMP + Cleaning"}, {"notes": "Final seal", "sitting_no": 3, "procedure_name": "Obturation"}]', '[]', 'Avoid hard food on treated tooth.', '2026-06-17 13:29:36.39001+05:30');
INSERT INTO public.treatment_templates VALUES ('e783b79f-8d48-4d97-a757-1033df303797', 'a1111111-1111-1111-1111-111111111111', 'Implant Workup', 'Consultation + diagnostic prep for implant', '[{"discount": 0, "doctor_rate": 300, "suggested_rate": 300, "treatment_name": "Consultation"}, {"discount": 0, "doctor_rate": 25000, "suggested_rate": 25000, "treatment_name": "Implant", "teeth_placeholder": true}]', 2, NULL, '2026-06-12 09:20:22.955498', true, 'Implant Workup', NULL, 1, NULL, '[]', '[]', NULL, '2026-06-17 13:29:36.39001+05:30');
INSERT INTO public.treatment_templates VALUES ('e76078b6-2ef8-44aa-917b-0b52e85d88c8', 'b2222222-2222-2222-2222-222222222222', 'Single-Sitting RCT', 'Single visit RCT', '[]', 0, NULL, '2026-06-17 13:29:36.39001', true, 'Single-Sitting RCT', 'endodontic', 1, 4500.00, '[{"notes": "Full procedure", "sitting_no": 1, "procedure_name": "Access + BMP + Obturation"}]', '[]', 'Soft diet for 24 hrs.', '2026-06-17 13:29:36.39001+05:30');
INSERT INTO public.treatment_templates VALUES ('3d62be52-55b0-4d88-9a94-fded286180ec', 'b2222222-2222-2222-2222-222222222222', 'Composite Filling', 'Direct composite restoration', '[]', 0, NULL, '2026-06-17 13:29:36.39001', true, 'Composite Filling', 'restorative', 1, 1200.00, '[{"notes": "Shade match", "sitting_no": 1, "procedure_name": "Cavity Prep + Composite Fill"}]', '[]', 'Avoid hot/cold for 24 hrs.', '2026-06-17 13:29:36.39001+05:30');
INSERT INTO public.treatment_templates VALUES ('97371a46-685a-4eac-8007-951dfeab20cc', 'b2222222-2222-2222-2222-222222222222', 'Crown (PFM, 2-sitting)', 'Tooth preparation + cementation', '[]', 0, NULL, '2026-06-17 13:29:36.39001', true, 'Crown (PFM, 2-sitting)', 'prosthetic', 2, 8000.00, '[{"notes": "Temp crown", "sitting_no": 1, "procedure_name": "Tooth Preparation + Impression"}, {"notes": "Occlusion check", "sitting_no": 2, "procedure_name": "Crown Cementation"}]', '[]', 'Soft diet 24 hrs.', '2026-06-17 13:29:36.39001+05:30');
INSERT INTO public.treatment_templates VALUES ('77acb03d-6c0b-42e4-ba09-e0ccec7734f2', 'b2222222-2222-2222-2222-222222222222', 'Scaling + Polishing', 'Full mouth scaling', '[]', 0, NULL, '2026-06-17 13:29:36.39001', true, 'Scaling + Polishing', 'periodontic', 1, 1500.00, '[{"notes": "Both arches", "sitting_no": 1, "procedure_name": "Ultrasonic Scaling + Polishing"}]', '[]', 'Salt water rinse 3x/day.', '2026-06-17 13:29:36.39001+05:30');
INSERT INTO public.treatment_templates VALUES ('147898c1-bcf1-42da-b62a-f15de88daea5', 'b2222222-2222-2222-2222-222222222222', 'Extraction (Simple)', 'Simple extraction', '[]', 0, NULL, '2026-06-17 13:29:36.39001', true, 'Extraction (Simple)', 'surgical', 1, 1000.00, '[{"notes": "LA, post-op instructions", "sitting_no": 1, "procedure_name": "Simple Extraction"}]', '[]', 'Bite on gauze 30 min.', '2026-06-17 13:29:36.39001+05:30');
INSERT INTO public.treatment_templates VALUES ('8b74c7a2-a95a-40bc-a800-72ccb57c644c', 'b2222222-2222-2222-2222-222222222222', 'Wisdom Tooth Extraction', 'Surgical 3rd molar removal', '[]', 0, NULL, '2026-06-17 13:29:36.39001', true, 'Wisdom Tooth Extraction', 'surgical', 1, 4000.00, '[{"notes": "LA, flap if needed", "sitting_no": 1, "procedure_name": "Surgical Extraction + Suturing"}]', '[]', 'Ice pack first day.', '2026-06-17 13:29:36.39001+05:30');
INSERT INTO public.treatment_templates VALUES ('3ce88ac1-79cd-4a45-a1b2-7da434b7bb4e', 'b2222222-2222-2222-2222-222222222222', 'Zirconia Crown (2-sitting)', 'Premium crown', '[]', 0, NULL, '2026-06-17 13:29:36.39001', true, 'Zirconia Crown (2-sitting)', 'prosthetic', 2, 14000.00, '[{"notes": "Temp crown", "sitting_no": 1, "procedure_name": "Tooth Preparation + Digital Impression"}, {"notes": "Occlusion adjustment", "sitting_no": 2, "procedure_name": "Zirconia Crown Cementation"}]', '[]', 'Avoid biting hard items on crown.', '2026-06-17 13:29:36.39001+05:30');


--
-- Data for Name: walk_in_patients; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: workspace_drafts; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.workspace_drafts VALUES ('a0000003-0000-0000-0000-000000000003', '{"adjAmt": "", "advice": "Follow doctor instructions", "rxMeds": [], "ticked": [{"step": "Specialist assessment completed", "item_id": "c3a950cd-72dd-4a2c-97e8-21fdaf02f46a", "treatment": "Specialist flow verification", "item_completed": true}], "adjReason": "", "complaint": "Wisdom tooth", "visitNotes": "SS completed specialist workflow verification", "collectToday": ""}', '2026-06-20 17:59:57.351621');
INSERT INTO public.workspace_drafts VALUES ('10000000-0000-4000-8000-000000000102', '{"adjAmt": "", "advice": "", "rxMeds": [{"dose": "1 tablet", "name": "Aceclofenac+Paracetamol", "duration": "3 days", "strength": "100+325mg", "frequency": "Twice daily", "instructions": "After meals.."}], "ticked": [], "adjReason": "", "complaint": "Tooth Pain", "visitNotes": "", "collectToday": ""}', '2026-06-22 23:38:15.365222');
INSERT INTO public.workspace_drafts VALUES ('257303ab-e6d0-49d0-9caf-e058550c7edf', '{"adjAmt": "", "advice": "", "rxMeds": [{"dose": "Three times daily", "name": "Clotrimazole Paint", "duration": "7 days", "strength": "1%", "frequency": "Three times daily", "instructions": "On affected area after meals."}], "ticked": [{"step": "Completed", "teeth": [33], "item_id": "8f9ea39e-2e29-43b5-861d-33268ffe8daa", "treatment": "Scaling", "item_completed": true}], "adjReason": "", "complaint": "", "visitNotes": "dsgsdgg", "collectToday": ""}', '2026-07-10 17:43:24.51634');


--
-- Name: appointment_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.appointment_requests_id_seq', 4, true);


--
-- Name: clinic_info_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.clinic_info_id_seq', 13, true);


--
-- Name: lab_orders_serial_no_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.lab_orders_serial_no_seq', 6, true);


--
-- Name: patient_uploads_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.patient_uploads_id_seq', 1, false);


--
-- Name: appointment_call_logs appointment_call_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointment_call_logs
    ADD CONSTRAINT appointment_call_logs_pkey PRIMARY KEY (id);


--
-- Name: appointment_history appointment_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointment_history
    ADD CONSTRAINT appointment_history_pkey PRIMARY KEY (id);


--
-- Name: appointment_message_logs appointment_message_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointment_message_logs
    ADD CONSTRAINT appointment_message_logs_pkey PRIMARY KEY (id);


--
-- Name: appointment_requests appointment_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointment_requests
    ADD CONSTRAINT appointment_requests_pkey PRIMARY KEY (id);


--
-- Name: appointment_types appointment_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointment_types
    ADD CONSTRAINT appointment_types_pkey PRIMARY KEY (id);


--
-- Name: appointment_types appointment_types_type_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointment_types
    ADD CONSTRAINT appointment_types_type_name_key UNIQUE (type_name);


--
-- Name: appointments appointments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_pkey PRIMARY KEY (id);


--
-- Name: ar_preview_settings ar_preview_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ar_preview_settings
    ADD CONSTRAINT ar_preview_settings_pkey PRIMARY KEY (id);


--
-- Name: bot_config bot_config_clinic_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bot_config
    ADD CONSTRAINT bot_config_clinic_id_key UNIQUE (clinic_id);


--
-- Name: bot_config bot_config_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bot_config
    ADD CONSTRAINT bot_config_pkey PRIMARY KEY (id);


--
-- Name: bot_event_log bot_event_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bot_event_log
    ADD CONSTRAINT bot_event_log_pkey PRIMARY KEY (id);


--
-- Name: business_hours business_hours_clinic_id_weekday_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_hours
    ADD CONSTRAINT business_hours_clinic_id_weekday_key UNIQUE (clinic_id, weekday);


--
-- Name: business_hours business_hours_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_hours
    ADD CONSTRAINT business_hours_pkey PRIMARY KEY (id);


--
-- Name: clinic_content clinic_content_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinic_content
    ADD CONSTRAINT clinic_content_pkey PRIMARY KEY (id);


--
-- Name: clinic_holidays clinic_holidays_clinic_id_holiday_date_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinic_holidays
    ADD CONSTRAINT clinic_holidays_clinic_id_holiday_date_key UNIQUE (clinic_id, holiday_date);


--
-- Name: clinic_holidays clinic_holidays_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinic_holidays
    ADD CONSTRAINT clinic_holidays_pkey PRIMARY KEY (id);


--
-- Name: clinic_info_ext clinic_info_ext_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinic_info_ext
    ADD CONSTRAINT clinic_info_ext_pkey PRIMARY KEY (clinic_id);


--
-- Name: clinic_info clinic_info_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinic_info
    ADD CONSTRAINT clinic_info_key_key UNIQUE (key);


--
-- Name: clinic_info clinic_info_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinic_info
    ADD CONSTRAINT clinic_info_pkey PRIMARY KEY (id);


--
-- Name: clinic_notifications clinic_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinic_notifications
    ADD CONSTRAINT clinic_notifications_pkey PRIMARY KEY (id);


--
-- Name: clinic_page_sections clinic_page_sections_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinic_page_sections
    ADD CONSTRAINT clinic_page_sections_pkey PRIMARY KEY (id);


--
-- Name: clinic_pages clinic_pages_clinic_id_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinic_pages
    ADD CONSTRAINT clinic_pages_clinic_id_slug_key UNIQUE (clinic_id, slug);


--
-- Name: clinic_pages clinic_pages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinic_pages
    ADD CONSTRAINT clinic_pages_pkey PRIMARY KEY (id);


--
-- Name: clinic_settings clinic_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinic_settings
    ADD CONSTRAINT clinic_settings_pkey PRIMARY KEY (clinic_id);


--
-- Name: clinical_link_scores clinical_link_scores_link_type_source_key_target_key_clinic_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinical_link_scores
    ADD CONSTRAINT clinical_link_scores_link_type_source_key_target_key_clinic_key UNIQUE (link_type, source_key, target_key, clinic_id);


--
-- Name: clinical_link_scores clinical_link_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinical_link_scores
    ADD CONSTRAINT clinical_link_scores_pkey PRIMARY KEY (id);


--
-- Name: clinics clinics_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinics
    ADD CONSTRAINT clinics_pkey PRIMARY KEY (id);


--
-- Name: common_complaints common_complaints_complaint_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.common_complaints
    ADD CONSTRAINT common_complaints_complaint_name_key UNIQUE (complaint_name);


--
-- Name: common_complaints common_complaints_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.common_complaints
    ADD CONSTRAINT common_complaints_pkey PRIMARY KEY (id);


--
-- Name: common_conditions common_conditions_condition_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.common_conditions
    ADD CONSTRAINT common_conditions_condition_name_key UNIQUE (condition_name);


--
-- Name: common_conditions common_conditions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.common_conditions
    ADD CONSTRAINT common_conditions_pkey PRIMARY KEY (id);


--
-- Name: communication_log communication_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.communication_log
    ADD CONSTRAINT communication_log_pkey PRIMARY KEY (id);


--
-- Name: dashboard_widget_prefs dashboard_widget_prefs_clinic_id_staff_id_widget_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dashboard_widget_prefs
    ADD CONSTRAINT dashboard_widget_prefs_clinic_id_staff_id_widget_key_key UNIQUE (clinic_id, staff_id, widget_key);


--
-- Name: dashboard_widget_prefs dashboard_widget_prefs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dashboard_widget_prefs
    ADD CONSTRAINT dashboard_widget_prefs_pkey PRIMARY KEY (id);


--
-- Name: diagnosis_catalog diagnosis_catalog_diagnosis_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.diagnosis_catalog
    ADD CONSTRAINT diagnosis_catalog_diagnosis_name_key UNIQUE (diagnosis_name);


--
-- Name: diagnosis_catalog diagnosis_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.diagnosis_catalog
    ADD CONSTRAINT diagnosis_catalog_pkey PRIMARY KEY (id);


--
-- Name: examination_catalog examination_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.examination_catalog
    ADD CONSTRAINT examination_catalog_pkey PRIMARY KEY (id);


--
-- Name: examination_finding_catalog examination_finding_catalog_finding_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.examination_finding_catalog
    ADD CONSTRAINT examination_finding_catalog_finding_name_key UNIQUE (finding_name);


--
-- Name: examination_finding_catalog examination_finding_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.examination_finding_catalog
    ADD CONSTRAINT examination_finding_catalog_pkey PRIMARY KEY (id);


--
-- Name: fee_schedule_overrides fee_schedule_overrides_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fee_schedule_overrides
    ADD CONSTRAINT fee_schedule_overrides_pkey PRIMARY KEY (id);


--
-- Name: follow_ups follow_ups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.follow_ups
    ADD CONSTRAINT follow_ups_pkey PRIMARY KEY (id);


--
-- Name: gallery_images gallery_images_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gallery_images
    ADD CONSTRAINT gallery_images_pkey PRIMARY KEY (id);


--
-- Name: illness_library illness_library_clinic_id_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.illness_library
    ADD CONSTRAINT illness_library_clinic_id_name_key UNIQUE (clinic_id, name);


--
-- Name: illness_library illness_library_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.illness_library
    ADD CONSTRAINT illness_library_pkey PRIMARY KEY (id);


--
-- Name: image_annotations image_annotations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.image_annotations
    ADD CONSTRAINT image_annotations_pkey PRIMARY KEY (id);


--
-- Name: kanban_columns kanban_columns_clinic_id_plan_status_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kanban_columns
    ADD CONSTRAINT kanban_columns_clinic_id_plan_status_key UNIQUE (clinic_id, plan_status);


--
-- Name: kanban_columns kanban_columns_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kanban_columns
    ADD CONSTRAINT kanban_columns_pkey PRIMARY KEY (id);


--
-- Name: lab_order_payments lab_order_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lab_order_payments
    ADD CONSTRAINT lab_order_payments_pkey PRIMARY KEY (id);


--
-- Name: lab_orders lab_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lab_orders
    ADD CONSTRAINT lab_orders_pkey PRIMARY KEY (id);


--
-- Name: lab_vendors lab_vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lab_vendors
    ADD CONSTRAINT lab_vendors_pkey PRIMARY KEY (id);


--
-- Name: lab_work_types lab_work_types_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lab_work_types
    ADD CONSTRAINT lab_work_types_name_key UNIQUE (name);


--
-- Name: lab_work_types lab_work_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lab_work_types
    ADD CONSTRAINT lab_work_types_pkey PRIMARY KEY (id);


--
-- Name: media_gallery media_gallery_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.media_gallery
    ADD CONSTRAINT media_gallery_pkey PRIMARY KEY (id);


--
-- Name: media media_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.media
    ADD CONSTRAINT media_pkey PRIMARY KEY (id);


--
-- Name: medicine_catalog medicine_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.medicine_catalog
    ADD CONSTRAINT medicine_catalog_pkey PRIMARY KEY (id);


--
-- Name: medicine_reminders medicine_reminders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.medicine_reminders
    ADD CONSTRAINT medicine_reminders_pkey PRIMARY KEY (id);


--
-- Name: message_log message_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_log
    ADD CONSTRAINT message_log_pkey PRIMARY KEY (id);


--
-- Name: message_templates message_templates_clinic_id_template_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_templates
    ADD CONSTRAINT message_templates_clinic_id_template_key_key UNIQUE (clinic_id, template_key);


--
-- Name: message_templates message_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_templates
    ADD CONSTRAINT message_templates_pkey PRIMARY KEY (id);


--
-- Name: module_visibility module_visibility_clinic_id_module_key_role_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_visibility
    ADD CONSTRAINT module_visibility_clinic_id_module_key_role_key UNIQUE (clinic_id, module_key, role);


--
-- Name: module_visibility module_visibility_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_visibility
    ADD CONSTRAINT module_visibility_pkey PRIMARY KEY (id);


--
-- Name: patient_credits patient_credits_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_credits
    ADD CONSTRAINT patient_credits_pkey PRIMARY KEY (id);


--
-- Name: patient_health patient_health_patient_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_health
    ADD CONSTRAINT patient_health_patient_id_key UNIQUE (patient_id);


--
-- Name: patient_health patient_health_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_health
    ADD CONSTRAINT patient_health_pkey PRIMARY KEY (id);


--
-- Name: patient_images patient_images_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_images
    ADD CONSTRAINT patient_images_pkey PRIMARY KEY (id);


--
-- Name: patient_portal_tokens patient_portal_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_portal_tokens
    ADD CONSTRAINT patient_portal_tokens_pkey PRIMARY KEY (id);


--
-- Name: patient_portal_tokens patient_portal_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_portal_tokens
    ADD CONSTRAINT patient_portal_tokens_token_key UNIQUE (token);


--
-- Name: patient_ratings patient_ratings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_ratings
    ADD CONSTRAINT patient_ratings_pkey PRIMARY KEY (id);


--
-- Name: patient_ratings patient_ratings_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_ratings
    ADD CONSTRAINT patient_ratings_token_key UNIQUE (token);


--
-- Name: patient_uploads patient_uploads_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_uploads
    ADD CONSTRAINT patient_uploads_pkey PRIMARY KEY (id);


--
-- Name: patients patients_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_pkey PRIMARY KEY (id);


--
-- Name: payment_transactions payment_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_pkey PRIMARY KEY (id);


--
-- Name: phone_consultations phone_consultations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.phone_consultations
    ADD CONSTRAINT phone_consultations_pkey PRIMARY KEY (id);


--
-- Name: plan_revisions plan_revisions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plan_revisions
    ADD CONSTRAINT plan_revisions_pkey PRIMARY KEY (id);


--
-- Name: prescriptions prescriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_pkey PRIMARY KEY (id);


--
-- Name: procedure_catalog procedure_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.procedure_catalog
    ADD CONSTRAINT procedure_catalog_pkey PRIMARY KEY (id);


--
-- Name: procedure_medicine_map procedure_medicine_map_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.procedure_medicine_map
    ADD CONSTRAINT procedure_medicine_map_pkey PRIMARY KEY (id);


--
-- Name: procedure_medicine_map procedure_medicine_map_procedure_id_medicine_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.procedure_medicine_map
    ADD CONSTRAINT procedure_medicine_map_procedure_id_medicine_id_key UNIQUE (procedure_id, medicine_id);


--
-- Name: qr_codes qr_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.qr_codes
    ADD CONSTRAINT qr_codes_pkey PRIMARY KEY (id);


--
-- Name: qr_codes qr_codes_short_code_uq; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.qr_codes
    ADD CONSTRAINT qr_codes_short_code_uq UNIQUE (short_code);


--
-- Name: reminder_log reminder_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reminder_log
    ADD CONSTRAINT reminder_log_pkey PRIMARY KEY (id);


--
-- Name: reminder_log reminder_log_reminder_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reminder_log
    ADD CONSTRAINT reminder_log_reminder_key_key UNIQUE (reminder_key);


--
-- Name: reminder_settings reminder_settings_clinic_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reminder_settings
    ADD CONSTRAINT reminder_settings_clinic_id_key UNIQUE (clinic_id);


--
-- Name: reminder_settings reminder_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reminder_settings
    ADD CONSTRAINT reminder_settings_pkey PRIMARY KEY (id);


--
-- Name: reschedule_requests reschedule_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reschedule_requests
    ADD CONSTRAINT reschedule_requests_pkey PRIMARY KEY (id);


--
-- Name: service_catalog service_catalog_clinic_id_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_catalog
    ADD CONSTRAINT service_catalog_clinic_id_name_key UNIQUE (clinic_id, name);


--
-- Name: service_catalog service_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_catalog
    ADD CONSTRAINT service_catalog_pkey PRIMARY KEY (id);


--
-- Name: site_doctors site_doctors_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.site_doctors
    ADD CONSTRAINT site_doctors_pkey PRIMARY KEY (id);


--
-- Name: site_services site_services_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.site_services
    ADD CONSTRAINT site_services_pkey PRIMARY KEY (id);


--
-- Name: site_testimonials site_testimonials_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.site_testimonials
    ADD CONSTRAINT site_testimonials_pkey PRIMARY KEY (id);


--
-- Name: site_theme site_theme_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.site_theme
    ADD CONSTRAINT site_theme_pkey PRIMARY KEY (id);


--
-- Name: site_videos site_videos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.site_videos
    ADD CONSTRAINT site_videos_pkey PRIMARY KEY (id);


--
-- Name: smile_sessions smile_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.smile_sessions
    ADD CONSTRAINT smile_sessions_pkey PRIMARY KEY (id);


--
-- Name: specialist_earnings specialist_earnings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.specialist_earnings
    ADD CONSTRAINT specialist_earnings_pkey PRIMARY KEY (id);


--
-- Name: specialist_notifications specialist_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.specialist_notifications
    ADD CONSTRAINT specialist_notifications_pkey PRIMARY KEY (id);


--
-- Name: specialist_rate_tiers specialist_rate_tiers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.specialist_rate_tiers
    ADD CONSTRAINT specialist_rate_tiers_pkey PRIMARY KEY (id);


--
-- Name: specialist_rate_tiers specialist_rate_tiers_specialist_id_tier_name_treatment_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.specialist_rate_tiers
    ADD CONSTRAINT specialist_rate_tiers_specialist_id_tier_name_treatment_key_key UNIQUE (specialist_id, tier_name, treatment_key);


--
-- Name: staff staff_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_pkey PRIMARY KEY (id);


--
-- Name: to_be_appointed to_be_appointed_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.to_be_appointed
    ADD CONSTRAINT to_be_appointed_pkey PRIMARY KEY (id);


--
-- Name: tooth_clinical_records tooth_clinical_records_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tooth_clinical_records
    ADD CONSTRAINT tooth_clinical_records_pkey PRIMARY KEY (id);


--
-- Name: tooth_conditions tooth_conditions_patient_id_tooth_number_is_active_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tooth_conditions
    ADD CONSTRAINT tooth_conditions_patient_id_tooth_number_is_active_key UNIQUE (patient_id, tooth_number, is_active) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: tooth_conditions tooth_conditions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tooth_conditions
    ADD CONSTRAINT tooth_conditions_pkey PRIMARY KEY (id);


--
-- Name: tooth_diagnoses tooth_diagnoses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tooth_diagnoses
    ADD CONSTRAINT tooth_diagnoses_pkey PRIMARY KEY (id);


--
-- Name: tooth_examinations tooth_examinations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tooth_examinations
    ADD CONSTRAINT tooth_examinations_pkey PRIMARY KEY (id);


--
-- Name: tooth_issue_catalog tooth_issue_catalog_issue_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tooth_issue_catalog
    ADD CONSTRAINT tooth_issue_catalog_issue_name_key UNIQUE (issue_name);


--
-- Name: tooth_issue_catalog tooth_issue_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tooth_issue_catalog
    ADD CONSTRAINT tooth_issue_catalog_pkey PRIMARY KEY (id);


--
-- Name: tooth_observations tooth_observations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tooth_observations
    ADD CONSTRAINT tooth_observations_pkey PRIMARY KEY (id);


--
-- Name: tooth_treatments tooth_treatments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tooth_treatments
    ADD CONSTRAINT tooth_treatments_pkey PRIMARY KEY (id);


--
-- Name: treatment_plan_items treatment_plan_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.treatment_plan_items
    ADD CONSTRAINT treatment_plan_items_pkey PRIMARY KEY (id);


--
-- Name: treatment_plans treatment_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.treatment_plans
    ADD CONSTRAINT treatment_plans_pkey PRIMARY KEY (id);


--
-- Name: treatment_sessions treatment_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.treatment_sessions
    ADD CONSTRAINT treatment_sessions_pkey PRIMARY KEY (id);


--
-- Name: treatment_sittings treatment_sittings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.treatment_sittings
    ADD CONSTRAINT treatment_sittings_pkey PRIMARY KEY (id);


--
-- Name: treatment_templates treatment_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.treatment_templates
    ADD CONSTRAINT treatment_templates_pkey PRIMARY KEY (id);


--
-- Name: tooth_clinical_records uq_tooth_clinical_patient_tooth; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tooth_clinical_records
    ADD CONSTRAINT uq_tooth_clinical_patient_tooth UNIQUE (patient_id, tooth_number);


--
-- Name: walk_in_patients walk_in_patients_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.walk_in_patients
    ADD CONSTRAINT walk_in_patients_pkey PRIMARY KEY (id);


--
-- Name: workspace_drafts workspace_drafts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workspace_drafts
    ADD CONSTRAINT workspace_drafts_pkey PRIMARY KEY (patient_id);


--
-- Name: appointment_history_action_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX appointment_history_action_idx ON public.appointment_history USING btree (action_type);


--
-- Name: appointment_history_apt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX appointment_history_apt_idx ON public.appointment_history USING btree (appointment_id, changed_at DESC);


--
-- Name: idx_annot_image; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_annot_image ON public.image_annotations USING btree (image_id);


--
-- Name: idx_appointments_patient_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_appointments_patient_date ON public.appointments USING btree (patient_id, COALESCE(confirmed_date, requested_date) DESC);


--
-- Name: idx_apt_arrived_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_apt_arrived_at ON public.appointments USING btree (arrived_at);


--
-- Name: idx_apt_clinic_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_apt_clinic_date ON public.appointments USING btree (clinic_id, confirmed_date);


--
-- Name: idx_apt_contact_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_apt_contact_status ON public.appointments USING btree (contact_status);


--
-- Name: idx_apt_effective_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_apt_effective_date ON public.appointments USING btree (clinic_id, COALESCE(confirmed_date, requested_date));


--
-- Name: idx_apt_patient; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_apt_patient ON public.appointments USING btree (patient_id);


--
-- Name: idx_apt_req_clinic_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_apt_req_clinic_status ON public.appointment_requests USING btree (clinic_id, status, created_at DESC);


--
-- Name: idx_apt_specialist; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_apt_specialist ON public.appointments USING btree (specialist_id, scheduled_date) WHERE (specialist_id IS NOT NULL);


--
-- Name: idx_apt_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_apt_status ON public.appointments USING btree (status, clinic_id);


--
-- Name: idx_apt_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_apt_type ON public.appointments USING btree (appointment_type);


--
-- Name: idx_apt_workflow; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_apt_workflow ON public.appointments USING btree (workflow_status);


--
-- Name: idx_bot_event_log_clinic_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bot_event_log_clinic_created ON public.bot_event_log USING btree (clinic_id, created_at DESC);


--
-- Name: idx_bot_log_channel_dir; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bot_log_channel_dir ON public.bot_event_log USING btree (clinic_id, channel, direction, created_at DESC);


--
-- Name: idx_call_apt; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_call_apt ON public.appointment_call_logs USING btree (appointment_id);


--
-- Name: idx_call_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_call_status ON public.appointment_call_logs USING btree (call_status);


--
-- Name: idx_clinic_page_sections_page_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clinic_page_sections_page_order ON public.clinic_page_sections USING btree (page_id, display_order);


--
-- Name: idx_clinical_link_clinic; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clinical_link_clinic ON public.clinical_link_scores USING btree (clinic_id);


--
-- Name: idx_clinical_link_source; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clinical_link_source ON public.clinical_link_scores USING btree (link_type, source_key);


--
-- Name: idx_content_clinic_section; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_content_clinic_section ON public.clinic_content USING btree (clinic_id, section, order_idx);


--
-- Name: idx_credits_patient_unused; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_credits_patient_unused ON public.patient_credits USING btree (patient_id, is_used) WHERE (is_used = false);


--
-- Name: idx_diag_catalog_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_diag_catalog_name ON public.diagnosis_catalog USING btree (lower((name)::text)) WHERE is_active;


--
-- Name: idx_dwp_clinic_staff; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_dwp_clinic_staff ON public.dashboard_widget_prefs USING btree (clinic_id, staff_id);


--
-- Name: idx_exam_catalog_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_exam_catalog_name ON public.examination_catalog USING btree (lower((name)::text)) WHERE is_active;


--
-- Name: idx_fee_override_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_fee_override_active ON public.fee_schedule_overrides USING btree (clinic_id, is_active, valid_from, valid_until);


--
-- Name: idx_followups_clinic_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_followups_clinic_date ON public.follow_ups USING btree (clinic_id, follow_up_date, status);


--
-- Name: idx_followups_patient; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_followups_patient ON public.follow_ups USING btree (patient_id, follow_up_date DESC);


--
-- Name: idx_gallery_clinic_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gallery_clinic_order ON public.gallery_images USING btree (clinic_id, category, order_idx) WHERE is_active;


--
-- Name: idx_health_patient; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_health_patient ON public.patient_health USING btree (patient_id);


--
-- Name: idx_image_patient; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_image_patient ON public.patient_images USING btree (patient_id);


--
-- Name: idx_image_tooth; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_image_tooth ON public.patient_images USING btree (linked_tooth_number);


--
-- Name: idx_image_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_image_type ON public.patient_images USING btree (image_type);


--
-- Name: idx_lab_orders_appointment; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lab_orders_appointment ON public.lab_orders USING btree (appointment_id);


--
-- Name: idx_lab_orders_patient; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lab_orders_patient ON public.lab_orders USING btree (patient_id, created_at DESC);


--
-- Name: idx_lab_orders_pending; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lab_orders_pending ON public.lab_orders USING btree (status, expected_date) WHERE ((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('sent'::character varying)::text]));


--
-- Name: idx_lab_vendors_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lab_vendors_active ON public.lab_vendors USING btree (is_active, name);


--
-- Name: idx_med_catalog_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_med_catalog_active ON public.medicine_catalog USING btree (is_active, category);


--
-- Name: idx_media_gallery_clinic_taken; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_media_gallery_clinic_taken ON public.media_gallery USING btree (clinic_id, taken_at DESC);


--
-- Name: idx_media_gallery_patient_taken; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_media_gallery_patient_taken ON public.media_gallery USING btree (patient_id, taken_at DESC);


--
-- Name: idx_media_gallery_patient_tooth; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_media_gallery_patient_tooth ON public.media_gallery USING btree (patient_id, tooth_number);


--
-- Name: idx_medicine_catalog_name_trgm; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_medicine_catalog_name_trgm ON public.medicine_catalog USING gin (lower((name)::text) public.gin_trgm_ops);


--
-- Name: idx_medicine_catalog_usage; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_medicine_catalog_usage ON public.medicine_catalog USING btree (usage_count DESC, name);


--
-- Name: idx_msg_apt; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_msg_apt ON public.appointment_message_logs USING btree (appointment_id);


--
-- Name: idx_msg_log_appointment; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_msg_log_appointment ON public.message_log USING btree (appointment_id);


--
-- Name: idx_msg_log_clinic; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_msg_log_clinic ON public.message_log USING btree (clinic_id, created_at DESC);


--
-- Name: idx_msg_log_lab_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_msg_log_lab_order ON public.message_log USING btree (lab_order_id);


--
-- Name: idx_msg_log_recipient; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_msg_log_recipient ON public.message_log USING btree (recipient_kind, recipient_id, created_at DESC);


--
-- Name: idx_msg_log_scheduled; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_msg_log_scheduled ON public.message_log USING btree (status, scheduled_for) WHERE ((status)::text = 'queued'::text);


--
-- Name: idx_msg_tpl_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_msg_tpl_key ON public.message_templates USING btree (template_key, is_active);


--
-- Name: idx_notif_clinic_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notif_clinic_type ON public.clinic_notifications USING btree (clinic_id, notification_type);


--
-- Name: idx_notif_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notif_created ON public.clinic_notifications USING btree (created_at DESC);


--
-- Name: idx_notif_recipient; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notif_recipient ON public.clinic_notifications USING btree (recipient_staff_id, is_read);


--
-- Name: idx_patient_auto_delete; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patient_auto_delete ON public.patients USING btree (auto_delete_at) WHERE (auto_delete_at IS NOT NULL);


--
-- Name: idx_patients_clinic_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patients_clinic_active ON public.patients USING btree (preferred_clinic_id, is_active, created_at DESC) WHERE (is_active = true);


--
-- Name: idx_patients_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patients_name ON public.patients USING btree (name);


--
-- Name: idx_patients_name_trgm; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patients_name_trgm ON public.patients USING gin (lower((name)::text) public.gin_trgm_ops);


--
-- Name: idx_patients_phone; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patients_phone ON public.patients USING btree (phone);


--
-- Name: idx_patients_phone_trgm; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patients_phone_trgm ON public.patients USING gin (phone public.gin_trgm_ops);


--
-- Name: idx_pay_txn_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pay_txn_date ON public.payment_transactions USING btree (date, clinic_id);


--
-- Name: idx_pay_txn_patient; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pay_txn_patient ON public.payment_transactions USING btree (patient_id);


--
-- Name: idx_pay_txn_plan; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pay_txn_plan ON public.payment_transactions USING btree (plan_id);


--
-- Name: idx_payments_patient_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payments_patient_created ON public.payment_transactions USING btree (patient_id, created_at DESC);


--
-- Name: idx_payments_patient_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payments_patient_date ON public.payment_transactions USING btree (patient_id, date DESC);


--
-- Name: idx_phone_consult_clinic; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_phone_consult_clinic ON public.phone_consultations USING btree (clinic_id, status, created_at DESC);


--
-- Name: idx_phone_consult_payment; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_phone_consult_payment ON public.phone_consultations USING btree (payment_status, created_at DESC);


--
-- Name: idx_plan_items; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_plan_items ON public.treatment_plan_items USING btree (plan_id);


--
-- Name: idx_plan_rev; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_plan_rev ON public.plan_revisions USING btree (plan_id, revision_number);


--
-- Name: idx_plans_patient; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_plans_patient ON public.treatment_plans USING btree (patient_id);


--
-- Name: idx_plans_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_plans_status ON public.treatment_plans USING btree (status, clinic_id);


--
-- Name: idx_portal_tokens_patient; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_portal_tokens_patient ON public.patient_portal_tokens USING btree (patient_id);


--
-- Name: idx_portal_tokens_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_portal_tokens_token ON public.patient_portal_tokens USING btree (token);


--
-- Name: idx_prescriptions_patient; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_prescriptions_patient ON public.prescriptions USING btree (patient_id);


--
-- Name: idx_prescriptions_patient_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_prescriptions_patient_created ON public.prescriptions USING btree (patient_id, created_at DESC);


--
-- Name: idx_prescriptions_patient_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_prescriptions_patient_date ON public.prescriptions USING btree (patient_id, created_at DESC);


--
-- Name: idx_proc_catalog_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_proc_catalog_active ON public.procedure_catalog USING btree (is_active, category);


--
-- Name: idx_qr_codes_clinic; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_qr_codes_clinic ON public.qr_codes USING btree (clinic_id);


--
-- Name: idx_qr_codes_kind_target; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_qr_codes_kind_target ON public.qr_codes USING btree (kind, target_id);


--
-- Name: idx_ratings_patient; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ratings_patient ON public.patient_ratings USING btree (patient_id, submitted_at DESC);


--
-- Name: idx_ratings_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ratings_token ON public.patient_ratings USING btree (token);


--
-- Name: idx_reminder_log_clinic_fired; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reminder_log_clinic_fired ON public.reminder_log USING btree (clinic_id, fired_at DESC);


--
-- Name: idx_reschedule_clinic_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reschedule_clinic_status ON public.reschedule_requests USING btree (clinic_id, status, created_at DESC);


--
-- Name: idx_rx_diagnoses_list_gin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rx_diagnoses_list_gin ON public.prescriptions USING gin (diagnoses_list);


--
-- Name: idx_service_cat_clinic; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_service_cat_clinic ON public.service_catalog USING btree (clinic_id, category, is_active);


--
-- Name: idx_session_clinic_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_session_clinic_date ON public.treatment_sessions USING btree (clinic_id, started_at);


--
-- Name: idx_session_patient; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_session_patient ON public.treatment_sessions USING btree (patient_id);


--
-- Name: idx_session_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_session_status ON public.treatment_sessions USING btree (status);


--
-- Name: idx_site_videos_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_site_videos_active ON public.site_videos USING btree (category, order_idx) WHERE is_active;


--
-- Name: idx_sittings_plan; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sittings_plan ON public.treatment_sittings USING btree (plan_id);


--
-- Name: idx_sittings_plan_num; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sittings_plan_num ON public.treatment_sittings USING btree (plan_id, sitting_number);


--
-- Name: idx_spec_earn_settled; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_spec_earn_settled ON public.specialist_earnings USING btree (is_settled, specialist_id);


--
-- Name: idx_spec_earn_specialist; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_spec_earn_specialist ON public.specialist_earnings USING btree (specialist_id, earned_on DESC);


--
-- Name: idx_spec_tiers_specialist; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_spec_tiers_specialist ON public.specialist_rate_tiers USING btree (specialist_id, is_active);


--
-- Name: idx_staff_clinic_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_staff_clinic_role ON public.staff USING btree (clinic_id, role, is_active);


--
-- Name: idx_tba_clinic_resolved; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tba_clinic_resolved ON public.to_be_appointed USING btree (clinic_id, is_resolved);


--
-- Name: idx_tba_patient; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tba_patient ON public.to_be_appointed USING btree (patient_id);


--
-- Name: idx_templates_clinic; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_templates_clinic ON public.treatment_templates USING btree (clinic_id, is_active);


--
-- Name: idx_tooth_clinical_patient; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tooth_clinical_patient ON public.tooth_clinical_records USING btree (patient_id, tooth_number);


--
-- Name: idx_tooth_cond_patient; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tooth_cond_patient ON public.tooth_conditions USING btree (patient_id);


--
-- Name: idx_tooth_diag_patient; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tooth_diag_patient ON public.tooth_diagnoses USING btree (patient_id, tooth_number) WHERE is_active;


--
-- Name: idx_tooth_exam_patient; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tooth_exam_patient ON public.tooth_examinations USING btree (patient_id, tooth_number) WHERE is_active;


--
-- Name: idx_tooth_obs_patient; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tooth_obs_patient ON public.tooth_observations USING btree (patient_id, status);


--
-- Name: idx_tooth_obs_tooth; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tooth_obs_tooth ON public.tooth_observations USING btree (patient_id, tooth_number, status);


--
-- Name: idx_tooth_patient; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tooth_patient ON public.tooth_conditions USING btree (patient_id);


--
-- Name: idx_tooth_treatments_kind; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tooth_treatments_kind ON public.tooth_treatments USING btree (patient_id, tooth_number, treatment_kind);


--
-- Name: idx_tooth_tx_item; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tooth_tx_item ON public.tooth_treatments USING btree (plan_item_id);


--
-- Name: idx_tooth_tx_patient; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tooth_tx_patient ON public.tooth_treatments USING btree (patient_id);


--
-- Name: idx_tooth_tx_plan; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tooth_tx_plan ON public.tooth_treatments USING btree (treatment_plan_id);


--
-- Name: idx_treatment_plans_patient; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_treatment_plans_patient ON public.treatment_plans USING btree (patient_id, is_archived, status);


--
-- Name: idx_treatment_plans_patient_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_treatment_plans_patient_created ON public.treatment_plans USING btree (patient_id, created_at DESC);


--
-- Name: idx_treatment_templates_bundle_u; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_treatment_templates_bundle_u ON public.treatment_templates USING btree (clinic_id, is_active, template_name);


--
-- Name: idx_uploads_appointment; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_uploads_appointment ON public.patient_uploads USING btree (appointment_id);


--
-- Name: idx_uploads_patient; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_uploads_patient ON public.patient_uploads USING btree (patient_id);


--
-- Name: idx_walkin_clinic_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_walkin_clinic_date ON public.walk_in_patients USING btree (clinic_id, registered_at);


--
-- Name: idx_walkin_outcome; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_walkin_outcome ON public.walk_in_patients USING btree (outcome);


--
-- Name: lab_work_types_clinic_name_uniq; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX lab_work_types_clinic_name_uniq ON public.lab_work_types USING btree (COALESCE(clinic_id, '00000000-0000-0000-0000-000000000000'::uuid), lower((name)::text));


--
-- Name: module_vis_clinic_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX module_vis_clinic_idx ON public.module_visibility USING btree (clinic_id);


--
-- Name: appointment_call_logs appointment_call_logs_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointment_call_logs
    ADD CONSTRAINT appointment_call_logs_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE CASCADE;


--
-- Name: appointment_call_logs appointment_call_logs_called_by_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointment_call_logs
    ADD CONSTRAINT appointment_call_logs_called_by_staff_id_fkey FOREIGN KEY (called_by_staff_id) REFERENCES public.staff(id);


--
-- Name: appointment_history appointment_history_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointment_history
    ADD CONSTRAINT appointment_history_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE CASCADE;


--
-- Name: appointment_message_logs appointment_message_logs_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointment_message_logs
    ADD CONSTRAINT appointment_message_logs_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE CASCADE;


--
-- Name: appointment_message_logs appointment_message_logs_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointment_message_logs
    ADD CONSTRAINT appointment_message_logs_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: appointment_message_logs appointment_message_logs_sent_by_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointment_message_logs
    ADD CONSTRAINT appointment_message_logs_sent_by_staff_id_fkey FOREIGN KEY (sent_by_staff_id) REFERENCES public.staff(id);


--
-- Name: appointment_requests appointment_requests_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointment_requests
    ADD CONSTRAINT appointment_requests_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id);


--
-- Name: appointment_requests appointment_requests_converted_to_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointment_requests
    ADD CONSTRAINT appointment_requests_converted_to_appointment_id_fkey FOREIGN KEY (converted_to_appointment_id) REFERENCES public.appointments(id);


--
-- Name: appointment_requests appointment_requests_handled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointment_requests
    ADD CONSTRAINT appointment_requests_handled_by_fkey FOREIGN KEY (handled_by) REFERENCES public.staff(id);


--
-- Name: appointments appointments_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id);


--
-- Name: appointments appointments_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.staff(id);


--
-- Name: appointments appointments_last_contacted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_last_contacted_by_fkey FOREIGN KEY (last_contacted_by) REFERENCES public.staff(id);


--
-- Name: appointments appointments_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: appointments appointments_specialist_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_specialist_assigned_by_fkey FOREIGN KEY (specialist_assigned_by) REFERENCES public.staff(id);


--
-- Name: appointments appointments_specialist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_specialist_id_fkey FOREIGN KEY (specialist_id) REFERENCES public.staff(id);


--
-- Name: bot_config bot_config_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bot_config
    ADD CONSTRAINT bot_config_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id);


--
-- Name: bot_event_log bot_event_log_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bot_event_log
    ADD CONSTRAINT bot_event_log_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id);


--
-- Name: bot_event_log bot_event_log_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bot_event_log
    ADD CONSTRAINT bot_event_log_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE SET NULL;


--
-- Name: business_hours business_hours_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_hours
    ADD CONSTRAINT business_hours_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;


--
-- Name: clinic_content clinic_content_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinic_content
    ADD CONSTRAINT clinic_content_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;


--
-- Name: clinic_holidays clinic_holidays_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinic_holidays
    ADD CONSTRAINT clinic_holidays_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;


--
-- Name: clinic_info_ext clinic_info_ext_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinic_info_ext
    ADD CONSTRAINT clinic_info_ext_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;


--
-- Name: clinic_notifications clinic_notifications_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinic_notifications
    ADD CONSTRAINT clinic_notifications_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id);


--
-- Name: clinic_notifications clinic_notifications_recipient_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinic_notifications
    ADD CONSTRAINT clinic_notifications_recipient_staff_id_fkey FOREIGN KEY (recipient_staff_id) REFERENCES public.staff(id);


--
-- Name: clinic_notifications clinic_notifications_sender_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinic_notifications
    ADD CONSTRAINT clinic_notifications_sender_staff_id_fkey FOREIGN KEY (sender_staff_id) REFERENCES public.staff(id);


--
-- Name: clinic_page_sections clinic_page_sections_page_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinic_page_sections
    ADD CONSTRAINT clinic_page_sections_page_id_fkey FOREIGN KEY (page_id) REFERENCES public.clinic_pages(id) ON DELETE CASCADE;


--
-- Name: clinic_pages clinic_pages_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinic_pages
    ADD CONSTRAINT clinic_pages_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;


--
-- Name: clinic_settings clinic_settings_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinic_settings
    ADD CONSTRAINT clinic_settings_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;


--
-- Name: communication_log communication_log_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.communication_log
    ADD CONSTRAINT communication_log_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: dashboard_widget_prefs dashboard_widget_prefs_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dashboard_widget_prefs
    ADD CONSTRAINT dashboard_widget_prefs_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;


--
-- Name: dashboard_widget_prefs dashboard_widget_prefs_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dashboard_widget_prefs
    ADD CONSTRAINT dashboard_widget_prefs_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE;


--
-- Name: fee_schedule_overrides fee_schedule_overrides_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fee_schedule_overrides
    ADD CONSTRAINT fee_schedule_overrides_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;


--
-- Name: fee_schedule_overrides fee_schedule_overrides_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fee_schedule_overrides
    ADD CONSTRAINT fee_schedule_overrides_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.service_catalog(id) ON DELETE CASCADE;


--
-- Name: appointments fk_apt_plan; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT fk_apt_plan FOREIGN KEY (treatment_plan_id) REFERENCES public.treatment_plans(id);


--
-- Name: follow_ups follow_ups_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.follow_ups
    ADD CONSTRAINT follow_ups_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: illness_library illness_library_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.illness_library
    ADD CONSTRAINT illness_library_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;


--
-- Name: image_annotations image_annotations_added_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.image_annotations
    ADD CONSTRAINT image_annotations_added_by_fkey FOREIGN KEY (added_by) REFERENCES public.staff(id);


--
-- Name: image_annotations image_annotations_image_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.image_annotations
    ADD CONSTRAINT image_annotations_image_id_fkey FOREIGN KEY (image_id) REFERENCES public.patient_images(id) ON DELETE CASCADE;


--
-- Name: kanban_columns kanban_columns_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kanban_columns
    ADD CONSTRAINT kanban_columns_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;


--
-- Name: lab_order_payments lab_order_payments_lab_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lab_order_payments
    ADD CONSTRAINT lab_order_payments_lab_order_id_fkey FOREIGN KEY (lab_order_id) REFERENCES public.lab_orders(id) ON DELETE CASCADE;


--
-- Name: lab_order_payments lab_order_payments_recorded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lab_order_payments
    ADD CONSTRAINT lab_order_payments_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.staff(id);


--
-- Name: lab_orders lab_orders_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lab_orders
    ADD CONSTRAINT lab_orders_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE SET NULL;


--
-- Name: lab_orders lab_orders_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lab_orders
    ADD CONSTRAINT lab_orders_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id);


--
-- Name: lab_orders lab_orders_closed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lab_orders
    ADD CONSTRAINT lab_orders_closed_by_fkey FOREIGN KEY (closed_by) REFERENCES public.staff(id);


--
-- Name: lab_orders lab_orders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lab_orders
    ADD CONSTRAINT lab_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id);


--
-- Name: lab_orders lab_orders_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lab_orders
    ADD CONSTRAINT lab_orders_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: lab_orders lab_orders_qr_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lab_orders
    ADD CONSTRAINT lab_orders_qr_code_id_fkey FOREIGN KEY (qr_code_id) REFERENCES public.qr_codes(id) ON DELETE SET NULL;


--
-- Name: lab_orders lab_orders_received_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lab_orders
    ADD CONSTRAINT lab_orders_received_by_fkey FOREIGN KEY (received_by) REFERENCES public.staff(id);


--
-- Name: lab_orders lab_orders_treatment_plan_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lab_orders
    ADD CONSTRAINT lab_orders_treatment_plan_item_id_fkey FOREIGN KEY (treatment_plan_item_id) REFERENCES public.treatment_plan_items(id) ON DELETE SET NULL;


--
-- Name: lab_orders lab_orders_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lab_orders
    ADD CONSTRAINT lab_orders_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.lab_vendors(id);


--
-- Name: lab_vendors lab_vendors_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lab_vendors
    ADD CONSTRAINT lab_vendors_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id);


--
-- Name: media media_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.media
    ADD CONSTRAINT media_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id);


--
-- Name: media_gallery media_gallery_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.media_gallery
    ADD CONSTRAINT media_gallery_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id);


--
-- Name: media_gallery media_gallery_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.media_gallery
    ADD CONSTRAINT media_gallery_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: media_gallery media_gallery_taken_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.media_gallery
    ADD CONSTRAINT media_gallery_taken_by_fkey FOREIGN KEY (taken_by) REFERENCES public.staff(id);


--
-- Name: media_gallery media_gallery_treatment_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.media_gallery
    ADD CONSTRAINT media_gallery_treatment_plan_id_fkey FOREIGN KEY (treatment_plan_id) REFERENCES public.treatment_plans(id) ON DELETE SET NULL;


--
-- Name: media media_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.media
    ADD CONSTRAINT media_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: media media_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.media
    ADD CONSTRAINT media_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.staff(id);


--
-- Name: medicine_catalog medicine_catalog_added_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.medicine_catalog
    ADD CONSTRAINT medicine_catalog_added_by_fkey FOREIGN KEY (added_by) REFERENCES public.staff(id);


--
-- Name: medicine_reminders medicine_reminders_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.medicine_reminders
    ADD CONSTRAINT medicine_reminders_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: medicine_reminders medicine_reminders_prescription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.medicine_reminders
    ADD CONSTRAINT medicine_reminders_prescription_id_fkey FOREIGN KEY (prescription_id) REFERENCES public.prescriptions(id) ON DELETE CASCADE;


--
-- Name: module_visibility module_visibility_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_visibility
    ADD CONSTRAINT module_visibility_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;


--
-- Name: patient_credits patient_credits_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_credits
    ADD CONSTRAINT patient_credits_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: patient_health patient_health_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_health
    ADD CONSTRAINT patient_health_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: patient_images patient_images_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_images
    ADD CONSTRAINT patient_images_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id);


--
-- Name: patient_images patient_images_linked_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_images
    ADD CONSTRAINT patient_images_linked_plan_id_fkey FOREIGN KEY (linked_plan_id) REFERENCES public.treatment_plans(id);


--
-- Name: patient_images patient_images_linked_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_images
    ADD CONSTRAINT patient_images_linked_session_id_fkey FOREIGN KEY (linked_session_id) REFERENCES public.treatment_sessions(id);


--
-- Name: patient_images patient_images_linked_sitting_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_images
    ADD CONSTRAINT patient_images_linked_sitting_id_fkey FOREIGN KEY (linked_sitting_id) REFERENCES public.treatment_sittings(id);


--
-- Name: patient_images patient_images_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_images
    ADD CONSTRAINT patient_images_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: patient_images patient_images_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_images
    ADD CONSTRAINT patient_images_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.staff(id);


--
-- Name: patient_portal_tokens patient_portal_tokens_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_portal_tokens
    ADD CONSTRAINT patient_portal_tokens_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: patient_ratings patient_ratings_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_ratings
    ADD CONSTRAINT patient_ratings_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: patient_uploads patient_uploads_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_uploads
    ADD CONSTRAINT patient_uploads_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE SET NULL;


--
-- Name: patient_uploads patient_uploads_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_uploads
    ADD CONSTRAINT patient_uploads_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: patient_uploads patient_uploads_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_uploads
    ADD CONSTRAINT patient_uploads_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.staff(id);


--
-- Name: patients patients_preferred_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_preferred_clinic_id_fkey FOREIGN KEY (preferred_clinic_id) REFERENCES public.clinics(id);


--
-- Name: payment_transactions payment_transactions_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id);


--
-- Name: payment_transactions payment_transactions_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id);


--
-- Name: payment_transactions payment_transactions_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: payment_transactions payment_transactions_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.treatment_plans(id);


--
-- Name: prescriptions prescriptions_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id);


--
-- Name: prescriptions prescriptions_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id);


--
-- Name: prescriptions prescriptions_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.staff(id);


--
-- Name: prescriptions prescriptions_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: prescriptions prescriptions_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.treatment_plans(id);


--
-- Name: prescriptions prescriptions_qr_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_qr_code_id_fkey FOREIGN KEY (qr_code_id) REFERENCES public.qr_codes(id) ON DELETE SET NULL;


--
-- Name: procedure_medicine_map procedure_medicine_map_medicine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.procedure_medicine_map
    ADD CONSTRAINT procedure_medicine_map_medicine_id_fkey FOREIGN KEY (medicine_id) REFERENCES public.medicine_catalog(id) ON DELETE CASCADE;


--
-- Name: procedure_medicine_map procedure_medicine_map_procedure_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.procedure_medicine_map
    ADD CONSTRAINT procedure_medicine_map_procedure_id_fkey FOREIGN KEY (procedure_id) REFERENCES public.procedure_catalog(id) ON DELETE CASCADE;


--
-- Name: qr_codes qr_codes_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.qr_codes
    ADD CONSTRAINT qr_codes_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id);


--
-- Name: reminder_log reminder_log_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reminder_log
    ADD CONSTRAINT reminder_log_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id);


--
-- Name: reminder_log reminder_log_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reminder_log
    ADD CONSTRAINT reminder_log_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id);


--
-- Name: reminder_log reminder_log_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reminder_log
    ADD CONSTRAINT reminder_log_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: reminder_settings reminder_settings_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reminder_settings
    ADD CONSTRAINT reminder_settings_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id);


--
-- Name: reschedule_requests reschedule_requests_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reschedule_requests
    ADD CONSTRAINT reschedule_requests_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id);


--
-- Name: reschedule_requests reschedule_requests_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reschedule_requests
    ADD CONSTRAINT reschedule_requests_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id);


--
-- Name: reschedule_requests reschedule_requests_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reschedule_requests
    ADD CONSTRAINT reschedule_requests_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: reschedule_requests reschedule_requests_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reschedule_requests
    ADD CONSTRAINT reschedule_requests_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.staff(id);


--
-- Name: service_catalog service_catalog_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_catalog
    ADD CONSTRAINT service_catalog_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;


--
-- Name: site_doctors site_doctors_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.site_doctors
    ADD CONSTRAINT site_doctors_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: site_videos site_videos_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.site_videos
    ADD CONSTRAINT site_videos_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;


--
-- Name: smile_sessions smile_sessions_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.smile_sessions
    ADD CONSTRAINT smile_sessions_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id);


--
-- Name: smile_sessions smile_sessions_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.smile_sessions
    ADD CONSTRAINT smile_sessions_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: specialist_earnings specialist_earnings_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.specialist_earnings
    ADD CONSTRAINT specialist_earnings_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE SET NULL;


--
-- Name: specialist_earnings specialist_earnings_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.specialist_earnings
    ADD CONSTRAINT specialist_earnings_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id);


--
-- Name: specialist_earnings specialist_earnings_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.specialist_earnings
    ADD CONSTRAINT specialist_earnings_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE SET NULL;


--
-- Name: specialist_earnings specialist_earnings_recorded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.specialist_earnings
    ADD CONSTRAINT specialist_earnings_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.staff(id);


--
-- Name: specialist_earnings specialist_earnings_settled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.specialist_earnings
    ADD CONSTRAINT specialist_earnings_settled_by_fkey FOREIGN KEY (settled_by) REFERENCES public.staff(id);


--
-- Name: specialist_earnings specialist_earnings_specialist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.specialist_earnings
    ADD CONSTRAINT specialist_earnings_specialist_id_fkey FOREIGN KEY (specialist_id) REFERENCES public.staff(id);


--
-- Name: specialist_notifications specialist_notifications_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.specialist_notifications
    ADD CONSTRAINT specialist_notifications_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE CASCADE;


--
-- Name: specialist_notifications specialist_notifications_sent_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.specialist_notifications
    ADD CONSTRAINT specialist_notifications_sent_by_fkey FOREIGN KEY (sent_by) REFERENCES public.staff(id);


--
-- Name: specialist_notifications specialist_notifications_specialist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.specialist_notifications
    ADD CONSTRAINT specialist_notifications_specialist_id_fkey FOREIGN KEY (specialist_id) REFERENCES public.staff(id);


--
-- Name: staff staff_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;


--
-- Name: to_be_appointed to_be_appointed_added_by_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.to_be_appointed
    ADD CONSTRAINT to_be_appointed_added_by_staff_id_fkey FOREIGN KEY (added_by_staff_id) REFERENCES public.staff(id);


--
-- Name: to_be_appointed to_be_appointed_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.to_be_appointed
    ADD CONSTRAINT to_be_appointed_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id);


--
-- Name: to_be_appointed to_be_appointed_original_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.to_be_appointed
    ADD CONSTRAINT to_be_appointed_original_appointment_id_fkey FOREIGN KEY (original_appointment_id) REFERENCES public.appointments(id);


--
-- Name: to_be_appointed to_be_appointed_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.to_be_appointed
    ADD CONSTRAINT to_be_appointed_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: to_be_appointed to_be_appointed_resolved_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.to_be_appointed
    ADD CONSTRAINT to_be_appointed_resolved_appointment_id_fkey FOREIGN KEY (resolved_appointment_id) REFERENCES public.appointments(id);


--
-- Name: tooth_clinical_records tooth_clinical_records_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tooth_clinical_records
    ADD CONSTRAINT tooth_clinical_records_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: tooth_conditions tooth_conditions_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tooth_conditions
    ADD CONSTRAINT tooth_conditions_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: tooth_conditions tooth_conditions_recorded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tooth_conditions
    ADD CONSTRAINT tooth_conditions_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.staff(id);


--
-- Name: tooth_diagnoses tooth_diagnoses_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tooth_diagnoses
    ADD CONSTRAINT tooth_diagnoses_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: tooth_examinations tooth_examinations_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tooth_examinations
    ADD CONSTRAINT tooth_examinations_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: tooth_observations tooth_observations_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tooth_observations
    ADD CONSTRAINT tooth_observations_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: tooth_treatments tooth_treatments_completed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tooth_treatments
    ADD CONSTRAINT tooth_treatments_completed_by_fkey FOREIGN KEY (completed_by) REFERENCES public.staff(id);


--
-- Name: tooth_treatments tooth_treatments_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tooth_treatments
    ADD CONSTRAINT tooth_treatments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: tooth_treatments tooth_treatments_sitting_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tooth_treatments
    ADD CONSTRAINT tooth_treatments_sitting_id_fkey FOREIGN KEY (sitting_id) REFERENCES public.treatment_sittings(id);


--
-- Name: tooth_treatments tooth_treatments_treatment_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tooth_treatments
    ADD CONSTRAINT tooth_treatments_treatment_plan_id_fkey FOREIGN KEY (treatment_plan_id) REFERENCES public.treatment_plans(id);


--
-- Name: treatment_plan_items treatment_plan_items_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.treatment_plan_items
    ADD CONSTRAINT treatment_plan_items_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.treatment_plans(id) ON DELETE CASCADE;


--
-- Name: treatment_plan_items treatment_plan_items_procedure_catalog_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.treatment_plan_items
    ADD CONSTRAINT treatment_plan_items_procedure_catalog_id_fkey FOREIGN KEY (procedure_catalog_id) REFERENCES public.procedure_catalog(id);


--
-- Name: treatment_plans treatment_plans_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.treatment_plans
    ADD CONSTRAINT treatment_plans_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id);


--
-- Name: treatment_plans treatment_plans_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.treatment_plans
    ADD CONSTRAINT treatment_plans_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.staff(id);


--
-- Name: treatment_plans treatment_plans_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.treatment_plans
    ADD CONSTRAINT treatment_plans_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: treatment_sessions treatment_sessions_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.treatment_sessions
    ADD CONSTRAINT treatment_sessions_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id);


--
-- Name: treatment_sessions treatment_sessions_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.treatment_sessions
    ADD CONSTRAINT treatment_sessions_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id);


--
-- Name: treatment_sessions treatment_sessions_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.treatment_sessions
    ADD CONSTRAINT treatment_sessions_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.staff(id);


--
-- Name: treatment_sessions treatment_sessions_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.treatment_sessions
    ADD CONSTRAINT treatment_sessions_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: treatment_sessions treatment_sessions_payment_collected_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.treatment_sessions
    ADD CONSTRAINT treatment_sessions_payment_collected_by_fkey FOREIGN KEY (payment_collected_by) REFERENCES public.staff(id);


--
-- Name: treatment_sessions treatment_sessions_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.treatment_sessions
    ADD CONSTRAINT treatment_sessions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.treatment_plans(id);


--
-- Name: treatment_sessions treatment_sessions_prescription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.treatment_sessions
    ADD CONSTRAINT treatment_sessions_prescription_id_fkey FOREIGN KEY (prescription_id) REFERENCES public.prescriptions(id);


--
-- Name: treatment_sessions treatment_sessions_sitting_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.treatment_sessions
    ADD CONSTRAINT treatment_sessions_sitting_id_fkey FOREIGN KEY (sitting_id) REFERENCES public.treatment_sittings(id);


--
-- Name: treatment_sessions treatment_sessions_walk_in_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.treatment_sessions
    ADD CONSTRAINT treatment_sessions_walk_in_id_fkey FOREIGN KEY (walk_in_id) REFERENCES public.walk_in_patients(id);


--
-- Name: treatment_sittings treatment_sittings_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.treatment_sittings
    ADD CONSTRAINT treatment_sittings_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id);


--
-- Name: treatment_sittings treatment_sittings_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.treatment_sittings
    ADD CONSTRAINT treatment_sittings_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.staff(id);


--
-- Name: treatment_sittings treatment_sittings_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.treatment_sittings
    ADD CONSTRAINT treatment_sittings_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.treatment_plans(id) ON DELETE CASCADE;


--
-- Name: walk_in_patients walk_in_patients_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.walk_in_patients
    ADD CONSTRAINT walk_in_patients_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id);


--
-- Name: walk_in_patients walk_in_patients_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.walk_in_patients
    ADD CONSTRAINT walk_in_patients_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.staff(id);


--
-- Name: walk_in_patients walk_in_patients_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.walk_in_patients
    ADD CONSTRAINT walk_in_patients_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: walk_in_patients walk_in_patients_registered_by_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.walk_in_patients
    ADD CONSTRAINT walk_in_patients_registered_by_staff_id_fkey FOREIGN KEY (registered_by_staff_id) REFERENCES public.staff(id);


--
-- PostgreSQL database dump complete
--

\unrestrict WsDOPpVdJB4DgmB80cVKLnQenaITm7nniFThf7lhpqmC5B5B2Trf3kqMIMxSbfq

