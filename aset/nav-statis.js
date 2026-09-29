/* ../aset/nav-statis.js — menu navigasi TETAP untuk semua halaman fitur (kecuali landing & halaman app utama).
   Isinya sama seperti di halaman utama: tombol tab (Kalender/Belajar/Bunpou/Kanji/Dokkai)
   + alat (Quiz/Tulis/Dashboard/Review). Di HP jadi bar bawah, di desktop jadi rail kiri + bar atas.
   Dipasang otomatis oleh skrip ini (gaya ikut disuntik, jadi tidak perlu ubah CSS halaman). */
(function () {
    if (window.__navStatis) return;
    window.__navStatis = true;

    const TAB = [
        { k: "calendar", ikon: "📅", teks: "Kalender" },
        { k: "study",    ikon: "学",  teks: "Belajar" },
        { k: "bunpou",   ikon: "文",  teks: "Bunpou" },
        { k: "kanji",    ikon: "漢",  teks: "Kanji" },
        { k: "dokkai",   ikon: "読",  teks: "Dokkai" }
    ];
    const ALAT = [
        { berkas: "quiz",      ikon: "📝", teks: "Buka Quiz", utama: true },
        { berkas: "tulis",     ikon: "✍️", teks: "Tulis Kanji" },
        { berkas: "dashboard", ikon: "📊", teks: "Dashboard" },
        { berkas: "review",    ikon: "🔁", teks: "Review" }
    ];

    /* tingkat (N3/N4/N5) yang dipakai untuk tautan tab — ikut pilihan terakhir, default N3 */
    function tingkat() {
        try {
            const t = (localStorage.getItem("n3_level") || localStorage.getItem("jlpt_level") || "N3").toUpperCase();
            return ["N3", "N4", "N5"].indexOf(t) >= 0 ? t.toLowerCase() : "n3";
        } catch (e) { return "n3"; }
    }
    /* kedalaman folder halaman ini → "../" kalau di dalam folder */
    function naik() { return (location.pathname.split("/").filter(Boolean).length > 1) ? "../" : ""; }
    function ini(berkas) { return (location.pathname.split("/").pop() || "").toLowerCase() === berkas; }

    const GAYA = `
    .ns-bar{position:fixed;left:0;right:0;bottom:0;z-index:60;display:flex;gap:4px;padding:8px 8px calc(8px + env(safe-area-inset-bottom));
      background:rgba(255,255,255,.96);backdrop-filter:blur(14px);border-top:1px solid #e6e8f4;
      box-shadow:0 -8px 24px rgba(27,32,53,.08)}
    .ns-item{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;border:0;background:transparent;
      color:#6b7280;font:inherit;font-size:10.5px;font-weight:700;padding:6px 2px;border-radius:12px;cursor:pointer;text-decoration:none}
    .ns-item .ns-ikon{font-size:17px;line-height:1;font-weight:800}
    .ns-item.aktif{color:#4f46e5;background:#eef2ff}
    .ns-item.aktif .ns-ikon{color:#4f46e5}
    .ns-atas{display:none}
    .ns-rail{display:none}
    .ns-panel{position:fixed;left:12px;right:12px;bottom:76px;z-index:61;background:#fff;border:1px solid #e6e8f4;
      border-radius:18px;box-shadow:0 18px 44px rgba(27,32,53,.18);padding:10px;display:grid;gap:6px}
    .ns-panel a{display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:12px;background:#f5f6fb;
      color:#1b2035;font-weight:700;font-size:14px;text-decoration:none}
    .ns-panel a.utama{background:#eef2ff;color:#312e81}
    .ns-panel[hidden]{display:none}
    @media (min-width:701px){
      body.ns-ada-rail{padding-left:96px}
      .ns-bar{display:none}
      .ns-rail{display:flex;position:fixed;left:16px;top:50%;transform:translateY(-50%);z-index:60;
        flex-direction:column;gap:8px;width:64px;padding:10px 6px;background:#fff;border:1px solid #e6e8f4;
        border-radius:20px;box-shadow:0 10px 26px rgba(27,32,53,.09);align-items:center}
      .ns-rail a{width:52px;display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 2px;border-radius:14px;
        color:#6b7280;font-size:9.5px;font-weight:700;text-decoration:none;text-align:center;line-height:1.2}
      .ns-rail a .ns-ikon{font-size:16px}
      .ns-rail a:hover{background:#f5f6fb;color:#312e81}
      .ns-rail a.aktif{background:#eef2ff;color:#4f46e5}
      .ns-rail .ns-garis{width:32px;height:1px;background:#e6e8f4;margin:2px 0}
      .ns-atas{display:block;position:fixed;left:96px;right:0;top:0;z-index:59;background:rgba(245,246,251,.94);
        backdrop-filter:blur(12px);border-bottom:1px solid #e6e8f4}
      .ns-atas .in{display:flex;align-items:center;gap:6px;padding:9px 16px;overflow-x:auto}
      .ns-atas a{display:inline-flex;align-items:center;gap:7px;padding:8px 14px;border-radius:999px;background:#fff;
        border:1px solid #e6e8f4;color:#475569;font-size:13px;font-weight:700;text-decoration:none;white-space:nowrap}
      .ns-atas a.aktif{background:#4f46e5;border-color:#4f46e5;color:#fff}
      .ns-atas .sp{flex:1}
      .ns-atas .logo{font-weight:800;color:#312e81;font-size:14px;white-space:nowrap}
    }`;

    function pasang() {
        const n = naik(), lv = tingkat();
        if (!document.getElementById("ns-gaya")) {
            const s = document.createElement("style");
            s.id = "ns-gaya"; s.textContent = GAYA; document.head.appendChild(s);
        }
        const tabHTML = TAB.map(function (t) {
            return '<a class="ns-item' + (t.k === "calendar" && (location.hash === "#kalender" || ini("index" + ".html")) ? " aktif" : "") +
                   '" href="' + n + lv + '/#' + t.k + '"><span class="ns-ikon">' + t.ikon + '</span>' + t.teks + '</a>';
        }).join("");
        const alatHTML = ALAT.map(function (a) {
            return '<a class="ns-item' + (ini(a.berkas + ".html") ? " aktif" : "") + '" href="' + n + 'fitur/' + a.berkas + '">' +
                   '<span class="ns-ikon">' + a.ikon + '</span>' + a.teks.replace("Buka ", "") + '</a>';
        }).join("");

        if (!document.querySelector(".ns-bar")) {
            const bar = document.createElement("nav");
            bar.className = "ns-bar";
            bar.setAttribute("aria-label", "Menu utama");
            bar.innerHTML = tabHTML + '<button type="button" class="ns-item" id="nsLain"><span class="ns-ikon">⋯</span>Lainnya</button>';
            document.body.appendChild(bar);

            const panel = document.createElement("div");
            panel.className = "ns-panel"; panel.id = "nsPanel"; panel.hidden = true;
            panel.innerHTML = ALAT.map(function (a) {
                return '<a class="' + (a.utama ? "utama" : "") + '" href="' + n + 'fitur/' + a.berkas + '">' + a.ikon + " " + a.teks + "</a>";
            }).join("");
            document.body.appendChild(panel);
            bar.querySelector("#nsLain").addEventListener("click", function () {
                const p = document.getElementById("nsPanel");
                p.hidden = !p.hidden;
            });
        }

        if (!document.querySelector(".ns-rail")) {
            document.body.classList.add("ns-ada-rail");
            const atas = document.createElement("div");
            atas.className = "ns-atas";
            atas.innerHTML = '<div class="in"><span class="logo">BelajarN3</span>' +
                TAB.map(function (t) { return '<a href="' + n + lv + '/#' + t.k + '">' + (t.ikon.length <= 2 ? "" : "") + t.teks + "</a>"; }).join("") +
                '<span class="sp"></span>' +
                '<a href="' + n + 'fitur/quiz.html">📝 Quiz</a><a href="' + n + 'fitur/dashboard.html">📊 Dashboard</a></div>';
            document.body.appendChild(atas);

            const rail = document.createElement("aside");
            rail.className = "ns-rail";
            rail.setAttribute("aria-label", "Alat");
            rail.innerHTML = '<span class="ns-ikon" aria-hidden="true">⚡</span><span class="ns-garis"></span>' +
                ALAT.map(function (a) {
                    return '<a class="' + (ini(a.berkas + ".html") ? "aktif" : "") + '" href="' + n + 'fitur/' + a.berkas + '">' +
                           '<span class="ns-ikon">' + a.ikon + '</span>' + a.teks.replace("Buka ", "") + "</a>";
                }).join("") + '<span class="ns-garis"></span><a href="' + n + lv + '/"><span class="ns-ikon">🏠</span>Beranda</a>';
            document.body.appendChild(rail);
        }

        /* beri ruang bawah di HP supaya bar tidak menutup isi halaman */
        if (!document.getElementById("ns-ruang")) {
            const st = document.createElement("style");
            st.id = "ns-ruang";
            st.textContent = "@media (max-width:700px){body{padding-bottom:78px !important}}";
            document.head.appendChild(st);
        }
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", pasang);
    else pasang();
})();
