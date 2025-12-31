CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_net";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

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
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: ai_execution_mode; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ai_execution_mode AS ENUM (
    'single',
    'parallel_merge',
    'sequential_chain'
);


--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'moderator',
    'user'
);


--
-- Name: cleanup_share_link_attempts(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_share_link_attempts() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  DELETE FROM public.share_link_attempts
  WHERE created_at < now() - INTERVAL '24 hours';
END;
$$;


--
-- Name: create_codex_prompt_version(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_codex_prompt_version() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  next_version INTEGER;
BEGIN
  -- Get next version number
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO next_version
  FROM codex_prompts_history
  WHERE codex_prompt_id = OLD.id;

  -- Insert version history record including AI configuration
  INSERT INTO codex_prompts_history (
    codex_prompt_id,
    version_number,
    codex_name,
    system_prompt,
    display_order,
    depends_on_codex_id,
    depends_on_transcript,
    word_count_min,
    word_count_max,
    is_active,
    ai_execution_mode,
    primary_provider_id,
    primary_model,
    merge_provider_id,
    merge_model,
    merge_prompt,
    changed_by
  ) VALUES (
    OLD.id,
    next_version,
    OLD.codex_name,
    OLD.system_prompt,
    OLD.display_order,
    OLD.depends_on_codex_id,
    OLD.depends_on_transcript,
    OLD.word_count_min,
    OLD.word_count_max,
    OLD.is_active,
    OLD.ai_execution_mode,
    OLD.primary_provider_id,
    OLD.primary_model,
    OLD.merge_provider_id,
    OLD.merge_model,
    OLD.merge_prompt,
    auth.uid()
  );

  RETURN NEW;
END;
$$;


--
-- Name: create_codex_section_version(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_codex_section_version() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  next_version INTEGER;
BEGIN
  -- Get next version number
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO next_version
  FROM codex_section_prompts_history
  WHERE section_prompt_id = OLD.id;

  -- Insert version history record
  INSERT INTO codex_section_prompts_history (
    section_prompt_id,
    version_number,
    section_name,
    section_prompt,
    section_index,
    word_count_target,
    is_active,
    changed_by
  ) VALUES (
    OLD.id,
    next_version,
    OLD.section_name,
    OLD.section_prompt,
    OLD.section_index,
    OLD.word_count_target,
    OLD.is_active,
    auth.uid()
  );

  RETURN NEW;
END;
$$;


--
-- Name: ensure_single_default_provider(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ensure_single_default_provider() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.ai_providers
    SET is_default = false
    WHERE id != NEW.id AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: get_user_role(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_role(_user_id uuid) RETURNS public.app_role
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY CASE role
    WHEN 'admin' THEN 1
    WHEN 'moderator' THEN 2
    WHEN 'user' THEN 3
  END
  LIMIT 1
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: is_user_blocked(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_user_blocked(user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
  SELECT EXISTS (
    SELECT 1 FROM public.user_blocks WHERE user_blocks.user_id = $1
  )
$_$;


--
-- Name: notify_admins_on_persona_status_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_admins_on_persona_status_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  admin_record RECORD;
BEGIN
  -- Only trigger on status changes to completed or failed
  IF (NEW.status = 'completed' OR NEW.status = 'failed') AND OLD.status != NEW.status THEN
    -- Get all admin users
    FOR admin_record IN 
      SELECT DISTINCT user_id FROM user_roles WHERE role = 'admin'
    LOOP
      INSERT INTO admin_notifications (
        admin_id,
        persona_run_id,
        notification_type,
        title,
        message
      ) VALUES (
        admin_record.user_id,
        NEW.id,
        CASE 
          WHEN NEW.status = 'completed' THEN 'persona_completed'
          WHEN NEW.status = 'failed' THEN 'persona_failed'
        END,
        CASE 
          WHEN NEW.status = 'completed' THEN 'Persona Run Completed'
          WHEN NEW.status = 'failed' THEN 'Persona Run Failed'
        END,
        CASE 
          WHEN NEW.status = 'completed' THEN 'Persona run "' || NEW.title || '" has completed successfully'
          WHEN NEW.status = 'failed' THEN 'Persona run "' || NEW.title || '" has failed'
        END
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: update_codex_completed_sections(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_codex_completed_sections() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Update the completed_sections count
  UPDATE codexes
  SET completed_sections = (
    SELECT COUNT(*)
    FROM codex_sections
    WHERE codex_id = NEW.codex_id
    AND status = 'completed'
  )
  WHERE id = NEW.codex_id;
  
  RETURN NEW;
END;
$$;


--
-- Name: update_codex_status_on_completion(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_codex_status_on_completion() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  total_count INTEGER;
  completed_count INTEGER;
  error_count INTEGER;
BEGIN
  -- Get section counts
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status = 'error')
  INTO total_count, completed_count, error_count
  FROM codex_sections
  WHERE codex_id = NEW.codex_id;
  
  -- Update codex status if all sections are done (completed or error)
  IF (completed_count + error_count) = total_count THEN
    UPDATE codexes
    SET status = CASE
      WHEN error_count > 0 THEN 'ready_with_errors'
      ELSE 'ready'
    END
    WHERE id = NEW.codex_id;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: update_persona_run_status_on_codex_completion(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_persona_run_status_on_codex_completion() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  total_count INTEGER;
  completed_count INTEGER;
BEGIN
  -- Get codex counts for this persona run
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status IN ('ready', 'ready_with_errors', 'failed'))
  INTO total_count, completed_count
  FROM codexes
  WHERE persona_run_id = NEW.persona_run_id;
  
  -- If all codexes are done, update persona run status
  IF total_count > 0 AND completed_count = total_count THEN
    UPDATE persona_runs
    SET 
      status = 'completed',
      completed_at = CASE 
        WHEN completed_at IS NULL THEN now()
        ELSE completed_at
      END
    WHERE id = NEW.persona_run_id
      AND status != 'completed';
      
    RAISE NOTICE 'Updated persona_run % to completed', NEW.persona_run_id;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: admin_activity_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_activity_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_id uuid NOT NULL,
    action text NOT NULL,
    target_user_id uuid,
    target_persona_id uuid,
    details jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: admin_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_id uuid,
    persona_run_id uuid,
    notification_type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: ai_provider_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_provider_keys (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider_id uuid NOT NULL,
    api_key_encrypted text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    last_tested_at timestamp with time zone,
    test_status text DEFAULT 'untested'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid
);


--
-- Name: ai_providers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_providers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider_code text NOT NULL,
    name text NOT NULL,
    base_url text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    available_models jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_default boolean DEFAULT false,
    default_model text
);


--
-- Name: ai_usage_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_usage_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    function_name text NOT NULL,
    model text NOT NULL,
    prompt_tokens integer DEFAULT 0 NOT NULL,
    completion_tokens integer DEFAULT 0 NOT NULL,
    total_tokens integer DEFAULT 0 NOT NULL,
    estimated_cost numeric(10,6) DEFAULT 0 NOT NULL,
    persona_run_id uuid,
    codex_id uuid,
    status text DEFAULT 'success'::text NOT NULL,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    provider_code text,
    model_name text,
    execution_mode public.ai_execution_mode,
    parent_run_id uuid
);


--
-- Name: analytics_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.analytics_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type text NOT NULL,
    user_id uuid,
    persona_run_id uuid,
    codex_id uuid,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: codex_ai_steps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.codex_ai_steps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    codex_prompt_id uuid NOT NULL,
    step_order integer NOT NULL,
    provider_id uuid NOT NULL,
    model_name text NOT NULL,
    step_type text DEFAULT 'generate'::text NOT NULL,
    custom_prompt text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: codex_prompt_dependencies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.codex_prompt_dependencies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    codex_prompt_id uuid NOT NULL,
    depends_on_codex_id uuid NOT NULL,
    display_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: codex_prompts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.codex_prompts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    codex_name text NOT NULL,
    system_prompt text NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true,
    word_count_min integer DEFAULT 1000,
    word_count_max integer DEFAULT 2000,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    depends_on_codex_id uuid,
    depends_on_transcript boolean DEFAULT false,
    use_pricing_brackets boolean DEFAULT false,
    ai_execution_mode public.ai_execution_mode DEFAULT 'single'::public.ai_execution_mode,
    primary_provider_id uuid,
    primary_model text,
    merge_provider_id uuid,
    merge_model text,
    merge_prompt text
);


--
-- Name: codex_prompts_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.codex_prompts_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    codex_prompt_id uuid NOT NULL,
    version_number integer NOT NULL,
    codex_name text NOT NULL,
    system_prompt text NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    depends_on_codex_id uuid,
    word_count_min integer,
    word_count_max integer,
    is_active boolean DEFAULT true,
    changed_by uuid,
    change_description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    depends_on_transcript boolean DEFAULT false,
    ai_execution_mode public.ai_execution_mode,
    primary_provider_id uuid,
    primary_model text,
    merge_provider_id uuid,
    merge_model text,
    merge_prompt text
);


--
-- Name: codex_question_mappings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.codex_question_mappings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    codex_prompt_id uuid NOT NULL,
    question_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: codex_section_ai_steps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.codex_section_ai_steps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    section_prompt_id uuid NOT NULL,
    step_order integer NOT NULL,
    provider_id uuid NOT NULL,
    model_name text NOT NULL,
    step_type text DEFAULT 'generate'::text NOT NULL,
    custom_prompt text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT codex_section_ai_steps_step_type_check CHECK ((step_type = ANY (ARRAY['generate'::text, 'merge'::text])))
);


--
-- Name: codex_section_prompts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.codex_section_prompts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    codex_prompt_id uuid,
    section_name text NOT NULL,
    section_prompt text NOT NULL,
    section_index integer NOT NULL,
    word_count_target integer DEFAULT 500,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    ai_execution_mode public.ai_execution_mode DEFAULT 'single'::public.ai_execution_mode,
    primary_provider_id uuid,
    primary_model text,
    merge_provider_id uuid,
    merge_model text,
    merge_prompt text
);


--
-- Name: codex_section_prompts_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.codex_section_prompts_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    section_prompt_id uuid NOT NULL,
    version_number integer NOT NULL,
    section_name text NOT NULL,
    section_prompt text NOT NULL,
    section_index integer NOT NULL,
    word_count_target integer,
    is_active boolean DEFAULT true,
    changed_by uuid,
    change_description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: codex_sections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.codex_sections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    codex_id uuid NOT NULL,
    section_name text NOT NULL,
    section_index integer NOT NULL,
    content text,
    status text DEFAULT 'pending'::text NOT NULL,
    retries integer DEFAULT 0 NOT NULL,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    regeneration_count integer DEFAULT 0 NOT NULL,
    last_regenerated_at timestamp with time zone,
    content_summary text,
    CONSTRAINT codex_sections_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'generating'::text, 'completed'::text, 'error'::text])))
);

ALTER TABLE ONLY public.codex_sections REPLICA IDENTITY FULL;


--
-- Name: codexes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.codexes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    persona_run_id uuid NOT NULL,
    codex_name text NOT NULL,
    codex_order integer NOT NULL,
    status text DEFAULT 'not_started'::text NOT NULL,
    total_sections integer DEFAULT 0 NOT NULL,
    completed_sections integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    codex_prompt_id uuid,
    CONSTRAINT codexes_status_check CHECK ((status = ANY (ARRAY['not_started'::text, 'generating'::text, 'ready'::text, 'ready_with_errors'::text, 'failed'::text])))
);

ALTER TABLE ONLY public.codexes REPLICA IDENTITY FULL;


--
-- Name: pdf_exports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pdf_exports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    persona_run_id uuid NOT NULL,
    codex_id uuid,
    export_type text NOT NULL,
    file_path text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT pdf_exports_export_type_check CHECK ((export_type = ANY (ARRAY['single_codex'::text, 'full_suite'::text, 'master_pdf'::text])))
);


--
-- Name: pdf_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pdf_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_name text DEFAULT 'Default Template'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    title_font text DEFAULT 'TimesRomanBold'::text NOT NULL,
    body_font text DEFAULT 'TimesRoman'::text NOT NULL,
    title_font_size integer DEFAULT 24 NOT NULL,
    heading_font_size integer DEFAULT 16 NOT NULL,
    body_font_size integer DEFAULT 11 NOT NULL,
    title_color_r numeric DEFAULT 0 NOT NULL,
    title_color_g numeric DEFAULT 0 NOT NULL,
    title_color_b numeric DEFAULT 0 NOT NULL,
    heading_color_r numeric DEFAULT 0.2 NOT NULL,
    heading_color_g numeric DEFAULT 0.24 NOT NULL,
    heading_color_b numeric DEFAULT 0.31 NOT NULL,
    body_color_r numeric DEFAULT 0 NOT NULL,
    body_color_g numeric DEFAULT 0 NOT NULL,
    body_color_b numeric DEFAULT 0 NOT NULL,
    page_margin integer DEFAULT 50 NOT NULL,
    line_spacing integer DEFAULT 5 NOT NULL,
    section_spacing integer DEFAULT 20 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    logo_url text,
    company_name text DEFAULT 'My Company'::text,
    show_header boolean DEFAULT true,
    show_footer boolean DEFAULT true,
    show_page_numbers boolean DEFAULT true,
    show_toc boolean DEFAULT true,
    cover_bg_color_r numeric DEFAULT 1,
    cover_bg_color_g numeric DEFAULT 1,
    cover_bg_color_b numeric DEFAULT 1,
    cover_bg_image_url text,
    cover_subtitle text,
    show_cover_page boolean DEFAULT true
);


--
-- Name: persona_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.persona_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text DEFAULT 'My Coach Persona'::text NOT NULL,
    answers_json jsonb NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_cancelled boolean DEFAULT false,
    source_type text DEFAULT 'questionnaire'::text,
    original_transcript text,
    CONSTRAINT persona_runs_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'generating'::text, 'completed'::text, 'failed'::text]))),
    CONSTRAINT valid_source_type CHECK ((source_type = ANY (ARRAY['questionnaire'::text, 'transcript'::text])))
);

ALTER TABLE ONLY public.persona_runs REPLICA IDENTITY FULL;


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    full_name text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    title text,
    location text,
    website_social text
);


--
-- Name: questionnaire_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.questionnaire_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category_name text NOT NULL,
    display_order integer NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: questionnaire_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.questionnaire_questions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category_id uuid NOT NULL,
    question_text text NOT NULL,
    display_order integer NOT NULL,
    is_required boolean DEFAULT true,
    is_active boolean DEFAULT true,
    helper_text text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid
);


--
-- Name: share_link_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.share_link_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    share_token text NOT NULL,
    ip_address text NOT NULL,
    attempt_type text NOT NULL,
    success boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: shared_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shared_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    persona_run_id uuid NOT NULL,
    share_token text NOT NULL,
    password_hash text,
    is_active boolean DEFAULT true NOT NULL,
    expires_at timestamp with time zone,
    view_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid NOT NULL
);


--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    setting_key text NOT NULL,
    setting_value jsonb NOT NULL,
    description text,
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid
);


--
-- Name: user_blocks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_blocks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    blocked_by uuid NOT NULL,
    blocked_at timestamp with time zone DEFAULT now() NOT NULL,
    reason text
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_unlimited_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_unlimited_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    granted_by uuid NOT NULL,
    granted_at timestamp with time zone DEFAULT now() NOT NULL,
    reason text
);


--
-- Name: admin_activity_log admin_activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_activity_log
    ADD CONSTRAINT admin_activity_log_pkey PRIMARY KEY (id);


--
-- Name: admin_notifications admin_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_notifications
    ADD CONSTRAINT admin_notifications_pkey PRIMARY KEY (id);


--
-- Name: ai_provider_keys ai_provider_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_provider_keys
    ADD CONSTRAINT ai_provider_keys_pkey PRIMARY KEY (id);


--
-- Name: ai_provider_keys ai_provider_keys_provider_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_provider_keys
    ADD CONSTRAINT ai_provider_keys_provider_id_key UNIQUE (provider_id);


--
-- Name: ai_providers ai_providers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_providers
    ADD CONSTRAINT ai_providers_pkey PRIMARY KEY (id);


--
-- Name: ai_providers ai_providers_provider_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_providers
    ADD CONSTRAINT ai_providers_provider_code_key UNIQUE (provider_code);


--
-- Name: ai_usage_logs ai_usage_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_usage_logs
    ADD CONSTRAINT ai_usage_logs_pkey PRIMARY KEY (id);


--
-- Name: analytics_events analytics_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_events
    ADD CONSTRAINT analytics_events_pkey PRIMARY KEY (id);


--
-- Name: codex_ai_steps codex_ai_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.codex_ai_steps
    ADD CONSTRAINT codex_ai_steps_pkey PRIMARY KEY (id);


--
-- Name: codex_prompt_dependencies codex_prompt_dependencies_codex_prompt_id_depends_on_codex__key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.codex_prompt_dependencies
    ADD CONSTRAINT codex_prompt_dependencies_codex_prompt_id_depends_on_codex__key UNIQUE (codex_prompt_id, depends_on_codex_id);


--
-- Name: codex_prompt_dependencies codex_prompt_dependencies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.codex_prompt_dependencies
    ADD CONSTRAINT codex_prompt_dependencies_pkey PRIMARY KEY (id);


--
-- Name: codex_prompts codex_prompts_codex_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.codex_prompts
    ADD CONSTRAINT codex_prompts_codex_name_key UNIQUE (codex_name);


--
-- Name: codex_prompts_history codex_prompts_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.codex_prompts_history
    ADD CONSTRAINT codex_prompts_history_pkey PRIMARY KEY (id);


--
-- Name: codex_prompts codex_prompts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.codex_prompts
    ADD CONSTRAINT codex_prompts_pkey PRIMARY KEY (id);


--
-- Name: codex_question_mappings codex_question_mappings_codex_prompt_id_question_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.codex_question_mappings
    ADD CONSTRAINT codex_question_mappings_codex_prompt_id_question_id_key UNIQUE (codex_prompt_id, question_id);


--
-- Name: codex_question_mappings codex_question_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.codex_question_mappings
    ADD CONSTRAINT codex_question_mappings_pkey PRIMARY KEY (id);


--
-- Name: codex_section_ai_steps codex_section_ai_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.codex_section_ai_steps
    ADD CONSTRAINT codex_section_ai_steps_pkey PRIMARY KEY (id);


--
-- Name: codex_section_ai_steps codex_section_ai_steps_section_prompt_id_step_order_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.codex_section_ai_steps
    ADD CONSTRAINT codex_section_ai_steps_section_prompt_id_step_order_key UNIQUE (section_prompt_id, step_order);


--
-- Name: codex_section_prompts_history codex_section_prompts_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.codex_section_prompts_history
    ADD CONSTRAINT codex_section_prompts_history_pkey PRIMARY KEY (id);


--
-- Name: codex_section_prompts codex_section_prompts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.codex_section_prompts
    ADD CONSTRAINT codex_section_prompts_pkey PRIMARY KEY (id);


--
-- Name: codex_sections codex_sections_codex_id_section_index_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.codex_sections
    ADD CONSTRAINT codex_sections_codex_id_section_index_key UNIQUE (codex_id, section_index);


--
-- Name: codex_sections codex_sections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.codex_sections
    ADD CONSTRAINT codex_sections_pkey PRIMARY KEY (id);


--
-- Name: codexes codexes_persona_run_id_codex_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.codexes
    ADD CONSTRAINT codexes_persona_run_id_codex_name_key UNIQUE (persona_run_id, codex_name);


--
-- Name: codexes codexes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.codexes
    ADD CONSTRAINT codexes_pkey PRIMARY KEY (id);


--
-- Name: pdf_exports pdf_exports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pdf_exports
    ADD CONSTRAINT pdf_exports_pkey PRIMARY KEY (id);


--
-- Name: pdf_templates pdf_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pdf_templates
    ADD CONSTRAINT pdf_templates_pkey PRIMARY KEY (id);


--
-- Name: persona_runs persona_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.persona_runs
    ADD CONSTRAINT persona_runs_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: questionnaire_categories questionnaire_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questionnaire_categories
    ADD CONSTRAINT questionnaire_categories_pkey PRIMARY KEY (id);


--
-- Name: questionnaire_questions questionnaire_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questionnaire_questions
    ADD CONSTRAINT questionnaire_questions_pkey PRIMARY KEY (id);


--
-- Name: share_link_attempts share_link_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.share_link_attempts
    ADD CONSTRAINT share_link_attempts_pkey PRIMARY KEY (id);


--
-- Name: shared_links shared_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shared_links
    ADD CONSTRAINT shared_links_pkey PRIMARY KEY (id);


--
-- Name: shared_links shared_links_share_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shared_links
    ADD CONSTRAINT shared_links_share_token_key UNIQUE (share_token);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_setting_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_setting_key_key UNIQUE (setting_key);


--
-- Name: user_blocks user_blocks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_blocks
    ADD CONSTRAINT user_blocks_pkey PRIMARY KEY (id);


--
-- Name: user_blocks user_blocks_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_blocks
    ADD CONSTRAINT user_blocks_user_id_key UNIQUE (user_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: user_unlimited_runs user_unlimited_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_unlimited_runs
    ADD CONSTRAINT user_unlimited_runs_pkey PRIMARY KEY (id);


--
-- Name: user_unlimited_runs user_unlimited_runs_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_unlimited_runs
    ADD CONSTRAINT user_unlimited_runs_user_id_key UNIQUE (user_id);


--
-- Name: idx_admin_notifications_admin_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_notifications_admin_id ON public.admin_notifications USING btree (admin_id);


--
-- Name: idx_admin_notifications_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_notifications_created_at ON public.admin_notifications USING btree (created_at DESC);


--
-- Name: idx_ai_usage_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_usage_logs_created_at ON public.ai_usage_logs USING btree (created_at DESC);


--
-- Name: idx_ai_usage_logs_function_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_usage_logs_function_name ON public.ai_usage_logs USING btree (function_name);


--
-- Name: idx_ai_usage_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_usage_logs_user_id ON public.ai_usage_logs USING btree (user_id);


--
-- Name: idx_analytics_events_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_analytics_events_created_at ON public.analytics_events USING btree (created_at);


--
-- Name: idx_analytics_events_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_analytics_events_type ON public.analytics_events USING btree (event_type);


--
-- Name: idx_analytics_events_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_analytics_events_user_id ON public.analytics_events USING btree (user_id);


--
-- Name: idx_codex_ai_steps_codex_prompt_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_codex_ai_steps_codex_prompt_id ON public.codex_ai_steps USING btree (codex_prompt_id);


--
-- Name: idx_codex_prompt_dependencies_codex_prompt_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_codex_prompt_dependencies_codex_prompt_id ON public.codex_prompt_dependencies USING btree (codex_prompt_id);


--
-- Name: idx_codex_prompt_dependencies_depends_on_codex_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_codex_prompt_dependencies_depends_on_codex_id ON public.codex_prompt_dependencies USING btree (depends_on_codex_id);


--
-- Name: idx_codex_prompts_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_codex_prompts_active ON public.codex_prompts USING btree (is_active);


--
-- Name: idx_codex_prompts_depends_on; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_codex_prompts_depends_on ON public.codex_prompts USING btree (depends_on_codex_id);


--
-- Name: idx_codex_prompts_display_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_codex_prompts_display_order ON public.codex_prompts USING btree (display_order);


--
-- Name: idx_codex_prompts_history_codex_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_codex_prompts_history_codex_id ON public.codex_prompts_history USING btree (codex_prompt_id);


--
-- Name: idx_codex_prompts_history_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_codex_prompts_history_created_at ON public.codex_prompts_history USING btree (created_at DESC);


--
-- Name: idx_codex_question_mappings_codex; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_codex_question_mappings_codex ON public.codex_question_mappings USING btree (codex_prompt_id);


--
-- Name: idx_codex_section_prompts_codex; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_codex_section_prompts_codex ON public.codex_section_prompts USING btree (codex_prompt_id);


--
-- Name: idx_codex_section_prompts_history_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_codex_section_prompts_history_created_at ON public.codex_section_prompts_history USING btree (created_at DESC);


--
-- Name: idx_codex_section_prompts_history_section_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_codex_section_prompts_history_section_id ON public.codex_section_prompts_history USING btree (section_prompt_id);


--
-- Name: idx_codex_section_prompts_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_codex_section_prompts_index ON public.codex_section_prompts USING btree (section_index);


--
-- Name: idx_codex_sections_codex_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_codex_sections_codex_id ON public.codex_sections USING btree (codex_id);


--
-- Name: idx_codex_sections_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_codex_sections_status ON public.codex_sections USING btree (status);


--
-- Name: idx_codexes_codex_prompt_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_codexes_codex_prompt_id ON public.codexes USING btree (codex_prompt_id);


--
-- Name: idx_codexes_persona_run_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_codexes_persona_run_id ON public.codexes USING btree (persona_run_id);


--
-- Name: idx_codexes_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_codexes_status ON public.codexes USING btree (status);


--
-- Name: idx_pdf_exports_persona_run_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pdf_exports_persona_run_id ON public.pdf_exports USING btree (persona_run_id);


--
-- Name: idx_persona_runs_is_cancelled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_persona_runs_is_cancelled ON public.persona_runs USING btree (is_cancelled);


--
-- Name: idx_persona_runs_source_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_persona_runs_source_type ON public.persona_runs USING btree (source_type);


--
-- Name: idx_persona_runs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_persona_runs_status ON public.persona_runs USING btree (status);


--
-- Name: idx_persona_runs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_persona_runs_user_id ON public.persona_runs USING btree (user_id);


--
-- Name: idx_share_link_attempts_cleanup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_share_link_attempts_cleanup ON public.share_link_attempts USING btree (created_at);


--
-- Name: idx_share_link_attempts_token_ip; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_share_link_attempts_token_ip ON public.share_link_attempts USING btree (share_token, ip_address, created_at DESC);


--
-- Name: idx_shared_links_persona_run; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shared_links_persona_run ON public.shared_links USING btree (persona_run_id);


--
-- Name: idx_shared_links_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shared_links_token ON public.shared_links USING btree (share_token);


--
-- Name: idx_user_blocks_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_blocks_user_id ON public.user_blocks USING btree (user_id);


--
-- Name: codex_prompts codex_prompt_version_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER codex_prompt_version_trigger BEFORE UPDATE ON public.codex_prompts FOR EACH ROW EXECUTE FUNCTION public.create_codex_prompt_version();


--
-- Name: codex_section_prompts codex_section_version_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER codex_section_version_trigger BEFORE UPDATE ON public.codex_section_prompts FOR EACH ROW EXECUTE FUNCTION public.create_codex_section_version();


--
-- Name: ai_providers ensure_single_default_provider_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER ensure_single_default_provider_trigger BEFORE INSERT OR UPDATE ON public.ai_providers FOR EACH ROW EXECUTE FUNCTION public.ensure_single_default_provider();


--
-- Name: persona_runs persona_run_status_change_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER persona_run_status_change_trigger AFTER UPDATE OF status ON public.persona_runs FOR EACH ROW EXECUTE FUNCTION public.notify_admins_on_persona_status_change();


--
-- Name: codex_sections trigger_update_codex_status; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_codex_status AFTER INSERT OR UPDATE OF status ON public.codex_sections FOR EACH ROW WHEN (((new.status = 'completed'::text) OR (new.status = 'error'::text))) EXECUTE FUNCTION public.update_codex_status_on_completion();


--
-- Name: codex_sections trigger_update_completed_sections; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_completed_sections AFTER INSERT OR UPDATE OF status ON public.codex_sections FOR EACH ROW WHEN ((new.status = 'completed'::text)) EXECUTE FUNCTION public.update_codex_completed_sections();


--
-- Name: codexes trigger_update_persona_run_on_codex_completion; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_persona_run_on_codex_completion AFTER UPDATE OF status ON public.codexes FOR EACH ROW WHEN (((new.status = ANY (ARRAY['ready'::text, 'ready_with_errors'::text, 'failed'::text])) AND (old.status <> new.status))) EXECUTE FUNCTION public.update_persona_run_status_on_codex_completion();


--
-- Name: ai_provider_keys update_ai_provider_keys_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_ai_provider_keys_updated_at BEFORE UPDATE ON public.ai_provider_keys FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ai_providers update_ai_providers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_ai_providers_updated_at BEFORE UPDATE ON public.ai_providers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: codex_prompts update_codex_prompts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_codex_prompts_updated_at BEFORE UPDATE ON public.codex_prompts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: codex_section_prompts update_codex_section_prompts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_codex_section_prompts_updated_at BEFORE UPDATE ON public.codex_section_prompts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: codex_sections update_codex_sections_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_codex_sections_updated_at BEFORE UPDATE ON public.codex_sections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: codexes update_codexes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_codexes_updated_at BEFORE UPDATE ON public.codexes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: pdf_templates update_pdf_templates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_pdf_templates_updated_at BEFORE UPDATE ON public.pdf_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: persona_runs update_persona_runs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_persona_runs_updated_at BEFORE UPDATE ON public.persona_runs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: questionnaire_categories update_questionnaire_categories_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_questionnaire_categories_updated_at BEFORE UPDATE ON public.questionnaire_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: questionnaire_questions update_questionnaire_questions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_questionnaire_questions_updated_at BEFORE UPDATE ON public.questionnaire_questions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: system_settings update_system_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON public.system_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: admin_notifications admin_notifications_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_notifications
    ADD CONSTRAINT admin_notifications_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: admin_notifications admin_notifications_persona_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_notifications
    ADD CONSTRAINT admin_notifications_persona_run_id_fkey FOREIGN KEY (persona_run_id) REFERENCES public.persona_runs(id) ON DELETE CASCADE;


--
-- Name: ai_provider_keys ai_provider_keys_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_provider_keys
    ADD CONSTRAINT ai_provider_keys_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: ai_provider_keys ai_provider_keys_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_provider_keys
    ADD CONSTRAINT ai_provider_keys_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.ai_providers(id) ON DELETE CASCADE;


--
-- Name: ai_usage_logs ai_usage_logs_codex_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_usage_logs
    ADD CONSTRAINT ai_usage_logs_codex_id_fkey FOREIGN KEY (codex_id) REFERENCES public.codexes(id) ON DELETE SET NULL;


--
-- Name: ai_usage_logs ai_usage_logs_parent_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_usage_logs
    ADD CONSTRAINT ai_usage_logs_parent_run_id_fkey FOREIGN KEY (parent_run_id) REFERENCES public.ai_usage_logs(id);


--
-- Name: ai_usage_logs ai_usage_logs_persona_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_usage_logs
    ADD CONSTRAINT ai_usage_logs_persona_run_id_fkey FOREIGN KEY (persona_run_id) REFERENCES public.persona_runs(id) ON DELETE SET NULL;


--
-- Name: ai_usage_logs ai_usage_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_usage_logs
    ADD CONSTRAINT ai_usage_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: analytics_events analytics_events_codex_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_events
    ADD CONSTRAINT analytics_events_codex_id_fkey FOREIGN KEY (codex_id) REFERENCES public.codexes(id) ON DELETE CASCADE;


--
-- Name: analytics_events analytics_events_persona_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_events
    ADD CONSTRAINT analytics_events_persona_run_id_fkey FOREIGN KEY (persona_run_id) REFERENCES public.persona_runs(id) ON DELETE CASCADE;


--
-- Name: codex_ai_steps codex_ai_steps_codex_prompt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.codex_ai_steps
    ADD CONSTRAINT codex_ai_steps_codex_prompt_id_fkey FOREIGN KEY (codex_prompt_id) REFERENCES public.codex_prompts(id) ON DELETE CASCADE;


--
-- Name: codex_ai_steps codex_ai_steps_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.codex_ai_steps
    ADD CONSTRAINT codex_ai_steps_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.ai_providers(id);


--
-- Name: codex_prompt_dependencies codex_prompt_dependencies_codex_prompt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.codex_prompt_dependencies
    ADD CONSTRAINT codex_prompt_dependencies_codex_prompt_id_fkey FOREIGN KEY (codex_prompt_id) REFERENCES public.codex_prompts(id) ON DELETE CASCADE;


--
-- Name: codex_prompt_dependencies codex_prompt_dependencies_depends_on_codex_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.codex_prompt_dependencies
    ADD CONSTRAINT codex_prompt_dependencies_depends_on_codex_id_fkey FOREIGN KEY (depends_on_codex_id) REFERENCES public.codex_prompts(id) ON DELETE CASCADE;


--
-- Name: codex_prompts codex_prompts_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.codex_prompts
    ADD CONSTRAINT codex_prompts_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: codex_prompts codex_prompts_depends_on_codex_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.codex_prompts
    ADD CONSTRAINT codex_prompts_depends_on_codex_id_fkey FOREIGN KEY (depends_on_codex_id) REFERENCES public.codex_prompts(id);


--
-- Name: codex_prompts_history codex_prompts_history_codex_prompt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.codex_prompts_history
    ADD CONSTRAINT codex_prompts_history_codex_prompt_id_fkey FOREIGN KEY (codex_prompt_id) REFERENCES public.codex_prompts(id) ON DELETE CASCADE;


--
-- Name: codex_prompts codex_prompts_merge_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.codex_prompts
    ADD CONSTRAINT codex_prompts_merge_provider_id_fkey FOREIGN KEY (merge_provider_id) REFERENCES public.ai_providers(id);


--
-- Name: codex_prompts codex_prompts_primary_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.codex_prompts
    ADD CONSTRAINT codex_prompts_primary_provider_id_fkey FOREIGN KEY (primary_provider_id) REFERENCES public.ai_providers(id);


--
-- Name: codex_question_mappings codex_question_mappings_codex_prompt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.codex_question_mappings
    ADD CONSTRAINT codex_question_mappings_codex_prompt_id_fkey FOREIGN KEY (codex_prompt_id) REFERENCES public.codex_prompts(id) ON DELETE CASCADE;


--
-- Name: codex_question_mappings codex_question_mappings_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.codex_question_mappings
    ADD CONSTRAINT codex_question_mappings_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questionnaire_questions(id) ON DELETE CASCADE;


--
-- Name: codex_section_ai_steps codex_section_ai_steps_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.codex_section_ai_steps
    ADD CONSTRAINT codex_section_ai_steps_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.ai_providers(id);


--
-- Name: codex_section_ai_steps codex_section_ai_steps_section_prompt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.codex_section_ai_steps
    ADD CONSTRAINT codex_section_ai_steps_section_prompt_id_fkey FOREIGN KEY (section_prompt_id) REFERENCES public.codex_section_prompts(id) ON DELETE CASCADE;


--
-- Name: codex_section_prompts codex_section_prompts_codex_prompt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.codex_section_prompts
    ADD CONSTRAINT codex_section_prompts_codex_prompt_id_fkey FOREIGN KEY (codex_prompt_id) REFERENCES public.codex_prompts(id) ON DELETE CASCADE;


--
-- Name: codex_section_prompts_history codex_section_prompts_history_section_prompt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.codex_section_prompts_history
    ADD CONSTRAINT codex_section_prompts_history_section_prompt_id_fkey FOREIGN KEY (section_prompt_id) REFERENCES public.codex_section_prompts(id) ON DELETE CASCADE;


--
-- Name: codex_section_prompts codex_section_prompts_merge_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.codex_section_prompts
    ADD CONSTRAINT codex_section_prompts_merge_provider_id_fkey FOREIGN KEY (merge_provider_id) REFERENCES public.ai_providers(id);


--
-- Name: codex_section_prompts codex_section_prompts_primary_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.codex_section_prompts
    ADD CONSTRAINT codex_section_prompts_primary_provider_id_fkey FOREIGN KEY (primary_provider_id) REFERENCES public.ai_providers(id);


--
-- Name: codex_sections codex_sections_codex_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.codex_sections
    ADD CONSTRAINT codex_sections_codex_id_fkey FOREIGN KEY (codex_id) REFERENCES public.codexes(id) ON DELETE CASCADE;


--
-- Name: codexes codexes_codex_prompt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.codexes
    ADD CONSTRAINT codexes_codex_prompt_id_fkey FOREIGN KEY (codex_prompt_id) REFERENCES public.codex_prompts(id) ON DELETE SET NULL;


--
-- Name: codexes codexes_persona_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.codexes
    ADD CONSTRAINT codexes_persona_run_id_fkey FOREIGN KEY (persona_run_id) REFERENCES public.persona_runs(id) ON DELETE CASCADE;


--
-- Name: pdf_exports pdf_exports_codex_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pdf_exports
    ADD CONSTRAINT pdf_exports_codex_id_fkey FOREIGN KEY (codex_id) REFERENCES public.codexes(id) ON DELETE CASCADE;


--
-- Name: pdf_exports pdf_exports_persona_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pdf_exports
    ADD CONSTRAINT pdf_exports_persona_run_id_fkey FOREIGN KEY (persona_run_id) REFERENCES public.persona_runs(id) ON DELETE CASCADE;


--
-- Name: pdf_templates pdf_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pdf_templates
    ADD CONSTRAINT pdf_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: persona_runs persona_runs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.persona_runs
    ADD CONSTRAINT persona_runs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: questionnaire_questions questionnaire_questions_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questionnaire_questions
    ADD CONSTRAINT questionnaire_questions_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.questionnaire_categories(id) ON DELETE CASCADE;


--
-- Name: questionnaire_questions questionnaire_questions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questionnaire_questions
    ADD CONSTRAINT questionnaire_questions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: shared_links shared_links_persona_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shared_links
    ADD CONSTRAINT shared_links_persona_run_id_fkey FOREIGN KEY (persona_run_id) REFERENCES public.persona_runs(id) ON DELETE CASCADE;


--
-- Name: user_blocks user_blocks_blocked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_blocks
    ADD CONSTRAINT user_blocks_blocked_by_fkey FOREIGN KEY (blocked_by) REFERENCES auth.users(id);


--
-- Name: user_blocks user_blocks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_blocks
    ADD CONSTRAINT user_blocks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_blocks Admins can block users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can block users" ON public.user_blocks FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: pdf_templates Admins can create PDF templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can create PDF templates" ON public.pdf_templates FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: pdf_templates Admins can delete PDF templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete PDF templates" ON public.pdf_templates FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: persona_runs Admins can delete all persona runs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete all persona runs" ON public.persona_runs FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can delete roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: admin_activity_log Admins can insert activity log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert activity log" ON public.admin_activity_log FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: profiles Admins can insert profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert profiles" ON public.profiles FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can insert roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: system_settings Admins can insert system settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert system settings" ON public.system_settings FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ai_providers Admins can manage AI providers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage AI providers" ON public.ai_providers TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: codex_section_ai_steps Admins can manage AI steps; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage AI steps" ON public.codex_section_ai_steps TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ai_provider_keys Admins can manage API keys; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage API keys" ON public.ai_provider_keys TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: questionnaire_categories Admins can manage categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage categories" ON public.questionnaire_categories USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: codex_ai_steps Admins can manage codex AI steps; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage codex AI steps" ON public.codex_ai_steps USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: codex_prompts Admins can manage codex prompts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage codex prompts" ON public.codex_prompts USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: codex_prompt_dependencies Admins can manage dependencies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage dependencies" ON public.codex_prompt_dependencies USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: codex_question_mappings Admins can manage question mappings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage question mappings" ON public.codex_question_mappings USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: questionnaire_questions Admins can manage questions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage questions" ON public.questionnaire_questions USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: codex_section_prompts Admins can manage section prompts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage section prompts" ON public.codex_section_prompts USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_unlimited_runs Admins can manage unlimited runs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage unlimited runs" ON public.user_unlimited_runs USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_blocks Admins can unblock users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can unblock users" ON public.user_blocks FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: pdf_templates Admins can update PDF templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update PDF templates" ON public.pdf_templates FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: profiles Admins can update all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can update roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: system_settings Admins can update system settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update system settings" ON public.system_settings FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: admin_notifications Admins can update their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update their own notifications" ON public.admin_notifications FOR UPDATE TO authenticated USING ((auth.uid() = admin_id));


--
-- Name: pdf_templates Admins can view PDF templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view PDF templates" ON public.pdf_templates FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: admin_activity_log Admins can view activity log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view activity log" ON public.admin_activity_log FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ai_usage_logs Admins can view all AI usage logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all AI usage logs" ON public.ai_usage_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: analytics_events Admins can view all analytics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all analytics" ON public.analytics_events FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_blocks Admins can view all blocks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all blocks" ON public.user_blocks FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: codex_sections Admins can view all codex sections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all codex sections" ON public.codex_sections FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: codexes Admins can view all codexes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all codexes" ON public.codexes FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: pdf_exports Admins can view all pdf exports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all pdf exports" ON public.pdf_exports FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: persona_runs Admins can view all persona runs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all persona runs" ON public.persona_runs FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: profiles Admins can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can view all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: codex_section_prompts_history Admins can view all section version history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all section version history" ON public.codex_section_prompts_history FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: shared_links Admins can view all shared links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all shared links" ON public.shared_links FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: codex_prompts_history Admins can view all version history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all version history" ON public.codex_prompts_history FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: admin_notifications Admins can view their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view their own notifications" ON public.admin_notifications FOR SELECT TO authenticated USING (((auth.uid() = admin_id) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: codex_section_ai_steps Authenticated users can view AI steps; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view AI steps" ON public.codex_section_ai_steps FOR SELECT TO authenticated USING (true);


--
-- Name: questionnaire_categories Authenticated users can view active categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view active categories" ON public.questionnaire_categories FOR SELECT TO authenticated USING ((is_active = true));


--
-- Name: codex_prompts Authenticated users can view active prompts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view active prompts" ON public.codex_prompts FOR SELECT TO authenticated USING ((is_active = true));


--
-- Name: ai_providers Authenticated users can view active providers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view active providers" ON public.ai_providers FOR SELECT TO authenticated USING ((is_active = true));


--
-- Name: questionnaire_questions Authenticated users can view active questions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view active questions" ON public.questionnaire_questions FOR SELECT TO authenticated USING ((is_active = true));


--
-- Name: codex_section_prompts Authenticated users can view active section prompts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view active section prompts" ON public.codex_section_prompts FOR SELECT TO authenticated USING ((is_active = true));


--
-- Name: codex_ai_steps Authenticated users can view codex AI steps; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view codex AI steps" ON public.codex_ai_steps FOR SELECT USING (true);


--
-- Name: codex_prompt_dependencies Authenticated users can view dependencies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view dependencies" ON public.codex_prompt_dependencies FOR SELECT TO authenticated USING (true);


--
-- Name: codex_question_mappings Authenticated users can view question mappings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view question mappings" ON public.codex_question_mappings FOR SELECT TO authenticated USING (true);


--
-- Name: system_settings Authenticated users can view system settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view system settings" ON public.system_settings FOR SELECT TO authenticated USING (true);


--
-- Name: codex_section_prompts_history No one can delete section version history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "No one can delete section version history" ON public.codex_section_prompts_history FOR DELETE USING (false);


--
-- Name: codex_prompts_history No one can delete version history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "No one can delete version history" ON public.codex_prompts_history FOR DELETE USING (false);


--
-- Name: codex_section_prompts_history No one can update section version history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "No one can update section version history" ON public.codex_section_prompts_history FOR UPDATE USING (false);


--
-- Name: codex_prompts_history No one can update version history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "No one can update version history" ON public.codex_prompts_history FOR UPDATE USING (false);


--
-- Name: admin_notifications System can insert notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert notifications" ON public.admin_notifications FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: codex_section_prompts_history System can insert section version history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert section version history" ON public.codex_section_prompts_history FOR INSERT WITH CHECK (true);


--
-- Name: codex_prompts_history System can insert version history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert version history" ON public.codex_prompts_history FOR INSERT WITH CHECK (true);


--
-- Name: shared_links Users can create shared links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create shared links" ON public.shared_links FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.persona_runs
  WHERE ((persona_runs.id = shared_links.persona_run_id) AND (persona_runs.user_id = auth.uid())))));


--
-- Name: persona_runs Users can create their own persona runs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own persona runs" ON public.persona_runs FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: persona_runs Users can delete their own persona runs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own persona runs" ON public.persona_runs FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: shared_links Users can delete their own shared links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own shared links" ON public.shared_links FOR DELETE USING ((created_by = auth.uid()));


--
-- Name: persona_runs Users can update their own persona runs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own persona runs" ON public.persona_runs FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: shared_links Users can update their own shared links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own shared links" ON public.shared_links FOR UPDATE USING ((created_by = auth.uid()));


--
-- Name: ai_usage_logs Users can view their own AI usage logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own AI usage logs" ON public.ai_usage_logs FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: codex_sections Users can view their own codex sections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own codex sections" ON public.codex_sections FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.codexes
     JOIN public.persona_runs ON ((persona_runs.id = codexes.persona_run_id)))
  WHERE ((codexes.id = codex_sections.codex_id) AND (persona_runs.user_id = auth.uid())))));


--
-- Name: codexes Users can view their own codexes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own codexes" ON public.codexes FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.persona_runs
  WHERE ((persona_runs.id = codexes.persona_run_id) AND (persona_runs.user_id = auth.uid())))));


--
-- Name: pdf_exports Users can view their own pdf exports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own pdf exports" ON public.pdf_exports FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.persona_runs
  WHERE ((persona_runs.id = pdf_exports.persona_run_id) AND (persona_runs.user_id = auth.uid())))));


--
-- Name: persona_runs Users can view their own persona runs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own persona runs" ON public.persona_runs FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated USING ((auth.uid() = id));


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: shared_links Users can view their own shared links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own shared links" ON public.shared_links FOR SELECT USING ((created_by = auth.uid()));


--
-- Name: user_unlimited_runs Users can view their own unlimited runs status; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own unlimited runs status" ON public.user_unlimited_runs FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: admin_activity_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_provider_keys; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_provider_keys ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_providers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_usage_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: analytics_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

--
-- Name: codex_ai_steps; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.codex_ai_steps ENABLE ROW LEVEL SECURITY;

--
-- Name: codex_prompt_dependencies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.codex_prompt_dependencies ENABLE ROW LEVEL SECURITY;

--
-- Name: codex_prompts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.codex_prompts ENABLE ROW LEVEL SECURITY;

--
-- Name: codex_prompts_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.codex_prompts_history ENABLE ROW LEVEL SECURITY;

--
-- Name: codex_question_mappings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.codex_question_mappings ENABLE ROW LEVEL SECURITY;

--
-- Name: codex_section_ai_steps; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.codex_section_ai_steps ENABLE ROW LEVEL SECURITY;

--
-- Name: codex_section_prompts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.codex_section_prompts ENABLE ROW LEVEL SECURITY;

--
-- Name: codex_section_prompts_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.codex_section_prompts_history ENABLE ROW LEVEL SECURITY;

--
-- Name: codex_sections; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.codex_sections ENABLE ROW LEVEL SECURITY;

--
-- Name: codexes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.codexes ENABLE ROW LEVEL SECURITY;

--
-- Name: pdf_exports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pdf_exports ENABLE ROW LEVEL SECURITY;

--
-- Name: pdf_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pdf_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: persona_runs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.persona_runs ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: questionnaire_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.questionnaire_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: questionnaire_questions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.questionnaire_questions ENABLE ROW LEVEL SECURITY;

--
-- Name: share_link_attempts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.share_link_attempts ENABLE ROW LEVEL SECURITY;

--
-- Name: shared_links; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shared_links ENABLE ROW LEVEL SECURITY;

--
-- Name: system_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: user_blocks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_unlimited_runs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_unlimited_runs ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;