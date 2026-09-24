/* ==========================================================================
   ../aset/sapaan.js — sapaan hangat di header
   Menyesuaikan waktu (pagi/siang/malam) + nama pengguna + pesan harian.
   Dipasang di index.html. Kalau ingin dimatikan: hapus <script src="../aset/sapaan.js">
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

    /* ---------- angka dari log harian ../aset/app.js (tidak bikin pencatatan baru) ---------- */
    function detikHari(y, m, d) {
        try {
            if (typeof window.getDaySeconds === "function") return Number(window.getDaySeconds(y, m, d)) || 0;
        } catch (e) {}
        return 0;
    }
    // beruntun: mundur hari demi hari selama masih ada catatan belajar.
    // Kalau hari ini belum sempat belajar, hitungan mulai dari kemarin (tidak langsung putus).
    function hitungBeruntun(y, m, d) {
        var beruntun = 0;
        var jalan = new Date(y, m, d);
        if (detikHari(jalan.getFullYear(), jalan.getMonth(), jalan.getDate()) === 0) jalan.setDate(jalan.getDate() - 1);
        for (var i = 0; i < 400; i++) {
            if (detikHari(jalan.getFullYear(), jalan.getMonth(), jalan.getDate()) <= 0) break;
            beruntun++;
            jalan.setDate(jalan.getDate() - 1);
        }
        return beruntun;
    }

    // total hari yang ada catatan belajarnya (maks 400 hari ke belakang)
    function hitungTotalHari(y, m, d) {
        var total = 0;
        var cek = new Date(y, m, d);
        for (var i = 0; i < 400; i++) {
            if (detikHari(cek.getFullYear(), cek.getMonth(), cek.getDate()) > 0) total++;
            cek.setDate(cek.getDate() - 1);
        }
        return total;
    }

    function hitungAngka() {
        var sekarang = new Date();
        var y = sekarang.getFullYear(), m = sekarang.getMonth(), d = sekarang.getDate();
        return {
            menit: Math.floor(detikHari(y, m, d) / 60),
            beruntun: hitungBeruntun(y, m, d),
            total: hitungTotalHari(y, m, d)
        };
    }

    // kartu sapaan model B: strip 7 hari (Senin-Minggu) + beruntun
    function kartuHari(nama) {
        var a = hitungAngka();
        var j = new Date().getHours();
        var skrg = new Date(); skrg.setHours(0, 0, 0, 0);
        var senin = new Date(skrg);
        senin.setDate(senin.getDate() - ((senin.getDay() + 6) % 7));      // Senin = hari pertama
        var NAMA_HARI = ["SEN", "SEL", "RAB", "KAM", "JUM", "SAB", "MIN"];
        var strip = "", hariIni = 0, totalMenit = 0;
        for (var i = 0; i < 7; i++) {
            var t = new Date(senin.getTime());
            t.setDate(senin.getDate() + i);
            var dtk = detikHari(t.getFullYear(), t.getMonth(), t.getDate());
            var sudah = dtk > 0;
            var ini = (t.getTime() === skrg.getTime());
            if (sudah) { hariIni++; totalMenit += Math.floor(dtk / 60); }
            var isi = ini ? String(t.getDate()) : (sudah ? "✓" : "–");
            var kls = "sb-dot" + (sudah ? " isi" : "") + (ini ? " ini" : "");
            strip += '<div class="sb-hari"><span>' + NAMA_HARI[i] + "</span>" +
                     '<div class="' + kls + '">' + isi + "</div></div>";
        }
        return '<div class="sb-atas"><span class="sapaan-nama">' + sapaanWaktu(j) + "、" + nama + "</span>" +
               '<span class="sb-pil">🔥 ' + a.beruntun + " hari beruntun</span></div>" +
               '<div class="sb-strip">' + strip + "</div>" +
               '<div class="sb-kaki"><span>Minggu ini: <b>' + hariIni + "/7 hari</b></span>" +
               "<span>Total: <b>" + totalMenit + " menit</b></span></div>";
    }

    function kartuBento(nama) {
        var a = hitungAngka();
        var judulBeruntun = a.beruntun > 0 ? (a.beruntun + " hari tanpa bolong") : "mulai hari ini ✓";
        var j = new Date().getHours();
        return '<div class="sb-atas"><span class="sapaan-nama">' + sapaanWaktu(j) + "、" + nama + "</span>" +
               '<span class="sapaan-pesan">' + pesanHariIni() + "</span></div>" +
               '<div class="sb-grid">' +
                 '<div class="sb-kotak sb-besar">' +
                   '<div class="sb-judul">🔥 BERUNTUN</div>' +
                   '<div class="sb-angka">' + a.beruntun + "</div>" +
                   '<span class="sb-ket">' + judulBeruntun + "</span>" +
                   '<div class="sb-kanji">連</div>' +
                 "</div>" +
                 '<div class="sb-kotak">' +
                   '<div class="sb-judul">MENIT HARI INI</div>' +
                   '<div class="sb-angka2">' + a.menit + "</div>" +
                   '<div class="sb-kanji">時</div>' +
                 "</div>" +
                 '<div class="sb-kotak">' +
                   '<div class="sb-judul">HARI BELAJAR</div>' +
                   '<div class="sb-angka2">' + a.total + "</div>" +
                   '<div class="sb-kanji">学</div>' +
                 "</div>" +
               "</div>";
    }

    function pasang() {
        var kotak = document.getElementById("sapaan");
        if (!kotak) return;
        var nama = namaPengguna();
        kotak.classList.add("sapaan-bento");
        kotak.innerHTML = kartuHari(nama);
        kotak.classList.add("sapaan-siap");

        // chip profil: sembunyikan kalau isinya nama umum (DefaultUser/Guest/…)
        var chip = document.getElementById("currentProfileDisplay");
        if (chip) {
            var teksChip = String(chip.textContent).replace(/[👤\s]+/g, " ").trim();
            chip.style.display = layakDipakai(teksChip) ? "" : "none";
        }
    }

    // dipakai juga untuk uji cepat di konsol browser
    window.hitungAngkaSapaan = hitungAngka;

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", pasang);
    } else {
        pasang();
    }
    // perbarui saat pengguna berganti profil / login
    setInterval(pasang, 30000);
})();
