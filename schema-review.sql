-- ============================================================================
-- TAMBAHAN UNTUK FITUR "REVIEW KOSAKATA"
-- Tempel SELURUH isi file ini ke: Supabase → SQL Editor → New query → Run
-- (aman dijalankan berulang)
--
-- Fungsi: mencatat kata mana yang SALAH dan yang LAMA dijawab saat kuis,
-- supaya kata-kata itu bisa muncul lagi di halaman Review Kosakata.
-- ============================================================================

-- 1) TABEL STATISTIK PER KATA ------------------------------------------------
create table if not exists public.word_stats (
    user_id     uuid not null references public.profiles(id) on delete cascade,
    kata        text not null,                 -- tulisan kanji (front kartu)
    day_no      int  not null,                 -- hari materi kata itu
    benar       int  not null default 0,       -- berapa kali dijawab benar
    salah       int  not null default 0,       -- berapa kali dijawab salah
    lambat      int  not null default 0,       -- berapa kali dijawab > ambang detik
    detik_total int  not null default 0,       -- akumulasi waktu jawab (detik)
    terakhir    timestamptz default now(),
    primary key (user_id, kata)
);

alter table public.word_stats enable row level security;

drop policy if exists "kata: kelola sendiri" on public.word_stats;
create policy "kata: kelola sendiri" on public.word_stats
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 2) FUNGSI PENCATAT (dipanggil web setiap kali soal kuis dijawab) ------------
-- p_detik   : lama menjawab (detik)
-- p_ambang  : batas dianggap "lambat" (default 30 detik)
create or replace function public.catat_kata(
    p_kata text,
    p_day int,
    p_benar boolean,
    p_detik int,
    p_ambang int default 30
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    if auth.uid() is null then return; end if;
    if p_kata is null or length(trim(p_kata)) = 0 then return; end if;

    insert into public.word_stats (user_id, kata, day_no, benar, salah, lambat, detik_total, terakhir)
    values (
        auth.uid(),
        trim(p_kata),
        coalesce(p_day, 0),
        case when p_benar then 1 else 0 end,
        case when p_benar then 0 else 1 end,
        case when coalesce(p_detik,0) >= coalesce(p_ambang,30) then 1 else 0 end,
        coalesce(p_detik, 0),
        now()
    )
    on conflict (user_id, kata) do update set
        benar       = public.word_stats.benar + excluded.benar,
        salah       = public.word_stats.salah + excluded.salah,
        lambat      = public.word_stats.lambat + excluded.lambat,
        detik_total = public.word_stats.detik_total + excluded.detik_total,
        day_no      = greatest(public.word_stats.day_no, excluded.day_no),
        terakhir    = now();
end;
$$;

grant execute on function public.catat_kata(text, int, boolean, int, int) to authenticated;

-- 3) VIEW: kata yang perlu direview (lengkap dengan skor prioritas) ----------
-- hanya dari hari yang KUNIS-nya sudah selesai (progress session = 'kuis')
create or replace view public.v_review_kata as
select
    w.user_id,
    w.kata,
    w.day_no,
    w.benar,
    w.salah,
    w.lambat,
    w.detik_total,
    round(w.detik_total::numeric / greatest(w.benar + w.salah, 1), 1) as rata_detik,
    (w.salah * 3 + w.lambat * 2)                                       as skor_susah,
    w.terakhir
from public.word_stats w
where exists (
    select 1 from public.progress p
    where p.user_id = w.user_id
      and p.day_no = w.day_no
      and p.session = 'kuis'
      and p.selesai
)
and (w.salah > 0 or w.lambat > 0);

grant select on public.v_review_kata to authenticated;

-- 4) FUNGSI IMPOR DATA LAMA (waktu belajar yang cuma tercatat di HP) ---------
-- Idempoten: mengirim ulang tanggal yang sama TIDAK menambah detik (pakai greatest),
-- jadi aman ditekan berkali-kali.
create or replace function public.impor_waktu_lama(p_tanggal date, p_detik int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    if auth.uid() is null then return; end if;
    if p_tanggal is null or coalesce(p_detik,0) <= 0 then return; end if;

    insert into public.study_sessions (user_id, tanggal, day_no, session, detik)
    values (auth.uid(), p_tanggal, 0, 'lama', p_detik)
    on conflict (user_id, tanggal, day_no, session)
    do update set detik = greatest(public.study_sessions.detik, excluded.detik);
end;
$$;

grant execute on function public.impor_waktu_lama(date, int) to authenticated;
