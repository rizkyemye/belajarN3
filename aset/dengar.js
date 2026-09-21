/* ==========================================================================
   ../aset/dengar.js — tap kata/kalimat → dengar pengucapan (Web Speech API, gratis)
   Yang dipasangi tombol 🔊:
     • kartu utama (#cardFront)
     • daftar kata hari ini (.vocab-front)
     • soal kuis (#quizQuestionText, #bunpouQuestionText)
   Kalau HP belum punya suara Jepang, muncul pesan kecil (bukan error).
   Matikan dengan: hapus <script src="../aset/dengar.js"> dari halaman.
   ========================================================================== */
(function () {
    "use strict";

    if (!("speechSynthesis" in window)) return;

    var suaraJepang = null;
    function pilihSuara() {
        try {
            var daftar = window.speechSynthesis.getVoices() || [];
            suaraJepang = daftar.find(function (v) { return /^ja/i.test(v.lang || ""); }) || null;
        } catch (e) { suaraJepang = null; }
    }
    pilihSuara();
    if (typeof window.speechSynthesis.onvoiceschanged !== "undefined") {
        window.speechSynthesis.onvoiceschanged = pilihSuara;
    }

    // buang tanda baca/tanda kurung yang tidak perlu dibaca
    function bersihkan(teks) {
        return String(teks || "")
            .replace(/[「」『』（）()【】\[\]]/g, " ")
            .replace(/（\s*　?\s*）/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    // baca teks tanpa ikut membaca emoji tombolnya sendiri
    function teksTanpaTombol(el) {
        if (!el) return "";
        var klon = el.cloneNode(true);
        klon.querySelectorAll(".tombol-dengar").forEach(function (b) { b.remove(); });
        return klon.textContent;
    }

    var pesanDitampilkan = false;
    function beriTahu(teks) {
        if (pesanDitampilkan) return;
        pesanDitampilkan = true;
        var el = document.createElement("div");
        el.className = "info-dengar";
        el.textContent = teks;
        document.body.appendChild(el);
        setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 2600);
    }

    window.bacaJepang = function (teks) {
        var t = bersihkan(teks);
        if (!t) return;
        try {
            window.speechSynthesis.cancel();
            var u = new SpeechSynthesisUtterance(t);
            u.lang = suaraJepang ? suaraJepang.lang : "ja-JP";
            if (suaraJepang) u.voice = suaraJepang;
            u.rate = 0.85;   // agak lambat: lebih jelas buat belajar
            u.pitch = 1.0;
            window.speechSynthesis.speak(u);
            if (!suaraJepang) beriTahu("🔊 Membaca dengan suara bawaan — kalau terdengar aneh, pasang \"Japanese\" di setelan suara HP ya");
        } catch (e) {
            beriTahu("🔇 Suara tidak bisa dipakai di peramban ini");
        }
    };

    function tombol(teks, kelas) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = kelas || "tombol-dengar";
        b.title = "Dengar pengucapan";
        b.setAttribute("aria-label", "Dengar pengucapan");
        b.textContent = "🔊";
        b.addEventListener("click", function (ev) {
            ev.preventDefault();
            ev.stopPropagation();
            window.bacaJepang(teks());
        });
        return b;
    }

    // --- 1) kartu utama ---
    function pasangKartu() {
        var kartu = document.getElementById("cardFront");
        if (!kartu || kartu.querySelector(".tombol-dengar")) return;
        if (getComputedStyle(kartu).position === "static") kartu.style.position = "relative";
        kartu.appendChild(tombol(function () { return teksTanpaTombol(kartu); }, "tombol-dengar tombol-dengar-kartu"));
    }

    // --- 2) daftar kata ---
    function pasangDaftarKata() {
        document.querySelectorAll(".vocab-front").forEach(function (span) {
            if (span.querySelector(".tombol-dengar")) return;
            span.appendChild(tombol(function () { return teksTanpaTombol(span); }, "tombol-dengar tombol-dengar-kecil"));
        });
    }

    // --- 3) soal kuis ---
    function pasangSoal() {
        ["quizQuestionText", "bunpouQuestionText"].forEach(function (id) {
            var el = document.getElementById(id);
            if (!el || el.querySelector(".tombol-dengar")) return;
            if (el.classList.contains("card-face") || getComputedStyle(el).position !== "static") {
                // sudah punya posisi → pasang di dalam
                el.appendChild(tombol(function () { return teksTanpaTombol(el); }, "tombol-dengar tombol-dengar-kartu"));
            } else {
                var b = tombol(function () { return teksTanpaTombol(el); }, "tombol-dengar tombol-dengar-kecil");
                el.parentNode.insertBefore(b, el.nextSibling);
            }
        });
    }

    function pasangSemua() {
        pasangKartu();
        pasangDaftarKata();
        pasangSoal();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", pasangSemua);
    } else {
        pasangSemua();
    }

    // daftar kata & soal digambar ulang oleh ../aset/app.js → pantau perubahan
    try {
        var pengamat = new MutationObserver(function () { pasangSemua(); });
        pengamat.observe(document.body, { childList: true, subtree: true });
    } catch (e) {}
})();
