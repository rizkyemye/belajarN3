/* ==========================================================================
   n3-srs.js — JADWAL ULANG KATA (spaced repetition) untuk halaman Review
   --------------------------------------------------------------------------
   Cara kerja (kotak Leitner):
       kotak 0 → ulang besok         kotak 3 → 14 hari lagi
       kotak 1 → 3 hari lagi         kotak 4 → 30 hari lagi
       kotak 2 → 7 hari lagi         kotak 5 → 60 hari · kotak 6 → 120 hari
   "Sudah ingat" → naik satu kotak.  "Belum ingat" → turun ke kotak 0 (besok lagi).
   Disimpan di localStorage: n3_srs_<pengguna>. Tidak mengubah data apa pun
   yang lama — kalau ingin dibuang: hapus berkas ini dari halaman.
   ========================================================================== */
(function () {
    "use strict";

    const HARI_KOTAK = [1, 3, 7, 14, 30, 60, 120];   // jeda (hari) untuk kotak 0..6
    const MAKS_KOTAK = HARI_KOTAK.length - 1;
    const MAKS_SESI = 30;                            // batas kata per sesi (biar tidak kebanjiran)
    const SEHARI = 24 * 60 * 60 * 1000;

    function kunci() {
        let u = "";
        try {
            u = (window.N3 && N3.namaPengguna && N3.namaPengguna()) ||
                localStorage.getItem("n3_username") ||
                localStorage.getItem("jlpt_current_user") || "-";
        } catch (e) { u = "-"; }
        return "n3_srs_" + u;
    }

    function baca() {
        try { return JSON.parse(localStorage.getItem(kunci()) || "{}") || {}; } catch (e) { return {}; }
    }

    function simpan(d) {
        try { localStorage.setItem(kunci(), JSON.stringify(d)); } catch (e) {}
    }

    function hariIni() {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }

    function teksTanggal(d) {
        return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    }

    function tambahHari(n) {
        const d = hariIni();
        d.setDate(d.getDate() + n);
        return teksTanggal(d);
    }

    /* ---------- catat hasil satu kata ---------- */
    function catat(kata, benar, lambat) {
        if (!kata) return null;
        const k = String(kata).trim();
        if (!k) return null;

        const semua = baca();
        const s = semua[k] || { k: -1, n: 0, salah: 0 };
        s.n = (s.n || 0) + 1;
        if (benar && !lambat) {
            // benar & cepat → naik satu tingkat
            s.k = Math.min(MAKS_KOTAK, (Number(s.k) < 0 ? 0 : Number(s.k)) + 1);
        } else if (benar) {
            // benar tapi lambat (> ambang) → tingkat TIDAK naik, jadi muncul lagi lebih cepat
            s.k = Math.max(0, Number(s.k) < 0 ? 0 : Number(s.k));
        } else {
            s.k = 0;
            s.salah = (s.salah || 0) + 1;
        }
        s.t = tambahHari(HARI_KOTAK[Math.max(0, Math.min(MAKS_KOTAK, Number(s.k)))]);
        s.terakhir = new Date().toISOString();
        semua[k] = s;
        simpan(semua);
        return s;
    }

    /* ---------- daftar kata yang jatuh tempo (termasuk yang telat) ---------- */
    function jatuhTempo() {
        const hari = teksTanggal(hariIni());
        const semua = baca();
        return Object.keys(semua).filter(function (k) {
            const s = semua[k] || {};
            return s.t && String(s.t) <= hari;
        }).sort(function (a, b) {
            const sa = semua[a], sb = semua[b];
            return String(sa.t).localeCompare(String(sb.t)) || (sb.salah || 0) - (sa.salah || 0);
        }).slice(0, MAKS_SESI);
    }

    /* ---------- ringkasan untuk tampilan ---------- */
    function statistik() {
        const semua = baca();
        const hari = teksTanggal(hariIni());
        const out = { total: 0, jatuhTempo: 0, baru: 0, sedang: 0, kuat: 0, kotak: [0, 0, 0, 0, 0, 0, 0] };
        Object.keys(semua).forEach(function (k) {
            const s = semua[k] || {};
            const b = Math.max(0, Math.min(MAKS_KOTAK, Number(s.k) || 0));
            out.total++;
            out.kotak[b]++;
            if (s.t && String(s.t) <= hari) out.jatuhTempo++;
            if (b <= 1) out.baru++;
            else if (b <= 3) out.sedang++;
            else out.kuat++;
        });
        return out;
    }

    function kataTerdekat() {
        const semua = baca();
        let dekat = null;
        Object.keys(semua).forEach(function (k) {
            const t = semua[k] && semua[k].t;
            if (!t) return;
            if (!dekat || String(t) < String(dekat)) dekat = String(t);
        });
        return dekat;
    }

    function lupakanSemua() {
        try { localStorage.removeItem(kunci()); } catch (e) {}
    }

    window.N3SRS = {
        catat: catat,
        jatuhTempo: jatuhTempo,
        statistik: statistik,
        kataTerdekat: kataTerdekat,
        lupakanSemua: lupakanSemua,
        HARI_KOTAK: HARI_KOTAK,
        MAKS_SESI: MAKS_SESI
    };
})();
