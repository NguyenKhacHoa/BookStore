-- =====================================================================
-- MIGRATION: Bổ sung luồng Hoàn hàng / Trả hàng (Return & Refund)
-- Chạy trong Supabase Dashboard -> SQL Editor -> Run
-- =====================================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS return_reason TEXT;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check
    CHECK (status IN (
      'PENDING',
      'CONFIRMED',
      'SHIPPING',
      'COMPLETED',
      'CANCELLED',
      'RETURN_REQUESTED',
      'RETURNED',
      'RETURN_REJECTED'
    ));

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_payment_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_status_check
    CHECK (payment_status IN ('UNPAID', 'PAID', 'REFUNDED'));
