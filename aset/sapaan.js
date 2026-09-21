/* ==========================================================================
   sapaan.js — sapaan hangat di header
   Menyesuaikan waktu (pagi/siang/malam) + nama pengguna + pesan harian.
   Dipasang di index.html. Kalau ingin dimatikan: hapus <script src="sapaan.js">
   ========================================================================== */
(function () {
    "use strict";

    var NAMA_CADANGAN = "リズ";

    // nama yang tidak enak dipakai untuk sapaan → pakai panggilan sayang
    var NAMA_UMUM = ["defaultuser", "guest", "ujicoba", "user", "-", "", "belum masuk", "masuk", "login", "silakan masuk", "not logged in", "anonim", "anon"];
    function layakDipakai(n) {
        if (!n) return false;
        return NAMA_UMUM.indexOf(String(n).trim().toLowerCase()) === -1;
    }

    function namaPengguna() {
        try {
            if (window.N3 && typeof N3.namaPengguna === "function" && layakDipakai(N3.namaPengguna())) {
                return N3.namaPengguna();
            }
        } catch (e) {}
        try {
            var tampil = document.getElementById("currentProfileDisplay");
            if (tampil) {
                var bersih = String(tampil.textContent).replace(/[👤\s]+/g, " ").trim();
                if (layakDipakai(bersih)) return bersih;
            }
        } catch (e) {}
        try {
            var p = localStorage.getItem("jlpt_current_user");
            if (layakDipakai(p)) return p;
        } catch (e) {}
        try {
            // nama yang diisi di halaman "Mulai dari sini"
            var ob = localStorage.getItem("n3_nama_panggilan");
            if (layakDipakai(ob)) return ob;
        } catch (e) {}
        return NAMA_CADANGAN;
    }

    function sapaanWaktu(j) {
        if (j >= 5 && j < 11) return "おはよう";
        if (j >= 11 && j < 18) return "こんにちは";
        return "こんばんは";
    }

    // pesan berganti tiap hari (stabil dalam satu hari, jadi tidak "loncat-loncat")
    var PESAN = [
        "今日も一歩ずつ ✓ (hari ini satu langkah lagi)",
        "1 sesi aja dulu, nanti lanjut ✓",
        "kotoba hari ini sudah dibaca? ✓",
        "頑張りすぎないでね (jangan terlalu dipaksa ya) ✓",
        "sedikit tapi tiap hari > banyak tapi sekali ✓",
        "聞く・読む・書く — pelan-pelan saja ✓",
    ];
    function pesanHariIni() {
        var d = new Date();
        var urut = Math.floor(d.getTime() / 86400000) % PESAN.length;
        return PESAN[urut];
    }

    function pasang() {
        var kotak = document.getElementById("sapaan");
        if (!kotak) return;
        var j = new Date().getHours();
        var nama = namaPengguna();
        kotak.innerHTML =
            '<span class="sapaan-emoji">🌸</span>' +
            '<span><span class="sapaan-nama">' + sapaanWaktu(j) + "、" + nama + "</span>" +
            '<span class="sapaan-pesan">' + pesanHariIni() + "</span></span>";
        kotak.classList.add("sapaan-siap");

        // chip profil: sembunyikan kalau isinya nama umum (DefaultUser/Guest/…)
        var chip = document.getElementById("currentProfileDisplay");
        if (chip) {
            var teksChip = String(chip.textContent).replace(/[👤\s]+/g, " ").trim();
            chip.style.display = layakDipakai(teksChip) ? "" : "none";
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", pasang);
    } else {
        pasang();
    }
    // perbarui saat pengguna berganti profil / login
    setInterval(pasang, 30000);
})();
