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
| 🗓️ **Strip hari & kartu tugas** | strip 7 hari yang bisa digeser (di HP) + **5 kartu tugas** hari ini: Sesi · Bunpou · Dokkai · **Kuis** · Motivasi; yang belum selesai berlatar merah, yang selesai hijau + centang ✓, dan kalau semua beres muncul **“✓ Hari ini sudah selesai!”**. Tiap kartu juga bilang *“masih ada N hari yang … belum dikerjakan”* |
| 🎯 **Level terpisah** | waktu daftar wajib pilih **N5 / N4 / N3** — masing-masing punya halamannya sendiri (`n5.html` · `n4.html` · `index.html`), tersimpan di akun, dan tidak ada fitur ganti-ganti level |
| ✍️ **Tulis (kana & kanji)** | `tulis.html` — **(a) 🃏 Kartu hafalan kana** (khusus N5): 71 kana hiragana & katakana, ketuk untuk membalik, 🔁 Belum ingat / ✅ Sudah ingat + penghitung hafal; **(b) ✍️ Latihan tulis**: tulis pakai jari dengan panduan **urutan goresan** (KanjiVG), tombol *Cara tulis* (animasi), 🔊 dengar |
| 🈳 **Tulis Kanji per tingkat** | kanji yang muncul **sesuai tingkat akun** (N5 168 · N4 220 · N3 437 kanji), ada **pemilih “Hari belajar”** supaya sama dengan tab 漢字 Kanji hari itu, lengkap **音読み / 訓読み / arti + kosakata terkait** |
| 📖 **Belajar** | **1.384 kartu** dari 38 hari materi (31 hari tema harian + **Hari 32–38: set kosakata ujian N3, 50 kata per hari**) — kosakata + contoh kalimat **berfurigana**, 3 sesi per hari, tombol nilai *Belum ingat / Sudah ingat*, timer belajar otomatis |
| 🔁 **Jadwal ulang (spaced repetition)** | tiap kata punya tingkat ulangan sendiri: **besok → 3 → 7 → 14 → 30 → 60 → 120 hari**. Benar & cepat = naik tingkat, benar tapi lambat = tingkatnya tetap, salah = mulai dari besok lagi |
| ⚡ **Aturan 3 detik** | kata yang dijawab **lebih dari 3 detik** (walau jawabannya benar) otomatis masuk Review Kosakata — ambangnya bisa diganti dari 3 / 5 / 8 / 15 / … / 60 detik |
| 📐 **Bunpou** | **119 pola tata bahasa** N3 — tiap pola ada **rumus sambung**, arti, contoh kalimat + terjemahan, bisa dicari & difilter per hari |
| 🎓 **Kuiz Bunpou** | **310 soal** tata bahasa (10 soal per hari, 31 hari) — isian kalimat, arti pola, dan arah balik |
| 🈶 **漢字 Kanji** | **1.197 kanji** (N5 168 · N4 220 · N3 437) — bacaan **音読み (onyomi)**, **訓読み (kunyomi)**, arti Bahasa Indonesia, jumlah goresan, level JLPT, dan **kosakata terkait** (mis. 中 → 集中, 中古) |
| 📝 **Kuis** | 13 soal pilihan ganda per hari (kanji→hiragana, hiragana→kanji, bunpou), timer per soal |
| 🔁 **Review Kosakata** | kata yang **pernah salah** atau **jawabnya lebih dari 3 detik** otomatis masuk daftar ulang — cuma dari hari yang kuisnya sudah selesai; kartunya menampilkan *⚡ rata-rata waktu jawab* |
| 🔊 **Dengar pengucapan** | tombol 🔊 di kartu & soal — membaca dengan suara Jepang (Web Speech API, kecepatan 0.85×) |
| 📈 **EXP & level** | EXP dihitung dari jam belajar + hari selesai + jawaban benar, dengan animasi **+1 XP** dan **LEVEL UP**; 7 tingkat (初心者 → 見習い → 学習者 → 中級者 → 上級者 → 達人) |
| 📊 **Dashboard** | login aman, total jam, akurasi kuis, level, papan peringkat antar pengguna |
| 📱 **Tampilan HP & desktop dipisah** | HP: strip hari, tab bawah dengan 漢字/読/動, tombol alat melayang (⋯), kartu tugas gaya iOS · Desktop: rail alat di kiri, satu baris tab dengan pil meluncur |
| 🌱 **Mulai dari sini** | halaman perkenalan: isi nama → pilih target harian → tes kecil 10 soal → mulai Hari 1 |
| 📖 **Cara pakai & kredit** | panduan 5 langkah, sumber data & lisensi, keterangan data pribadi |
| 🔑 **Lupa sandi mandiri** | tiap akun dapat **kode pemulihan** — kalau lupa sandi tinggal pakai kode itu, tanpa email |

**Aturan buka materi:** hari ke-1 dimulai di **tanggal kamu mulai** — 1 hari = 1 materi baru. Materi lama tetap bisa dibuka kapan saja, dan ada tombol *Tampilkan semua* kalau mau mengintip ke depan.

Semua jalan di HP **dan desktop**: tampilan responsif (satu kolom di HP, banyak kolom di layar lebar), data belajar tersimpan di server (bisa dibuka dari HP mana pun), dan ada antrean offline kalau internet sempat putus.

---

## 🆕 Yang baru (26 September 2026)

- 🗓️ **Strip hari** di HP: 7 tanggal bisa digeser, angka besar, plus **menit belajar per hari** (25m · 1j 5m) dan bilah kemajuan — animasi masuk berjenjang, hari ini berdenyut
- ✅ **Kartu tugas hari ini**: Sesi · Bunpou · Dokkai · **Kuis** · Motivasi — selesai = hijau + centang, belum = merah, dan kalau semua beres muncul **“✓ Hari ini sudah selesai!”**
- 🧮 **Hitungan tunggakan** per kartu: *“masih ada N hari yang sesinya / bunpou-nya / dokkainya / kuisnya belum …”* (dihitung dari seluruh hari yang sudah terbuka)
- 🈳 **Tulis Kanji per tingkat**: kanji mengikuti tingkat akun (N5 tampil hiragana + katakana + kanji · N4 · N3), ada **pemilih “Hari belajar”** supaya selaras dengan tab 漢字, dan setiap kanji menampilkan **kosakata terkait**
- 📱 **Tampilan dipisah tegas**: HP = strip hari + tab bawah (ikon 学 文 漢 読 動) + menu alat melayang (⋯) · Desktop = rail alat di kiri + bar tab dengan pil meluncur, header diringkas
- 🦶 **Kaki halaman baru**: `⚡ BelajarN3` · info sumber data · tautan *Cara pakai & kredit* (rata dengan konten)
- 🐛 Perbaikan: kartu tugas kadang tidak muncul kalau langsung buka tab Kalender; panel menu melayang sempat nyangkut; pil tab bawah tidak bisa meluncur; popup “mau keluar?” muncul dua kali
- 🈶 Jumlah kanji di halaman kredit & README diperbaiki (824 → **1.197**), dan sumber **kosakata terkait** (JMdict) ditulis jelas

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
- **Data kanji** (bacaan 音読み/訓読み, arti, jumlah goresan) diambil dari dataset terbuka [kanji-data](https://github.com/davidluzgouveia/kanji-data) (**lisensi MIT**, bersumber dari **KANJIDIC2** — EDRDG). Artinya sudah diterjemahkan ke Bahasa Indonesia.
- **Tingkat tiap kanji** (N5/N4/N3) mengikuti daftar [OpenJLPT](https://github.com/evanclan/OpenJLPT) (**CC BY-SA 4.0**); **pembagian “hari”** materi disusun sendiri.
- **Kosakata terkait** tiap kanji (mis. 中 → 集中, 中古) diambil dari **JMdict** (EDRDG, **CC BY-SA 4.0**) — kata yang memuat kanji itu — lalu artinya diterjemahkan sendiri.
- **Urutan goresan** kana & kanji dari **KanjiVG** oleh Ulrich Apel (**CC BY-SA 3.0**).
- **Kosakata, contoh kalimat, pola bunpou, dan bacaan dokkai** disusun sendiri untuk latihan pribadi (kalimat contoh sebagian memakai [Tatoeba](https://tatoeba.org) — CC BY 2.0 FR).
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
data.json             1.384 kartu N3 (front/back + furigana + hari)
kanji.json            1.197 kanji (bacaan on/kun + arti + kosakata terkait + hari & tingkat)
kanji-svg.json        urutan goresan kanji (KanjiVG, CC BY-SA 3.0)
data-n4.json          kosakata & materi N4 (948 entri) · data-n5.json (1.013 entri)
dokkai-n3/n4/n5.json  bacaan + soal per tingkat · bunpou-note.json catatan bunpou
tulis.html            latihan tulis kana & kanji (kartu hafalan + urutan goresan)
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

- [ ] 2.000 kosakata (sekarang 1.384 — termasuk set ujian N3 Hari 32–38)
- [ ] latihan 聴解 (mendengar) penuh — sekarang baru pengucapan per kata
- [ ] mode gelap
- [x] latihan tulis hiragana & katakana + **kanji** (KanjiVG) — sekarang per tingkat, ada pemilih hari
- [ ] export/import progres belajar
- [x] level N5 & N4 (kosakata + kuis) — **bunpou/kanji/dokkai per level sudah jalan**
- [ ] simulasi ujian JLPT (dijadwalkan H-60 sebelum 6 Desember 2026)

---

<div align="center">
  <i>「継続は力なり」— 続けることが力になる</i><br>
  <sub>Terus-menerus, sedikit-sedikit, itu yang jadi kekuatan.</sub>
</div>
