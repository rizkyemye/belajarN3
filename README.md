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
| 🌸 **Banner & sapaan** | sapaan otomatis sesuai waktu (おはよう / こんにちは / こんばんは) + pesan harian; nama diambil dari halaman *Mulai dari sini* |
| 📅 **Kalender** | hari konsisten (streak), jumlah hari belajar bulan ini, total jam, target 20 jam, hitung mundur ke JLPT (6 Desember 2026) |
| 📖 **Belajar** | **1.160 kartu** dari 31 hari materi — kosakata + contoh kalimat **berfurigana**, 3 sesi per hari, tombol nilai *Belum ingat / Sudah ingat*, timer belajar otomatis |
| 🔁 **Jadwal ulang (spaced repetition)** | tiap kata punya tingkat ulangan sendiri: **besok → 3 → 7 → 14 → 30 → 60 → 120 hari**. Benar & cepat = naik tingkat, benar tapi lambat = tingkatnya tetap, salah = mulai dari besok lagi |
| ⚡ **Aturan 3 detik** | kata yang dijawab **lebih dari 3 detik** (walau jawabannya benar) otomatis masuk Review Kosakata — ambangnya bisa diganti dari 3 / 5 / 8 / 15 / … / 60 detik |
| 📐 **Bunpou** | **119 pola tata bahasa** N3 — tiap pola ada **rumus sambung**, arti, contoh kalimat + terjemahan, bisa dicari & difilter per hari |
| 🎓 **Kuiz Bunpou** | **310 soal** tata bahasa (10 soal per hari, 31 hari) — isian kalimat, arti pola, dan arah balik |
| 🈶 **漢字 Kanji** | **824 kanji** — bacaan **音読み (onyomi)**, **訓読み (kunyomi)**, arti Bahasa Indonesia, jumlah goresan, level JLPT, dan contoh kata dari materi sendiri |
| 📝 **Kuis** | 13 soal pilihan ganda per hari (kanji→hiragana, hiragana→kanji, bunpou), timer per soal |
| 🔁 **Review Kosakata** | kata yang **pernah salah** atau **jawabnya lebih dari 3 detik** otomatis masuk daftar ulang — cuma dari hari yang kuisnya sudah selesai; kartunya menampilkan *⚡ rata-rata waktu jawab* |
| 🔊 **Dengar pengucapan** | tombol 🔊 di kartu & soal — membaca dengan suara Jepang (Web Speech API, kecepatan 0.85×) |
| 📈 **EXP & level** | EXP dihitung dari jam belajar + hari selesai + jawaban benar, dengan animasi **+1 XP** dan **LEVEL UP**; 7 tingkat (初心者 → 見習い → 学習者 → 中級者 → 上級者 → 達人) |
| 📊 **Dashboard** | login aman, total jam, akurasi kuis, level, papan peringkat antar pengguna |
| 🌱 **Mulai dari sini** | halaman perkenalan: isi nama → pilih target harian → tes kecil 10 soal → mulai Hari 1 |
| 📖 **Cara pakai & kredit** | panduan 5 langkah, sumber data & lisensi, keterangan data pribadi |
| 🔑 **Lupa sandi mandiri** | tiap akun dapat **kode pemulihan** — kalau lupa sandi tinggal pakai kode itu, tanpa email |

**Aturan buka materi:** hari ke-1 dimulai di **tanggal kamu mulai** — 1 hari = 1 materi baru. Materi lama tetap bisa dibuka kapan saja, dan ada tombol *Tampilkan semua* kalau mau mengintip ke depan.

Semua jalan di HP **dan desktop**: tampilan responsif (satu kolom di HP, banyak kolom di layar lebar), data belajar tersimpan di server (bisa dibuka dari HP mana pun), dan ada antrean offline kalau internet sempat putus.

---

## 🆕 Yang baru (19 September 2026)

- 🌸 Tampilan baru: banner sapaan gradasi, tombol aksi besar (sasaran sentuh 46px), tab yang selalu muat di layar HP
- 🖥️ Tata letak khusus desktop: konten 1080–1240px, tombol sejajar, kartu materi 2–3 kolom, efek hover
- 🔁 **Spaced repetition**: jadwal ulang per kata (1 → 3 → 7 → 14 → 30 → 60 → 120 hari)
- ⚡ **Aturan 3 detik**: jawaban lambat (walau benar) masuk daftar ulang; ambangnya bisa diatur
- 🎓 Kuiz Bunpou: 310 soal, 10 soal per hari
- 📈 EXP dari Dashboard masuk ke kuis & kartu, lengkap dengan animasi level
- 🌱 Halaman *Mulai dari sini* + halaman *Cara pakai & kredit*
- 📱 Meta/OG + favicon: link yang dibagikan tampil sebagai kartu (og-image 1200×630)
- 🐛 Perbaikan: kartu flashcard tidak lagi "jatuh ke bawah" saat dibalik; halaman jadi jauh lebih ringan (sebelumnya ada selektor CSS berat yang bikin tombol terasa lambat)

---

## 🈶 Soal furigana & data kanji

- **Furigana** di kalimat contoh dibuat otomatis pakai [SudachiPy](https://github.com/WorksApplications/SudachiPy) (analisis morfologi Jepang), lalu disimpan di field `furi` pada `data.json` dalam bentuk markup `<ruby>` — jadi `back` tetap bersih tanpa HTML.
- **Data kanji** (bacaan 音読み/訓読み, goresan, level JLPT) diambil dari dataset terbuka [kanji-data](https://github.com/davidluzgouveia/kanji-data) (**lisensi MIT**, bersumber dari KANJIDIC). Artinya sudah diterjemahkan ke Bahasa Indonesia.
- **Kosakata, contoh kalimat, pola bunpou, dan bacaan dokkai** disusun sendiri untuk latihan pribadi.
- Rinciannya juga ada di halaman **[Cara pakai & kredit](https://rizkyemye.github.io/belajarN3/kredit.html)**.

---

## 🛠️ Teknologi

- **Vanilla JavaScript** — tanpa framework, tanpa build step (simpel & cepat dibuka di HP)
- **Supabase** — login username+sandi, database Postgres, RLS, dan fungsi RPC (reset sandi, pencatat progres)
- **GitHub Pages** — hosting statis gratis
- **Web Speech API** — pengucapan kata bahasa Jepang (tanpa file audio, jadi tetap ringan)
- Data belajar disimpan sebagai file JSON (`data.json`, `kanji.json`, `bunpou_rumus.json`, `bunpou_quiz.json`, `dokkai.json`)
- Fitur baru selalu dibuat sebagai berkas terpisah yang bisa dicabut (hapus satu baris `<link>` / `<script>`)

---

## 📁 Struktur berkas

```
index.html            halaman utama (5 tab: Kalender · Belajar · Bunpou · 漢字 · Dokkai)
mulai.html            halaman "Mulai dari sini" (nama · target harian · tes 10 soal)
kredit.html           cara pakai, sumber data & lisensi, keterangan data pribadi
app.js                logika flashcard, bunpou, tab & kalender
tema-baru.css         tema baru (banner, tombol, tab, tata letak HP & desktop)
sapaan.js             sapaan otomatis sesuai waktu + nama pengguna
dengar.js             tombol 🔊 pengucapan (Web Speech API)
n3-kunci.js           kunci materi: 1 hari = 1 materi, dihitung dari tanggal mulai akun
n3-srs.js             jadwal ulang kata (spaced repetition)
n3-auth.js            login/daftar, sinkron data ke server, kode pemulihan, antrean offline
n3-kanji.js           logika tab 漢字 (pencarian, filter hari, filter JLPT N3)
n3-dokkai.js          logika tab 読解 Dokkai (bacaan + soal)
quiz.html / quiz.js   kuis kosakata harian (13 soal, timer per soal, aturan 3 detik)
quiz-bunpou.html/js   kuiz tata bahasa (10 soal per hari)
review.html           Review Kosakata + jadwal ulang
dashboard.html        dashboard: statistik, level, papan peringkat, input nilai lama
style.css             seluruh tampilan lama (responsif)
data.json             1.160 kartu (front/back + furigana + hari)
kanji.json            824 kanji (bacaan on/kun + arti + contoh kata)
bunpou_rumus.json     119 pola tata bahasa
bunpou_quiz.json      310 soal bunpou (10 soal × 31 hari)
dokkai.json           bacaan + soal pemahaman
bikin_kuis_bunpou.py  pembuat bunpou_quiz.json
og-image.png          gambar pratinjau link (1200×630)
supabase-config.js    isi URL + publishable key Supabase  ← wajib ada biar login jalan
schema.sql            tabel profiles / study_sessions / progress + view + RLS
schema-review.sql     tabel word_stats (Review Kosakata)
schema-reset.sql      fungsi kode pemulihan (fitur lupa sandi)
```

---

## 🚀 Pakai webnya

1. Buka **[rizkyemye.github.io/belajarN3](https://rizkyemye.github.io/belajarN3/)**
2. Klik **Daftar Baru** — bikin username + sandi (nggak perlu email)
3. **Simpan kode pemulihannya** (dikasih sekali waktu daftar) — buat jaga-jaga kalau lupa sandi
4. Buka halaman **[Mulai dari sini](https://rizkyemye.github.io/belajarN3/mulai.html)** — isi nama, pilih target harian, kerjakan tes kecil 10 soal
5. Mulai belajar: 1 hari = 1 materi baru. Kuis jam 17:00, dan keesokan harinya cek **Review Kosakata** — kata yang lambat (>3 detik) atau salah akan muncul di sana

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

> Catatan: `bunpou_quiz.json` dan `data.json` dibaca lewat `fetch()`, jadi halaman harus dibuka dari server (`http.server` / GitHub Pages), **bukan** diklik langsung sebagai berkas (`file://`).

---

## 🗺️ Rencana berikutnya

- [ ] 2.000 kosakata (sekarang 1.160)
- [ ] latihan 聴解 (mendengar) penuh — sekarang baru pengucapan per kata
- [ ] mode gelap
- [ ] latihan urutan goresan kanji (KanjiVG)
- [ ] export/import progres belajar
- [ ] level N5 & N4

---

<div align="center">
  <i>「継続は力なり」— 続けることが力になる</i><br>
  <sub>Terus-menerus, sedikit-sedikit, itu yang jadi kekuatan.</sub>
</div>
