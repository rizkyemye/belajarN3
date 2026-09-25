// --- SISTEM LOGIN LOKAL / PROFIL ---
let currentUser = localStorage.getItem('jlpt_current_user') || '';

// Fungsi untuk memastikan user sudah memasukkan nama saat pertama buka
function checkAndInitUser() {
    // ONLINE: login pakai username + sandi (Supabase) -> gerbang login
    if (window.N3 && N3.aktif) {
        const tersimpan = localStorage.getItem('n3_username') || '';
        if (tersimpan) {
            currentUser = tersimpan;
        } else {
            currentUser = '';
            if (typeof window.N3TampilkanGerbang === 'function') window.N3TampilkanGerbang(true);
        }
        updateProfileDisplay();
        return;
    }

    // LOKAL (belum tersambung server): perilaku lama
    if (!currentUser || currentUser.trim() === '') {
        let inputName = prompt("Masukkan nama profil kamu untuk mulai belajar:");
        if (inputName && inputName.trim() !== '') {
            currentUser = inputName.trim();
        } else {
            currentUser = "DefaultUser";
        }
        localStorage.setItem('jlpt_current_user', currentUser);
    }
    updateProfileDisplay();
}

// Fungsi untuk mengganti profil
function switchProfile() {
    // ONLINE: tombol ini jadi "keluar" (ganti akun)
    if (window.N3 && N3.aktif && N3.pengguna) {
        if (confirm("Keluar dari akun " + currentUser + "?")) {
            if (typeof window.N3Keluar === 'function') window.N3Keluar();
        }
        return;
    }
    let inputName = prompt("Masukkan nama profil baru atau ganti profil:", currentUser);
    if (inputName && inputName.trim() !== '') {
        currentUser = inputName.trim();
        localStorage.setItem('jlpt_current_user', currentUser);
        updateProfileDisplay();
        
        // Refresh data kalender dan statistik sesuai user baru
        renderCalendar();
        updateStatsBar();
        populateDirectStudyDropdown();
        alert(`Berhasil beralih ke profil: ${currentUser}`);
    }
}

// Menampilkan nama profil di layar
function updateProfileDisplay() {
    const profileEl = document.getElementById('currentProfileDisplay');
    if (profileEl) {
        profileEl.textContent = currentUser ? `👤 ${currentUser}` : '👤 belum masuk';
    }
    // kalau online, tombol "Ganti Profil" berubah jadi "Keluar"
    const btnGanti = document.querySelector('.quiz-link-btn[onclick="switchProfile()"]');
    if (btnGanti && window.N3 && N3.aktif) {
        btnGanti.textContent = 'Keluar';
        btnGanti.style.backgroundColor = '#fee2e2';
        btnGanti.style.color = '#b91c1c';
    }
}

// Panggil saat aplikasi pertama kali dijalankan
checkAndInitUser();

// --- VARIABEL GLOBAL UTAMA ---
let allData = [];
let cardQueue = [];
let currentDateObj = new Date(); // Bulan aktif di kalender
let currentActiveDay = 1;        // Hari yang sedang dipilih di menu belajar
let currentSession = null;       // 'pagi', 'siang', 'malam'

let secondsElapsed = 0;
let timerInterval = null;

const calendarSection = document.getElementById("calendarSection");
const learningArea = document.getElementById("learning-area");
const completionScreen = document.getElementById("completionScreen");

const flashcard = document.getElementById("flashcard");
const cardFront = document.getElementById("cardFront");
const cardBack = document.getElementById("cardBack");
const counter = document.getElementById("counter");
const timerDisplay = document.getElementById("timerDisplay");
const resultText = document.getElementById("resultText");

fetch((window.N3BerkasData ? N3BerkasData() : '../aset/data.json?v=10'))
    .then(response => response.json())
    .then(data => {
        allData = data;
        renderCalendar();
        updateStatsBar();
        populateDirectStudyDropdown();
        initBunpouUI();
    })
    .catch(error => {
        console.error("Error loading data.json:", error);
    });

// --- FUNGSI PEMBERSIH TEKS CONTOH KALIMAT ---
function getCleanBack(rawText) {
    if (!rawText) return "";
    return rawText.includes("【Contoh Kalimat】") 
        ? rawText.split("【Contoh Kalimat】")[0].trim() 
        : rawText.trim();
}


// --- RENDER KARTU BELAKANG: kosakata besar, contoh kalimat lebih kecil ---
function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
}

function renderCardBack(el, rawText, furi) {
    const MARK = "【Contoh Kalimat】";
    const text = rawText || "";
    const cut = text.indexOf(MARK);
    const head = (cut === -1 ? text : text.slice(0, cut)).trim();
    const rest = cut === -1 ? "" : text.slice(cut + MARK.length).trim();

    // baris terakhir = terjemahan Indonesia, sisanya = kalimat Jepang
    const lines = rest.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
    const indo = lines.length ? lines[lines.length - 1] : "";
    const jp = lines.slice(0, -1).join(" ");

    let html = '<div class="back-wrap"><div class="back-word">' + escapeHtml(head) + "</div>";
    if (rest) {
        html += '<div class="back-example">'
              + '<div class="back-example-label">Contoh Kalimat</div>'
              + (jp ? '<div class="back-example-jp">' + (furi ? furi : escapeHtml(jp)) + "</div>" : "")
              + (indo ? '<div class="back-example-id">' + escapeHtml(indo) + "</div>" : "")
              + "</div>";
    }
    html += "</div>";
    el.innerHTML = html;
}
// TAMBAHAN: Fungsi untuk memperbarui preview kosakata saat dropdown diganti
function onDayDropdownChange() {
    const selectElement = document.getElementById('directDaySelect');
    if (!selectElement) return;
    
    const selectedDay = parseInt(selectElement.value);
    const previewContainer = document.getElementById('previewVocabList');
    if (!previewContainer) return;
    
    previewContainer.innerHTML = '';

    const dayItems = allData.filter(item => Number(item.day) === selectedDay && item.jenis !== 'bunpou');
    
    if (dayItems.length === 0) {
        previewContainer.innerHTML = '<p style="color: #64748b; font-size: 0.85rem; padding: 10px;">Tidak ada kosakata untuk hari ini.</p>';
        return;
    }

    dayItems.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'vocab-item';
        div.innerHTML = `
            <span class="vocab-number">${index + 1}.</span>
            <span class="vocab-front">${tampilKata(item)}${bacaanKata(item) ? ' <span class="bacaan-kata">' + bacaanKata(item) + '</span>' : ''}</span>
            <span class="vocab-back">${getCleanBack(item.back)}</span>
        `;
        previewContainer.appendChild(div);
    });
}

// --- TAB NAVIGATION LOGIC ---
// --- TAB BUNPOU: KUMPULAN TATA BAHASA (dibaca langsung dari data.json) ---
const BUNPOU_MARK = "【Contoh Kalimat】";

/* ===== kata: bentuk kanji vs bacaan kana =====
   Data menyimpan kata_kanji (bentuk kanji) + kata_kana (bacaan).
   Mode かな/漢字 bisa dibolak-balik; kalau field belum ada, pakai front apa adanya. */
function modeKana() {
    try { return localStorage.getItem("n3_mode_kana") === "1"; } catch (e) { return false; }
}
function tampilKata(item) {
    if (!item) return "";
    const kanji = String(item.kata_kanji || item.front || "");
    const kana = String(item.kata_kana || "");
    if (!kana) return kanji || String(item.front || "");
    if (modeKana()) return kana;
    return kanji || kana;
}
function bacaanKata(item) {
    if (!item || modeKana()) return "";
    const kanji = String(item.kata_kanji || item.front || "");
    const kana = String(item.kata_kana || "");
    if (!kana || kana === kanji) return "";
    return kana;
}
function pasangTombolKana() {
    if (document.getElementById("tombolKana")) return;
    const b = document.createElement("button");
    b.id = "tombolKana";
    b.type = "button";
    b.className = "tombol-kana";
    function label() { b.textContent = modeKana() ? "かな" : "漢字"; b.title = "Ganti tampilan kata: kanji atau hiragana"; }
    label();
    b.addEventListener("click", function () {
        try { localStorage.setItem("n3_mode_kana", modeKana() ? "0" : "1"); } catch (e) {}
        label();
        if (typeof renderBunpou === "function") { try { renderBunpou(); } catch (e) {} }
        if (typeof tampilkanKartuKata === "function") { try { tampilkanKartuKata(); } catch (e) {} }
        if (typeof renderPreview === "function") { try { renderPreview(); } catch (e) {} }
        if (typeof muatKuis === "function") { try { muatKuis(); } catch (e) {} }
    });
    document.body.appendChild(b);
}
/* tombol 漢字/かな mengambang dimatikan (diminta リズ). Fungsi modeKana() tetap ada,
   jadi bacaan kata tetap tampil seperti biasa. */
window.tampilKata = tampilKata;
window.bacaanKata = bacaanKata;
window.modeKana = modeKana;

function isBunpouItem(item) {
    // entri tata bahasa di ../aset/data.json selalu diawali tanda gelombang (〜 / ～)
    if (String(item.jenis || "") === "bunpou") return true;   // entri bunpou baru (N5/N4) belum tentu pakai 〜
    return /^[\u301c\uff5e〜～]/.test(String(item.front || "").trim());
}

function parseBunpouBack(rawText) {
    const text = rawText || "";
    const cut = text.indexOf(BUNPOU_MARK);
    const meaning = (cut === -1 ? text : text.slice(0, cut)).trim();
    const rest = cut === -1 ? "" : text.slice(cut + BUNPOU_MARK.length).trim();
    const lines = rest.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
    const id = lines.length ? lines[lines.length - 1] : "";
    const jp = lines.slice(0, -1).join(" ");
    return { meaning: meaning, jp: jp, id: id };
}

function bunpouItems() {
    return allData.filter(isBunpouItem).map(function (item) {
        const p = parseBunpouBack(item.back);
        return { day: Number(item.day), pattern: String(item.front).trim(), meaning: p.meaning, jp: p.jp, id: p.id };
    });
}

// Satu pola bisa muncul di beberapa hari (data hari 1-14 ada yang dobel),
// jadi digabung per pola + dicatat hari-hari kemunculannya.
function bunpouGroups() {
    const map = new Map();
    bunpouItems().forEach(function (it) {
        if (!map.has(it.pattern)) {
            map.set(it.pattern, { pattern: it.pattern, meaning: it.meaning, jp: it.jp, id: it.id, days: [it.day] });
            return;
        }
        const g = map.get(it.pattern);
        if (g.days.indexOf(it.day) === -1) g.days.push(it.day);
        if ((!g.jp || !g.meaning) && it.jp) { g.jp = it.jp; g.id = it.id; }
        if (!g.meaning && it.meaning) g.meaning = it.meaning;
    });
    return Array.from(map.values()).map(function (g) {
        g.days.sort(function (a, b) { return a - b; });
        return g;
    }).sort(function (a, b) {
        return (a.days[0] - b.days[0]) || a.pattern.localeCompare(b.pattern, "ja");
    });
}

let bunpouFilterDay = "all";
let bunpouQuery = "";
// Rumus/aturan sambung tiap pola, ditanam langsung di file ini
// (biar nggak perlu file terpisah + nggak bisa gagal load).
 /* Istilah rumus -> Bahasa Indonesia, biar gampang dipahami */
const ISTILAH_RUMUS_ID = [
    ["（ます形の語幹）", "(batang bentuk ~masu)"],
    ["（辞書形・ている形）", "(bentuk kamus / ~te-iru)"],
    ["（辞書形・ない形）", "(bentuk kamus / bentuk negatif)"],
    ["（辞書形・た形）", "(bentuk kamus / bentuk lampau)"],
    ["（ない形の「ない」→「ず」）", "(bentuk negatif: 「ない」 diganti 「ず」)"],
    ["（ない形の「ない」→「ざる」）", "(bentuk negatif: 「ない」 diganti 「ざる」)"],
    ["（普通形）", "(bentuk biasa)"],
    ["普通形", "bentuk biasa"],
    ["名詞", "kata benda"],
    ["動詞", "kata kerja"],
    ["い形", "kata sifat-i"],
    ["な形", "kata sifat-na"],
    ["数・量", "angka/jumlah"],
    ["※", "Catatan: "],
    ["／", " / "],
    ["（て形）", "(bentuk ~te)"],
    ["（可能形）", "(bentuk potensial)"],
    ["（意向形）", "(bentuk ajakan)"],
];
function rumusIndonesia(teks) {
    let t = String(teks || "");
    ISTILAH_RUMUS_ID.forEach(function (p) { t = t.split(p[0]).join(p[1]); });
    return t.replace(/\s{2,}/g, " ").trim();
}

/* Penjelasan detail tiap pola (diambil sekali dari bunpou-note.json) */
let PETA_CATATAN_BUNPOU = null;
function muatCatatanBunpou() {
    if (PETA_CATATAN_BUNPOU) return Promise.resolve(PETA_CATATAN_BUNPOU);
    return fetch("../aset/bunpou-note.json")
        .then(function (r) { return r.json(); })
        .then(function (d) { PETA_CATATAN_BUNPOU = d || {}; return PETA_CATATAN_BUNPOU; })
        .catch(function () { PETA_CATATAN_BUNPOU = {}; return PETA_CATATAN_BUNPOU; });
}

const BUNPOU_RUMUS = {
    "〜あまり": "名詞 + の ／ 動詞・い形・な形（普通形）+ あまり",
    "〜うちに": "名詞 + の ／ 動詞（辞書形・ている形）／ い形 + うちに",
    "〜おかげで": "名詞 + の ／ 動詞・い形・な形（普通形）+ おかげで",
    "〜およそ": "およそ + 数・量",
    "〜かねる": "動詞（ます形の語幹）+ かねる",
    "〜かのように": "名詞 + の ／ 普通形 + かのように",
    "〜かもしれない": "普通形 + かもしれない（名詞・な形は「だ」を付けない）",
    "〜からこそ": "名詞・普通形 + からこそ",
    "〜かわりに": "名詞 + の ／ 動詞（辞書形・た形）+ かわりに",
    "〜がたい": "動詞（ます形の語幹）+ がたい",
    "〜がち": "名詞 ／ 動詞（ます形の語幹）+ がち",
    "〜がてら": "名詞 ／ 動詞（ます形の語幹）+ がてら",
    "〜きる": "動詞（ます形の語幹）+ きる",
    "〜ことだ": "動詞（辞書形・ない形）+ ことだ",
    "〜ことなく": "動詞（辞書形）+ ことなく",
    "〜さえ": "名詞 + さえ（+ 〜ない／〜ば）",
    "〜ざるを得ない": "動詞（ない形の「ない」→「ざる」）+ を得ない　※する → せざるを得ない",
    "〜ずじまい": "動詞（ない形の「ない」→「ず」）+ じまい　※する → せずじまい",
    "〜ずにはいられない": "動詞（ない形の「ない」→「ず」）+ にはいられない",
    "〜ずにはすまない": "動詞（ない形の「ない」→「ず」）+ にはすまない",
    "〜せいで": "名詞 + の ／ 普通形 + せいで",
    "〜たびごとに": "名詞 + の ／ 動詞（辞書形）+ たびごとに",
    "〜たびに": "名詞 + の ／ 動詞（辞書形）+ たびに",
    "〜ため": "名詞 + の ／ 動詞（辞書形・た形）+ ため（に）",
    "〜ために": "名詞 + の ／ 動詞（辞書形）+ ために",
    "〜だけでなく": "名詞・普通形 + だけでなく",
    "〜だけのことはある": "名詞 ／ 普通形 + だけのことはある",
    "〜っこない": "動詞（ます形の語幹）+ っこない",
    "〜っぱなし": "動詞（ます形の語幹）+ っぱなし",
    "〜っぽい": "名詞 ／ い形（〜い）／ 動詞（ます形の語幹）+ っぽい",
    "〜ついでに": "名詞 + の ／ 動詞（辞書形・た形）+ ついでに",
    "〜つつ": "動詞（ます形の語幹）+ つつ",
    "〜つつある": "動詞（ます形の語幹）+ つつある",
    "〜つもりだ": "動詞（辞書形・ない形）+ つもりだ",
    "〜つもりで": "動詞（辞書形・ない形）+ つもりで",
    "〜つもりはない": "動詞（辞書形）+ つもりはない",
    "〜てたまらない": "い形（〜くて）／ な形（〜で）／ 動詞（て形）+ たまらない",
    "〜てならない": "い形（〜くて）／ な形（〜で）／ 動詞（て形）+ ならない",
    "〜てはじめて": "動詞（て形）+ はじめて",
    "〜であれ": "名詞 + であれ",
    "〜とあって": "名詞・普通形 + とあって",
    "〜ということ": "普通形 ／ 名詞 + ということ",
    "〜というものだ": "普通形 ／ 名詞 + というものだ",
    "〜というより": "名詞・普通形 + というより",
    "〜といった": "名詞 + といった + 名詞",
    "〜といっても": "名詞・普通形 + といっても",
    "〜とおり": "名詞 + の ／ 動詞（辞書形・た形）+ とおり（に）",
    "〜として": "名詞 + として",
    "〜とともに": "名詞 ／ 動詞（辞書形）+ とともに",
    "〜とはいえ": "名詞・普通形 + とはいえ",
    "〜とは限らない": "普通形 + とは限らない",
    "〜ともなると": "名詞 + ともなると",
    "〜どころか": "名詞・普通形 + どころか",
    "〜ないことには": "動詞（ない形）+ ことには",
    "〜ないまでも": "動詞（ない形）+ までも",
    "〜ながらも": "動詞（ます形の語幹）／ い形 ／ 名詞 + ながらも",
    "〜なり〜なり": "名詞 + なり + 名詞 + なり",
    "〜にあたって": "名詞 ／ 動詞（辞書形）+ にあたって",
    "〜において": "名詞 + において",
    "〜にかけて": "名詞 + にかけて（は）",
    "〜にこたえて": "名詞 + にこたえて",
    "〜にちなんで": "名詞 + にちなんで",
    "〜について": "名詞 + について",
    "〜につれて": "動詞（辞書形）／ 名詞 + につれて",
    "〜にとって": "名詞 + にとって",
    "〜にほかならない": "名詞 + にほかならない",
    "〜によって": "名詞 + によって",
    "〜にわたって": "名詞 + にわたって",
    "〜に伴って": "名詞 ／ 動詞（辞書形）+ に伴って",
    "〜に先立って": "名詞 + に先立って",
    "〜に加えて": "名詞 + に加えて",
    "〜に反して": "名詞 + に反して",
    "〜に基づいて": "名詞 + に基づいて",
    "〜に対して": "名詞 + に対して",
    "〜に応じて": "名詞 + に応じて",
    "〜に決まっている": "普通形 + に決まっている",
    "〜に沿って": "名詞 + に沿って",
    "〜に越したことはない": "動詞（辞書形）+ に越したことはない",
    "〜に過ぎない": "名詞・普通形 + に過ぎない",
    "〜に違いない": "普通形 + に違いない",
    "〜に関して": "名詞 + に関して",
    "〜に限って": "名詞 + に限って",
    "〜に限る": "名詞 ／ 動詞（辞書形・ない形）+ に限る",
    "〜ぬく": "動詞（ます形の語幹）+ ぬく",
    "〜のみならず": "名詞・普通形 + のみならず",
    "〜の際に": "名詞 + の際に",
    "〜はずだ": "普通形 + はずだ",
    "〜はもとより": "名詞 + はもとより",
    "〜ばかりか": "名詞・普通形 + ばかりか",
    "〜ばかりに": "名詞・普通形 + ばかりに",
    "〜ばよかった": "動詞（ば形）+ よかった",
    "〜べきだ": "動詞（辞書形）+ べきだ　※する → すべきだ／するべきだ",
    "〜べく": "動詞（辞書形）+ べく　※する → すべく",
    "〜ほど": "名詞 ／ 動詞（辞書形）+ ほど",
    "〜ものだ": "普通形 + ものだ",
    "〜ものだから": "普通形 + ものだから",
    "〜ものなら": "動詞（可能形）+ ものなら",
    "〜ものの": "普通形（名詞・な形は「な」）+ ものの",
    "〜ようがない": "動詞（ます形の語幹）+ ようがない",
    "〜ようでは": "動詞（辞書形・ない形）+ ようでは",
    "〜ようとしている": "動詞（意向形）+ としている　※する → しようとしている",
    "〜ように": "動詞（辞書形・ない形）+ ように",
    "〜ようにする": "動詞（辞書形・ない形）+ ようにする",
    "〜ように見える": "名詞 + の ／ 普通形 + ように見える",
    "〜わけがない": "普通形 + わけがない",
    "〜わけだ": "普通形 + わけだ",
    "〜をはじめ": "名詞 + をはじめ",
    "〜をめぐって": "名詞 + をめぐって",
    "〜を問わず": "名詞 + を問わず",
    "〜を込めて": "名詞 + を込めて",
    "〜を通して": "名詞 + を通して",
    "〜を通じて": "名詞 + を通じて",
    "〜一方だ": "動詞（辞書形）+ 一方だ",
    "〜一方で": "動詞・い形（普通形）／ 名詞 + である + 一方で",
    "〜上で": "名詞 + の ／ 動詞（辞書形・た形）+ 上で",
    "〜反面": "動詞・い形（普通形）／ 名詞・な形（である・な）+ 反面",
    "〜恐れがある": "名詞 + の ／ 動詞（辞書形）+ 恐れがある",
    "〜次第": "名詞 + 次第（で）",
    "〜気味": "名詞 ／ 動詞（ます形の語幹）+ 気味",
    "〜は": "Kata Benda + は",
    "〜の": "Kata Benda + の + Kata Benda",
    "〜に": "Tempat + に + あります/います",
    "〜で": "Kata Benda + で",
    "〜を": "Kata Benda + を + Kata Kerja",
    "〜と": "Orang + と + Kata Kerja",
    "〜がいます": "Kata Benda (hidup) + が + います",
    "〜にあります": "Tempat + に + Kata Benda + が + あります",
    "〜も": "Kata Benda + も",
    "〜が好きです": "Kata Benda + が + 好きです",
    "〜に会います": "Orang + に + 会います",
    "〜へ行きたいです": "Tempat + へ + 行きたいです",
    "い形容詞 + 名詞": "い形容詞 + 名詞",
    "な形容詞 + 名詞": "な形容詞 + な + 名詞",
    "い形容詞 + です": "い形容詞 + です",
    "な形容詞 + です": "な形容詞 + です",
    "〜を散歩します": "Tempat + を + 散歩します",
    "〜に電話します": "Orang + に + 電話します",
    "〜へ行きます": "Tempat + へ + 行きます",
    "〜に習います": "Orang + に + 習います",
    "〜に乗ります": "Kendaraan + に + 乗ります",
    "〜に帰ります": "Tempat + に + 帰ります",
    "〜と一緒に": "Orang + と + 一緒に + Kata Kerja",
    "です": "Kata Benda + です",
    "は": "Kata Benda + は",
    "を": "Kata Benda + を + Kata Kerja",
    "に": "Kata Benda (tempat) + に + いきます",
    "で": "Kata Benda (alat) + で + Kata Kerja",
    "へ": "Kata Benda (tempat) + へ + いきます",
    "の": "Kata Benda + の + Kata Benda",
    "から": "Kata Benda (waktu) + から",
    "まで": "Kata Benda (waktu) + まで",
    "が": "Kata Benda + が + すきです",
    "〜てしまう": "動詞て形 + しまう",
    "〜ている": "動詞て形 + いる",
    "受身": "動詞ない形 + れる/られる",
    "使役": "動詞ない形 + せる/させる",
    "〜ば": "動詞・形容詞ば形",
    "〜なら": "名詞・普通形 + なら",
    "〜のに": "普通形 + のに",
    "〜らしい": "名詞 + らしい",
    "〜みたいだ": "名詞 + みたいだ",
    "〜そうだ(伝聞)": "普通形 + そうだ",
    "〜ておく": "動詞て形 + おく",
    "〜てある": "動詞て形 + ある",
    "〜ことにする": "動詞辞書形/ない形 + ことにする",
    "〜ところだ": "動詞辞書形/ている形/た形 + ところだ",
    "〜し": "普通形 + し",
    "〜ので": "普通形 + ので",
    "〜ながら": "動詞ます形（語幹）+ ながら",
    "〜ばかり": "動詞て形/名詞 + ばかり",
    "〜やすい": "動詞ます形（語幹）+ やすい",
    "〜そうだ(様態)": "形容詞語幹 + そうだ",
    "〜れる/〜られる": "動詞ない形 + れる/られる",
    "〜させる/〜させる": "動詞ない形 + せる/させる",
    "〜そうだ (伝聞)": "普通形 + そうだ",
    "〜おきに": "時間/数量 + おきに",
    "〜ようだ": "名詞の + ようだ / 普通形 + ようだ",
    "〜そうだ (様態)": "形容詞語幹 + そうだ",
};

function buildBunpouFilters() {
    const chips = document.getElementById("bunpouDayChips");
    if (!chips) return;
    const groups = bunpouGroups();
    const days = [];
    groups.forEach(function (g) { g.days.forEach(function (d) { if (days.indexOf(d) === -1) days.push(d); }); });
    days.sort(function (a, b) { return a - b; });

    const jmlTerbuka = groups.filter(function (g) { return g.days.some(hariTerbukaUntukMateri); }).length;
    let html = '<button class="bunpou-chip active" data-day="all">Semua <span class="chip-n">' + jmlTerbuka + "</span></button>";
    days.filter(hariTerbukaUntukMateri).forEach(function (d) {
        const n = groups.filter(function (g) { return g.days.indexOf(d) !== -1; }).length;
        html += '<button class="bunpou-chip" data-day="' + d + '">Hari ' + d + ' <span class="chip-n">' + n + "</span></button>";
    });
    chips.innerHTML = html;

    const lamaCatatan = document.querySelector('#bunpouTabContent .kunci-catatan');
    if (lamaCatatan) lamaCatatan.remove();
    if (window.N3Unlock) {
        const jmlTerkunci = groups.length - jmlTerbuka;
        let hariKecil = 0;
        groups.forEach(function (g) {
            g.days.forEach(function (d) { if (!hariTerbukaUntukMateri(d) && (!hariKecil || d < hariKecil)) hariKecil = d; });
        });
        const note = window.N3Unlock.catatan(hariKecil, jmlTerkunci, function () { buildBunpouFilters(); renderBunpou(); });
        if (note && chips.parentNode) chips.parentNode.insertBefore(note, chips);
    }

    chips.querySelectorAll(".bunpou-chip").forEach(function (btn) {
        btn.addEventListener("click", function () {
            chips.querySelectorAll(".bunpou-chip").forEach(function (b) { b.classList.remove("active"); });
            btn.classList.add("active");
            bunpouFilterDay = btn.dataset.day === "all" ? "all" : Number(btn.dataset.day);
            renderBunpou();
        });
    });
}

function renderBunpou() {
    const list = document.getElementById("bunpouList");
    const countEl = document.getElementById("bunpouCount");
    if (!list) return;

    let groups = bunpouGroups();
    if (window.N3Unlock && !window.N3Unlock.lihatSemua()) {
        groups = groups.filter(function (g) { return g.days.some(hariTerbukaUntukMateri); });
    }
    if (bunpouFilterDay !== "all") {
        groups = groups.filter(function (g) { return g.days.indexOf(bunpouFilterDay) !== -1; });
    }

    const q = bunpouQuery.trim().toLowerCase();
    if (q) {
        groups = groups.filter(function (g) {
            return (g.pattern + " " + (BUNPOU_RUMUS[g.pattern] || "") + " " + g.meaning + " " + g.jp + " " + g.id).toLowerCase().indexOf(q) !== -1;
        });
    }

    if (countEl) {
        countEl.textContent = "v4 · " + groups.length + " rumus bunpou" +
            (bunpouFilterDay === "all" ? " · semua hari" : " · Hari " + bunpouFilterDay) +
            (q ? " · cari: " + bunpouQuery.trim() : "");
    }

    if (!groups.length) {
        list.innerHTML = '<div class="bunpou-empty">Tidak ada pola yang cocok 🙈<br>Coba kata kunci lain ya〜</div>';
        return;
    }

    let html = "";
    groups.forEach(function (g) {
        const rumus = rumusIndonesia(BUNPOU_RUMUS[g.pattern] || "");
        html += '<div class="bunpou-item">' +
            '<div class="bunpou-days">Hari ' + g.days.join(" · ") + "</div>" +
            '<div class="bunpou-pattern">' + escapeHtml(g.pattern) + "</div>" +
            (rumus ? '<div class="bunpou-rumus"><span class="bunpou-rumus-label">Rumus</span><span class="bunpou-rumus-text">' + escapeHtml(rumus) + "</span></div>" : "") +
            (g.meaning ? '<div class="bunpou-meaning">' + escapeHtml(g.meaning) + "</div>" : "") +
            (g.jp ? '<div class="bunpou-example">' +
                '<div class="bunpou-ex-label">Contoh Kalimat</div>' +
                '<div class="bunpou-jp">' + escapeHtml(g.jp) + "</div>" +
                (g.id ? '<div class="bunpou-id">' + escapeHtml(g.id) + "</div>" : "") +
            "</div>" : "") +
        "</div>";
    });
    list.innerHTML = html;
}

function injectBunpouLegend() {
    const head = document.querySelector(".bunpou-header-card");
    if (!head || head.querySelector(".bunpou-legend")) return;
    const div = document.createElement("div");
    div.className = "bunpou-legend";
    div.innerHTML = "<b>Arti singkatan rumus:</b> 名詞 = kata benda · 動詞 = kata kerja · い形 = kata sifat-i · " +
        "な形 = kata sifat-na · 普通形 = bentuk biasa · 辞書形 = bentuk kamus · た形 = bentuk lampau · " +
        "ない形 = bentuk negatif · ます形の語幹 = akar bentuk sopan · 意向形 = bentuk ajakan";
    const anchorEl = document.getElementById("bunpouDayChips");
    if (anchorEl && anchorEl.parentNode) anchorEl.parentNode.insertBefore(div, anchorEl);
    else head.appendChild(div);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(function () { pasangNavBawah(); pasangTombolKalender(); pasangPilTab(); pasangRailAlat(); }, 200); });
else setTimeout(function () { pasangNavBawah(); pasangTombolKalender(); pasangPilTab(); pasangRailAlat(); }, 200);

function initBunpouUI() {
    const searchEl = document.getElementById("bunpouSearch");
    if (searchEl && !searchEl.dataset.wired) {
        searchEl.dataset.wired = "1";
        searchEl.addEventListener("input", function (e) {
            bunpouQuery = e.target.value;
            renderBunpou();
        });
    }
    injectBunpouLegend();
    pasangPopupBunpou();
    buildBunpouFilters();
    renderBunpou();
}

// mesin + tab 「動詞」 (dimuat dari sini biar tidak perlu ubah HTML tiap halaman)
(function muatDoushi() {
    if (window.__doushiDimuat) return;
    window.__doushiDimuat = true;
    ["../aset/doushi-engine.js", "../aset/doushi.js"].forEach(function (src) {
        const s = document.createElement("script");
        s.src = src; s.async = false;
        document.head.appendChild(s);
    });
})();

/* ===== NAVIGASI BAWAH (HP) =====
   Dibangun otomatis dari tombol tab yang sudah ada, jadi tidak ada daftar ganda.
   Kalender sengaja TIDAK dimasukkan (maunya リズ). Desktop tidak memakai ini. */
const IKON_NAV = { study: "学", bunpou: "文", doushi: "動", kanji: "漢", dokkai: "読" };
function pasangNavBawah() {
    const nav = document.querySelector(".tab-navigation");
    if (!nav) return null;
    let bar = document.getElementById("navBawah");
    if (!bar) {
        bar = document.createElement("nav");
        bar.id = "navBawah";
        bar.className = "nav-bawah";
        document.body.appendChild(bar);
    } else if (bar.querySelector(".nb-item")) {
        return bar;      // sudah dibangun → JANGAN bongkar ulang (biar pil penanda bisa meluncur, bukan lahir dari nol)
    }
    const tombol = [];
    nav.querySelectorAll("button.tab-btn").forEach(function (b) {
        const m = /switchTab\s*\(\s*['"]([a-z]+)['"]/.exec(b.getAttribute("onclick") || "");
        const kunci = m ? m[1] : "";
        if (!kunci || kunci === "calendar") return;      // kalender tidak masuk nav bawah
        let teks = (b.textContent || "").replace(/[^A-Za-z\u3040-\u30ff\u4e00-\u9fff ]/g, "").trim();
        teks = teks.replace(/^[\u3040-\u30ff\u4e00-\u9fff]+\s*/, "").trim() || teks;   // buang kanji di depan (mis. "漢字 Kanji" -> "Kanji")
        tombol.push({ kunci: kunci, teks: teks });
    });
    bar.innerHTML = '<span class="nb-pil" aria-hidden="true"></span>' + tombol.map(function (t, i) {
        return '<button type="button" class="nb-item" style="--i:' + i + '" data-tab="' + t.kunci + '">' +
               '<span class="nb-kanji">' + (IKON_NAV[t.kunci] || "・") + "</span>" +
               '<span class="nb-teks">' + escapeHtml(t.teks) + "</span>" +
               "</button>";
    }).join("");
    bar.querySelectorAll(".nb-item").forEach(function (el) {
        el.addEventListener("click", function (e) {
            const kotak = el.getBoundingClientRect();
            const riak = document.createElement("span");
            riak.className = "nb-ombak";
            riak.style.left = (e.clientX - kotak.left) + "px";
            riak.style.top = (e.clientY - kotak.top) + "px";
            el.appendChild(riak);
            riak.addEventListener("animationend", function () { riak.remove(); });
            switchTab(el.dataset.tab);
        });
    });
    return bar;
}

/* Pindahkan pil penanda ke posisi tab yang sedang aktif (animasinya di CSS). */
function pindahPilNav() {
    const bar = document.getElementById("navBawah");
    if (!bar) return;
    const pil = bar.querySelector(".nb-pil");
    if (!pil) return;
    const aktif = bar.querySelector(".nb-item.aktif");
    if (!aktif) { pil.style.setProperty("--w", "0px"); return; }
    pil.style.setProperty("--x", aktif.offsetLeft + "px");
    pil.style.setProperty("--w", aktif.offsetWidth + "px");
}
/* ====== TAB DESKTOP: pil penanda yang meluncur (versi rapi dari nav bawah) ====== */
function pasangPilTab() {
    const nav = document.querySelector(".tab-navigation");
    if (!nav || nav.dataset.pilSiap) return;
    nav.dataset.pilSiap = "1";
    const pil = document.createElement("span");
    pil.className = "tn-pil";
    pil.setAttribute("aria-hidden", "true");
    nav.insertBefore(pil, nav.firstChild);
    pindahPilTab();
}
/* Desktop: tombol alat (Quiz/Tulis/Dashboard/Review/Profil) DIPINDAH ke bar tab yang sama,
   jadi cuma ada satu baris alat di atas. Di HP dia balik ke tempat asalnya (jadi menu melayang). */
/* Pisahkan emoji & label tiap tombol alat, supaya di desktop bisa tampil ikon saja
   (label tetap ada untuk pembaca layar & muncul sebagai tooltip waktu di-hover). */
function pisahLabelAlat() {
    document.querySelectorAll(".aksi-grid .tombol-aksi").forEach(function (b) {
        if (b.dataset.labelSiap) return;
        b.dataset.labelSiap = "1";
        const teks = (b.textContent || "").trim();
        const pisah = teks.match(/^(\S+)\s+(.+)$/);
        b.setAttribute("aria-label", teks);
        b.setAttribute("title", teks);
        if (pisah) {
            b.innerHTML = '<span class="ta-ikon" aria-hidden="true">' + pisah[1] + "</span>" +
                          '<span class="ta-teks">' + pisah[2] + "</span>";
        }
    });
}

/* Desktop: tombol alat (Quiz/Tulis/Dashboard/Review/Profil) dipindah ke RAIL IKON sisi kiri
   (opsi G pilihan リズ). Di HP railnya dibuang & tombolnya balik ke tempat asal → jadi menu melayang. */
const ASAL_AKSI = { induk: null, sebelum: null };
function pasangRailAlat() {
    const grid = document.querySelector(".aksi-grid");
    if (!grid) return;
    const lebar = (typeof matchMedia === "function") && matchMedia("(min-width: 701px)").matches;
    let rail = document.getElementById("railAlat");
    if (lebar) {
        if (!ASAL_AKSI.induk) { ASAL_AKSI.induk = grid.parentElement; ASAL_AKSI.sebelum = grid.nextElementSibling; }
        pisahLabelAlat();
        if (!rail) {
            rail = document.createElement("aside");
            rail.id = "railAlat";
            rail.className = "rail-alat";
            rail.setAttribute("aria-label", "Alat lain");
            rail.innerHTML = '<span class="rail-logo" aria-hidden="true">⚡</span><span class="rail-garis" aria-hidden="true"></span>';
            document.body.appendChild(rail);
        }
        if (grid.parentElement !== rail) rail.appendChild(grid);
        grid.classList.add("aksi-di-rail");
        document.body.classList.add("ada-rail");
    } else {
        if (rail) rail.remove();
        if (ASAL_AKSI.induk && grid.parentElement !== ASAL_AKSI.induk) {
            ASAL_AKSI.induk.insertBefore(grid, ASAL_AKSI.sebelum || null);
        }
        grid.classList.remove("aksi-di-rail");
        document.body.classList.remove("ada-rail");
    }
    pindahPilTab();
}
window.pasangRailAlat = pasangRailAlat;
window.pasangRailAlat = pasangRailAlat;

function pindahPilTab() {
    const nav = document.querySelector(".tab-navigation");
    if (!nav) return;
    const pil = nav.querySelector(".tn-pil");
    const aktif = nav.querySelector(".tab-btn.active");
    if (!pil) return;
    if (!aktif) { pil.style.setProperty("--w", "0px"); return; }
    pil.style.setProperty("--x", aktif.offsetLeft + "px");
    pil.style.setProperty("--w", aktif.offsetWidth + "px");
}
window.pasangPilTab = pasangPilTab;
window.pindahPilTab = pindahPilTab;

function perbaruiNavBawah(tabName) {
    const bar = document.getElementById("navBawah");
    if (!bar) return;
    bar.querySelectorAll(".nb-item").forEach(function (el) {
        el.classList.toggle("aktif", el.dataset.tab === tabName);
    });
    pindahPilNav();
    const aktif = bar.querySelector(".nb-item.aktif");
    if (aktif) {                       // putar ulang animasi pantulan tiap kali tabnya berpindah
        aktif.classList.remove("pop");
        void aktif.offsetWidth;
        aktif.classList.add("pop");
    }
    const kali = document.getElementById("tombolKalender");
    if (kali) {
        // di desktop tombol Kalender sudah ada di bar tab → jangan tampil ganda
        const sembunyi = (tabName === "calendar") ||
            (typeof matchMedia === "function" && matchMedia("(min-width: 701px)").matches);
        kali.style.display = sembunyi ? "none" : "flex";
    }
}
function pasangTombolKalender() {
    if (document.getElementById("tombolKalender")) return;
    const grid = document.querySelector(".aksi-grid");
    if (!grid) return;
    const b = document.createElement("button");
    b.id = "tombolKalender";
    b.type = "button";
    b.className = "tombol-aksi tombol-kalender";
    b.innerHTML = "📅 Kalender";
    b.addEventListener("click", function () { switchTab("calendar"); });
    grid.appendChild(b);
    const bar = document.getElementById("navBawah");
    if (bar && !bar.querySelector(".nb-item.aktif")) b.style.display = "none";
    pasangMenuAksi();
}

/* Baris tombol aksi (Quiz/Tulis/Dashboard/Review/Kalender/Profil) dijadikan MENU MELAYANG
   di sudut kanan bawah — tombol bulat yang kalau dipencet membuka daftar menu.
   Barisnya TIDAK dipindah-pindah: cuma diubah jadi <popover> bawaan browser, jadi semua
   tautan, onclick, dan penambahan tombol Kalender tetap jalan seperti sebelumnya.
   Kalau browsernya belum dukung popover, baris lama dibiarkan apa adanya (tidak rusak). */
function pasangMenuAksi() {
    const grid = document.querySelector(".aksi-grid");
    if (!grid) return;
    // Desktop TIDAK diubah: baris tombol tetap seperti semula. Menu melayang hanya untuk HP.
    const hp = (typeof matchMedia === "function") && matchMedia("(max-width: 700px)").matches;
    if (!hp || typeof grid.showPopover !== "function") { lepasMenuAksi(); return; }
    if (grid.dataset.menuAksi) return;
    grid.dataset.menuAksi = "1";
    grid.id = "menuAksi";
    grid.setAttribute("popover", "auto");
    grid.setAttribute("aria-label", "Menu lain");

    const fab = document.createElement("button");
    fab.type = "button";
    fab.id = "fabAksi";
    fab.className = "fab-aksi";
    fab.setAttribute("popovertarget", "menuAksi");
    fab.setAttribute("aria-label", "Menu lain: kuis, tulis kanji, dashboard, review, kalender, ganti profil");
    fab.innerHTML = '<span class="fab-tanda" aria-hidden="true">⋯</span><span class="fab-silang" aria-hidden="true">✕</span>';
    document.body.appendChild(fab);

    grid.addEventListener("toggle", function (e) {
        fab.classList.toggle("terbuka", e.newState === "open");
    });
    // tanda buka/tutup (jaga-jaga kalau peristiwa toggle belum jalan di browser tertentu)
    fab.addEventListener("click", function () {
        setTimeout(function () { fab.classList.toggle("terbuka", grid.matches(":popover-open")); }, 0);
    });
    Array.from(grid.children).forEach(function (el, i) { el.style.setProperty("--i", i); });
}
/* Balikkan ke baris tombol biasa (dipakai kalau layar jadi lebar / desktop). */
function lepasMenuAksi() {
    const grid = document.querySelector(".aksi-grid");
    if (!grid || !grid.dataset.menuAksi) return;
    delete grid.dataset.menuAksi;
    grid.removeAttribute("popover");
    grid.removeAttribute("aria-label");
    grid.removeAttribute("id");
    const fab = document.getElementById("fabAksi");
    if (fab) fab.remove();
}
window.pasangMenuAksi = pasangMenuAksi;
window.lepasMenuAksi = lepasMenuAksi;

// ikut berubah kalau layar diputar / diubah ukurannya
if (typeof matchMedia === "function") {
    const mqAksi = matchMedia("(max-width: 700px)");
    const ubahTata = function () { pasangMenuAksi(); pasangRailAlat(); };
    if (mqAksi.addEventListener) mqAksi.addEventListener("change", ubahTata);
    else if (mqAksi.addListener) mqAksi.addListener(ubahTata);
}
window.perbaruiNavBawah = perbaruiNavBawah;
window.pindahPilNav = pindahPilNav;
if (!window.__navUbahUkuran) {
    window.__navUbahUkuran = 1;
    window.addEventListener("resize", function () { pindahPilNav(); pindahPilTab(); });
    window.addEventListener("orientationchange", function () { setTimeout(pindahPilNav, 250); });
}
window.pasangNavBawah = pasangNavBawah;
window.pasangTombolKalender = pasangTombolKalender;

/* ====== POPUP KONFIRMASI KELUAR BELAJAR ======
   Menggantikan confirm() bawaan browser dengan popup sendiri (#customStudyExitModal).
   Kalau markupnya tidak ada (halaman lain), otomatis balik ke confirm() supaya tidak rusak. */
let lewatiTanyaKeluar = false;          // penanda: sudah dijawab "ya", jangan tanya dua kali
function tanyaKeluarBelajar(panggilBalik) {
    const modal = document.getElementById("customStudyExitModal");
    const batal = document.getElementById("cancelStudyExitBtn");
    const keluar = document.getElementById("confirmStudyExitBtn");
    if (!modal || !batal || !keluar) {
        panggilBalik(confirm("Mau kemana? Masih banyak kosakatanya nih, yakin mau ditinggal?"));
        return;
    }
    if (modal.dataset.sibuk === "1") return;      // sedang ditanya → jangan dobel
    modal.dataset.sibuk = "1";
    modal.style.display = "flex";
    void modal.offsetWidth;                        // paksa reflow dulu biar animasi masuknya jalan
    modal.classList.add("buka");

    // pendengar dilepas sendiri saat ditutup — kalau tidak, pendengar lama bisa "mencuri"
    // jawaban popup berikutnya (mis. tombol Batal dari popup sebelumnya yang masih menempel)
    const bersihkan = function () {
        batal.removeEventListener("click", pilihBatal);
        keluar.removeEventListener("click", pilihKeluar);
        modal.removeEventListener("click", klikLatar);
        document.removeEventListener("keydown", tekanTombol);
    };
    const tutup = function (jawaban) {
        if (modal.dataset.sibuk !== "1") return;   // sudah ditutup sebelumnya → abaikan
        delete modal.dataset.sibuk;
        bersihkan();
        modal.classList.remove("buka");
        const beres = function () {
            if (modal.classList.contains("buka")) return;   // sudah dibuka lagi → jangan sembunyikan
            modal.style.display = "none";
            modal.removeEventListener("transitionend", beres);
        };
        modal.addEventListener("transitionend", beres);
        setTimeout(beres, 340);                    // jaring pengaman kalau transisi dimatikan
        panggilBalik(jawaban);
    };
    const pilihBatal = function (e) { e.preventDefault(); tutup(false); };
    const pilihKeluar = function (e) { e.preventDefault(); tutup(true); };
    const klikLatar = function (e) { if (e.target === modal) tutup(false); };
    const tekanTombol = function (e) { if (e.key === "Escape") { e.preventDefault(); tutup(false); } };
    batal.addEventListener("click", pilihBatal);
    keluar.addEventListener("click", pilihKeluar);
    modal.addEventListener("click", klikLatar);
    document.addEventListener("keydown", tekanTombol);
    try { batal.focus({ preventScroll: true }); } catch (e) {}
}
window.tanyaKeluarBelajar = tanyaKeluarBelajar;

function switchTab(tabName) {
    // Cek apakah sesi belajar sedang aktif (learningArea terbuka)
    if (learningArea.style.display === 'block' && cardQueue.length > 0 && !lewatiTanyaKeluar) {
        tanyaKeluarBelajar(function (ya) {
            if (!ya) return;                       // Batalkan perpindahan tab jika user pilih Batal
            stopTimer();                           // Jika user tetap ingin keluar, matikan timer sesi
            lewatiTanyaKeluar = true;
            try { switchTab(tabName); } finally { lewatiTanyaKeluar = false; }
        });
        return;
    }

    const tabs = {
        calendar: { content: document.getElementById('calendarTabContent'), btn: document.getElementById('btnTabCalendar') },
        study:    { content: document.getElementById('studyTabContent'),    btn: document.getElementById('btnTabStudy') },
        bunpou:   { content: document.getElementById('bunpouTabContent'),  btn: document.getElementById('btnTabBunpou') },
        kanji:    { content: document.getElementById('kanjiTabContent'),   btn: document.getElementById('btnTabKanji') },
        dokkai:   { content: document.getElementById('dokkaiTabContent'),  btn: document.getElementById('btnTabDokkai') },
        doushi:   { content: document.getElementById('doushiTabContent'),  btn: document.getElementById('btnTabDoushi') }
    };

    learningArea.style.display = 'none';
    document.body.classList.remove('sesi-aktif');
    completionScreen.style.display = 'none';

    Object.keys(tabs).forEach(function (key) {
        const t = tabs[key];
        if (!t.content || !t.btn) return;
        const aktif = (key === tabName);
        t.content.style.display = aktif ? 'block' : 'none';
        t.btn.classList.toggle('active', aktif);
    });

    pindahPilTab();
    if (typeof window.perbaruiNavBawah === "function") window.perbaruiNavBawah(tabName);
    if (typeof window.pasangNavBawah === "function") setTimeout(function () { const b = window.pasangNavBawah(); if (b) window.perbaruiNavBawah(tabName); }, 0);

    if (tabName === 'calendar') {
        renderCalendar();
        updateStatsBar();
    } else if (tabName === 'study') {
        document.getElementById('studySelectionCard').style.display = 'block';
        document.getElementById('studySessionMenu').style.display = 'none';
        populateDirectStudyDropdown();
    } else if (tabName === 'bunpou') {
        initBunpouUI();
    } else if (tabName === 'kanji') {
        if (typeof window.initKanjiUI === 'function') window.initKanjiUI();
    } else if (tabName === 'dokkai') {
        if (typeof window.initDokkaiUI === 'function') window.initDokkaiUI();
    } else if (tabName === 'doushi') {
        if (typeof window.pasangTabDoushi === 'function') window.pasangTabDoushi();
    }
    if (typeof window.pasangNavBawah === "function") window.pasangNavBawah();
    if (typeof window.pasangTombolKalender === "function") window.pasangTombolKalender();
}

// --- CALENDAR LOGIC (VIEW ONLY) ---
const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

function changeMonth(direction) {
    currentDateObj.setMonth(currentDateObj.getMonth() + direction);
    renderCalendar();
    updateStatsBar();
}

// KUNCI DATA UNIK BERDASARKAN USER AKTIF
function getFormattedDateKey(year, month, day) {
    const mStr = String(month + 1).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    return `study_time_${currentUser}_${year}-${mStr}-${dStr}`;
}

function getDaySeconds(year, month, day) {
    const key = getFormattedDateKey(year, month, day);
    return parseInt(localStorage.getItem(key)) || 0;
}

function getIntensityLevel(seconds) {
    if (seconds === 0) return 0;
    if (seconds < 600) return 1;    // < 10 mins
    if (seconds < 1800) return 2;   // < 30 mins
    if (seconds < 3600) return 3;   // < 1 jam
    return 4;                       // >= 1 jam
}

/* PEMULIHAN KALENDER — data menit belajar tersimpan per nama pengguna:
   "study_time_<user>_YYYY-MM-DD". Kalau nama pengguna di peranti berubah
   (mis. dulu nama tampilan, sekarang nama akun), datanya seolah hilang —
   padahal masih ada di kunci lama. Di sini dipindahkan sekali saja. */
function pulihkanDataKalender() {
    try {
        // WAJIB sama dengan yang dipakai getFormattedDateKey(): variabel currentUser.
        // Kalau belum login (currentUser kosong), jangan dipindahkan — nanti jadi kunci kosong.
        const nama = String(currentUser || "").trim();
        if (!nama) return;
        if (localStorage.getItem("n3_pulih_kalender") === "1") return;
        const awalan = "study_time_" + nama + "_";
        const punyaSendiri = Object.keys(localStorage).some(function (k) { return k.indexOf(awalan) === 0; });
        if (!punyaSendiri) {
            const lain = Object.keys(localStorage).filter(function (k) {
                return /^study_time_.+_\d{4}-\d{2}-\d{2}$/.test(k);
            });
            let pindah = 0;
            lain.forEach(function (k) {
                const pisah = k.lastIndexOf("_");
                const tanggal = k.slice(pisah + 1);
                const baru = awalan + tanggal;
                const nilai = localStorage.getItem(k);
                if (!localStorage.getItem(baru) && nilai) {
                    localStorage.setItem(baru, nilai);
                    pindah++;
                }
            });
            if (pindah) console.log("kalender dipulihkan:", pindah, "hari untuk", nama);
        }
        localStorage.setItem("n3_pulih_kalender", "1");
    } catch (e) {}
}

/* ====== KARTU TUGAS HARIAN (tampil di bawah kalender) ====== */
const KUNCI_BUNPOU_BUKA = "n3_bunpou_buka";     // {"pola": 1} — pola bunpou yang sudah dibuka

function bunpouDibuka() {
    try { return JSON.parse(localStorage.getItem(KUNCI_BUNPOU_BUKA) || "{}") || {}; } catch (e) { return {}; }
}

function catatBunpouDibuka(pola) {
    pola = String(pola || "").trim();
    if (!pola) return;
    const d = bunpouDibuka();
    if (d[pola]) return;
    d[pola] = 1;
    try { localStorage.setItem(KUNCI_BUNPOU_BUKA, JSON.stringify(d)); } catch (e) {}
    renderTugasHari(currentActiveDay);
}

function daftarPolaHari(dayNum) {
    const set = new Set();
    (typeof bunpouItems === "function" ? bunpouItems() : []).forEach(function (it) {
        if (Number(it.day) === Number(dayNum) && it.pattern) set.add(String(it.pattern).trim());
    });
    return [...set];
}

/* Berapa HARI yang masih menggantung (sesi / bunpou / dokkai) sampai hari yang sudah kebuka.
   Ini yang bikin kartu tugas bisa bilang "ada N hari ... belum selesai". */
function hitungHariTertinggal() {
    const hasil = { sesi: 0, bunpou: 0, dokkai: 0, sampaiHari: 0 };
    let maks = 1;
    // pakai aturan yang sama dengan tab Dokkai/Belajar: N3Unlock (per akun) kalau ada, kalau tidak aturan lama
    try {
        maks = (window.N3Unlock && typeof window.N3Unlock.maksHari === "function")
            ? window.N3Unlock.maksHari() : getMaxUnlockedDay();
    } catch (e) { try { maks = getMaxUnlockedDay(); } catch (e2) {} }
    hasil.sampaiHari = maks;
    const dibuka = bunpouDibuka();
    let hariDokkai = [];
    try { if (typeof window.hariDokkaiAda === "function") hariDokkai = window.hariDokkaiAda() || []; } catch (e) {}
    for (let d = 1; d <= maks; d++) {
        try {
            const tigaBeres = ["pagi", "siang", "malam"].every(function (s) { return isSessionCompleted(d, s); });
            if (!tigaBeres) hasil.sesi++;
        } catch (e) {}
        const pola = daftarPolaHari(d);
        if (pola.length && pola.filter(function (p) { return dibuka[p]; }).length < pola.length) hasil.bunpou++;
        if (hariDokkai.indexOf(d) >= 0 && !dokkaiSelesai(d)) hasil.dokkai++;
    }
    return hasil;
}

function dokkaiSelesai(dayNum) {
    try {
        const h = JSON.parse(localStorage.getItem("n3_dokkai_hasil") || "{}") || {};
        return !!h[dayNum];
    } catch (e) { return false; }
}

let hariTerakhirTugas = 1;      // supaya kartu bisa disegarkan tanpa harus tahu hari aktifnya
function renderTugasHari(dayNum) {
    const kalender = document.getElementById("calendarSection");
    const sisa = hitungHariTertinggal();
    if (dayNum) hariTerakhirTugas = dayNum;
    if (!kalender || !dayNum) return;
    let kotak = document.getElementById("tugasHariBox");
    if (!kotak) {
        kotak = document.createElement("div");
        kotak.id = "tugasHariBox";
        kotak.className = "tugas-hari";
        const acuan = document.getElementById("stripHari") || kalender;   // urutan: kalender → strip → kartu tugas
        kotak.setAttribute("aria-label", "Daftar tugas hari ini");
        acuan.after(kotak);
    }
    const sesiBeres = ["pagi", "siang", "malam"].filter(function (s) { return isSessionCompleted(dayNum, s); });
    const pola = daftarPolaHari(dayNum);
    const dibuka = bunpouDibuka();
    const polaBeres = pola.filter(function (p) { return dibuka[p]; });
    const dk = dokkaiSelesai(dayNum);
    const elJlpt = document.getElementById("jlptCountdown");
    const sisaHari = elJlpt ? String(elJlpt.textContent || "").trim() : "";

    // hitungan "ada N hari ..." untuk seluruh hari yang sudah kebuka sampai hari ini
    const antre = function (jumlah, kalauAda, kalauBeres) {
        return jumlah > 0 ? "⚠ Ada " + jumlah + " hari " + kalauAda : "✓ Semua hari " + kalauBeres;
    };
    const kartu = [
        { ikon: "📚", judul: "Sesi Pagi · Siang · Malam",
          sub: sesiBeres.length === 3 ? "Ketiga sesi sudah selesai" :
               (sesiBeres.length ? sesiBeres.length + " dari 3 sesi sudah selesai" : "Belum ada sesi yang dikerjakan"),
          sisa: antre(sisa.sesi, "sesinya belum selesai", "sesinya sudah beres"), sisaAda: sisa.sesi > 0,
          beres: sesiBeres.length === 3 },
        { ikon: "📐", judul: "Bunpou hari ini",
          sub: !pola.length ? "Belum ada bunpou untuk hari ini" :
               (polaBeres.length === pola.length ? "Semua pola sudah dibaca" :
                polaBeres.length + " dari " + pola.length + " pola sudah dibaca — belum selesai dibaca"),
          sisa: antre(sisa.bunpou, "bunpou-nya belum dibaca", "bunpou-nya sudah dibaca"), sisaAda: sisa.bunpou > 0,
          beres: pola.length > 0 && polaBeres.length === pola.length },
        { ikon: "📖", judul: "Dokkai hari ini",
          sub: dk ? "Sudah dikerjakan" : "Masih belum dikerjakan",
          sisa: antre(sisa.dokkai, "dokkainya belum dikerjakan", "dokkainya sudah dikerjakan"), sisaAda: sisa.dokkai > 0,
          beres: dk },
        { ikon: "🌸", judul: "Semangat ya buat lulus Ujian JLPT-nya!",
          sub: sisaHari ? "Sisa " + sisaHari + " hari menuju ujian — pelan-pelan aja, yang penting rutin" :
                          "Pelan-pelan aja, yang penting rutin", semangat: true }
    ];

    kotak.innerHTML = kartu.map(function (k) {
        const kelas = k.semangat ? "tugas semangat" : (k.beres ? "tugas beres" : "tugas belum");
        const tanda = k.semangat ? "🎌" : (k.beres ? "✓" : "!");
        const label = k.semangat ? "Motivasi" : (k.judul.split(" ")[0] === "Sesi" ? "Sesi" : (k.judul.split(" ")[0] === "Bunpou" ? "Bunpou" : "Dokkai"));
        const barisSisa = k.sisa ? '<span class="tugas-sisa' + (k.sisaAda ? " ada" : "") + '">' + k.sisa + "</span>" : "";
        return '<div class="' + kelas + '" role="status">' +
               '<span class="tugas-label">' + label + "</span>" +
               '<span class="tugas-ikon" aria-hidden="true">' + k.ikon + "</span>" +
               '<span class="tugas-teks"><b>' + k.judul + "</b><span>" + k.sub + "</span>" + barisSisa + "</span>" +
               '<span class="tugas-tanda" aria-hidden="true">' + tanda + "</span></div>";
    }).join("");
}
window.renderTugasHari = renderTugasHari;
window.segarkanTugasHari = function () { renderTugasHari(hariTerakhirTugas); };

/* Strip hari (versi HP) — deretan tanggal bisa digeser, hari ini kotak penuh.
   Mengikuti contoh リズ: nama hari kecil di atas, angka besar di bawah, panah » di ujung. */
function renderStripHari() {
    const kalender = document.getElementById("calendarSection");
    if (!kalender) return;
    let strip = document.getElementById("stripHari");
    if (!strip) {
        strip = document.createElement("div");
        strip.id = "stripHari";
        strip.className = "strip-hari";
        strip.setAttribute("aria-label", "Pilih tanggal");
    }
    kalender.after(strip);          // strip hari duduk DI BAWAH kartu kalender
    const nama = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
    const kini = new Date(); kini.setHours(0, 0, 0, 0);
    let isi = "";
    for (let i = -3; i <= 10; i++) {
        const t = new Date(kini.getTime());
        t.setDate(kini.getDate() + i);
        const ini = i === 0;
        const detik = (typeof getDaySeconds === "function")
            ? getDaySeconds(t.getFullYear(), t.getMonth(), t.getDate()) : 0;
        const menit = Math.floor(detik / 60);
        const tandaMenit = menit > 0 ? (menit >= 60 ? Math.floor(menit / 60) + "j " + (menit % 60) + "m" : menit + "m") : "–";
        const persen = Math.max(0, Math.min(100, Math.round((menit / 30) * 100)));   // target harian 30 menit
        isi += '<button class="sh-item' + (ini ? " ini" : "") + (menit > 0 ? " ada" : "") +
               '" style="--i:' + (i + 3) + ";--p:" + persen + '"' +
               ' data-tgl="' + t.getFullYear() + "-" +
               String(t.getMonth() + 1).padStart(2, "0") + "-" + String(t.getDate()).padStart(2, "0") + '">' +
               '<span class="sh-kilau" aria-hidden="true"></span>' +
               '<span class="sh-tgl">' + t.getDate() + "</span>" +
               '<span class="sh-hari">' + nama[t.getDay()] + "</span>" +
               '<span class="sh-menit">' + tandaMenit + "</span>" +
               '<span class="sh-bar" aria-hidden="true"><i></i></span></button>';
    }
    strip.innerHTML = isi + '<span class="sh-panah" aria-hidden="true">»</span>';
    const aktif = strip.querySelector(".sh-item.ini");
    if (aktif && aktif.scrollIntoView) { try { aktif.scrollIntoView({ block: "nearest", inline: "center" }); } catch (e) {} }
}
window.renderStripHari = renderStripHari;

function renderCalendar() {
    pulihkanDataKalender();
    renderStripHari();
    renderTugasHari(currentActiveDay);
    const year = currentDateObj.getFullYear();
    const month = currentDateObj.getMonth();

    const titleEl = document.getElementById("monthYearTitle");
    if (titleEl) titleEl.textContent = `${monthNames[month]} ${year}`;

    const daysGrid = document.getElementById("daysGrid");
    if (!daysGrid) return;
    daysGrid.innerHTML = "";

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Minggu
    const totalDays = new Date(year, month + 1, 0).getDate();

    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
    const todayDate = today.getDate();

    for (let i = 0; i < firstDayIndex; i++) {
        const emptyCell = document.createElement("div");
        emptyCell.className = "day-cell empty";
        daysGrid.appendChild(emptyCell);
    }

    for (let day = 1; day <= totalDays; day++) {
        const cell = document.createElement("div");
        const sec = getDaySeconds(year, month, day);
        const level = getIntensityLevel(sec);

        let classNames = `day-cell level-${level}`;
        if (isCurrentMonth && day === todayDate) {
            classNames += " today";
        }
        cell.className = classNames;
        
        let timeLabel = "·";
        if (sec > 0) {
            const mins = Math.floor(sec / 60);
            const hrs = (mins / 60).toFixed(1);
            timeLabel = mins >= 60 ? `✓${Math.floor(hrs)}j` : `✓${mins}m`;
        }

        cell.innerHTML = `
            <span class="day-number">${day}</span>
            <span class="day-time">${timeLabel}</span>
        `;
        daysGrid.appendChild(cell);
    }
}

function updateStatsBar() {
    const year = currentDateObj.getFullYear();
    const month = currentDateObj.getMonth();
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

    let monthDaysStudied = 0;
    let totalMonthSeconds = 0;

    for (let d = 1; d <= totalDaysInMonth; d++) {
        const sec = getDaySeconds(year, month, d);
        if (sec > 0) {
            monthDaysStudied++;
            totalMonthSeconds += sec;
        }
    }

    let totalLifetimeSeconds = 0;
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        // HANYA hitung key yang milik user aktif saat ini
        if (key && key.startsWith(`study_time_${currentUser}_`)) {
            totalLifetimeSeconds += parseInt(localStorage.getItem(key)) || 0;
        }
    }

    const targetSeconds = 20 * 3600;
    let targetPercentage = Math.floor((totalLifetimeSeconds / targetSeconds) * 100);
    if (targetPercentage > 100) targetPercentage = 100;

    const today = new Date();
    const jlptDate = new Date('2026-12-06');
    const diffTime = jlptDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const daysRemaining = diffDays > 0 ? diffDays : 0;

    let streak = 0;
    let checkDate = new Date();
    while (true) {
        const y = checkDate.getFullYear();
        const m = checkDate.getMonth();
        const d = checkDate.getDate();
        const sec = getDaySeconds(y, m, d);
        if (sec > 0) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            const todayObj = new Date();
            if (d === todayObj.getDate() && m === todayObj.getMonth() && y === todayObj.getFullYear()) {
                checkDate.setDate(checkDate.getDate() - 1);
                const secYesterday = getDaySeconds(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate());
                if (secYesterday > 0) {
                    streak++;
                    checkDate.setDate(checkDate.getDate() - 1);
                    continue;
                }
            }
            break;
        }
    }

    const streakEl = document.getElementById("streakCount");
    const monthDaysEl = document.getElementById("monthDaysCount");
    const totalTimeEl = document.getElementById("totalMonthTime");
    const targetProgressEl = document.getElementById("targetProgress");
    const jlptCountdownEl = document.getElementById("jlptCountdown");

    if (streakEl) streakEl.textContent = streak;
    if (monthDaysEl) monthDaysEl.textContent = monthDaysStudied;

    const totalMins = Math.floor(totalMonthSeconds / 60);
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    if (totalTimeEl) totalTimeEl.textContent = `${hrs}j ${mins}m`;

    if (targetProgressEl) targetProgressEl.textContent = `${targetPercentage}%`;
    if (jlptCountdownEl) jlptCountdownEl.textContent = daysRemaining;
}

// --- SISTEM UNLOCK HARIAN (HARI KE-1 DIMULAI TANGGAL 5) ---
function hariTerbukaUntukMateri(h) {
    if (window.N3Unlock) return window.N3Unlock.terbuka(h);
    return Number(h) <= getMaxUnlockedDay();
}

function getMaxUnlockedDay() {
    const now = new Date();
    const dateNum = now.getDate();
    
    if (dateNum < 5) {
        return 1;
    }
    
    return dateNum - 4;
}

// --- STUDY TAB & SESSION LOGIC ---
function populateDirectStudyDropdown() {
    const selectElement = document.getElementById('directDaySelect');
    if (!selectElement) return;
    selectElement.innerHTML = '';
    
    const maxUnlocked = getMaxUnlockedDay();
    const days = [...new Set(allData.map(item => item.day))].sort((a, b) => a - b);
    
    days.forEach(dayNum => {
        const opt = document.createElement('option');
        opt.value = dayNum;
        
        const jumlahKata = allData.filter(i => i.day === dayNum).length;
        if (dayNum <= maxUnlocked) {
            // tanda di pilihan: sudah beres semua sesinya, atau ini hari yang sedang berjalan
            let tanda = "";
            try {
                const semuaBeres = ["pagi", "siang", "malam"].every(s => isSessionCompleted(dayNum, s));
                tanda = semuaBeres ? " · ✅ beres" : (dayNum === maxUnlocked ? " · ▶ hari ini" : "");
            } catch (e) {}
            opt.textContent = `Hari ke-${dayNum} (${jumlahKata} Kosakata)${tanda}`;
        } else {
            opt.textContent = `🔒 Hari ke-${dayNum} (Terkunci - Buka besok jam 05:00)`;
            opt.disabled = true;
        }
        selectElement.appendChild(opt);
    });
}

/* ====== JUDUL MENU SESI (#studySessionMenuTitle) ======
   Bukan cuma teks polos: ada penanda hari (第 N 日), judul, jumlah kosakata + kemajuan sesi. */
function tulisJudulSesi(dayNum) {
    const el = document.getElementById("studySessionMenuTitle");
    if (!el) return;
    const hari = Number(dayNum) || 1;
    let kata = 0;
    try {
        if (typeof allData !== "undefined" && Array.isArray(allData)) {
            kata = allData.filter(function (it) { return Number(it.day) === hari; }).length;
        }
    } catch (e) {}
    let beres = 0;
    try {
        beres = ["pagi", "siang", "malam"].filter(function (s) { return isSessionCompleted(hari, s); }).length;
    } catch (e) {}
    const rincian = [];
    if (kata) rincian.push(kata + " kosakata");
    rincian.push(beres + " dari 3 sesi selesai");
    el.innerHTML = '<span class="ss-hari">第 ' + hari + " 日</span>" +
                   '<span class="ss-utama">Sesi Belajar Hari ke-' + hari + "</span>" +
                   '<span class="ss-rincian">' + rincian.join(" · ") + "</span>";
    el.classList.toggle("ss-beres", beres === 3);
    el.classList.remove("ss-masuk");     // putar ulang animasi masuknya tiap menu dibuka
    void el.offsetWidth;
    el.classList.add("ss-masuk");
}
window.tulisJudulSesi = tulisJudulSesi;

/* Pilihan hari (.study-select): beri "denyut" tiap kali hari diganti — sekali pasang untuk semua halaman. */
if (!window.__pilihanHariSiap) {
    window.__pilihanHariSiap = 1;
    document.addEventListener("change", function (e) {
        const sel = e.target && e.target.closest ? e.target.closest("select.study-select") : null;
        if (!sel) return;
        sel.classList.remove("pilih");
        void sel.offsetWidth;
        sel.classList.add("pilih");
    });
}

function openStudySessions() {
    const selectElement = document.getElementById('directDaySelect');
    const selectedOption = selectElement.options[selectElement.selectedIndex];
    currentActiveDay = parseInt(selectElement.value);

    if (selectedOption.disabled || currentActiveDay > getMaxUnlockedDay()) {
        alert("🔒 Hari ini masih terkunci! Sesi baru akan terbuka secara otomatis pada pukul 05:00 pagi.");
        return;
    }

    document.getElementById('studySelectionCard').style.display = 'none';
    document.getElementById('studySessionMenu').style.display = 'block';
    tulisJudulSesi(currentActiveDay);

    updateStudySessionButtonsState(currentActiveDay);
    renderDayVocabList(currentActiveDay);
}

// Fungsi untuk merender daftar kosakata berdasarkan hari yang dipilih
function renderDayVocabList(dayNum) {
    const vocabListContainer = document.getElementById('dayVocabList');
    if (!vocabListContainer) return;
    vocabListContainer.innerHTML = '';

    const dayItems = allData.filter(item => item.day === dayNum);
    if (dayItems.length === 0) {
        vocabListContainer.innerHTML = '<p style="color: #64748b; font-size: 0.85rem;">Tidak ada kosakata untuk hari ini.</p>';
        return;
    }

    dayItems.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'vocab-item';
        div.innerHTML = `
            <span class="vocab-number">${index + 1}.</span>
            <span class="vocab-front">${tampilKata(item)}${bacaanKata(item) ? ' <span class="bacaan-kata">' + bacaanKata(item) + '</span>' : ''}</span>
            <span class="vocab-back">${getCleanBack(item.back)}</span>
        `;
        vocabListContainer.appendChild(div);
    });
}

function backToStudySelection() {
    document.getElementById('studySessionMenu').style.display = 'none';
    document.getElementById('studySelectionCard').style.display = 'block';
}

// KUNCI SESI HARIAN UNIK BERDASARKAN USER AKTIF
function getDaySessionKey(dayNum, sessionName) {
    return `session_done_${currentUser}_day_${dayNum}_${sessionName}`;
}

function isSessionCompleted(dayNum, sessionName) {
    return localStorage.getItem(getDaySessionKey(dayNum, sessionName)) === 'true';
}

function setSessionCompleted(dayNum, sessionName) {
    localStorage.setItem(getDaySessionKey(dayNum, sessionName), 'true');

    // kirim juga ke server (Supabase)
    if (window.N3 && N3.kirimSelesai) {
        N3.kirimSelesai(dayNum, sessionName);
    }
}

function updateStudySessionButtonsState(dayNum) {
    const pagiDone = isSessionCompleted(dayNum, 'pagi');
    const siangDone = isSessionCompleted(dayNum, 'siang');
    const malamDone = isSessionCompleted(dayNum, 'malam');

    const btnPagi = document.getElementById("studyBtnPagi");
    const statusPagi = document.getElementById("studyStatusPagi");
    btnPagi.className = pagiDone ? "session-btn completed" : "session-btn";
    statusPagi.textContent = pagiDone ? "Selesai ✔️" : "Mulai ➔";
    btnPagi.onclick = () => startStudySession('pagi', dayNum);

    const btnSiang = document.getElementById("studyBtnSiang");
    const statusSiang = document.getElementById("studyStatusSiang");
    if (pagiDone) {
        btnSiang.className = siangDone ? "session-btn completed" : "session-btn";
        statusSiang.textContent = siangDone ? "Selesai ✔️" : "Mulai ➔";
        btnSiang.onclick = () => startStudySession('siang', dayNum);
    } else {
        btnSiang.className = "session-btn locked";
        statusSiang.textContent = "🔒 Selesaikan Pagi";
        btnSiang.onclick = () => alert("Selesaikan Sesi Pagi terlebih dahulu!");
    }

    const btnMalam = document.getElementById("studyBtnMalam");
    const statusMalam = document.getElementById("studyStatusMalam");
    if (siangDone) {
        btnMalam.className = malamDone ? "session-btn completed" : "session-btn";
        statusMalam.textContent = malamDone ? "Selesai ✔️" : "Mulai ➔";
        btnMalam.onclick = () => startStudySession('malam', dayNum);
    } else {
        btnMalam.className = "session-btn locked";
        statusMalam.textContent = "🔒 Selesaikan Siang";
        btnMalam.onclick = () => alert("Selesaikan Sesi Siang terlebih dahulu!");
    }

    tandaHariSelesai(dayNum, pagiDone && siangDone && malamDone);
    renderTugasHari(dayNum);
    tulisJudulSesi(dayNum);
}

/* Tanda "hari ini sudah selesai" di tab Belajar — tampil kalau KETIGA sesi hari itu beres.
   Elemennya dibuat dari JS supaya tidak perlu menyentuh HTML tiga tingkat. */
function tandaHariSelesai(dayNum, semuaSelesai) {
    let tanda = document.getElementById("tandaHariSelesai");
    if (!tanda) {
        const acuan = document.getElementById("studyBtnPagi");
        const induk = acuan ? (acuan.closest(".session-buttons-list") || acuan.parentElement) : null;
        if (!induk) return;
        tanda = document.createElement("div");
        tanda.id = "tandaHariSelesai";
        tanda.className = "tanda-selesai";
        tanda.setAttribute("role", "status");
        tanda.innerHTML = '<span class="ts-ikon" aria-hidden="true">✓</span>' +
            '<span class="ts-teks"><b>Hari ini sudah selesai!</b>' +
            '<span>Ketiga sesi hari ke-' + dayNum + ' beres semua. Istirahat dulu, besok lanjut ✨</span></span>';
        induk.insertBefore(tanda, induk.firstChild);
    }
    tanda.style.display = semuaSelesai ? "" : "none";
}

function startStudySession(sessionName, dayNum) {
    currentSession = sessionName;
    const filteredData = allData.filter(item => item.day === dayNum);
    
    const chunkSize = Math.ceil(filteredData.length / 3);
    let sessionData = [];

    if (sessionName === 'pagi') {
        sessionData = filteredData.slice(0, chunkSize);
    } else if (sessionName === 'siang') {
        sessionData = filteredData.slice(chunkSize, chunkSize * 2);
    } else if (sessionName === 'malam') {
        sessionData = filteredData.slice(chunkSize * 2);
    }

    cardQueue = shuffleArray([...sessionData]);
    hitungBelum = {};

    document.getElementById('studySessionMenu').style.display = 'none';
    learningArea.style.display = 'block';
    document.body.classList.add('sesi-aktif'); // sembunyikan banner & tombol menu saat belajar
    completionScreen.style.display = 'none';

    startTimer();
    updateCard();
}

function backToStudySessionsMenu() {
    // Tambahkan konfirmasi jika user klik tombol kembali saat sesi flashcard masih berjalan
    if (cardQueue.length > 0 && !lewatiTanyaKeluar) {
        tanyaKeluarBelajar(function (ya) {
            if (!ya) return;                       // Batal kembali jika user pilih Batal
            lewatiTanyaKeluar = true;
            try { backToStudySessionsMenu(); } finally { lewatiTanyaKeluar = false; }
        });
        return;
    }

    stopTimer();
    learningArea.style.display = 'none';
    document.body.classList.remove('sesi-aktif');
    document.getElementById('studySessionMenu').style.display = 'block';
    updateStudySessionButtonsState(currentActiveDay);
}

function backToStudySessionsMenuFromCompletion() {
    completionScreen.style.display = 'none';
    document.getElementById('studySessionMenu').style.display = 'block';
    updateStudySessionButtonsState(currentActiveDay);
}

// --- STUDY SESSION & TIMER LOGIC ---
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function formatTime(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function startTimer() {
    stopTimer();
    secondsElapsed = 0;
    timerDisplay.textContent = `⏱️ 00:00`;
    
    timerInterval = setInterval(() => {
        secondsElapsed++;
        timerDisplay.textContent = `⏱️ ${formatTime(secondsElapsed)}`;
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function addStudyTimeToToday(seconds) {
    const today = new Date();
    const key = getFormattedDateKey(today.getFullYear(), today.getMonth(), today.getDate());
    const currentSec = parseInt(localStorage.getItem(key)) || 0;
    localStorage.setItem(key, currentSec + seconds);

    // kirim juga ke server (Supabase) supaya data tidak hilang
    if (window.N3 && N3.kirimDetik) {
        N3.kirimDetik(currentActiveDay, currentSession || '-', seconds);
    }
}

function updateCard() {
    if (cardQueue.length === 0) {
        stopTimer();
        addStudyTimeToToday(secondsElapsed);
        setSessionCompleted(currentActiveDay, currentSession);

        learningArea.style.display = 'none';
    document.body.classList.remove('sesi-aktif');
        completionScreen.style.display = "block";
        
        resultText.innerHTML = `Hebat! Sesi <b>${currentSession.toUpperCase()}</b> selesai dalam <b>${formatTime(secondsElapsed)}</b>.<br>Waktu belajar telah dicatat ke kalender hari ini 🎉`;

        /* ringkasan tiap kartu DIMATIKAN di tab Belajar — dipindah ke halaman Kuis (per sesi) */
        return;
    }

    waktuKartu = Date.now();
    cardFront.textContent = cardQueue[0].front;
    renderCardBack(cardBack, cardQueue[0].back, cardQueue[0].furi);
    counter.textContent = `Sisa: ${cardQueue.length} kartu`;
    
    flashcard.classList.remove("flipped");
}

flashcard.addEventListener("click", () => {
    if (cardQueue.length > 0) {
        flashcard.classList.toggle("flipped");
    }
});

// --- PENILAIAN KARTU: 2 pilihan saja (Sudah ingat / Belum ingat) ---
let hitungBelum = {};                 // berapa kali kartu ditandai "belum ingat" di sesi ini
let waktuKartu = Date.now();          // kapan kartu yang tampil sekarang mulai dilihat


/* ===== RINGKASAN AKHIR SESI =====
   Tiap kartu dinilai OTOMATIS oleh sistem (Again/Hard/Good/Easy) dari hasil + lamanya menjawab.
   Datanya sudah lama direkam (benar/salah/detik) — di sini hanya ditampilkan. */
let sesiIni = [];                     // catatan kartu di sesi yang sedang berjalan

function nilaiKartu(ingat, detik) {
    const d = Number(detik) || 0;
    if (!ingat) return { kode: "again", label: "Again", ikon: "🔴", warna: "#DC2626" };
    if (d > 20) return { kode: "hard", label: "Hard", ikon: "🟠", warna: "#D97706" };
    if (d >= 8) return { kode: "good", label: "Good", ikon: "🔵", warna: "#2563EB" };
    return { kode: "easy", label: "Easy", ikon: "🟢", warna: "#059669" };
}

function bersihkan(teks) {
    const d = document.createElement("div");
    d.innerHTML = String(teks || "");
    return (d.textContent || "").replace(/\s+/g, " ").trim();
}

function ringkasanHTML() {
    if (!sesiIni.length) return "";
    const hitung = { again: 0, hard: 0, good: 0, easy: 0 };
    let detikTotal = 0;
    const baris = sesiIni.map(function (x) {
        const n = nilaiKartu(x.ingat, x.detik);
        hitung[n.kode]++;
        detikTotal += Number(x.detik) || 0;
        return '<li class="n3r-baris">'
            + '<span class="n3r-kata"><b>' + x.kata + '</b><small>' + bersihkan(x.arti) + '</small></span>'
            + '<span class="n3r-nilai" style="color:' + n.warna + ';background:' + n.warna + '1a">'
            + n.ikon + ' ' + n.label + ' <em>' + (Number(x.detik) || 0) + 's</em></span>'
            + '</li>';
    }).join("");
    const ringkas = [["easy", "Easy"], ["good", "Good"], ["hard", "Hard"], ["again", "Again"]]
        .filter(function (r) { return hitung[r[0]]; })
        .map(function (r) { return r[1] + " " + hitung[r[0]]; }).join(" · ");
    return '<div class="n3r-bungkus">'
        + '<div class="n3r-kepala"><b>Ringkasan sesi</b><span>' + sesiIni.length
        + ' kartu · ' + Math.round(detikTotal / Math.max(1, sesiIni.length)) + ' detik rata-rata</span></div>'
        + '<p class="n3r-legenda">' + ringkas + ' — nilai ini ditentukan sistem dari hasil &amp; kecepatanmu ✓</p>'
        + '<ul class="n3r-daftar">' + baris + '</ul></div>';
}

/* CSS-nya disuntik sekali saja */
function pasangGayaRingkasan() {
    if (document.getElementById("n3r-gaya")) return;
    const s = document.createElement("style");
    s.id = "n3r-gaya";
    s.textContent = ".n3r-bungkus{background:#fff;border:1px solid #E2E8F0;border-radius:18px;padding:16px;margin:16px 0;text-align:left}"
        + ".n3r-kepala{display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:6px}"
        + ".n3r-kepala b{font-size:1.02rem}.n3r-kepala span{color:#475569;font-size:.82rem}"
        + ".n3r-legenda{color:#475569;font-size:.82rem;line-height:1.5;margin:0 0 12px}"
        + ".n3r-daftar{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}"
        + ".n3r-baris{display:flex;align-items:center;justify-content:space-between;gap:10px;background:#F8FAFC;border-radius:12px;padding:10px 12px}"
        + ".n3r-kata b{display:block;font-size:1rem}.n3r-kata small{color:#475569;font-size:.82rem}"
        + ".n3r-nilai{font-weight:800;font-size:.8rem;padding:5px 10px;border-radius:999px;white-space:nowrap}"
        + ".n3r-nilai em{font-style:normal;opacity:.85;font-weight:700}"
        + "@media (max-width:400px){.n3r-nilai{font-size:.74rem;padding:4px 8px}}";
    document.head.appendChild(s);
}

/* dipakai halaman ringkasan/uji: render ke elemen mana pun */
window.N3Ringkasan = {
    nilaimu: nilaiKartu,
    html: function (daftar) { const lama = sesiIni; sesiIni = daftar || []; const h = ringkasanHTML(); sesiIni = lama; return h; },
    ke: function (el, daftar) { pasangGayaRingkasan(); el.innerHTML = window.N3Ringkasan.html(daftar); }
};

function catatKartu(card, ingat, durasi) {
    // catat untuk ringkasan akhir sesi (kata + arti + hasil + detik)
    try {
        sesiIni.push({
            kata: card && card.front ? card.front : "-",
            arti: card && card.back ? card.back : "",
            ingat: !!ingat,
            detik: Math.round(Number(durasi) || 0)
        });
    } catch (e) {}
    // dicatat ke server supaya masuk halaman Review Kosakata
    try {
        if (window.N3 && N3.catatKata && card && card.front) {
            N3.catatKata(card.front, currentActiveDay, ingat, durasi, 6);  // >6 detik = masuk review
        }
    } catch (e) { console.warn("gagal catat kartu:", e); }
}

function rateCard(action) {
    if (cardQueue.length === 0) return;

    const currentCard = cardQueue.shift();
    const durasi = (Date.now() - waktuKartu) / 1000;

    if (action === 'ingat' || action === 'easy') {
        // sudah ingat → selesai untuk sesi ini
        catatKartu(currentCard, true, durasi);
    } else if (action === 'belum' || action === 3) {
        // belum ingat → muncul lagi 3 kartu kemudian (maksimal 2 kali per sesi)
        const kali = (hitungBelum[currentCard.front] || 0) + 1;
        hitungBelum[currentCard.front] = kali;
        catatKartu(currentCard, false, durasi);
        if (kali <= 2) {
            const insertIndex = Math.min(3, cardQueue.length);
            cardQueue.splice(insertIndex, 0, currentCard);
        }
    } else if (typeof action === "number") {
        // kompatibilitas gaya lama (3 = susah, 7 = ragu) untuk halaman lain
        const insertIndex = Math.min(action, cardQueue.length);
        cardQueue.splice(insertIndex, 0, currentCard);
    }

    updateCard();
}

/* ===== POPUP BUNPOU =====
   Klik satu pola bunpou -> muncul penjelasan + rumus + contoh kalimatnya.
   Isi popup diambil dari kartu yang diklik sendiri, jadi tidak ada data baru. */
function bukaPopupBunpou(kartu) {
    const isi = kartu.cloneNode(true);
    const chip = isi.querySelector(".bunpou-days");
    if (chip) chip.remove();                       // buang label "Hari ..."
    let tutupLama = document.getElementById("popupBunpou");
    if (tutupLama) tutupLama.remove();
    const wadah = document.createElement("div");
    wadah.id = "popupBunpou";
    wadah.className = "popup-bunpou-latar";
    wadah.innerHTML =
        '<div class="popup-bunpou-kotak" role="dialog" aria-modal="true">' +
        '  <button class="popup-bunpou-x" aria-label="Tutup">✕</button>' +
        '  <div class="popup-bunpou-isi"></div>' +
        '  <button class="popup-bunpou-tutup">Tutup</button>' +
        '</div>';
    const rEl = isi.querySelector(".bunpou-rumus-text");
    if (rEl) rEl.textContent = rumusIndonesia(rEl.textContent);
    const pola = ((isi.querySelector(".bunpou-pattern") || {}).textContent || "").trim();
    const kotak = document.createElement("div");
    kotak.className = "popup-bunpou-note";
    kotak.innerHTML = '<div class="popup-bunpou-note-judul">Penjelasan</div><div class="popup-bunpou-note-isi">Memuat penjelasan…</div>';
    isi.appendChild(kotak);
    muatCatatanBunpou().then(function (peta) {
        const t = peta[pola] || kartu.dataset.penjelasan;
        kotak.querySelector(".popup-bunpou-note-isi").textContent =
            t || "Penjelasan detail untuk pola ini belum tersedia.";
    });
    wadah.querySelector(".popup-bunpou-isi").appendChild(isi);
    document.body.appendChild(wadah);
    document.body.style.overflow = "hidden";
    function tutup() { wadah.remove(); document.body.style.overflow = ""; }
    wadah.addEventListener("click", function (e) {
        if (e.target === wadah || e.target.classList.contains("popup-bunpou-x") || e.target.classList.contains("popup-bunpou-tutup")) tutup();
    });
    document.addEventListener("keydown", function esc(e) {
        if (e.key === "Escape") { tutup(); document.removeEventListener("keydown", esc); }
    });
}

function pasangPopupBunpou() {
    const list = document.getElementById("bunpouTabContent") || document.getElementById("bunpouList");
    if (!list || list.dataset.popupSiap) return;
    list.dataset.popupSiap = "1";
    list.addEventListener("click", function (e) {
        const kartu = e.target.closest(".bunpou-item");
        if (kartu) {
            const elemen = kartu.querySelector(".bunpou-pattern");
            catatBunpouDibuka(elemen ? elemen.textContent : "");
            bukaPopupBunpou(kartu);
        }
    });
}

