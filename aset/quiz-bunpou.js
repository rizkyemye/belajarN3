/* ==========================================================================
   QUIZ BUNPOU N3 — 10 soal tata bahasa per hari
   Soal diambil dari ../aset/bunpou_quiz.json (dibuat oleh bikin_kuis_bunpou.py):
     { "1": [ {jenis, soal, opsi[4], jawab, pola, arti, rumus, contoh, terjemah, petunjuk}, ... ] }
   Aturan buka hari sama dengan halaman lain: hari ke-1 mulai tanggal 5.
   ========================================================================== */
(function () {
    "use strict";

    let bankSoal = {};          // { "1": [...], "2": [...] }
    let daftarSoal = [];        // soal hari terpilih (sudah diacak)
    let idxSoal = 0;
    let benar = 0;
    let hariTerpilih = null;
    let waktuMulaiSoal = 0;
    let detikMulai = 0;


    /* ===== XP dari DASHBOARD (satu sumber, sama seperti dashboard.html) =====
       Rumus dashboard: XP = (jam belajar x 10) + (hari selesai x 5) + (jawaban benar)
       Jadi tiap jawaban benar = +1 XP. */
    const TINGKAT = [
        { min: 6000, no: 7, nama: "達人 (Ahli)" },
        { min: 3000, no: 6, nama: "上級者 (Mahir)" },
        { min: 1500, no: 5, nama: "中級者 (Menengah)" },
        { min: 700, no: 4, nama: "学習者 (Pembelajar)" },
        { min: 300, no: 3, nama: "見習い (Serius)" },
        { min: 100, no: 2, nama: "初心者+ (Pemula maju)" },
        { min: 0, no: 1, nama: "初心者 (Pemula)" }
    ];
    let xpSaya = 0;
    let sudahLogin = false;

    function tingkatDari(xp) { for (let i = 0; i < TINGKAT.length; i++) if (xp >= TINGKAT[i].min) return TINGKAT[i]; return TINGKAT[6]; }
    function tingkatBerikut(xp) { const urut = TINGKAT.slice().reverse(); for (let i = 0; i < urut.length; i++) if (urut[i].min > xp) return urut[i]; return null; }

    function gambarXp() {
        const tv = tingkatDari(xpSaya);
        const next = tingkatBerikut(xpSaya);
        const lv = document.getElementById("userLevel");
        const ex = document.getElementById("userExp");
        const nm = document.getElementById("namaLevel");
        const bar = document.getElementById("barXp");
        const teks = document.getElementById("xpTeks");
        if (lv) lv.textContent = tv.no;
        if (nm) nm.textContent = tv.nama;
        if (ex) ex.textContent = xpSaya.toLocaleString("id-ID");
        if (bar) {
            const mulai = tv.min;
            const akhir = next ? next.min : tv.min + 1;
            const persen = next ? Math.max(0, Math.min(100, Math.round(((xpSaya - mulai) / (akhir - mulai)) * 100))) : 100;
            bar.style.width = persen + "%";
        }
        if (teks) {
            teks.textContent = next
                ? xpSaya.toLocaleString("id-ID") + " XP · " + (next.min - xpSaya).toLocaleString("id-ID") + " XP lagi ke " + next.nama
                : xpSaya.toLocaleString("id-ID") + " XP · level tertinggi! 🎉";
        }
    }

    function tampilkanExpNaik(jumlah) {
        const el = document.createElement("div");
        el.className = "exp-naik";
        el.textContent = "+" + jumlah + " XP ✨";
        document.body.appendChild(el);
        setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 1150);
        const badge = document.getElementById("badgeXp");
        if (badge) { badge.classList.remove("badge-pulse"); void badge.offsetWidth; badge.classList.add("badge-pulse"); }
    }

    async function muatXp() {
        try {
            if (window.N3 && N3.tungguSiap) await N3.tungguSiap();
            if (window.N3 && N3.statistik) {
                const st = await N3.statistik();
                if (st && st.xp != null) { xpSaya = Number(st.xp) || 0; sudahLogin = true; }
            }
        } catch (e) { console.warn("gagal ambil EXP dashboard:", e); }
        const sumber = document.getElementById("badgeSumber");
        if (sumber) sumber.textContent = sudahLogin ? "📊 EXP dari Dashboard" : "📊 Dashboard (belum login)";
        gambarXp();
    }

    function tampilkanLevelNaik(noLama, noBaru) {
        const el = document.createElement("div");
        el.className = "level-naik";
        el.textContent = "🎉 LEVEL UP! Lv " + noLama + " → Lv " + noBaru;
        document.body.appendChild(el);
        setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 2300);
    }

    function tambahXp(n) {
        const noLama = tingkatDari(xpSaya).no;
        xpSaya += n;
        const noBaru = tingkatDari(xpSaya).no;
        gambarXp();
        tampilkanExpNaik(n);
        if (noBaru > noLama) tampilkanLevelNaik(noLama, noBaru);
    }

    function maksHari() {
        const tgl = new Date().getDate();
        return tgl < 5 ? 1 : tgl - 4;
    }

    function acak(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const t = a[i]; a[i] = a[j]; a[j] = t;
        }
        return a;
    }


    function isiPilihanHari() {
        const sel = document.getElementById("bunpouDaySelect");
        if (!sel) return;
        sel.innerHTML = "";
        const hari = Object.keys(bankSoal).map(Number).sort(function (a, b) { return a - b; });
        if (!hari.length) {
            const o = document.createElement("option");
            o.textContent =
                location.protocol === "file:"
                    ? "⚠️ Dibuka dari berkas komputer — data soal tidak bisa dimuat"
                    : "⚠️ Gagal memuat soal — pastikan ../aset/bunpou_quiz.json sudah di-upload";
            sel.appendChild(o);
            // beri penjelasan tambahan kalau dibuka sebagai berkas lokal
            if (location.protocol === "file:" && !document.getElementById("peringatanFile")) {
                const w = document.createElement("p");
                w.id = "peringatanFile";
                w.style.cssText = "margin:12px 0 0;font-size:.82rem;line-height:1.5;color:#92400e;background:#fffbeb;border:1px solid #fcd34d;border-radius:12px;padding:10px 12px;";
                w.innerHTML = "ℹ️ Halaman ini sedang dibuka <b>langsung dari berkas di komputer</b> (alamat berawalan <code>file://</code>). " +
                    "Peramban tidak mengizinkan halaman membaca berkas data dalam kondisi ini, jadi daftar hari kosong. " +
                    "Solusi: buka lewat <b>situs</b>-nya (<code>https://rizkyemye.github.io/belajarN3/quiz-bunpou.html</code>) setelah berkas di-upload ✓";
                sel.parentNode.insertBefore(w, sel.nextSibling);
            }
            return;
        }
        const maks = maksHari();
        const selesai = JSON.parse(localStorage.getItem("bunpou_selesai") || "[]");
        hari.forEach(function (d) {
            const o = document.createElement("option");
            o.value = d;
            const n = bankSoal[String(d)].length;
            if (d > maks) {
                o.textContent = "🔒 Hari ke-" + d + " (Terkunci)";
                o.disabled = true;
            } else if (selesai.indexOf(d) !== -1) {
                o.textContent = "✅ Hari ke-" + d + " (" + n + " soal) - Selesai";
            } else {
                o.textContent = "Hari ke-" + d + " (" + n + " soal)";
            }
            sel.appendChild(o);
        });
        const bisa = hari.filter(function (d) { return d <= maks; });
        if (bisa.length) sel.value = bisa[bisa.length - 1];
    }

    function startBunpouQuiz() {
        const sel = document.getElementById("bunpouDaySelect");
        if (!sel || !sel.value) return;
        hariTerpilih = Number(sel.value);
        const bank = bankSoal[String(hariTerpilih)] || [];
        if (!bank.length) return;

        daftarSoal = acak(bank);
        idxSoal = 0;
        benar = 0;
        detikMulai = Date.now();
        waktuMulaiSoal = Date.now();

        document.getElementById("bunpouSelectionCard").style.display = "none";
        document.getElementById("bunpouCompletionScreen").style.display = "none";
        document.getElementById("bunpouArea").style.display = "block";
        tampilkanSoal();
    }

    function tampilkanSoal() {
        const s = daftarSoal[idxSoal];
        if (!s) { selesaiBunpou(); return; }
        document.getElementById("bunpouCounter").textContent = "Soal: " + (idxSoal + 1) + "/" + daftarSoal.length;
        document.getElementById("bunpouScore").textContent = "Benar: " + benar;
        document.getElementById("bunpouPetunjuk").textContent = s.petunjuk || "Pilih jawaban yang tepat";
        document.getElementById("bunpouQuestionText").textContent = s.soal;

        const wadah = document.getElementById("bunpouOptions");
        wadah.innerHTML = "";
        s.opsi.forEach(function (teks, i) {
            const b = document.createElement("button");
            b.className = "quiz-option-btn";
            b.textContent = teks;
            b.setAttribute("data-benar", String(i === s.jawab));
            b.onclick = function () { jawabBunpou(this, i); };
            wadah.appendChild(b);
        });
        document.getElementById("bunpouExplain").style.display = "none";
        document.getElementById("bunpouExplainBody").innerHTML = "";
        waktuMulaiSoal = Date.now();
    }

    function jawabBunpou(tombol, pilihan) {
        const s = daftarSoal[idxSoal];
        const semua = document.querySelectorAll("#bunpouOptions .quiz-option-btn");
        semua.forEach(function (b) { b.disabled = true; });

        const durasi = (Date.now() - waktuMulaiSoal) / 1000;
        const tepat = pilihan === s.jawab;

        // catat kata/pola untuk Review Kosakata (opsional)
        try {
            if (window.N3 && N3.catatKata) N3.catatKata(s.pola, hariTerpilih, tepat, durasi, 8);  // soal kalimat perlu waktu baca
        } catch (e) { console.warn("gagal catat pola:", e); }

        if (tepat) {
            tombol.classList.add("correct");
            benar++;
            tambahXp(1); // 1 jawaban benar = +1 XP (rumus dashboard)
        } else {
            tombol.classList.add("wrong");
            semua.forEach(function (b) { if (b.getAttribute("data-benar") === "true") b.classList.add("correct"); });
        }
        document.getElementById("bunpouScore").textContent = "Benar: " + benar;

        // penjelasan
        const baris = [];
        baris.push('<b>' + (tepat ? "✅ Betul!" : "❌ Belum tepat") + '</b>');
        baris.push('<div style="margin-top:6px;">Pola: <b>' + s.pola + '</b> — ' + (s.arti || "-") + '</div>');
        if (s.rumus) baris.push('<div style="margin-top:4px;">Sambungan: <code style="background:#eef2ff;padding:2px 6px;border-radius:6px;">' + s.rumus + '</code></div>');
        if (s.contoh) baris.push('<div style="margin-top:8px;">例：' + s.contoh + '</div>');
        if (s.terjemah) baris.push('<div style="color:#64748b;">(' + s.terjemah + ')</div>');
        document.getElementById("bunpouExplainBody").innerHTML = baris.join("");
        document.getElementById("bunpouExplain").style.display = "block";
    }

    function lanjutBunpou() {
        idxSoal++;
        if (idxSoal >= daftarSoal.length) { selesaiBunpou(); return; }
        tampilkanSoal();
    }

    function selesaiBunpou() {
        document.getElementById("bunpouArea").style.display = "none";
        const layar = document.getElementById("bunpouCompletionScreen");
        layar.style.display = "block";
        const total = daftarSoal.length;
        const tvAkhir = tingkatDari(xpSaya);
        document.getElementById("bunpouResultText").innerHTML =
            "Hari ke-" + hariTerpilih + " · benar <b>" + benar + " / " + total + "</b><br>" +
            "Level " + tvAkhir.no + " · " + tvAkhir.nama + " · " + xpSaya.toLocaleString("id-ID") + " XP";
        // kirim nilai kuis ke server (menambah XP “hari selesai” di dashboard)
        try { if (window.N3 && N3.kirimNilai) N3.kirimNilai(hariTerpilih, benar, total); } catch (e) {}
        setTimeout(function () { muatXp(); }, 2500);

        // simpan waktu belajar ke kalender (kalau fungsi tersedia)
        try {
            const detik = Math.round((Date.now() - detikMulai) / 1000);
            if (window.N3 && N3.kirimDetik) N3.kirimDetik(hariTerpilih, "kuis", detik);
        } catch (e) { console.warn("gagal kirim waktu:", e); }

        const selesai = JSON.parse(localStorage.getItem("bunpou_selesai") || "[]");
        if (benar >= Math.ceil(total * 0.7) && selesai.indexOf(hariTerpilih) === -1) {
            selesai.push(hariTerpilih);
            localStorage.setItem("bunpou_selesai", JSON.stringify(selesai));
        }
    }

    function ulangiBunpou() { startBunpouQuiz(); }

    function kembaliPilihBunpou() {
        document.getElementById("bunpouCompletionScreen").style.display = "none";
        document.getElementById("bunpouArea").style.display = "none";
        document.getElementById("bunpouSelectionCard").style.display = "block";
        isiPilihanHari();
    }

    function exitBunpouQuiz() {
        const yakin = confirm("Yakin mau keluar? Progres quiz bunpou hari ini akan hilang.");
        if (!yakin) return;
        document.getElementById("bunpouArea").style.display = "none";
        document.getElementById("bunpouSelectionCard").style.display = "block";
    }

    // ekspos ke HTML
    window.startBunpouQuiz = startBunpouQuiz;
    window.lanjutBunpou = lanjutBunpou;
    window.ulangiBunpou = ulangiBunpou;
    window.kembaliPilihBunpou = kembaliPilihBunpou;
    window.exitBunpouQuiz = exitBunpouQuiz;

    document.addEventListener("DOMContentLoaded", function () {
        muatXp();
        fetch((function () {                       /* berkas soal mengikuti tingkat halaman */
        const lv = String(window.N3_LEVEL || "").toUpperCase()
            || String(localStorage.getItem("n3_level") || "").toUpperCase() || "N3";
        return lv === "N5" ? "../aset/bunpou_quiz-n5.json?v=1"
             : lv === "N4" ? "../aset/bunpou_quiz-n4.json?v=1"
             : "../aset/bunpou_quiz.json?v=1";
    })())
            .then(function (r) { return r.json(); })
            .then(function (data) {
                bankSoal = data || {};
                isiPilihanHari();
            })
            .catch(function (e) {
                console.error("Gagal memuat bunpou_quiz.json:", e);
                const sel = document.getElementById("bunpouDaySelect");
                if (sel) sel.innerHTML = "<option>Gagal memuat data bunpou</option>";
            });
    });
})();
