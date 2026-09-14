/* ==========================================================================
   N3 AUTH + SYNC (Supabase)
   Login pakai USERNAME + SANDI (tanpa email), data belajar disimpan di server.

   Cara pakai: file ini dimuat SEBELUM app.js.
   Kalau supabase-config.js belum diisi, file ini tidak mengubah apa pun —
   web tetap jalan seperti sekarang (mode lokal).

   Yang dipakai dari app.js (kompatibel, tidak diubah formatnya):
     study_time_<username>_<YYYY-MM-DD>      -> detik belajar per hari (cache lokal)
     session_done_<username>_day_<n>_<sesi>  -> penanda sesi selesai (cache lokal)
   ========================================================================== */
(function () {
    "use strict";

    const CFG = window.N3_SUPABASE || {};
    const AKTIF = !!(CFG.url && CFG.anonKey);
    const DOMAIN = "@n3master.local";        // email palsu: username@n3master.local
    const KUNCI_USER = "n3_username";
    const KUNCI_NAMA = "n3_display";
    const KUNCI_PENDING = "n3_pending";

    let sb = null;
    let pengguna = null;                     // { id, username, nama }
    let selesaiSiap;                         // resolver untuk N3.tungguSiap()
    const janjiSiap = new Promise(function (r) { selesaiSiap = r; });

    /* ================= util ================= */
    function emailDari(u) {
        return String(u || "").trim().toLowerCase().replace(/[^a-z0-9_]/g, "") + DOMAIN;
    }
    function usernameValid(u) {
        return /^[a-z0-9_]{3,20}$/.test(String(u || "").trim().toLowerCase());
    }
    function kunciHari(u, tanggal) { return "study_time_" + u + "_" + tanggal; }
    function kunciSesi(u, day, sesi) { return "session_done_" + u + "_day_" + day + "_" + sesi; }

    /* ================= pemulihan sesi (sinkron, sebelum app.js jalan) =========
       Supaya app.js langsung melihat "sudah login" tanpa nunggu jaringan.      */
    (function pulihkanCepat() {
        if (!AKTIF) return;
        const u = localStorage.getItem(KUNCI_USER);
        const adatoken = Object.keys(localStorage).some(function (k) {
            return k.indexOf("sb-") === 0 && k.indexOf("-auth-token") !== -1;
        });
        if (u && adatoken) localStorage.setItem("jlpt_current_user", u);
    })();

    /* ================= antrean tulis (kalau jaringan bermasalah) ============= */
    function bacaPending() {
        try { return JSON.parse(localStorage.getItem(KUNCI_PENDING) || "[]"); } catch (e) { return []; }
    }
    function simpanPending(arr) {
        try { localStorage.setItem(KUNCI_PENDING, JSON.stringify(arr.slice(-300))); } catch (e) {}
    }
    function antre(item) { const a = bacaPending(); a.push(item); simpanPending(a); }

    async function kirimAntrean() {
        if (!sb || !pengguna) return;
        const sisa = [];
        for (const it of bacaPending()) {
            const ok = await kirimKeServer(it);
            if (!ok) sisa.push(it);
        }
        simpanPending(sisa);
    }

    async function kirimKeServer(it) {
        try {
            if (it.jenis === "detik") {
                const { error } = await sb.rpc("add_study_seconds", {
                    p_day: it.day, p_session: it.session, p_seconds: it.detik
                });
                return !error;
            }
            if (it.jenis === "kata") {
                const { error } = await sb.rpc("catat_kata", {
                    p_kata: it.kata, p_day: it.day,
                    p_benar: !!it.benar, p_detik: Math.round(it.detik || 0),
                    p_ambang: it.ambang || 30
                });
                return !error;
            }
            if (it.jenis === "selesai") {
                const { error } = await sb.rpc("mark_session_done", {
                    p_day: it.day, p_session: it.session,
                    p_benar: it.benar || 0, p_total: it.total || 0
                });
                return !error;
            }
            return true;
        } catch (e) { return false; }
    }

    /* ================= API publik ================= */
    const N3 = {
        aktif: AKTIF,
        pengguna: null,
        siap: false,

        // dipanggil app.js saat ada sesi belajar selesai
        kirimDetik: function (day, session, detik) {
            if (!AKTIF || !detik || detik <= 0) return;
            const item = { jenis: "detik", day: Number(day) || 0, session: String(session || ""), detik: Math.round(detik) };
            if (!sb || !pengguna) return antre(item);
            kirimKeServer(item).then(function (ok) { if (!ok) antre(item); });
        },

        // dipanggil app.js saat satu sesi (pagi/siang/malam) ditandai selesai
        kirimSelesai: function (day, session, benar, total) {
            if (!AKTIF) return;
            const item = {
                jenis: "selesai", day: Number(day) || 0, session: String(session || ""),
                benar: Number(benar) || 0, total: Number(total) || 0
            };
            if (!sb || !pengguna) return antre(item);
            kirimKeServer(item).then(function (ok) { if (!ok) antre(item); });
        },

        // nilai kuis (dipakai halaman quiz kalau mau dihubungkan)
        kirimNilai: function (day, benar, total) { N3.kirimSelesai(day, "kuis", benar, total); },

        masuk: masuk,
        daftar: daftar,
        keluar: keluar,
        statistik: statistik,
        papanPeringkat: papanPeringkat,
        namaPengguna: function () { return pengguna ? pengguna.username : ""; },
        // --- Review Kosakata ---
        catatKata: catatKata,
        kataSusah: kataSusah,
        hariSelesai: hariSelesai,
        tandaiHariKuis: tandaiHariKuis,
        muatKata: muatKataDariServer,
        muatHariKuis: muatHariKuisDariServer,
        imporWaktuLama: imporWaktuLama,
        gantiSandi: gantiSandi,
        // --- kode pemulihan / lupa sandi ---
        pasangKodeBaru: pasangKodeBaru,
        statusKode: statusKode,
        lupaSandi: lupaSandi,

        // halaman lain bisa: await N3.tungguSiap()
        tungguSiap: function () { return janjiSiap; },
        // kirim ulang data yang sempat gagal (dipakai juga oleh dashboard)
        cekAntrean: function () { return kirimAntrean(); },
        jumlahAntrean: function () { return bacaPending().length; },
        segarkan: function () { return sinkronData(); }
    };
    window.N3 = N3;

    /* ================= login / daftar / keluar ================= */
    async function masuk(username, sandi) {
        if (!sb) throw new Error("Belum tersambung ke server.");
        const u = String(username || "").trim().toLowerCase();
        if (!usernameValid(u)) throw new Error("Username 3–20 karakter, pakai huruf kecil/angka/underscore.");
        if (!sandi || sandi.length < 6) throw new Error("Sandi minimal 6 karakter.");

        const { data, error } = await sb.auth.signInWithPassword({ email: emailDari(u), password: sandi });
        if (error) {
            if (/Invalid login credentials/i.test(error.message)) throw new Error("Username atau sandi salah.");
            if (/Email not confirmed/i.test(error.message)) throw new Error("Konfirmasi email masih aktif di Supabase — matikan dulu (lihat panduan).");
            throw new Error(error.message);
        }
        await pasangPengguna(data.user);
        await sinkronData();
        simpanSesiLokal();
    }

    async function daftar(username, sandi, nama) {
        if (!sb) throw new Error("Belum tersambung ke server.");
        const u = String(username || "").trim().toLowerCase();
        if (!usernameValid(u)) throw new Error("Username 3–20 karakter, pakai huruf kecil/angka/underscore.");
        if (!sandi || sandi.length < 6) throw new Error("Sandi minimal 6 karakter.");

        // cek username dulu biar pesannya jelas
        try {
            const { data: tersedia } = await sb.rpc("username_tersedia", { p_username: u });
            if (tersedia === false) throw new Error("Username sudah dipakai, pilih yang lain.");
        } catch (e) {
            if (e && e.message && e.message.indexOf("sudah dipakai") !== -1) throw e;
        }

        const { data, error } = await sb.auth.signUp({
            email: emailDari(u),
            password: sandi,
            options: { data: { username: u, display_name: (nama && nama.trim()) || u } }
        });
        if (error) {
            if (/already registered/i.test(error.message)) throw new Error("Username sudah dipakai, pilih yang lain.");
            throw new Error(error.message);
        }
        if (!data.session) {
            // artinya konfirmasi email masih menyala
            throw new Error("Akun dibuat, tapi Supabase masih minta konfirmasi email. Matikan 'Confirm email' di Supabase (lihat panduan) lalu coba masuk.");
        }
        await pasangPengguna(data.user);
        simpanSesiLokal();

        // sekalian bikinkan kode pemulihan (biar user nggak terkunci kalau lupa sandi)
        let kodeBaru = null;
        try { kodeBaru = await pasangKodeBaru(); }
        catch (e) { console.warn("[N3] kode pemulihan belum bisa dibuat:", e); }
        return kodeBaru;
    }

    async function keluar() {
        try { if (sb) await sb.auth.signOut(); } catch (e) {}
        localStorage.removeItem(KUNCI_USER);
        localStorage.removeItem(KUNCI_NAMA);
        localStorage.removeItem("jlpt_current_user");
        pengguna = null; N3.pengguna = null;
        location.reload();
    }

    function simpanSesiLokal() {
        if (!pengguna) return;
        localStorage.setItem(KUNCI_USER, pengguna.username);
        localStorage.setItem(KUNCI_NAMA, pengguna.nama || pengguna.username);
        localStorage.setItem("jlpt_current_user", pengguna.username);
    }

    async function pasangPengguna(user) {
        let username = (user.user_metadata && user.user_metadata.username) || "";
        let nama = (user.user_metadata && user.user_metadata.display_name) || username;
        try {
            const { data } = await sb.from("profiles").select("username,display_name").eq("id", user.id).single();
            if (data) { username = data.username || username; nama = data.display_name || username; }
        } catch (e) {}
        pengguna = { id: user.id, username: username || ("user_" + String(user.id).slice(0, 6)), nama: nama || username };
        N3.pengguna = pengguna;
    }

    /* ================= tarik data server -> cache lokal ================= */
    async function sinkronData() {
        if (!sb || !pengguna) return;
        try {
            const ses = await sb.from("study_sessions").select("tanggal,day_no,session,detik").eq("user_id", pengguna.id);
            const prg = await sb.from("progress").select("day_no,session,selesai").eq("user_id", pengguna.id);

            if (ses.data) {
                const perTanggal = {};
                ses.data.forEach(function (r) {
                    perTanggal[r.tanggal] = (perTanggal[r.tanggal] || 0) + (r.detik || 0);
                });
                Object.keys(perTanggal).forEach(function (t) {
                    localStorage.setItem(kunciHari(pengguna.username, t), String(perTanggal[t]));
                });
            }
            if (prg.data) {
                prg.data.forEach(function (r) {
                    if (r.selesai) localStorage.setItem(kunciSesi(pengguna.username, r.day_no, r.session), "true");
                });
            }
            segarkanTampilan();
        } catch (e) { console.warn("Sinkron data gagal:", e); }
    }

    function segarkanTampilan() {
        try {
            if (typeof window.renderCalendar === "function") window.renderCalendar();
            if (typeof window.updateStatsBar === "function") window.updateStatsBar();
            if (typeof window.populateDirectStudyDropdown === "function") window.populateDirectStudyDropdown();
            if (typeof window.updateProfileDisplay === "function") window.updateProfileDisplay();
        } catch (e) {}
    }

    /* ================= statistik & papan peringkat ================= */
    async function statistik() {
        if (!sb || !pengguna) return null;
        const { data, error } = await sb.from("v_leaderboard").select("*").eq("id", pengguna.id).single();
        if (error) return null;
        return data;
    }

    async function papanPeringkat(batas) {
        if (!sb || !pengguna) return [];
        const { data, error } = await sb.from("v_leaderboard")
            .select("*").order("xp", { ascending: false }).limit(batas || 50);
        if (error) return [];
        return data || [];
    }

    /* ================= REVIEW KOSAKATA: catatan per kata =================
       Mirror lokal (biar tetap jalan walau offline / belum jalankan SQL baru):
         n3_kata_<username> = { "<kanji>": {day, benar, salah, lambat, detik_total, terakhir} }
       Server: tabel word_stats lewat RPC catat_kata.                        */
    function kunciKata() { return "n3_kata_" + (pengguna ? pengguna.username : (localStorage.getItem(KUNCI_USER) || "-")); }

    function bacaKata() {
        try { return JSON.parse(localStorage.getItem(kunciKata()) || "{}") || {}; } catch (e) { return {}; }
    }
    function simpanKata(obj) {
        try { localStorage.setItem(kunciKata(), JSON.stringify(obj)); } catch (e) {}
    }

    function catatKata(kata, day, benar, detik, ambang) {
        if (!kata) return;
        const amb = Number(ambang) || 30;
        const d = Math.max(0, Math.round(Number(detik) || 0));

        // 1) mirror lokal (langsung, biar tampilan responsif)
        const semua = bacaKata();
        const k = String(kata).trim();
        const s = semua[k] || { day: Number(day) || 0, benar: 0, salah: 0, lambat: 0, detik_total: 0, terakhir: "" };
        if (benar) s.benar++; else s.salah++;
        if (d >= amb) s.lambat++;
        s.detik_total += d;
        s.day = Number(day) || s.day;
        s.terakhir = new Date().toISOString();
        semua[k] = s;
        simpanKata(semua);

        // 2) kirim ke server
        if (!AKTIF) return;
        const item = { jenis: "kata", kata: k, day: Number(day) || 0, benar: !!benar, detik: d, ambang: amb };
        if (!sb || !pengguna) return antre(item);
        kirimKeServer(item).then(function (ok) { if (!ok) antre(item); });
    }

    async function muatHariKuisDariServer() {
        if (!sb || !pengguna) return;
        try {
            const { data } = await sb.from("progress").select("day_no").eq("user_id", pengguna.id).eq("session", "kuis").eq("selesai", true);
            if (!data || !data.length) return;
            let arr = [];
            try { arr = JSON.parse(localStorage.getItem("n3_hari_kuis")) || []; } catch (e) { arr = []; }
            data.forEach(function (r) {
                if (arr.indexOf(Number(r.day_no)) === -1) arr.push(Number(r.day_no));
            });
            localStorage.setItem("n3_hari_kuis", JSON.stringify(arr.sort(function (x, y) { return x - y; })));
        } catch (e) {}
    }

    async function muatKataDariServer() {
        if (!sb || !pengguna) return;
        await muatHariKuisDariServer();
        try {
            const { data } = await sb.from("word_stats")
                .select("kata,day_no,benar,salah,lambat,detik_total,terakhir").eq("user_id", pengguna.id);
            if (!data) return;
            const lokal = bacaKata();
            data.forEach(function (r) {
                lokal[r.kata] = {
                    day: r.day_no, benar: r.benar, salah: r.salah, lambat: r.lambat,
                    detik_total: r.detik_total, terakhir: r.terakhir
                };
            });
            simpanKata(lokal);
        } catch (e) { /* tabel belum dipasang? biarkan pakai mirror lokal */ }
    }

    // kata yang perlu diulang (salah atau lama), hanya dari hari yang kuisnya sudah selesai
    function kataSusah(ambang) {
        const amb = Number(ambang) || 30;
        const semua = bacaKata();
        const hariOK = hariSelesai();
        const hasil = [];
        Object.keys(semua).forEach(function (k) {
            const s = semua[k] || {};
            if (!hariOK.includes(Number(s.day))) return;      // hari belum selesai -> jangan muncul
            if ((s.salah || 0) > 0 || (s.lambat || 0) > 0) {
                hasil.push({
                    kata: k, day: Number(s.day) || 0,
                    benar: s.benar || 0, salah: s.salah || 0, lambat: s.lambat || 0,
                    detik_total: s.detik_total || 0,
                    skor: (s.salah || 0) * 3 + (s.lambat || 0) * 2,
                    rata_detik: Math.round(((s.detik_total || 0) / Math.max((s.benar || 0) + (s.salah || 0), 1)) * 10) / 10
                });
            }
        });
        return hasil.sort(function (a, b) { return b.skor - a.skor || b.rata_detik - a.rata_detik; });
    }

    // hari yang kuisnya sudah selesai (gabungan lokal + server)
    function hariSelesai() {
        const hari = [];
        function tambah(d) { d = Number(d); if (d && hari.indexOf(d) === -1) hari.push(d); }
        try { (JSON.parse(localStorage.getItem("completed_quiz_days")) || []).forEach(tambah); } catch (e) {}
        try { (JSON.parse(localStorage.getItem("n3_hari_kuis")) || []).forEach(tambah); } catch (e) {}
        return hari.sort(function (a, b) { return a - b; });
    }

    // dipanggil quiz.js saat satu hari selesai dikerjakan
    function tandaiHariKuis(day, benar, total) {
        if (!day) return;
        try {
            const arr = JSON.parse(localStorage.getItem("n3_hari_kuis")) || [];
            if (arr.indexOf(Number(day)) === -1) { arr.push(Number(day)); localStorage.setItem("n3_hari_kuis", JSON.stringify(arr)); }
        } catch (e) {}
        N3.kirimSelesai(day, "kuis", benar, total);
    }

    /* ================= impor data lama (dari HP, sekali klik) =================
       Dipakai kalau waktu belajar sudah tercatat di HP sebelum web tersambung
       ke server. Idempoten: kirim dua kali tidak bikin dobel.               */
    async function imporWaktuLama(daftarTanggal) {
        if (!AKTIF || !sb || !pengguna) return { kirim: 0, gagal: 0 };
        let kirim = 0, gagal = 0;
        for (const it of (daftarTanggal || [])) {
            try {
                const { error } = await sb.rpc("impor_waktu_lama", {
                    p_tanggal: it.tanggal, p_detik: Math.round(it.detik)
                });
                if (error) gagal++; else kirim++;
            } catch (e) { gagal++; }
        }
        return { kirim: kirim, gagal: gagal };
    }

    /* ================= ganti sandi (tanpa email, karena akun pakai username) === */
    async function gantiSandi(baru) {
        if (!AKTIF || !sb) throw new Error("Belum tersambung ke server.");
        if (!baru || String(baru).length < 6) throw new Error("Sandi baru minimal 6 karakter.");
        const { error } = await sb.auth.updateUser({ password: String(baru) });
        if (error) throw new Error(error.message);
        return true;
    }

    /* ================= kode pemulihan (buat lupa sandi mandiri) ================= */
    function buatKodeAcak() {
        const AB = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";   // tanpa I/O/0/1 biar tak salah baca
        let k = "";
        let acak = null;
        try { acak = window.crypto.getRandomValues(new Uint8Array(8)); } catch (e) { acak = null; }
        for (let i = 0; i < 8; i++) {
            const n = acak ? (acak[i] % AB.length) : Math.floor(Math.random() * AB.length);
            k += AB[n];
        }
        return k.slice(0, 4) + "-" + k.slice(4);
    }

    // bikin kode baru (disimpan di server dalam bentuk hash) -> kode dikembalikan sekali
    async function pasangKodeBaru() {
        if (!sb || !pengguna) throw new Error("Harus login dulu.");
        const kode = buatKodeAcak();
        const { data, error } = await sb.rpc("set_kode_pemulihan", { p_kode: kode });
        if (error) {
            if (/set_kode_pemulihan/i.test(error.message))
                throw new Error("Fitur kode pemulihan belum aktif. Jalankan schema-reset.sql di Supabase dulu.");
            throw new Error(error.message);
        }
        if (data && data.ok === false) throw new Error(data.pesan || "Gagal menyimpan kode.");
        return kode;
    }

    // apakah akun ini sudah punya kode pemulihan?
    async function statusKode() {
        if (!sb || !pengguna) return null;
        const { data, error } = await sb.from("profiles").select("kode_dibuat").eq("id", pengguna.id).maybeSingle();
        if (error) return null;
        return { ada: !!(data && data.kode_dibuat), dibuat: data ? data.kode_dibuat : null };
    }

    // lupa sandi: username + kode pemulihan -> sandi baru (tanpa email, tanpa login)
    async function lupaSandi(username, kode, sandiBaru) {
        if (!sb) throw new Error("Belum tersambung ke server.");
        if (String(sandiBaru || "").length < 6) throw new Error("Sandi baru minimal 6 karakter.");
        const { data, error } = await sb.rpc("reset_sandi_dengan_kode", {
            p_username: String(username || "").trim().toLowerCase(),
            p_kode: String(kode || ""),
            p_sandi_baru: String(sandiBaru)
        });
        if (error) {
            if (/reset_sandi_dengan_kode/i.test(error.message))
                throw new Error("Fitur lupa sandi belum aktif. Jalankan schema-reset.sql di Supabase dulu.");
            throw new Error(error.message);
        }
        if (data && data.ok === false) throw new Error(data.pesan || "Gagal mengganti sandi.");
        return true;
    }

    /* ================= gerbang login (overlay) ================= */
    function gerbang() {
        if (!AKTIF) return null;
        let g = document.getElementById("n3Gate");
        if (g) return g;

        g = document.createElement("div");
        g.id = "n3Gate";
        g.innerHTML = [
            '<div class="n3-gate-card">',
            '  <div class="n3-gate-logo">⚡ JLPT N3 Master</div>',
            '  <p class="n3-gate-sub">Masuk dulu ya biar jam belajar & progress kamu tersimpan di server 👇</p>',
            '  <div class="n3-gate-tabs">',
            '    <button class="n3-tab aktif" data-mode="masuk">Masuk</button>',
            '    <button class="n3-tab" data-mode="daftar">Daftar Baru</button>',
            '  </div>',
            '  <input id="n3User" class="n3-input" type="text" autocomplete="username" placeholder="Username (huruf kecil, contoh: emye)">',
            '  <input id="n3Pass" class="n3-input" type="password" autocomplete="current-password" placeholder="Sandi (minimal 6 karakter)">',
            '  <input id="n3Nama" class="n3-input" type="text" placeholder="Nama tampilan (opsional)" style="display:none">',
            '  <div id="n3Pesan" class="n3-pesan"></div>',
            '  <button id="n3Kirim" class="n3-btn">Masuk ➔</button>',
            '  <p class="n3-gate-note">Data kamu (jam belajar, progress, level) tersimpan di server, jadi bisa dibuka dari HP mana pun 🌸</p>',
            '  <button id="n3Lupa" class="n3-lupa" type="button">🔑 Lupa sandi?</button>',
            '  <div id="n3Reset" class="n3-reset" style="display:none">',
            '    <div class="n3-reset-judul">Masukkan username + kode pemulihan kamu</div>',
            '    <input id="n3RUser" class="n3-input" type="text" placeholder="Username">',
            '    <input id="n3RKode" class="n3-input" type="text" placeholder="Kode pemulihan (contoh: K7F2-9QX4)">',
            '    <input id="n3RPass" class="n3-input" type="password" placeholder="Sandi baru (minimal 6 karakter)">',
            '    <input id="n3RPass2" class="n3-input" type="password" placeholder="Ulangi sandi baru">',
            '    <div id="n3RPesan" class="n3-pesan"></div>',
            '    <button id="n3RKirim" class="n3-btn" type="button">Ganti sandi ➔</button>',
            '    <button id="n3RBatal" class="n3-lupa" type="button">← Balik ke halaman masuk</button>',
            '  </div>',
            '  <div id="n3KodeBox" class="n3-kode-box" style="display:none"></div>',
            '</div>'
        ].join("\n");
        document.body.appendChild(g);

        let mode = "masuk";
        const elUser = g.querySelector("#n3User");
        const elPass = g.querySelector("#n3Pass");
        const elNama = g.querySelector("#n3Nama");
        const elPesan = g.querySelector("#n3Pesan");
        const elKirim = g.querySelector("#n3Kirim");
        if (!elUser || !elPass || !elKirim || !elPesan) {
            console.warn("[N3] form login tidak lengkap di halaman ini.");
            return g;
        }

        g.querySelectorAll(".n3-tab").forEach(function (t) {
            t.addEventListener("click", function () {
                mode = t.dataset.mode;
                g.querySelectorAll(".n3-tab").forEach(function (x) { x.classList.remove("aktif"); });
                t.classList.add("aktif");
                elNama.style.display = (mode === "daftar") ? "block" : "none";
                elKirim.textContent = (mode === "daftar") ? "Daftar & Mulai ➔" : "Masuk ➔";
                elPesan.textContent = "";
            });
        });

        async function kirim() {
            elPesan.className = "n3-pesan";
            elPesan.textContent = "Memproses…";
            elKirim.disabled = true;
            let kodeBaru = null;
            try {
                if (mode === "daftar") {
                    kodeBaru = await daftar(elUser.value, elPass.value, elNama.value);
                } else {
                    await masuk(elUser.value, elPass.value);
                }
                if (kodeBaru) {          // daftar baru: tunjukkan kode pemulihan dulu
                    elPesan.textContent = "";
                    elKirim.disabled = false;
                    tampilkanKode(kodeBaru);
                    return;
                }
                elPesan.textContent = "Berhasil! Memuat data…";
                elPesan.className = "n3-pesan ok";
                setTimeout(function () { location.reload(); }, 400);
            } catch (err) {
                elPesan.textContent = (err && err.message) ? err.message : String(err);
                elPesan.className = "n3-pesan err";
            } finally {
                elKirim.disabled = false;
            }
        }

        elKirim.addEventListener("click", kirim);
        [elUser, elPass, elNama].forEach(function (el) {
            el.addEventListener("keydown", function (e) { if (e.key === "Enter") kirim(); });
        });

        /* ---------- lupa sandi ---------- */
        const elLupa   = g.querySelector("#n3Lupa");
        const elReset  = g.querySelector("#n3Reset");
        const elRUser  = g.querySelector("#n3RUser");
        const elRKode  = g.querySelector("#n3RKode");
        const elRPass  = g.querySelector("#n3RPass");
        const elRPass2 = g.querySelector("#n3RPass2");
        const elRPesan = g.querySelector("#n3RPesan");
        const elRKirim = g.querySelector("#n3RKirim");
        const elRBatal = g.querySelector("#n3RBatal");
        const elKodeBox = g.querySelector("#n3KodeBox");
        const elemenLogin = [elUser, elPass, elNama, elKirim];

        function gantiPanel(mana) {
            const login = (mana === "login");
            if (elReset) elReset.style.display = login ? "none" : "block";
            elemenLogin.forEach(function (x) { if (x) x.style.display = login ? "" : "none"; });
            g.querySelectorAll(".n3-tab").forEach(function (x) { x.style.display = login ? "" : "none"; });
            if (elLupa) elLupa.style.display = login ? "block" : "none";
            if (elKodeBox) elKodeBox.style.display = "none";
            if (elRPesan) { elRPesan.textContent = ""; elRPesan.className = "n3-pesan"; }
            if (!login && elRUser) {
                elRUser.value = elUser.value || "";
                setTimeout(function () { (elRUser.value ? elRKode : elRUser).focus(); }, 60);
            }
        }

        if (elLupa && elReset && elRKirim) {
            elLupa.addEventListener("click", function () { gantiPanel("lupa"); });
            if (elRBatal) elRBatal.addEventListener("click", function () { gantiPanel("login"); });
            if (elRKode) elRKode.addEventListener("input", function () {
                elRKode.value = elRKode.value.toUpperCase();
            });
            elRKirim.addEventListener("click", async function () {
                elRPesan.className = "n3-pesan";
                elRPesan.textContent = "Memproses…";
                elRKirim.disabled = true;
                try {
                    if (elRPass.value !== elRPass2.value) throw new Error("Sandi baru dan ulangannya belum sama.");
                    await lupaSandi(elRUser.value, elRKode.value, elRPass.value);
                    elRPesan.textContent = "✅ Sandi berhasil diganti! Sekarang login pakai sandi baru.";
                    elRPesan.className = "n3-pesan ok";
                    mode = "masuk";
                    elUser.value = String(elRUser.value || "").trim().toLowerCase();
                    elPass.value = "";
                    if (elRKode) elRKode.value = "";
                    elRPass.value = ""; elRPass2.value = "";
                    setTimeout(function () { gantiPanel("login"); elPass.focus(); }, 1500);
                } catch (err) {
                    elRPesan.textContent = (err && err.message) ? err.message : String(err);
                    elRPesan.className = "n3-pesan err";
                } finally {
                    elRKirim.disabled = false;
                }
            });
        }

        /* ---------- tampilkan kode pemulihan sekali (habis daftar / buat baru) ---------- */
        function tampilkanKode(kode) {
            if (!elKodeBox) return;
            const aman = String(kode).replace(/[^A-Z0-9\-]/g, "");
            elKodeBox.innerHTML =
                '<div class="kode-judul">🔑 Ini kode pemulihan kamu</div>' +
                '<div class="kode-besar">' + aman + '</div>' +
                '<button class="n3-btn kecil" id="n3Salin" type="button">📋 Salin kode</button>' +
                '<div class="kode-ket">Kode ini <b>satu-satunya cara</b> ganti sandi kalau kamu lupa. ' +
                'Screenshot atau tulis di catatan HP ya. Jangan dikasih ke siapa pun 🌸</div>' +
                '<button class="n3-btn" id="n3Lanjut" type="button">Sudah kusimpan, mulai belajar ➔</button>';
            elKodeBox.style.display = "block";
            elemenLogin.forEach(function (x) { if (x) x.style.display = "none"; });
            g.querySelectorAll(".n3-tab").forEach(function (x) { x.style.display = "none"; });
            if (elReset) elReset.style.display = "none";
            if (elLupa) elLupa.style.display = "none";
            const btnSalin = g.querySelector("#n3Salin");
            if (btnSalin) btnSalin.addEventListener("click", function () {
                try {
                    if (navigator.clipboard) navigator.clipboard.writeText(aman);
                    btnSalin.textContent = "✅ Tersalin!";
                } catch (e) { btnSalin.textContent = "Salin manual ya"; }
            });
            const lanjut = g.querySelector("#n3Lanjut");
            if (lanjut) lanjut.addEventListener("click", function () { location.reload(); });
        }
        N3._tampilkanKode = tampilkanKode;

        return g;
    }

    function tampilkanGerbang(tampil) {
        const g = gerbang();
        if (!g) return;
        g.style.display = tampil ? "flex" : "none";
    }

    /* ================= jalan ================= */
    function mulai() {
        if (!AKTIF) { console.info("[N3] supabase-config.js belum diisi — jalan mode lokal."); selesaiSiap(); return; }

        sb = window.supabase.createClient(CFG.url, CFG.anonKey);
        N3.siap = true;

        sb.auth.getSession().then(async function (res) {
            const sesi = res && res.data ? res.data.session : null;
            if (sesi && sesi.user) {
                await pasangPengguna(sesi.user);
                    tampilkanGerbang(false);
                await sinkronData();
                await kirimAntrean();
                await sinkronData();
                await muatKataDariServer();
            } else {
                tampilkanGerbang(true);
            }
            selesaiSiap();
        }).catch(function (e) {
            console.warn("[N3] gagal cek sesi:", e);
            tampilkanGerbang(true);
            selesaiSiap();
        });

        // simpan otomatis di tengah sesi belajar (biar nggak hilang kalau HP dikunci)
        setInterval(function () { if (pengguna) kirimAntrean(); }, 60000);
    }

    window.N3TampilkanGerbang = tampilkanGerbang;
    window.N3Keluar = keluar;

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", mulai);
    } else {
        mulai();
    }
})();
