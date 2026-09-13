// --- SISTEM LOGIN LOKAL / PROFIL ---
let currentUser = localStorage.getItem('jlpt_current_user') || '';

// Fungsi untuk memastikan user sudah memasukkan nama saat pertama buka
function checkAndInitUser() {
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
        profileEl.textContent = `👤 ${currentUser}`;
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

fetch('data.json')
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

function renderCardBack(el, rawText) {
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
              + (jp ? '<div class="back-example-jp">' + escapeHtml(jp) + "</div>" : "")
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

    const dayItems = allData.filter(item => Number(item.day) === selectedDay);
    
    if (dayItems.length === 0) {
        previewContainer.innerHTML = '<p style="color: #64748b; font-size: 0.85rem; padding: 10px;">Tidak ada kosakata untuk hari ini.</p>';
        return;
    }

    dayItems.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'vocab-item';
        div.innerHTML = `
            <span class="vocab-number">${index + 1}.</span>
            <span class="vocab-front">${item.front}</span>
            <span class="vocab-back">${getCleanBack(item.back)}</span>
        `;
        previewContainer.appendChild(div);
    });
}

// --- TAB NAVIGATION LOGIC ---
// --- TAB BUNPOU: KUMPULAN TATA BAHASA (dibaca langsung dari data.json) ---
const BUNPOU_MARK = "【Contoh Kalimat】";

function isBunpouItem(item) {
    // entri tata bahasa di data.json selalu diawali tanda gelombang (〜 / ～)
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

function buildBunpouFilters() {
    const chips = document.getElementById("bunpouDayChips");
    if (!chips) return;
    const groups = bunpouGroups();
    const days = [];
    groups.forEach(function (g) { g.days.forEach(function (d) { if (days.indexOf(d) === -1) days.push(d); }); });
    days.sort(function (a, b) { return a - b; });

    let html = '<button class="bunpou-chip active" data-day="all">Semua <span class="chip-n">' + groups.length + "</span></button>";
    days.forEach(function (d) {
        const n = groups.filter(function (g) { return g.days.indexOf(d) !== -1; }).length;
        html += '<button class="bunpou-chip" data-day="' + d + '">Hari ' + d + ' <span class="chip-n">' + n + "</span></button>";
    });
    chips.innerHTML = html;

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
    if (bunpouFilterDay !== "all") {
        groups = groups.filter(function (g) { return g.days.indexOf(bunpouFilterDay) !== -1; });
    }

    const q = bunpouQuery.trim().toLowerCase();
    if (q) {
        groups = groups.filter(function (g) {
            return (g.pattern + " " + g.meaning + " " + g.jp + " " + g.id).toLowerCase().indexOf(q) !== -1;
        });
    }

    if (countEl) {
        countEl.textContent = groups.length + " rumus bunpou" +
            (bunpouFilterDay === "all" ? " · semua hari" : " · Hari " + bunpouFilterDay) +
            (q ? " · cari: " + bunpouQuery.trim() : "");
    }

    if (!groups.length) {
        list.innerHTML = '<div class="bunpou-empty">Tidak ada pola yang cocok 🙈<br>Coba kata kunci lain ya〜</div>';
        return;
    }

    let html = "";
    groups.forEach(function (g) {
        html += '<div class="bunpou-item">' +
            '<div class="bunpou-days">Hari ' + g.days.join(" · ") + "</div>" +
            '<div class="bunpou-pattern">' + escapeHtml(g.pattern) + "</div>" +
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

function initBunpouUI() {
    const searchEl = document.getElementById("bunpouSearch");
    if (searchEl && !searchEl.dataset.wired) {
        searchEl.dataset.wired = "1";
        searchEl.addEventListener("input", function (e) {
            bunpouQuery = e.target.value;
            renderBunpou();
        });
    }
    buildBunpouFilters();
    renderBunpou();
}

function switchTab(tabName) {
    // Cek apakah sesi belajar sedang aktif (learningArea terbuka)
    if (learningArea.style.display === 'block' && cardQueue.length > 0) {
        let konfirmasi = confirm("Mau kemana? Masih banyak kosakatanya nih, yakin mau ditinggal?");
        if (!konfirmasi) {
            return; // Batalkan perpindahan tab jika user pilih Batal
        }
        // Jika user tetap ingin keluar, matikan timer sesi
        stopTimer();
    }

    const tabs = {
        calendar: { content: document.getElementById('calendarTabContent'), btn: document.getElementById('btnTabCalendar') },
        study:    { content: document.getElementById('studyTabContent'),    btn: document.getElementById('btnTabStudy') },
        bunpou:   { content: document.getElementById('bunpouTabContent'),  btn: document.getElementById('btnTabBunpou') }
    };

    learningArea.style.display = 'none';
    completionScreen.style.display = 'none';

    Object.keys(tabs).forEach(function (key) {
        const t = tabs[key];
        if (!t.content || !t.btn) return;
        const aktif = (key === tabName);
        t.content.style.display = aktif ? 'block' : 'none';
        t.btn.classList.toggle('active', aktif);
    });

    if (tabName === 'calendar') {
        renderCalendar();
        updateStatsBar();
    } else if (tabName === 'study') {
        document.getElementById('studySelectionCard').style.display = 'block';
        document.getElementById('studySessionMenu').style.display = 'none';
        populateDirectStudyDropdown();
    } else if (tabName === 'bunpou') {
        initBunpouUI();
    }
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

function renderCalendar() {
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
        
        if (dayNum <= maxUnlocked) {
            opt.textContent = `Hari ke-${dayNum} (${allData.filter(i => i.day === dayNum).length} Kosakata)`;
        } else {
            opt.textContent = `🔒 Hari ke-${dayNum} (Terkunci - Buka besok jam 05:00)`;
            opt.disabled = true;
        }
        selectElement.appendChild(opt);
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
    document.getElementById('studySessionMenuTitle').textContent = `📚 Sesi Belajar Hari ke-${currentActiveDay}`;

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
            <span class="vocab-front">${item.front}</span>
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

    document.getElementById('studySessionMenu').style.display = 'none';
    learningArea.style.display = 'block';
    completionScreen.style.display = 'none';

    startTimer();
    updateCard();
}

function backToStudySessionsMenu() {
    // Tambahkan konfirmasi jika user klik tombol kembali saat sesi flashcard masih berjalan
    if (cardQueue.length > 0) {
        let konfirmasi = confirm("Mau kemana? Masih banyak kosakatanya nih, yakin mau ditinggal?");
        if (!konfirmasi) {
            return; // Batal kembali jika user pilih Batal
        }
    }

    stopTimer();
    learningArea.style.display = 'none';
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
}

function updateCard() {
    if (cardQueue.length === 0) {
        stopTimer();
        addStudyTimeToToday(secondsElapsed);
        setSessionCompleted(currentActiveDay, currentSession);

        learningArea.style.display = 'none';
        completionScreen.style.display = "block";
        
        resultText.innerHTML = `Hebat! Sesi <b>${currentSession.toUpperCase()}</b> selesai dalam <b>${formatTime(secondsElapsed)}</b>.<br>Waktu belajar telah dicatat ke kalender hari ini 🎉`;
        return;
    }

    cardFront.textContent = cardQueue[0].front;
    renderCardBack(cardBack, cardQueue[0].back);
    counter.textContent = `Sisa: ${cardQueue.length} kartu`;
    
    flashcard.classList.remove("flipped");
}

flashcard.addEventListener("click", () => {
    if (cardQueue.length > 0) {
        flashcard.classList.toggle("flipped");
    }
});

function rateCard(action) {
    if (cardQueue.length === 0) return;

    const currentCard = cardQueue.shift();

    if (action === 'easy') {
        // Kartu langsung selesai
    } else {
        let insertIndex = Math.min(action, cardQueue.length);
        cardQueue.splice(insertIndex, 0, currentCard);
    }

    updateCard();
}
