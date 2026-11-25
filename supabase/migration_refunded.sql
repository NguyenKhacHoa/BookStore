-- =====================================================================
-- MIGRATION: Bổ sung trạng thái hoàn tiền 'REFUNDED' cho cột payment_status
-- Chạy trong Supabase Dashboard -> SQL Editor -> Run
-- =====================================================================

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_payment_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_status_check
    CHECK (payment_status IN ('UNPAID', 'PAID', 'REFUNDED'));
