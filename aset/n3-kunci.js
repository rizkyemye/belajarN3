/* ==========================================================================
   KUNCI MATERI PER HARI  (dipakai tab 📖 Belajar · Bunpou · 漢字 Kanji · 読解 Dokkai)
   --------------------------------------------------------------------------
   ATURAN BARU (agar situs aman untuk banyak orang):
       · Setiap akun punya "tanggal mulai" sendiri.
       · Hari ke-1 = hari kamu mulai belajar → 1 hari = 1 materi baru kebuka.
       · Akun lama (yang sudah punya progres) otomatis dihitung ulang supaya
         materi yang sudah terbuka TIDAK ikut terkunci.
       · Tombol "Tampilkan semua" tetap ada kalau mau mengulang / mengintip.
   ========================================================================== */
(function () {
    "use strict";

    const KUNCI_SEMUA = "n3_buka_semua";        // "1" = jangan dikunci (lihat semua)
    const KUNCI_MULAI = "n3_tanggal_mulai";     // "YYYY-MM-DD" milik akun/browser ini
    const SEHARI = 24 * 60 * 60 * 1000;

    /* ---------- tanggal mulai ---------- */

    function penggunaAktif() {
        try { return localStorage.getItem("jlpt_current_user") || ""; } catch (e) { return ""; }
    }

    function kunciMulai() {
        const u = penggunaAktif();
        return u ? KUNCI_MULAI + "_" + u : KUNCI_MULAI;
    }

    function ubahKeTanggal(t) {
        const p = String(t).split("-");
        return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    }

    function jadikanTeks(d) {
        const b = String(d.getMonth() + 1).padStart(2, "0");
        const t = String(d.getDate()).padStart(2, "0");
        return d.getFullYear() + "-" + b + "-" + t;
    }

    function bacaMulai() {
        try {
            const u = penggunaAktif();
            return (u && localStorage.getItem(KUNCI_MULAI + "_" + u)) ||
                localStorage.getItem(KUNCI_MULAI) || null;
        } catch (e) { return null; }
    }

    function tanggalMulai() {
        const t = bacaMulai();
        return t ? ubahKeTanggal(t) : null;
    }

    function setTanggalMulai(t) {
        try {
            localStorage.setItem(kunciMulai(), t);
            localStorage.setItem(KUNCI_MULAI, t);
        } catch (e) {}
    }

    /* ---------- ada progres lama? (akun yang sudah belajar sebelum aturan baru) ---------- */

    function punyaProgresLama() {
        try {
            if (localStorage.getItem("jlpt_current_user")) return true;
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i) || "";
                if (k.indexOf("n3_detik_") === 0 || k.indexOf("n3_selesai_") === 0) return true;
            }
        } catch (e) {}
        return false;
    }

    /* ---------- inti: hari maksimal yang terbuka ---------- */

    // aturan lama (hari ke-1 = tanggal 5) — hanya dipakai sekali untuk akun lama
    function maksHariLama() {
        const tgl = new Date().getDate();
        return tgl < 5 ? 1 : tgl - 4;
    }

    function hariKe(mulai) {
        const dasar = new Date(mulai.getFullYear(), mulai.getMonth(), mulai.getDate());
        const kini = new Date();
        const kiniDasar = new Date(kini.getFullYear(), kini.getMonth(), kini.getDate());
        const selisih = Math.floor((kiniDasar - dasar) / SEHARI);
        return Math.max(1, selisih + 1);
    }

    function maksHari() {
        let mulai = bacaMulai();

        if (!mulai) {
            if (punyaProgresLama()) {
                // akun lama: bekukan progres sekarang supaya tidak ada yang terkunci
                const lama = maksHariLama();
                const d = new Date();
                d.setDate(d.getDate() - (lama - 1));
                setTanggalMulai(jadikanTeks(d));
            } else {
                // pengunjung baru: mulai dari Hari 1 hari ini
                setTanggalMulai(jadikanTeks(new Date()));
            }
            mulai = bacaMulai();
        }

        return hariKe(tanggalMulai() || new Date());
    }

    function lihatSemua() {
        try { return localStorage.getItem(KUNCI_SEMUA) === "1"; } catch (e) { return false; }
    }

    function terbuka(hari) {
        if (lihatSemua()) return true;
        const n = Number(hari);
        return !isNaN(n) && n <= maksHari();
    }

    function setLihatSemua(aktif) {
        try { localStorage.setItem(KUNCI_SEMUA, aktif ? "1" : "0"); } catch (e) {}
    }

    /* ---------- tampilan catatan kunci ---------- */
    function pasangGaya() {
        if (document.getElementById("gayaKunciHari")) return;
        const s = document.createElement("style");
        s.id = "gayaKunciHari";
        s.textContent =
            ".kunci-catatan{display:flex;gap:8px;align-items:center;flex-wrap:wrap;" +
            "background:#fffbeb;border:1px solid #fcd34d;color:#78350f;border-radius:10px;" +
            "padding:9px 12px;margin:10px 0;font-size:.85rem;line-height:1.45}" +
            ".kunci-catatan.buka{background:#eff6ff;border-color:#93c5fd;color:#1e3a8a}" +
            ".kunci-catatan b{font-weight:700}" +
            ".kunci-catatan button{margin-left:auto;background:#f59e0b;color:#fff;border:0;" +
            "border-radius:8px;padding:7px 12px;font-size:.8rem;font-weight:700;cursor:pointer;min-height:34px}" +
            ".kunci-catatan.buka button{background:#2563eb}" +
            ".kunci-catatan button:active{transform:scale(.97)}";
        (document.head || document.documentElement).appendChild(s);
    }

    function tanggalIndah(d) {
        const bulan = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
        return d.getDate() + " " + bulan[d.getMonth()] + " " + d.getFullYear();
    }

    /**
     * Bikin elemen catatan kunci.
     * @param {number} hariTerkunciAwal  hari terkecil yang masih terkunci (0 kalau tidak ada)
     * @param {number} jmlTerkunci       jumlah item yang disembunyikan
     * @param {function} onUbah          dipanggil setelah tombol ditekan (untuk render ulang)
     * @returns {HTMLElement|null}
     */
    function catatan(hariTerkunciAwal, jmlTerkunci, onUbah) {
        pasangGaya();
        if (!jmlTerkunci && !lihatSemua()) return null;

        const div = document.createElement("div");
        let pesan;
        if (lihatSemua()) {
            div.className = "kunci-catatan buka";
            pesan = "🔓 <b>Mode lihat semua</b> — semua hari ditampilkan (termasuk yang belum kebuka).";
        } else {
            div.className = "kunci-catatan";
            const mulai = tanggalMulai();
            pesan = "🔒 <b>" + jmlTerkunci + " materi</b> masih terkunci" +
                (hariTerkunciAwal ? " (mulai Hari " + hariTerkunciAwal + ")" : "") +
                ". <b>1 hari = 1 materi baru</b> — hari ini Hari <b>" + maksHari() + "</b>" +
                (mulai ? " (mulai " + tanggalIndah(mulai) + ")" : "") + ".";
        }
        div.innerHTML = "<span>" + pesan + "</span>" +
            '<button type="button">' + (lihatSemua() ? "Kunci lagi" : "Tampilkan semua") + "</button>";
        div.querySelector("button").addEventListener("click", function () {
            setLihatSemua(!lihatSemua());
            if (typeof onUbah === "function") onUbah();
        });
        return div;
    }

    window.N3Unlock = {
        maksHari: maksHari,
        terbuka: terbuka,
        lihatSemua: lihatSemua,
        setLihatSemua: setLihatSemua,
        catatan: catatan,
        // tambahan untuk halaman "Mulai dari sini" & dashboard
        tanggalMulai: tanggalMulai,
        setTanggalMulai: setTanggalMulai,
        hariKe: function () { return maksHari(); },
        tanggalIndah: tanggalIndah
    };
})();
