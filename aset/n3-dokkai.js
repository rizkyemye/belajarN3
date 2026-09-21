/* ==========================================================================
   TAB DOKKAI (読解) — bacaan + soal pemahaman, temanya sesuai hari belajar
   Data: ../aset/dokkai.json (dibuat otomatis; furigana sudah tertanam sebagai <ruby>)
   ========================================================================== */
(function () {
    "use strict";

    const KUNCI_HASIL = "n3_dokkai_hasil";     // {"5": {benar, total, tgl}}
    const KUNCI_TERAKHIR = "n3_dokkai_terakhir";

    let semua = null;
    let hariAktif = null;
    let pakaiFurigana = true;
    let tampilArti = false;
    let ukuran = localStorage.getItem("n3_dokkai_ukuran") || "sedang";   // kecil | sedang | besar
    let jawaban = {};
    let diperiksa = false;
    let sudahMuat = false;

    const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const $ = (s) => document.querySelector(s);

    function bacaHasil() { try { return JSON.parse(localStorage.getItem(KUNCI_HASIL) || "{}"); } catch (e) { return {}; } }
    function simpanHasil(h) { try { localStorage.setItem(KUNCI_HASIL, JSON.stringify(h)); } catch (e) {} }

    function daftarHari() {
        return Object.keys(semua || {}).map(Number).sort((a, b) => a - b);
    }

    // kunci per hari: bacaan hari ke-N baru muncul setelah hari itu kebuka di tab Belajar
    const hariTerbuka = (h) => !window.N3Unlock || window.N3Unlock.terbuka(h);
    function daftarHariTerbuka() { return daftarHari().filter(hariTerbuka); }
    function hariTerkunci() { return daftarHari().filter((d) => !hariTerbuka(d)); }

    function pilihHari(d) {
        hariAktif = d;
        jawaban = {}; diperiksa = false;
        try { localStorage.setItem(KUNCI_TERAKHIR, String(d)); } catch (e) {}
        render();
    }

    function render() {
        const wrap = $("#isiDokkai");
        if (!wrap || !semua) return;
        const hari = semua[hariAktif];
        if (!hari) { wrap.innerHTML = '<div class="dokkai-kosong">Materi untuk hari ini belum ada 🙈</div>'; return; }
        const hasil = bacaHasil();
        const hariList = daftarHariTerbuka();
        const terkunci = hariTerkunci();

        let html = `
        <div class="kartu dokkai-header">
            <h2>📖 読解 · Dokkai</h2>
            <p class="catatan">Bacaan + soal pemahaman, temanya sama dengan tema kosakata hari itu.
            Baca dulu tanpa lihat artinya, baru jawab 3 soal di bawah 👇</p>
            <div id="dokkaiKunci"></div>
            <div class="dokkai-chips">
                ${hariList.map((d) => {
                    const h = semua[d];
                    const selesai = hasil[d];
                    return `<button class="dokkai-chip ${d === hariAktif ? "aktif" : ""} ${selesai ? "selesai" : ""}" data-hari="${d}">
                        Hari ${d}${selesai ? " ✓" : ""}<span class="dokkai-tema">${esc(h.tema_jp)}</span></button>`;
                }).join("")}
            </div>
            <div class="dokkai-tombol-baris">
                <button class="tombol-kecil ${pakaiFurigana ? "terang" : ""}" id="btnFurigana">ふりがな ${pakaiFurigana ? "ON" : "OFF"}</button>
                <button class="tombol-kecil ${tampilArti ? "terang" : ""}" id="btnArti">Artinya ${tampilArti ? "ON" : "OFF"}</button>
                <span class="dokkai-ukuran">
                    <button data-ukuran="kecil" class="${ukuran === "kecil" ? "aktif" : ""}" title="huruf kecil">小</button>
                    <button data-ukuran="sedang" class="${ukuran === "sedang" ? "aktif" : ""}" title="huruf sedang">中</button>
                    <button data-ukuran="besar" class="${ukuran === "besar" ? "aktif" : ""}" title="huruf besar">大</button>
                </span>
            </div>
        </div>

        <div class="kartu dokkai-bacaan">
            <div class="dokkai-judul">${pakaiFurigana ? hari.judul_furi || esc(hari.judul) : esc(hari.judul)}</div>
            <div class="catatan">Hari ${hari.day} · ${esc(hari.tema_jp)}（${esc(hari.tema_id)}）</div>
            <div class="dokkai-teks ukuran-${ukuran}">${(pakaiFurigana ? hari.furi : esc(hari.teks)).replace(/\n\n/g, "</p><p>").replace(/^/, "<p>") + "</p>"}</div>
            ${hari.kotoba && hari.kotoba.length ? `<div class="dokkai-kotoba">
                <div class="label-kecil">KATA PENTING</div>
                ${hari.kotoba.map((k) => `<span class="dokkai-kata"><b>${esc(k.kata)}</b> ${esc(k.arti)}</span>`).join("")}
            </div>` : ""}
            ${tampilArti ? `<div class="dokkai-arti"><b>Inti bacaan:</b> ${esc(hari.terjemahan)}</div>` : ""}
        </div>

        <div class="kartu dokkai-soal">
            <h3>📝 Soal pemahaman</h3>
            ${hari.soal.map((s, i) => `
                <div class="dokkai-soal-item" id="soal-${i}">
                    <div class="dokkai-pertanyaan"><b>${i + 1}.</b> ${pakaiFurigana ? s.t_furi || esc(s.t) : esc(s.t)}</div>
                    <div class="dokkai-pilihan">
                        ${s.pilihan.map((p, j) => `
                            <button class="dokkai-opsi ${jawaban[i] === j ? "dipilih" : ""}" data-soal="${i}" data-opsi="${j}">
                                <span class="huruf">${"abcd"[j]}</span> ${esc(p)}
                            </button>`).join("")}
                    </div>
                    <div class="dokkai-bahas" id="bahas-${i}" style="display:none"></div>
                </div>`).join("")}
            <div class="dokkai-aksi">
                <button class="tombol-utama" id="btnPeriksa">Periksa jawaban ➔</button>
                <button class="tombol-batal" id="btnUlangi">Ulangi soal ini</button>
            </div>
            <div id="dokkai-skor"></div>
        </div>`;

        wrap.innerHTML = html;
        const kotakKunci = $("#dokkaiKunci");
        if (kotakKunci && window.N3Unlock) {
            const note = window.N3Unlock.catatan(terkunci.length ? terkunci[0] : 0, terkunci.length, () => {
                if (!hariList.length) {
                    const baru = daftarHariTerbuka();
                    if (baru.length) hariAktif = baru[baru.length - 1];
                } else if (!daftarHariTerbuka().includes(hariAktif)) {
                    hariAktif = daftarHariTerbuka()[0];
                }
                render();
            });
            if (note) kotakKunci.appendChild(note);
        }
        pasangAksi();
    }

    function pasangAksi() {
        document.querySelectorAll("#isiDokkai .dokkai-chip").forEach((b) =>
            b.addEventListener("click", () => pilihHari(Number(b.dataset.hari))));

        const bf = $("#btnFurigana");
        if (bf) bf.addEventListener("click", () => { pakaiFurigana = !pakaiFurigana; render(); });
        const ba = $("#btnArti");
        if (ba) ba.addEventListener("click", () => { tampilArti = !tampilArti; render(); });
        document.querySelectorAll("#isiDokkai .dokkai-ukuran button").forEach((b) =>
            b.addEventListener("click", () => {
                ukuran = b.dataset.ukuran;
                try { localStorage.setItem("n3_dokkai_ukuran", ukuran); } catch (e) {}
                render();
            }));

        document.querySelectorAll("#isiDokkai .dokkai-opsi").forEach((b) =>
            b.addEventListener("click", () => {
                if (diperiksa) return;
                jawaban[Number(b.dataset.soal)] = Number(b.dataset.opsi);
                render();
            }));

        const bp = $("#btnPeriksa");
        if (bp) bp.addEventListener("click", periksa);
        const bu = $("#btnUlangi");
        if (bu) bu.addEventListener("click", () => { jawaban = {}; diperiksa = false; render(); });
    }

    function periksa() {
        const hari = semua[hariAktif];
        if (!hari) return;
        if (Object.keys(jawaban).length < hari.soal.length) {
            alert(`Masih ada soal yang belum dijawab (${Object.keys(jawaban).length}/${hari.soal.length}) 💪`);
            return;
        }
        diperiksa = true;
        let benar = 0;
        hari.soal.forEach((s, i) => {
            const box = document.getElementById("bahas-" + i);
            const opsi = document.querySelectorAll(`#isiDokkai .dokkai-opsi[data-soal="${i}"]`);
            const tepat = jawaban[i] === s.jawab;
            if (tepat) benar++;
            opsi.forEach((b, j) => {
                b.classList.remove("dipilih");
                if (j === s.jawab && !tepat) b.classList.add("jawaban-benar");
                if (j === jawaban[i] && !tepat) b.classList.add("jawaban-salah");
                if (j === s.jawab && tepat) b.classList.add("jawaban-benar");
            });
            if (box) {
                box.style.display = "block";
                box.className = "dokkai-bahas " + (tepat ? "ok" : "salah");
                box.innerHTML = `${tepat ? "✅ Benar!" : "❌ Kurang tepat — jawabannya <b>" + "abcd"[s.jawab] + "</b>. "} ${esc(s.bahas || "")}`;
            }
        });

        const total = hari.soal.length;
        const hasil = bacaHasil();
        const lama = hasil[hariAktif];
        if (!lama || benar > lama.benar) hasil[hariAktif] = { benar, total, tgl: new Date().toISOString().slice(0, 10) };
        simpanHasil(hasil);

        const skor = $("#dokkai-skor");
        if (skor) {
            const persen = Math.round((benar / total) * 100);
            skor.innerHTML = `<div class="dokkai-skor">
                <b>${benar}/${total} (${persen}%)</b>
                ${benar === total ? "🎉 Sempurna! Bacaan ini sudah kamu kuasai." : benar >= 2 ? "Bagus! Baca ulang bagian yang salah ya." : "Belum apa-apa — baca pelan-pelan lagi, lalu coba ulang 🙂"}
                <div class="catatan">Skor terbaikmu untuk Hari ${hariAktif} disimpan di HP ini.</div>
            </div>`;
        }
        const chip = document.querySelector(`#isiDokkai .dokkai-chip[data-hari="${hariAktif}"]`);
        if (chip && !chip.classList.contains("selesai")) { chip.classList.add("selesai"); chip.innerHTML += " ✓"; }
    }

    function muat() {
        sudahMuat = true;
        fetch((function () {                       /* berkas bacaan mengikuti tingkat halaman */
        const lv = String(window.N3_LEVEL || "").toUpperCase()
            || String(localStorage.getItem("n3_level") || "").toUpperCase() || "N3";
        return lv === "N5" ? "../aset/dokkai-n5.json?v=1"
             : lv === "N4" ? "../aset/dokkai-n4.json?v=1"
             : "../aset/dokkai.json?v=12";
    })())
            .then((r) => (r.ok ? r.json() : {}))
            .then((json) => {
                semua = json && Object.keys(json).length ? json : {};
                if (!Object.keys(semua).length) {
                    $("#isiDokkai").innerHTML = '<div class="dokkai-kosong">Materi dokkai belum tersedia 😢<br>Pastikan ../aset/dokkai.json sudah di-upload.</div>';
                    return;
                }
                const terakhir = Number(localStorage.getItem(KUNCI_TERAKHIR) || 0);
                const daftar = daftarHariTerbuka();
                // default = hari terakhir yang sudah kebuka (hari yang sedang dipelajari sekarang)
                hariAktif = daftar.indexOf(terakhir) !== -1 ? terakhir : daftar[daftar.length - 1];
                render();
            })
            .catch((e) => {
                console.warn("[dokkai] gagal muat:", e);
                const w = $("#isiDokkai");
                if (w) w.innerHTML = '<div class="dokkai-kosong">Gagal memuat ../aset/dokkai.json 😢</div>';
            });
    }

    window.initDokkaiUI = function () {
        if (!sudahMuat) { muat(); return; }
        if (semua) render();
    };
})();
