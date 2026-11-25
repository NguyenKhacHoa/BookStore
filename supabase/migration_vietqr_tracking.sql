-- =====================================================================
-- MIGRATION: Bổ sung VietQR Payment & Trạng thái CONFIRMED cho bảng orders
-- Chạy trong Supabase Dashboard -> SQL Editor -> Run
-- =====================================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'UNPAID'
    CHECK (payment_status IN ('UNPAID', 'PAID')),
  ADD COLUMN IF NOT EXISTS transaction_code TEXT UNIQUE;

-- Cập nhật ràng buộc status để bổ sung trạng thái CONFIRMED (4 bước: PENDING -> CONFIRMED -> SHIPPING -> COMPLETED / CANCELLED)
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check
    CHECK (status IN ('PENDING', 'CONFIRMED', 'SHIPPING', 'COMPLETED', 'CANCELLED'));
