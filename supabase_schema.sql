-- ========================================================
-- SCRIPT TẠO DATABASE CHO DỰ ÁN SMART QR ORDER TRÊN SUPABASE
-- Bạn copy toàn bộ đoạn mã này và dán vào: Supabase -> SQL Editor -> Run
-- ========================================================

-- 1. Tạo bảng lưu trữ đơn đặt món (orders)
create table if not exists public.orders (
    id text primary key,
    session_id text not null default 'DEMO',
    table_number integer not null,
    customer_name text not null,
    items jsonb not null default '[]'::jsonb,
    total_amount bigint not null default 0,
    status text not null default 'pending', -- 'pending' (mới đặt), 'preparing' (đang pha), 'served' (đã giao), 'completed' (hoàn tất)
    note text,
    created_at timestamptz not null default now(),
    updated_at timestamptz default now()
);

-- 2. Tạo bảng lưu trữ yêu cầu hỗ trợ (gọi nhân viên / gọi tính tiền)
create table if not exists public.service_requests (
    id text primary key,
    session_id text not null default 'DEMO',
    table_number integer not null,
    customer_name text not null,
    type text not null, -- 'call_staff' (gọi nhân viên) hoặc 'request_bill' (gọi tính tiền)
    reason text,
    status text not null default 'pending', -- 'pending', 'resolved'
    created_at timestamptz not null default now()
);

-- 3. Bật tính năng Realtime (Postgres Changes) cho 2 bảng này
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.service_requests;

-- 4. Phân quyền bảo mật (Row Level Security - RLS) cho phép đọc và ghi công khai cho bản demo
alter table public.orders enable row level security;
drop policy if exists "Public access for orders" on public.orders;
create policy "Public access for orders" on public.orders for all using (true) with check (true);

alter table public.service_requests enable row level security;
drop policy if exists "Public access for service_requests" on public.service_requests;
create policy "Public access for service_requests" on public.service_requests for all using (true) with check (true);

-- 5. Tạo index tăng tốc truy vấn theo session và thời gian
create index if not exists idx_orders_session_time on public.orders(session_id, created_at desc);
create index if not exists idx_service_requests_session on public.service_requests(session_id, created_at desc);

