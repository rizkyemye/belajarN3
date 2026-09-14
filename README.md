<div align="center">

# 🇯🇵 belajarN3 — Belajar Bahasa Jepang N3

**Web belajar bahasa Jepang N3 yang aku bikin sendiri, dipakai tiap hari buat latihan menuju JLPT N3.**

[![Buka webnya](https://img.shields.io/badge/▶_buka_webnya-rizkyemye.github.io-38bdf8?style=for-the-badge)](https://rizkyemye.github.io/belajarN3/)
![JavaScript](https://img.shields.io/badge/JavaScript-vanilla-0f172a?style=flat-square&logo=javascript&logoColor=f7df1e)
![Supabase](https://img.shields.io/badge/Supabase-auth_&_database-0f172a?style=flat-square&logo=supabase&logoColor=3ecf8e)
![GitHub Pages](https://img.shields.io/badge/hosting-GitHub_Pages-0f172a?style=flat-square&logo=github&logoColor=ffffff)

</div>

---

## ✨ Fitur

| Bagian | Isi |
| --- | --- |
| 📅 **Kalender** | hari konsisten (streak), jumlah hari belajar bulan ini, total jam, target 20 jam, hitung mundur ke JLPT (6 Desember 2026) |
| 📖 **Belajar** | **1.160 kartu** dari 31 hari materi — kosakata + contoh kalimat **berfurigana**, 3 sesi per hari (pagi/siang/malam), tombol nilai kartu *Susah / Ragu / Mudah*, timer belajar otomatis |
| 📐 **Bunpou** | **119 pola tata bahasa** N3 — tiap pola ada **rumus sambung**, arti, contoh kalimat + terjemahan, bisa dicari & difilter per hari |
| 🈶 **漢字 Kanji** | **824 kanji** — bacaan **音読み (onyomi)**, **訓読み (kunyomi)**, arti Bahasa Indonesia, jumlah goresan, level JLPT, dan contoh kata dari materi sendiri |
| 📝 **Kuis** | 13 soal pilihan ganda per hari (kanji→hiragana, hiragana→kanji, bunpou), timer per soal |
| 🔁 **Review Kosakata** | kata yang **pernah salah** atau **dijawab lebih dari 30 detik** otomatis masuk daftar ulang — cuma dari hari yang kuisnya sudah selesai |
| 📊 **Dashboard** | login aman, total jam, akurasi kuis, level 7 tingkat (初心者 → 見習い → 学習者 → 中級者 → 上級者 → 達人), papan peringkat antar pengguna |
| 🔑 **Lupa sandi mandiri** | tiap akun dapat **kode pemulihan** — kalau lupa sandi tinggal pakai kode itu, tanpa email |

Semua jalan di HP: tampilan responsif, data belajar tersimpan di server (bisa dibuka dari HP mana pun), dan ada antrean offline kalau internet sempat putus.

---

## 🈶 Soal furigana & data kanji

- **Furigana** di kalimat contoh dibuat otomatis pakai [SudachiPy](https://github.com/WorksApplications/SudachiPy) (analisis morfologi Jepang), lalu disimpan di field `furi` pada `data.json` dalam bentuk markup `<ruby>` — jadi `back` tetap bersih tanpa HTML.
- **Data kanji** (bacaan 音読み/訓読み, goresan, level JLPT) diambil dari dataset terbuka [kanji-data](https://github.com/davidluzgouveia/kanji-data) (**lisensi MIT**, bersumber dari KANJIDIC). Artinya sudah diterjemahkan ke Bahasa Indonesia.
- **Kosakata & contoh kalimat** disusun sendiri untuk latihan pribadi.

---

## 🛠️ Teknologi

- **Vanilla JavaScript** — tanpa framework, tanpa build step (simpel & cepat dibuka di HP)
- **Supabase** — login username+sandi, database Postgres, RLS, dan fungsi RPC (reset sandi, pencatat progres)
- **GitHub Pages** — hosting statis gratis
- Data belajar disimpan sebagai file JSON (`data.json`, `kanji.json`)

---

## 📁 Struktur berkas

```
index.html          halaman utama (4 tab: Kalender · Belajar · Bunpou · 漢字)
app.js              logika flashcard, bunpou, tab & kalender
n3-kanji.js         logika tab 漢字 (pencarian, filter hari, filter JLPT N3)
n3-auth.js          login/daftar, sinkron data ke server, kode pemulihan, antrean offline
quiz.html / quiz.js halaman kuis harian (timer per soal)
review.html         halaman Review Kosakata
dashboard.html      dashboard: statistik, level, papan peringkat, input nilai lama
style.css           seluruh tampilan (responsif)
data.json           1.160 kartu (front/back + furigana + hari)
kanji.json          824 kanji (bacaan on/kun + arti + contoh kata)
supabase-config.js  isi URL + publishable key Supabase  ← wajib ada biar login jalan
schema.sql          tabel profiles / study_sessions / progress + view + RLS
schema-review.sql   tabel word_stats (Review Kosakata)
schema-reset.sql    fungsi kode pemulihan (fitur lupa sandi)
```

---

## 🚀 Pakai webnya

1. Buka **[rizkyemye.github.io/belajarN3](https://rizkyemye.github.io/belajarN3/)**
2. Klik **Daftar Baru** — bikin username + sandi (nggak perlu email)
3. **Simpan kode pemulihannya** (dikasih sekali waktu daftar) — buat jaga-jaga kalau lupa sandi
4. Mulai belajar: 1 hari = 15 menit, 3 sesi. Kuis jam 17:00, review keesokan harinya

---

## ⚙️ Menjalankan sendiri

```bash
git clone https://github.com/rizkyemye/belajarN3.git
cd belajarN3
python3 -m http.server 8080     # buka http://localhost:8080
```

Supaya fitur login & penyimpanan progres jalan, siapkan Supabase:

1. Buat project di [supabase.com](https://supabase.com) → ambil **URL** + **publishable key**
2. Isi `supabase-config.js`:
   ```js
   window.N3_SUPABASE = {
       url: "https://<project-kamu>.supabase.co",
       anonKey: "sb_publishable_..."
   };
   ```
3. Jalankan `schema.sql`, `schema-review.sql`, `schema-reset.sql` di **SQL Editor**
4. Di **Authentication → Providers**: nyalakan *Email*, matikan *Confirm email*, nyalakan *Allow signups*

> Kunci yang dipakai cuma *publishable/anon key* — aman ditaruh di web. Proteksi data lewat **Row Level Security**, dan kunci `service_role` **tidak pernah** ditaruh di repo ini.

---

## 🗺️ Rencana berikutnya

- [ ] 2.000 kosakata (sekarang 1.160)
- [ ] latihan 聴解 (mendengar) pakai audio
- [ ] mode gelap
- [ ] export/import progres belajar

---

<div align="center">
  <i>「継続は力なり」— 続けることが力になる</i><br>
  <sub>Terus-menerus, sedikit-sedikit, itu yang jadi kekuatan.</sub>
</div>
