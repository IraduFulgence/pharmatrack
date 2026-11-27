-- Migration: Create password_resets table for forgot/reset password workflow

CREATE TABLE IF NOT EXISTS public.password_resets (
    reset_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email character varying(255) NOT NULL,
    user_type character varying(20) NOT NULL, -- 'PATIENT' or 'PHARMACY'
    user_id bigint NOT NULL,
    token_hash text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_password_resets_token_hash ON public.password_resets (token_hash);
CREATE INDEX IF NOT EXISTS idx_password_resets_email ON public.password_resets (email);

