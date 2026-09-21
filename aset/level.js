/* ==========================================================================
   level.js — level ditentukan oleh HALAMAN (tanpa fitur ganti level)
   --------------------------------------------------------------------------
   · index.html  → N3   (materi: data.json)
   · n5.html     → N5   (materi: data-n5.json)
   · n4.html     → N4   (materi: data-n4.json)
   Halaman level menuliskan:  <script>window.N3_LEVEL="N5";</script>  sebelum level.js
   Kalau berkas ini dihapus, semua halaman otomatis pakai N3 (data.json).
   ========================================================================== */
(function () {
    "use strict";

    const DAFTAR = ["N5", "N4", "N3"];
    const HALAMAN = { N5: "../n5/", N4: "../n4/", N3: "../n3/" };   // folder per tingkat

    function level() {
        if (window.N3_LEVEL) {
            const lv = String(window.N3_LEVEL).toUpperCase();
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
        if (lv === "N5") return "data-n5.json?v=10";
        if (lv === "N4") return "data-n4.json?v=10";
        return "data.json?v=10";
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

    /* ---------- yang daftar sebagai N5/N4 otomatis diarahkan ke halamannya ---------- */
    function arahkan() {
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
