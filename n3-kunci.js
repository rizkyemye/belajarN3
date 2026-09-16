/* ==========================================================================
   KUNCI MATERI PER HARI  (dipakai tab Bunpou · 漢字 Kanji · 読解 Dokkai)
   Aturan sama dengan tab 📖 Belajar:
       hari ke-1 dimulai tanggal 5  →  maks hari terbuka = tanggal - 4
   Jadi materi hari ke-N baru muncul setelah hari itu kebuka di tab Belajar.
   Tombol "Tampilkan semua" (mode lihat-lihat) bisa dipakai kalau mau
   mengulang materi lama / mengintip ke depan.
   ========================================================================== */
(function () {
    "use strict";

    const KUNCI_SEMUA = "n3_buka_semua";   // "1" = jangan dikunci (lihat semua)

    function maksHari() {
        const tgl = new Date().getDate();
        return tgl < 5 ? 1 : tgl - 4;
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
            pesan = "🔒 <b>" + jmlTerkunci + " materi</b> masih terkunci" +
                (hariTerkunciAwal ? " (mulai Hari " + hariTerkunciAwal + ")" : "") +
                ". Kebuka otomatis sesuai progres di tab <b>📖 Belajar</b>.";
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
        catatan: catatan
    };
})();
