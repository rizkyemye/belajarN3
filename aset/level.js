/* ==========================================================================
   ../aset/level.js — level ditentukan oleh HALAMAN (tanpa fitur ganti level)
   --------------------------------------------------------------------------
   · ../  → N3   (materi: data.json)
   · n5.html     → N5   (materi: data-n5.json)
   · n4.html     → N4   (materi: data-n4.json)
   Halaman level menuliskan:  <script>window.N3_LEVEL="N5";</script>  sebelum ../aset/level.js
   Kalau berkas ini dihapus, semua halaman otomatis pakai N3 (data.json).
   ========================================================================== */
(function () {
    "use strict";

    const DAFTAR = ["N5", "N4", "N3"];
    const HALAMAN = { N5: "../n5/", N4: "../n4/", N3: "../n3/" };   // folder per tingkat

    /* Tombol "Beranda" di halaman /fitur/ harus kembali ke beranda TINGKAT ini
       (halaman /fitur/ melayani semua tingkat, jadi tautannya tidak boleh
       selalu ke halaman pemilih tingkat). */
    function rapikanTombolBeranda() {
        let lv = level();
        // kalau tingkat belum tersimpan, ambil dari alamat halaman (mis. /n5/ -> N5).
        // Ini mencegah tombol pulang melempar ke pemilih tingkat (index) yang bikin bingung.
        if (!lv) {
            const m = /\/(n[345])\//i.exec(location.pathname);
            if (m) lv = m[1].toUpperCase();
        }
        const tujuan = lv ? "../" + lv.toLowerCase() + "/" : "../";
                /* Halaman fitur memakai <a> DAN <button onclick="...href='../'...">.
           Dua-duanya diarahkan ke beranda TINGKAT ini. */
        document.querySelectorAll("a, button").forEach(function (el) {
            const teks = (el.textContent || "").trim();
            const onclick = el.getAttribute("onclick") || "";
            // JANGAN sentuh tombol tab (mis. "📖 Belajar" pakai switchTab) — itu bukan tombol pulang
            if (/switchTab\s*\(/.test(onclick)) return;
            // JANGAN sentuh tombol yang punya aksi sendiri (mis. "Balik ke sesi lain", "Mulai sesi")
            // — aksi itu bukan pengalihan halaman, jadi jangan ditimpa.
            if (onclick && !/(location|href|window\.open|assign|replace)/i.test(onclick)) return;
            // tombol pulang: teks Beranda/Home, onclick lama ke '../', atau tautan href="../"
            const iniBeranda = /beranda|home|ホーム/i.test(teks)
                || /'(\.\.\/|index\.html)'/.test(onclick)
                || (el.getAttribute("href") === "../");
            if (!iniBeranda) return;
            el.setAttribute("data-beranda", lv);
            if (el.tagName === "A") {
                el.setAttribute("href", tujuan);
            } else {
                el.removeAttribute("onclick");                       // buang pengalihan lama
                el.onclick = function (e) { e.preventDefault(); location.href = tujuan; };
            }
        });
    }
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", rapikanTombolBeranda);
    } else {
        rapikanTombolBeranda();
    }
    window.N3Beranda = rapikanTombolBeranda;   // bisa dipanggil ulang setelah login



    function level() {
        if (window.N3_LEVEL) {
            const lv = String(window.N3_LEVEL).toUpperCase();
            // simpan supaya halaman /fitur/ (kuis, dashboard, review) ikut tingkat ini
            if (window.simpanTingkat) window.simpanTingkat(lv); else { try { localStorage.setItem("n3_level", lv); } catch (e) {} }
            if (DAFTAR.indexOf(lv) >= 0) return lv;
        }
        const m = /[?&]lv=(N[345])/i.exec(location.search);
        if (m) return m[1].toUpperCase();
        try {
            const s = String(localStorage.getItem("n3_level") || "").toUpperCase();
            if (DAFTAR.indexOf(s) >= 0) return s;
        } catch (e) {}
        return "N3";
    }

    function berkasData() {
        const lv = level();
        if (lv === "N5") return "../aset/data-n5.json?v=10";
        if (lv === "N4") return "../aset/data-n4.json?v=10";
        return "../aset/data.json?v=10";
    }

    /* ---------- tampilan: judul ikut level, tab khusus N3 disembunyikan ---------- */
    const TAB_N3 = [];   // semua tab dibuka: kanji, bunpou, dokkai sudah punya data N5 & N4

    function pasangTampilan() {
        const lv = level();
        if (window.N3_LEVEL) {
            document.body.classList.add("lv-" + lv.toLowerCase());
        }
        document.querySelectorAll(".hero-judul, .header-title h1, h1").forEach(function (el) {
            if (/JLPT\s*N[1-5]/i.test(el.textContent)) el.textContent = el.textContent.replace(/JLPT\s*N[1-5]/i, "JLPT " + lv);
        });
        if (lv !== "N3") {
            document.querySelectorAll(".tab-navigation .tab-btn, .tab-navigation button").forEach(function (b) {
                const t = (b.textContent || "").toLowerCase();
                if (TAB_N3.some(function (k) { return t.indexOf(k.toLowerCase()) !== -1; })) b.style.display = "none";
            });
        }
    }

    /* ---------- (DINONAKTIFKAN) pengalihan otomatis lama ----------
       Dulu: kalau tingkat tersimpan N5/N4, halaman di luar halaman tingkat otomatis
       dilempar ke beranda tingkat itu. Sekarang halaman /fitur/ (kuis, review,
       dashboard) harus tetap di tempat — jadi arahkan() tidak dipakai lagi. */
    function arahkan() {
        return;                       // ponytail: sisa fitur "ganti tingkat" yang sudah dihapus
        /* eslint-disable no-unreachable */
        if (window.N3_LEVEL) return;                 // sudah di halaman level yang benar
        let lv = "";
        try {
            lv = (window.N3 && typeof N3.level === "function" && N3.level()) || localStorage.getItem("n3_level") || "";
        } catch (e) { lv = ""; }
        lv = String(lv).toUpperCase();
        if (DAFTAR.indexOf(lv) < 0 || lv === "N3") return;
        try {
            if (sessionStorage.getItem("n3_arah") === "1") return;
            sessionStorage.setItem("n3_arah", "1");
        } catch (e) {}
        location.replace(HALAMAN[lv] + location.search.replace(/[?&]lv=N[345]/i, ""));
    }

    window.N3Level = { level: level, berkasData: berkasData };
    window.N3BerkasData = berkasData;

    function mulai() { pasangTampilan(); setTimeout(arahkan, 600); }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mulai);
    else mulai();
})();
