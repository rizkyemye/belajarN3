let allQuizData = [];
let daySessions = [];       
let currentSessionIdx =  0;  
let currentSessionQuestions = [];
let currentQuestionIndex = 0;
let correctCount = 0;
let questionStartTime = 0;
let selectedDay = null;

// Timer Quiz Per Sesi
let quizSecondsElapsed = 0;
let quizTimerInterval = null;


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


document.addEventListener("DOMContentLoaded", () => {
    muatXp();  // EXP diambil dari Dashboard (satu sumber)
    
    fetch((window.N3BerkasData ? N3BerkasData() : '../aset/data.json?v=10'))
        .then(response => response.json())
        .then(data => {
            allQuizData = data;
            populateQuizDayDropdown();
        })
        .catch(error => {
            console.error("Error loading ../aset/data.json for quiz:", error);
        });
});

// --- FUNGSI PEMBERSIH TEKS CONTOH KALIMAT ---
function getCleanBack(rawText) {
    if (!rawText) return "";
    return rawText.includes("【Contoh Kalimat】") 
        ? rawText.split("【Contoh Kalimat】")[0].trim() 
        : rawText.trim();
}

// --- SISTEM UNLOCK HARIAN (MULAI TANGGAL 5) ---
function getMaxUnlockedDay() {
    const now = new Date();
    const dateNum = now.getDate();
    if (dateNum < 5) return 1;
    return dateNum - 4;
}

function populateQuizDayDropdown() {
    const selectElement = document.getElementById('quizDaySelect');
    if (!selectElement) return;
    selectElement.innerHTML = '';
    
    const maxUnlocked = getMaxUnlockedDay();
    const days = [...new Set(allQuizData.map(item => item.day))].sort((a, b) => a - b);
    
    const completedDays = JSON.parse(localStorage.getItem('completed_quiz_days')) || [];
    const savedDay = localStorage.getItem('saved_quiz_day');
    const savedSessionIdx = parseInt(localStorage.getItem('saved_session_idx')) || 0;
    
    if (days.length === 0) {
        const opt = document.createElement('option');
        opt.textContent = "Tidak ada data hari tersedia";
        selectElement.appendChild(opt);
        return;
    }

    days.forEach(dayNum => {
        const actualCount = allQuizData.filter(i => i.day === dayNum && i.jenis !== 'bunpou').length;
        const opt = document.createElement('option');
        opt.value = dayNum;
        
        if (dayNum > getMaxUnlockedDay()) {
            opt.textContent = `🔒 Hari ke-${dayNum} (Terkunci)`;
            opt.disabled = true;
        } else if (completedDays.includes(dayNum)) {
            opt.textContent = `✅ Hari ke-${dayNum} (${actualCount} Kosakata) - Selesai`;
        } else if (savedDay && parseInt(savedDay) === dayNum) {
            opt.textContent = `⏳ Hari ke-${dayNum} (${actualCount} Kosakata) - Sesi ${savedSessionIdx + 1}/8 (Berlangsung)`;
        } else {
            opt.textContent = `Hari ke-${dayNum} (${actualCount} Kosakata)`;
        }
        
        selectElement.appendChild(opt);
    });
}

// --- TIMER KONTROL ---
function startQuizTimer() {
    quizSecondsElapsed = 0;
    if (quizTimerInterval) clearInterval(quizTimerInterval);
    quizTimerInterval = setInterval(() => {
        quizSecondsElapsed++;
    }, 1000);
}

function stopQuizTimer() {
    if (quizTimerInterval) {
        clearInterval(quizTimerInterval);
        quizTimerInterval = null;
    }
}

function startQuiz() {
    const selectElement = document.getElementById('quizDaySelect');
    const selectedOption = selectElement.options[selectElement.selectedIndex];
    selectedDay = parseInt(selectElement.value);
    
    if (selectedOption.disabled || selectedDay > getMaxUnlockedDay()) {
        alert("🔒 Quiz untuk hari ini masih terkunci!");
        return;
    }

    const dayData = allQuizData.filter(item => item.day === selectedDay && item.jenis !== 'bunpou');
    if (dayData.length === 0) {
        alert("Kosakata untuk hari ini tidak ditemukan!");
        return;
    }

    const savedDay = localStorage.getItem('saved_quiz_day');
    const savedSessionIdx = parseInt(localStorage.getItem('saved_session_idx'));
    const savedDaySessions = JSON.parse(localStorage.getItem('saved_day_sessions'));
    const savedCorrectCount = parseInt(localStorage.getItem('saved_correct_count'));

    if (savedDay && parseInt(savedDay) === selectedDay && savedDaySessions) {
        daySessions = savedDaySessions;
        currentSessionIdx = savedSessionIdx;
        correctCount = isNaN(savedCorrectCount) ? 0 : savedCorrectCount;
        
        alert(`Melanjutkan progress di Sesi ${currentSessionIdx + 1}!`);
    } else {
        daySessions = [];
        let shuffledDayData = shuffleArray([...dayData]);
        const chunkSize = Math.ceil(shuffledDayData.length / 8);
        
        for (let i = 0; i < shuffledDayData.length; i += chunkSize) {
            daySessions.push(shuffledDayData.slice(i, i + chunkSize));
        }

        currentSessionIdx = 0;
        correctCount = 0;
        
        localStorage.removeItem('saved_quiz_day');
        localStorage.removeItem('saved_session_idx');
        localStorage.removeItem('saved_day_sessions');
        localStorage.removeItem('saved_correct_count');
    }

    document.getElementById('quizSelectionCard').style.display = 'none';
    document.getElementById('quizBreakScreen').style.display = 'none';
    document.getElementById('quizArea').style.display = 'block';
    document.getElementById('quizCompletionScreen').style.display = 'none';

    startQuizTimer();
    loadCurrentSession();
}

function loadCurrentSession() {
    if (currentSessionIdx >= daySessions.length) {
        finishQuizCompletion();
        return;
    }
    currentSessionQuestions = shuffleArray([...daySessions[currentSessionIdx]]);
    currentQuestionIndex = 0;
    loadQuizQuestion();
}

/* ===== MODE DENGAR (聴解) =====
   Soal tidak ditulis, tapi DIBACAKAN pakai suara Jepang bawaan HP.
   ponytail: pakai speechSynthesis bawaan browser (gratis, tanpa berkas audio).
   Kualitas suara beda-beda per HP — kalau nanti kurang jelas, ganti ke audio
   yang dibuat sekali di server lalu disimpan sebagai berkas mp3. */
let modeDengar = false;

function bacakan(teks) {
    try {
        if (!window.speechSynthesis) return;
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(String(teks));
        u.lang = "ja-JP";
        u.rate = 0.95;
        const v = speechSynthesis.getVoices().filter(function (x) { return x.lang === "ja-JP"; })[0];
        if (v) u.voice = v;
        speechSynthesis.speak(u);
    } catch (e) { console.warn("gagal membacakan:", e); }
}

(function pasangTombolDengar() {
    if (!window.speechSynthesis) return;          // HP lama tanpa suara: tombol tidak usah muncul
    const kartu = document.getElementById("quizSelectionCard");
    if (!kartu) return;
    const b = document.createElement("button");
    b.type = "button"; b.id = "tombolDengar";
    b.style.cssText = "margin:12px auto 0;display:block;padding:12px 18px;border-radius:12px;"
        + "border:2px solid #4f46e5;background:#fff;color:#4f46e5;font-weight:700;cursor:pointer;font-size:0.95rem";
    function gambar() {
        b.textContent = modeDengar ? "🔊 Mode dengar: HIDUP — soal dibacakan" : "🔇 Mode dengar: mati — soal ditulis";
        b.style.background = modeDengar ? "#4f46e5" : "#fff";
        b.style.color = modeDengar ? "#fff" : "#4f46e5";
    }
    b.onclick = function () {
        modeDengar = !modeDengar;
        try { localStorage.setItem("n3_mode_dengar", modeDengar ? "1" : "0"); } catch (e) {}
        gambar();
        if (modeDengar) bacakan("もんだいを きいて ください");
    };
    try { if (localStorage.getItem("n3_mode_dengar") === "1") modeDengar = true; } catch (e) {}
    gambar();
    kartu.appendChild(b);
})();

function loadQuizQuestion() {
    if (currentQuestionIndex >= currentSessionQuestions.length) {
        triggerSessionBreak();
        return;
    }

    const currentQuestion = currentSessionQuestions[currentQuestionIndex];
    
    document.getElementById('quizQuestionText').textContent = (typeof tampilKata === "function") ? tampilKata(currentQuestion) : currentQuestion.front;
    const qt = document.getElementById('quizQuestionText');
    if (modeDengar) {
        qt.textContent = "🔊";
        qt.style.fontSize = "2.4rem";
        qt.style.cursor = "pointer";
        qt.title = "Mode dengar — tekan untuk memutar lagi";
        qt.onclick = function () { bacakan(currentQuestion.front); };
        bacakan(currentQuestion.front);
    } else {
        qt.style.fontSize = ""; qt.style.cursor = ""; qt.title = ""; qt.onclick = null;
    }
    document.getElementById('quizCounter').textContent = `Sesi ${currentSessionIdx + 1}/${daySessions.length} | Soal: ${currentQuestionIndex + 1}/${currentSessionQuestions.length}`;
    document.getElementById('quizScore').textContent = `Benar: ${correctCount}`;

    questionStartTime = Date.now();

    const optionsContainer = document.getElementById('quizOptions');
    optionsContainer.innerHTML = '';

    const cleanCorrectAnswer = getCleanBack(currentQuestion.back);

    const wrongChoices = allQuizData
        .filter(item => item.back !== currentQuestion.back)
        .map(item => getCleanBack(item.back));
    
    const uniqueWrongChoices = [...new Set(wrongChoices)];
    const shuffledWrong = shuffleArray(uniqueWrongChoices).slice(0, 3);
    const choices = shuffleArray([cleanCorrectAnswer, ...shuffledWrong]);

    choices.forEach(choiceText => {
        const btn = document.createElement('button');
        btn.className = 'quiz-option-btn';
        btn.textContent = choiceText;
        btn.onclick = () => selectQuizAnswer(btn, choiceText, cleanCorrectAnswer);
        optionsContainer.appendChild(btn);
    });
}

function selectQuizAnswer(buttonElement, selectedAnswer, correctAnswer) {
    const allButtons = document.querySelectorAll('.quiz-option-btn');
    allButtons.forEach(btn => btn.disabled = true);

    const answerDuration = (Date.now() - questionStartTime) / 1000;
    const benarJawaban = (selectedAnswer === correctAnswer);

    // === Untuk fitur Review Kosakata ===
    // Kata dicatat sebagai "perlu diulang" kalau dijawab SALAH (Again) atau LAMA (> 20 detik, Hard).
    try {
        const soalKata = (currentSessionQuestions && currentSessionQuestions[currentQuestionIndex]) || null;
        if (window.N3 && N3.catatKata && soalKata) {
            N3.catatKata(soalKata.front, selectedDay, benarJawaban, answerDuration, 20);
            catatKuisSesi(soalKata, benarJawaban, answerDuration); // >20 detik (Hard) atau salah (Again) = masuk Review Kosakata
        }
    } catch (e) { console.warn("gagal catat kata:", e); }

    if (modeDengar) {                       // tampilkan kata aslinya setelah dijawab
        const soalKini = currentSessionQuestions[currentQuestionIndex];
        const qt2 = document.getElementById('quizQuestionText');
        if (soalKini && qt2) { qt2.textContent = (typeof tampilKata === "function") ? tampilKata(soalKini) : soalKini.front; qt2.style.fontSize = ""; qt2.onclick = function () { bacakan(soalKini.front); }; }
    }

    if (selectedAnswer === correctAnswer) {
        buttonElement.classList.add('correct');
        correctCount++;

        tambahXp(1); // 1 jawaban benar = +1 XP (rumus dashboard)
    } else {
        buttonElement.classList.add('wrong');
        allButtons.forEach(btn => {
            if (btn.textContent === correctAnswer) {
                btn.classList.add('correct');
            }
        });
    }

    setTimeout(() => {
        currentQuestionIndex++;
        loadQuizQuestion();
    }, 1200);
}

// --- FUNGSI SINKRONISASI WAKTU KE KALENDAR UTAMA ---
function getFormattedDateKey(year, month, day, user) {
    const mStr = String(month + 1).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    return `study_time_${user}_${year}-${mStr}-${dStr}`;
}

function triggerSessionBreak() {
    document.getElementById('quizArea').style.display = 'none';
    
    // Matikan timer dan langsung simpan waktu sesi ini ke kalender
    stopQuizTimer();
    
    if (quizSecondsElapsed > 0) {
        const currentUser = localStorage.getItem('jlpt_current_user') || 'DefaultUser';
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth();
        const day = today.getDate();
        
        const calendarKey = getFormattedDateKey(year, month, day, currentUser);
        const currentSec = parseInt(localStorage.getItem(calendarKey)) || 0;
        
        localStorage.setItem(calendarKey, currentSec + quizSecondsElapsed);

        // kirim juga ke server (biar jam belajar kuis muncul di Dashboard)
        try {
            if (window.N3 && N3.kirimDetik) N3.kirimDetik(selectedDay, 'kuis', quizSecondsElapsed);
        } catch (e) { console.warn("gagal kirim waktu kuis:", e); }
    }

    let nextSessionIdx = currentSessionIdx + 1;

    localStorage.setItem('saved_quiz_day', selectedDay);
    localStorage.setItem('saved_session_idx', nextSessionIdx);
    localStorage.setItem('saved_day_sessions', JSON.stringify(daySessions));
    localStorage.setItem('saved_correct_count', correctCount);

    const breakTextEl = document.getElementById('breakText');
    if (currentSessionIdx < daySessions.length - 1) {
        breakTextEl.innerHTML = `☕ Sesi ${currentSessionIdx + 1} Selesai!<br>Waktu sesi ini telah masuk ke kalender. Istirahat sejenak sebelum lanjut.`;
    } else {
        breakTextEl.innerHTML = `☕ Sesi terakhir selesai!<br>Semua waktu quiz sesi ini telah tercatat di kalender.`;
    }
    
    document.getElementById('quizBreakScreen').style.display = 'block';
}

function resumeQuizAfterBreak() {
    document.getElementById('quizBreakScreen').style.display = 'none';
    currentSessionIdx++;
    
    localStorage.setItem('saved_session_idx', currentSessionIdx);
    
    if (currentSessionIdx >= daySessions.length) {
        finishQuizCompletion();
    } else {
        document.getElementById('quizArea').style.display = 'block';
        startQuizTimer(); // Lanjut hitung timer sesi berikutnya
        loadCurrentSession();
    }
}

function goHomeFromBreak() {
    window.location.href = '../';
}

function finishQuizCompletion() {
    tampilkanRingkasanKuis();
    // XP: kirim nilai ke server (menambah "hari selesai" + "jawaban benar" di dashboard)
    try {
        const totalHari = allQuizData.filter(function (i) { return i.day === selectedDay && i.jenis !== 'bunpou'; }).length;
        if (window.N3 && N3.kirimNilai) N3.kirimNilai(selectedDay, correctCount, totalHari);
    } catch (e) { console.warn("gagal kirim nilai kuis:", e); }
    setTimeout(function () { muatXp(); }, 2500);
    let completedDays = JSON.parse(localStorage.getItem('completed_quiz_days')) || [];
    if (!completedDays.includes(selectedDay)) {
        completedDays.push(selectedDay);
        localStorage.setItem('completed_quiz_days', JSON.stringify(completedDays));
    }

    localStorage.removeItem('saved_quiz_day');
    localStorage.removeItem('saved_session_idx');
    localStorage.removeItem('saved_day_sessions');
    localStorage.removeItem('saved_correct_count');

    // === Hari ini dianggap "selesai" (dipakai halaman Review Kosakata) ===
    try {
        const totalSoalSemua = daySessions.reduce((acc, s) => acc + s.length, 0);
        if (window.N3 && N3.tandaiHariKuis) N3.tandaiHariKuis(selectedDay, correctCount, totalSoalSemua);
    } catch (e) { console.warn("gagal tandai hari kuis:", e); }
    
    document.getElementById('quizArea').style.display = 'none';
    document.getElementById('quizBreakScreen').style.display = 'none';
    document.getElementById('quizCompletionScreen').style.display = 'block';
    
    const totalQuestions = daySessions.reduce((acc, session) => acc + session.length, 0);
    document.getElementById('quizResultText').innerHTML = `
        🎉 Kuis Selesai!<br>
        Jawaban Benar: <b>${correctCount} / ${totalQuestions}</b><br>
        Seluruh waktu dari tiap sesi kuis telah terakumulasi di kalender! ⏱️
    `;
}

let pendingExitCallback = null;

function showExitModal(onConfirmCallback) {
    const modal = document.getElementById('customExitModal');
    if (!modal) {
        // Fallback jika elemen modal belum ada
        if (confirm("Mau kemana? Masih ada soal kuis nih, yakin mau ditinggal?")) {
            onConfirmCallback();
        }
        return;
    }
    
    pendingExitCallback = onConfirmCallback;
    modal.style.display = 'flex';
}

// Event listener untuk tombol di dalam modal popup
document.addEventListener("DOMContentLoaded", () => {
    // Pastikan elemen tombol modal terhubung setelah halaman dimuat
    const cancelBtn = document.getElementById('cancelExitBtn');
    const confirmBtn = document.getElementById('confirmExitBtn');
    const modal = document.getElementById('customExitModal');

    if (cancelBtn && confirmBtn && modal) {
        cancelBtn.onclick = () => {
            modal.style.display = 'none';
            pendingExitCallback = null;
        };

        confirmBtn.onclick = () => {
            modal.style.display = 'none';
            if (pendingExitCallback) {
                pendingExitCallback();
                pendingExitCallback = null;
            }
        };
    }
});

function exitQuiz() {
    // Cek apakah area kuis sedang aktif/terlihat
    const quizArea = document.getElementById('quizArea');
    const isQuizActive = quizArea && quizArea.style.display === 'block';

    if (isQuizActive) {
        showExitModal(() => {
            executeExitQuiz();
        });
    } else {
        executeExitQuiz();
    }
}

function executeExitQuiz() {
    stopQuizTimer();
    document.getElementById('quizArea').style.display = 'none';
    document.getElementById('quizBreakScreen').style.display = 'none';
    document.getElementById('quizSelectionCard').style.display = 'block';
    populateQuizDayDropdown();
}
function executeExitQuiz() {
    stopQuizTimer();
    document.getElementById('quizArea').style.display = 'none';
    document.getElementById('quizBreakScreen').style.display = 'none';
    document.getElementById('quizSelectionCard').style.display = 'block';
    populateQuizDayDropdown();
}

function backToQuizSelection() {
    document.getElementById('quizCompletionScreen').style.display = 'none';
    document.getElementById('quizSelectionCard').style.display = 'block';
    populateQuizDayDropdown();
}

// --- EXP & LEVEL SYSTEM ---
/* EXP kini diambil dari Dashboard (lihat muatXp/tambahXp di atas).
   Fungsi addExp & updateUserStatsDisplay lama dihapus supaya tidak dobel sumber. */

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}


/* ===== RINGKASAN SESI KUIS (dipindah dari tab Belajar) =====
   Tiap soal dinilai otomatis: salah = Again · benar >20 dtk = Hard ·
   benar 8-20 dtk = Good · benar <8 dtk = Easy. */
let sesiKuis = [];

function nilaiKuis(ingat, detik) {
    const d = Number(detik) || 0;
    if (!ingat) return { kode: "again", label: "Again", warna: "#b91c1c", bg: "rgba(185,28,28,.12)" };
    if (d > 20) return { kode: "hard", label: "Hard", warna: "#b45309", bg: "rgba(180,83,9,.12)" };
    if (d >= 8) return { kode: "good", label: "Good", warna: "#0369a1", bg: "rgba(3,105,161,.12)" };
    return { kode: "easy", label: "Easy", warna: "#047857", bg: "rgba(4,120,87,.12)" };
}

function catatKuisSesi(soal, benar, detik) {
    if (!soal) return;
    const n = nilaiKuis(benar, detik);
    sesiKuis.push({ kata: soal.front || "-", arti: soal.back || "", nilai: n.label, warna: n.warna, bg: n.bg, detik: Math.round(Number(detik) || 0) });
}

function ringkasanKuisHTML() {
    if (!sesiKuis.length) return "";
    const rata = Math.round(sesiKuis.reduce((s, x) => s + x.detik, 0) / sesiKuis.length);
    const urut = { Again: 0, Hard: 1, Good: 2, Easy: 3 };
    const daftar = sesiKuis.slice().sort((a, b) => (urut[a.nilai] - urut[b.nilai]) || (b.detik - a.detik));
    let html = '<div style="margin-top:18px;text-align:left;">' +
        '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap;">' +
        '<b style="font-size:1.05rem;">Ringkasan sesi</b>' +
        '<span style="color:#64748b;font-size:.82rem;">' + sesiKuis.length + ' soal · ' + rata + ' detik rata-rata</span></div>' +
        '<div style="color:#64748b;font-size:.78rem;margin:2px 0 10px;">Nilai ini ditentukan sistem dari hasil &amp; kecepatanmu</div>';
    daftar.forEach(function (x) {
        html += '<div style="display:flex;align-items:center;gap:10px;padding:9px 10px;margin-bottom:6px;border:1px solid #e2e8f0;border-radius:10px;background:#fff;">' +
            '<div style="flex:1;min-width:0;">' +
            '<b style="font-size:.98rem;">' + x.kata + '</b> <span style="color:#64748b;font-size:.85rem;">' + x.arti + '</span></div>' +
            '<span style="flex:0 0 auto;font-size:.78rem;font-weight:700;color:' + x.warna + ';background:' + x.bg + ';padding:4px 10px;border-radius:999px;">' + x.nilai + ' ' + x.detik + 's</span></div>';
    });
    html += '<div style="color:#64748b;font-size:.78rem;margin-top:6px;">Yang <b>Again</b> (salah) &amp; <b>Hard</b> (&gt;20 detik) otomatis masuk <b>Review Kosakata</b></div></div>';
    return html;
}

function tampilkanRingkasanKuis() {
    try {
        const layar = document.getElementById("quizCompletionScreen");
        if (!layar) return;
        let wadah = document.getElementById("ringkasanKuisSesi");
        if (!wadah) { wadah = document.createElement("div"); wadah.id = "ringkasanKuisSesi"; layar.appendChild(wadah); }
        wadah.innerHTML = ringkasanKuisHTML();
        sesiKuis = [];
    } catch (e) { console.warn("ringkasan kuis gagal:", e); }
}
