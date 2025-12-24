-- Add column to track if 50% notification was sent
ALTER TABLE public.metas ADD COLUMN notificado_50 boolean NOT NULL DEFAULT false;