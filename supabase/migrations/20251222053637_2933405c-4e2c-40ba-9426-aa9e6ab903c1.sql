-- Fix REPLICA IDENTITY for notifications table to enable proper realtime filtering
ALTER TABLE public.notifications REPLICA IDENTITY FULL;