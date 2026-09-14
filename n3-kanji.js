/* ==========================================================================
   TAB KANJI (漢字) — 音読み / 訓読み + contoh kata dari materi sendiri
   Dimuat oleh index.html. Data: kanji.json (824 kanji, sumber KANJIDIC via
   dataset kanji-data, lisensi MIT).
   ========================================================================== */
(function () {
    "use strict";

    let semuaKanji = [];      // array dari kanji.json
    let sudahMuat = false;
    let q = "";
    let filterHari = "all";
    let hanyaN3 = false;
    let batas = 60;           // tampilkan bertahap biar HP tetap ringan

    function esc(s) {
        return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
    }

    function tampilkanDaftar() {
        let arr = semuaKanji;

        if (filterHari !== "all") {
            arr = arr.filter(function (k) { return (k.hari || []).indexOf(Number(filterHari)) !== -1; });
        }
        if (hanyaN3) {
            arr = arr.filter(function (k) { return Number(k.jlpt) === 3; });
        }
        if (q.trim()) {
            const cari = q.trim().toLowerCase();
            arr = arr.filter(function (k) {
                const teks = [k.kanji, (k.on || []).join(" "), (k.kun || []).join(" "),
                              (k.arti || []).join(" "),
                              (k.kata || []).map(function (x) { return x.kata + " " + x.arti; }).join(" ")]
                              .join(" ").toLowerCase();
                return teks.indexOf(cari) !== -1;
            });
        }

        const info = document.getElementById("kanjiInfo");
        if (info) {
            info.textContent = arr.length + " kanji" +
                (filterHari === "all" ? " · semua hari" : " · Hari " + filterHari) +
                (hanyaN3 ? " · hanya JLPT N3" : "") +
                (q.trim() ? ' · cari: "' + q.trim() + '"' : "");
        }

        const list = document.getElementById("kanjiList");
        if (!list) return;
        if (!arr.length) {
            list.innerHTML = '<div class="kanji-kosong">Tidak ada kanji yang cocok 🙈<br>Coba kata kunci lain ya〜</div>';
            return;
        }

        const tampil = arr.slice(0, batas);
        let html = "";
        tampil.forEach(function (k) {
            const on = (k.on || []).length ? (k.on || []).join(" · ") : "—";
            const kun = (k.kun || []).length ? (k.kun || []).join(" · ") : "—";
            const contoh = (k.kata || []).map(function (x) {
                return '<span class="kanji-kata"><b>' + esc(x.kata) + "</b> " + esc(x.arti) + "</span>";
            }).join("");
            html += '<div class="kanji-item">' +
                '<div class="kanji-badge">' + esc(k.kanji) + "</div>" +
                '<div class="kanji-isi">' +
                    '<div class="kanji-baris"><span class="kanji-label on">音読み</span><span class="kanji-baca">' + esc(on) + "</span></div>" +
                    '<div class="kanji-baris"><span class="kanji-label kun">訓読み</span><span class="kanji-baca">' + esc(kun) + "</span></div>" +
                    '<div class="kanji-baris"><span class="kanji-label arti">Arti</span><span class="kanji-arti">' + esc((k.arti || []).join(" · ") || "—") + "</span></div>" +
                    '<div class="kanji-meta">' +
                        (k.tiang ? esc(k.tiang) + " goresan" : "") +
                        (k.jlpt ? " · JLPT N" + esc(k.jlpt) : " · level tidak diketahui") +
                        ((k.hari || []).length ? " · muncul di hari " + esc((k.hari || []).slice(0, 8).join(", ")) + ((k.hari || []).length > 8 ? "…" : "") : "") +
                    "</div>" +
                    (contoh ? '<div class="kanji-contoh">' + contoh + "</div>" : "") +
                "</div>" +
            "</div>";
        });

        if (arr.length > tampil.length) {
            html += '<button class="kanji-more" onclick="tambahKanji()">Tampilkan ' + Math.min(60, arr.length - tampil.length) + ' kanji lagi ➔</button>';
        }
        list.innerHTML = html;
    }

    function bikinChip() {
        const chips = document.getElementById("kanjiHari");
        if (!chips) return;
        const hitung = {};
        semuaKanji.forEach(function (k) {
            (k.hari || []).forEach(function (h) { hitung[h] = (hitung[h] || 0) + 1; });
        });
        const hari = Object.keys(hitung).map(Number).sort(function (a, b) { return a - b; });

        let html = '<button class="kanji-chip aktif" data-hari="all">Semua <span class="kanji-n">' + semuaKanji.length + "</span></button>";
        hari.forEach(function (h) {
            html += '<button class="kanji-chip" data-hari="' + h + '">Hari ' + h + ' <span class="kanji-n">' + hitung[h] + "</span></button>";
        });
        chips.innerHTML = html;

        chips.querySelectorAll(".kanji-chip").forEach(function (btn) {
            btn.addEventListener("click", function () {
                chips.querySelectorAll(".kanji-chip").forEach(function (b) { b.classList.remove("aktif"); });
                btn.classList.add("aktif");
                filterHari = btn.dataset.hari === "all" ? "all" : Number(btn.dataset.hari);
                batas = 60;
                tampilkanDaftar();
            });
        });
    }

    function pasangKontrol() {
        const cari = document.getElementById("kanjiCari");
        if (cari && !cari.dataset.wired) {
            cari.dataset.wired = "1";
            cari.addEventListener("input", function (e) {
                q = e.target.value;
                batas = 60;
                tampilkanDaftar();
            });
        }
        const n3 = document.getElementById("kanjiN3");
        if (n3 && !n3.dataset.wired) {
            n3.dataset.wired = "1";
            n3.addEventListener("change", function (e) {
                hanyaN3 = e.target.checked;
                batas = 60;
                tampilkanDaftar();
            });
        }
    }

    window.tambahKanji = function () { batas += 60; tampilkanDaftar(); };

    window.initKanjiUI = function () {
        if (sudahMuat) { pasangKontrol(); tampilkanDaftar(); return; }
        sudahMuat = true;
        fetch("kanji.json")
            .then(function (r) { return r.ok ? r.json() : {}; })
            .then(function (json) {
                semuaKanji = Object.keys(json || {}).map(function (k) { return json[k]; });
                pasangKontrol();
                bikinChip();
                tampilkanDaftar();
            })
            .catch(function (e) {
                console.warn("gagal muat kanji.json", e);
                const list = document.getElementById("kanjiList");
                if (list) list.innerHTML = '<div class="kanji-kosong">Gagal memuat kanji.json 😢<br>Pastikan file itu sudah di-upload ya.</div>';
            });
    };
})();
