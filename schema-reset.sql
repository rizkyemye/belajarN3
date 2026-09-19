-- ============================================================================
--  FITUR "LUPA SANDI" MANDIRI (kode pemulihan) — BelajarN3 Bareng
--  Cara pakai: Supabase → SQL Editor → New query → tempel semua ini → RUN
--  Aman dijalankan berulang (idempotent).
-- ============================================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------------ kolom baru
alter table public.profiles add column if not exists kode_hash      text;
alter table public.profiles add column if not exists kode_dibuat    timestamptz;
alter table public.profiles add column if not exists percobaan_gagal int not null default 0;
alter table public.profiles add column if not exists dikunci_sampai  timestamptz;

-- ============================================================================
--  1) BUAT / GANTI KODE PEMULIHAN  (dipanggil saat daftar & dari Dashboard)
--     Kode dikirim dalam bentuk teks, yang disimpan hanya HASH-nya (bcrypt).
-- ============================================================================
create or replace function public.set_kode_pemulihan(p_kode text)
returns json
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_kode text;
begin
  if auth.uid() is null then
    return json_build_object('ok', false, 'pesan', 'Harus login dulu.');
  end if;

  v_kode := upper(regexp_replace(coalesce(p_kode, ''), '[^A-Za-z0-9]', '', 'g'));
  if length(v_kode) < 8 then
    return json_build_object('ok', false, 'pesan', 'Kode pemulihan minimal 8 karakter.');
  end if;

  update public.profiles
     set kode_hash       = crypt(v_kode, gen_salt('bf')),
         kode_dibuat     = now(),
         percobaan_gagal = 0,
         dikunci_sampai  = null
   where id = auth.uid();

  if not found then
    return json_build_object('ok', false, 'pesan', 'Profil tidak ditemukan.');
  end if;

  return json_build_object('ok', true, 'pesan', 'Kode pemulihan disimpan.');
end;
$$;

-- ============================================================================
--  2) LUPA SANDI: username + kode pemulihan -> set sandi baru
--     Bisa dipanggil tanpa login (anon). Salah kode 5x = terkunci 15 menit.
-- ============================================================================
create or replace function public.reset_sandi_dengan_kode(
    p_username text, p_kode text, p_sandi_baru text)
returns json
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_id     uuid;
  v_hash   text;
  v_gagal  int;
  v_kunci  timestamptz;
  v_kode   text;
begin
  v_kode := upper(regexp_replace(coalesce(p_kode, ''), '[^A-Za-z0-9]', '', 'g'));

  if length(trim(coalesce(p_username, ''))) < 3 then
    return json_build_object('ok', false, 'pesan', 'Username tidak valid.');
  end if;
  if length(coalesce(p_sandi_baru, '')) < 6 then
    return json_build_object('ok', false, 'pesan', 'Sandi baru minimal 6 karakter.');
  end if;
  if length(v_kode) < 8 then
    return json_build_object('ok', false, 'pesan', 'Username atau kode pemulihan salah.');
  end if;

  select id, kode_hash, percobaan_gagal, dikunci_sampai
    into v_id, v_hash, v_gagal, v_kunci
    from public.profiles
   where lower(username) = lower(trim(p_username))
   limit 1;

  if v_id is null then
    return json_build_object('ok', false, 'pesan', 'Username atau kode pemulihan salah.');
  end if;

  if v_kunci is not null and v_kunci > now() then
    return json_build_object('ok', false,
      'pesan', 'Terlalu banyak percobaan salah. Coba lagi 15 menit lagi.');
  end if;

  if v_hash is null then
    return json_build_object('ok', false,
      'pesan', 'Akun ini belum punya kode pemulihan. Login dulu, lalu buat kode di Dashboard.');
  end if;

  if crypt(v_kode, v_hash) <> v_hash then
    update public.profiles
       set percobaan_gagal = coalesce(percobaan_gagal, 0) + 1,
           dikunci_sampai  = case
                              when coalesce(percobaan_gagal, 0) + 1 >= 5
                              then now() + interval '15 minutes'
                              else null end
     where id = v_id;
    return json_build_object('ok', false, 'pesan', 'Username atau kode pemulihan salah.');
  end if;

  update auth.users
     set encrypted_password = crypt(p_sandi_baru, gen_salt('bf')),
         updated_at         = now()
   where id = v_id;

  if not found then
    return json_build_object('ok', false, 'pesan', 'Akun tidak ditemukan.');
  end if;

  update public.profiles
     set percobaan_gagal = 0, dikunci_sampai = null
   where id = v_id;

  return json_build_object('ok', true,
    'pesan', 'Sandi berhasil diganti. Silakan login dengan sandi baru.');
end;
$$;

-- ============================================================================
--  3) HAK AKSES
-- ============================================================================
revoke all on function public.set_kode_pemulihan(text) from public;
revoke all on function public.reset_sandi_dengan_kode(text, text, text) from public;
grant execute on function public.set_kode_pemulihan(text) to authenticated;
grant execute on function public.reset_sandi_dengan_kode(text, text, text) to anon, authenticated;

-- ============================================================================
--  4) CEK HASIL (jalankan setelah semua di atas sukses)
-- ============================================================================
select
  (select count(*) from information_schema.columns
    where table_schema='public' and table_name='profiles'
      and column_name in ('kode_hash','kode_dibuat','percobaan_gagal','dikunci_sampai')) as kolom_baru,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname='public'
      and p.proname in ('set_kode_pemulihan','reset_sandi_dengan_kode')) as fungsi_baru;
-- harapan: kolom_baru = 4, fungsi_baru = 2
