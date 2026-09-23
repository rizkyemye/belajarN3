/* ../aset/doushi.js — tab 「動詞 Kata Kerja」
   Isi tab:
     A. 19 bentuk perubahan kata kerja — kartu tertutup (cuma nama + arti),
        klik untuk membuka rumus + cara ubah per golongan + contoh (hiragana).
     B. Kumpulan kata kerja N5/N4/N3 — klik satu kata kerja untuk melihat
        semua bentuknya (dihitung langsung oleh doushi-engine.js).
   Butuh: ../aset/doushi-engine.js (window.ubahKataKerja) + ../aset/doushi.json + ../aset/kata-kerja.json
*/
(function () {
    "use strict";
    const BENTUK_URUT = ["jisho", "masu", "masen", "mashita", "masendeshita", "te", "ta", "nai", "nakatta",
        "tai", "kanou", "ishi", "meirei", "ukemi", "shieki", "shiekiukemi", "jouken", "tara", "teiru"];
    const CONTOH = [["かく", 1, "かく (menulis)"], ["たべる", 2, "たべる (makan)"], ["する", 3, "する (melakukan)"]];
    let DATA_BENTUK = null, DATA_KATA = null;
    let tingkatAktif = "N5";

    function el(tag, cls, html) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (html !== undefined) e.innerHTML = html;
        return e;
    }
    function aman(s) {
        return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
        });
    }
    function muat(url) {
        return fetch(url).then(function (r) { return r.json(); });
    }
    function mobilekah() {
        try { return window.matchMedia("(max-width: 700px)").matches; } catch (e) { return false; }
    }
    function golNama(g) {
        return g === 1 ? "golongan 1 (五段・ごだん)" : g === 2 ? "golongan 2 (一段・いちだん)" : "golongan 3 (不規則・ふきそく)";
    }

    /* ---------- bagian A: daftar bentuk (buka-tutup) ---------- */
    function bagianBentuk(wadah) {
        const judul = el("div", "bunpou-header-card",
            '<div class="bunpou-title">動詞・へんか の かたち (Perubahan Kata Kerja)</div>' +
            '<div class="bunpou-sub">Klik satu bentuk → muncul rumus + cara mengubah + contoh. Contoh ditulis hiragana.</div>');
        wadah.appendChild(judul);
        const list = el("div", "bunpou-list doushi-accordion");
        wadah.appendChild(list);

        muat("../aset/doushi.json").then(function (d) {
            DATA_BENTUK = d;
            const bentuk = (d.bentuk || []).slice().sort(function (a, b) {
                return BENTUK_URUT.indexOf(a.id) - BENTUK_URUT.indexOf(b.id);
            });
            bentuk.forEach(function (b) {
                const kartu = el("div", "bunpou-item doushi-buka");
                const baris = el("div", "doushi-baris");
                baris.innerHTML = '<span class="bunpou-pattern">' + aman(b.nama) + '</span>' +
                    '<span class="doushi-hint">' + aman(b.arti || "") + '</span>' +
                    '<span class="doushi-panah">▾</span>';
                const isi = el("div", "doushi-isi", "");
                isi.style.display = "none";

                let html = "";
                if (b.rumus) html += '<div class="bunpou-rumus"><span class="bunpou-rumus-label">Rumus</span><span class="bunpou-rumus-text">' + aman(b.rumus) + "</span></div>";
                if (b.cara) {
                    html += '<div class="doushi-cara"><div class="doushi-cara-judul">Cara mengubah</div>';
                    ["1", "2", "3"].forEach(function (k) {
                        if (b.cara[k]) html += '<div class="doushi-cara-baris"><b>' + golNama(Number(k)) + "</b><br>" + aman(b.cara[k]) + "</div>";
                    });
                    html += "</div>";
                }
                if (window.ubahKataKerja) {
                    html += '<div class="doushi-contoh"><div class="doushi-cara-judul">Contoh (hiragana)</div>';
                    CONTOH.forEach(function (c) {
                        const h = window.ubahKataKerja(c[0], c[1], b.id);
                        html += "<div class=\"doushi-contoh-baris\"><b>" + aman(h) + "</b> <span>" + aman(c[2]) + "</span></div>";
                    });
                    html += "</div>";
                }
                if (b.catatan) html += '<div class="doushi-catatan">💡 ' + aman(b.catatan) + "</div>";
                isi.innerHTML = html;

                baris.addEventListener("click", function () {
                    const buka = isi.style.display === "none";
                    isi.style.display = buka ? "block" : "none";
                    kartu.classList.toggle("buka-lebar", buka);   // di HP: kartu yang dibuka melebar penuh
                    baris.querySelector(".doushi-panah").textContent = buka ? "▴" : "▾";
                });
                kartu.appendChild(baris); kartu.appendChild(isi);
                list.appendChild(kartu);
            });
        }).catch(function () { list.innerHTML = '<div class="bunpou-empty">Gagal memuat daftar bentuk 🙈</div>'; });
    }

    /* ---------- bagian B: kumpulan kata kerja ---------- */
    function bagianKata(wadah) {
        const judul = el("div", "bunpou-header-card",
            '<div class="bunpou-title">どうし の いちらん (Kumpulan Kata Kerja)</div>' +
            '<div class="bunpou-sub">Pilih tingkatan, lalu klik satu kata kerja → muncul semua bentuknya.</div>');
        const chips = el("div", "rv-chips doushi-chips", "");
        ["N5", "N4", "N3"].forEach(function (lv) {
           const b = el("button", "rv-chip tombol-warna" + (lv === tingkatAktif ? " aktif" : ""), lv);
            b.type = "button";
            b.addEventListener("click", function () {
                tingkatAktif = lv;
                chips.querySelectorAll(".rv-chip").forEach(function (x) { x.classList.remove("aktif"); });
                b.classList.add("aktif");
                gambarDaftarKata();
            });
            chips.appendChild(b);
        });
        judul.appendChild(chips);
        wadah.appendChild(judul);
        const cari = el("input", "doushi-cari", "");
        cari.type = "search";
        cari.placeholder = "🔍 cari kata kerja (kanji / hiragana / arti)";
        wadah.appendChild(cari);
        const list = el("div", "bunpou-list doushi-listkata");
        wadah.appendChild(list);
        cari.addEventListener("input", function () {
            const q = cari.value.trim().toLowerCase();
            let tampil = 0;
            list.querySelectorAll(".doushi-gol-isi").forEach(function (isi) {
                let ada = 0;
                isi.querySelectorAll(".doushi-buka").forEach(function (k) {
                    const cocok = !q || k.textContent.toLowerCase().indexOf(q) !== -1;
                    k.style.display = cocok ? "" : "none";
                    if (cocok) ada++;
                });
                const head = isi.previousElementSibling;
                if (head) head.style.display = ada ? "" : "none";
                isi.style.display = ada ? "" : "none";
                if (q && ada && isi.dataset.lipat) isi.classList.remove("tersembunyi");
                tampil += ada;
            });
            let info = list.querySelector(".doushi-hasil-cari");
            if (q && !tampil) {
                if (!info) { info = el("div", "bunpou-empty doushi-hasil-cari", "Tidak ada kata kerja yang cocok 🙈"); list.appendChild(info); }
                info.style.display = "";
            } else if (info) info.style.display = "none";
        });

        function gambarDaftarKata() {
            list.innerHTML = '<div class="bunpou-empty">Memuat…</div>';
            muat("../aset/kata-kerja.json").then(function (d) {
                DATA_KATA = d;
                const arr = (d[tingkatAktif] || []);
                if (!arr.length) { list.innerHTML = '<div class="bunpou-empty">Belum ada data untuk ' + tingkatAktif + " 🙈</div>"; return; }
                list.innerHTML = "";
                // dikelompokkan per golongan (1 -> 2 -> 3) biar kelihatan ada 3 golongan
                const urut = arr.slice().sort(function (a, b) {
                    return (a.golongan - b.golongan) || String(a.kana).localeCompare(String(b.kana), "ja");
                });
                const jumlahGol = {};
                urut.forEach(function (k) { jumlahGol[k.golongan] = (jumlahGol[k.golongan] || 0) + 1; });
                let golTerakhir = null, isiGol = null;
                urut.forEach(function (k) {
                    if (k.golongan !== golTerakhir) {
                        golTerakhir = k.golongan;
                        isiGol = el("div", "doushi-gol-isi", "");
                        if (mobilekah()) { isiGol.dataset.lipat = "1"; isiGol.classList.add("tersembunyi"); }
                        list.appendChild(isiGol);
                        const lipat = isiGol;
                        const info = ((DATA_BENTUK && DATA_BENTUK.golongan) || [])[k.golongan - 1] || {};
                        const head = el("div", "doushi-gol-header", "");
                        head.innerHTML = '<span class="doushi-gol-panah">▾</span>' +
                            "<b>" + aman(info.nama || golNama(k.golongan)) + "</b>" +
                            '<span class="doushi-gol-ciri">' + aman(info.ciri ? String(info.ciri).slice(0, 180) : "") + "</span>" +
                            '<span class="doushi-gol-jumlah">' + (jumlahGol[k.golongan] || 0) + " kata kerja</span>";
                        list.appendChild(head);
                        if (lipat.dataset.lipat) {
                            head.classList.add("doushi-gol-bisa-dilipat");
                            head.addEventListener("click", function () {
                                const tutup = lipat.classList.toggle("tersembunyi");
                                const p = head.querySelector(".doushi-gol-panah");
                                if (p) p.textContent = tutup ? "▸" : "▾";
                            });
                        }
                    }
                    const kartu = el("div", "bunpou-item doushi-buka");
                    const baris = el("div", "doushi-baris");
                    baris.innerHTML = '<span class="bunpou-pattern">' + aman(k.kata || k.kana) + "</span>" +
                        '<span class="doushi-hint">' + aman(k.kana) + " · " + aman(k.arti) + "</span>" +
                        '<span class="doushi-panah">▾</span>';
                    const isi = el("div", "doushi-isi", "");
                    isi.style.display = "none";
                    baris.addEventListener("click", function () {
                        if (isi.dataset.siap !== "1") {
                            let h = '<div class="doushi-cara-judul">' + aman(golNama(k.golongan)) + "</div>";
                            h += '<div class="doushi-tabel">';
                            BENTUK_URUT.forEach(function (id) {
                                const nm = (DATA_BENTUK && (DATA_BENTUK.bentuk || []).find(function (x) { return x.id === id; })) || {};
                                const hasil = window.ubahKataKerja ? window.ubahKataKerja(k.kana, k.golongan, id) : "";
                                h += '<div class="doushi-tabel-baris"><span class="doushi-tabel-nama">' + aman(nm.nama || id) + "</span><b>" + aman(hasil) + "</b></div>";
                            });
                            h += "</div>";
                            if (k.catatan) h += '<div class="doushi-catatan">💡 ' + aman(k.catatan) + "</div>";
                            isi.innerHTML = h;
                            isi.dataset.siap = "1";
                        }
                        const buka = isi.style.display === "none";
                        isi.style.display = buka ? "block" : "none";
                        baris.querySelector(".doushi-panah").textContent = buka ? "▴" : "▾";
                    });
                    kartu.appendChild(baris); kartu.appendChild(isi);
                    isiGol.appendChild(kartu);
                });
                const ringkas = el("div", "doushi-ringkas", "Total <b>" + urut.length + "</b> kata kerja " + tingkatAktif +
                    " — golongan 1: <b>" + (jumlahGol[1] || 0) + "</b> · golongan 2: <b>" + (jumlahGol[2] || 0) +
                    "</b> · golongan 3: <b>" + (jumlahGol[3] || 0) + "</b>");
                list.appendChild(ringkas);
            }).catch(function () { list.innerHTML = '<div class="bunpou-empty">Gagal memuat daftar kata kerja 🙈</div>'; });
        }
        gambarDaftarKata();
        return list;
    }

    /* ---------- pasang tab ---------- */
    function pasangTab() {
        if (document.getElementById("doushiTabContent")) return;
        const nav = document.querySelector(".tab-navigation");
        const acuan = document.getElementById("bunpouTabContent");
        if (!nav || !acuan) return;

        const btn = el("button", "tab-btn", "動詞 Kata Kerja");
        btn.type = "button"; btn.id = "btnTabDoushi";
        btn.setAttribute("onclick", "switchTab('doushi')");
        nav.appendChild(btn);

        const isi = el("div", "tab-content", "");
        isi.id = "doushiTabContent";
        isi.style.display = "none";
        acuan.parentNode.insertBefore(isi, acuan.nextSibling);

        bagianBentuk(isi);
        bagianKata(isi);
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", pasangTab);
    else pasangTab();
    window.pasangTabDoushi = pasangTab;
})();
