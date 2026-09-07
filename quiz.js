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

// User Stats (EXP & Level)
let userExp = parseInt(localStorage.getItem('user_exp')) || 0;
let userLevel = parseInt(localStorage.getItem('user_level')) || 1;

document.addEventListener("DOMContentLoaded", () => {
    updateUserStatsDisplay();
    
    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            allQuizData = data;
            populateQuizDayDropdown();
        })
        .catch(error => {
            console.error("Error loading data.json for quiz:", error);
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
        const actualCount = allQuizData.filter(i => i.day === dayNum).length;
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

    const dayData = allQuizData.filter(item => item.day === selectedDay);
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

function loadQuizQuestion() {
    if (currentQuestionIndex >= currentSessionQuestions.length) {
        triggerSessionBreak();
        return;
    }

    const currentQuestion = currentSessionQuestions[currentQuestionIndex];
    
    document.getElementById('quizQuestionText').textContent = currentQuestion.front;
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

    if (selectedAnswer === correctAnswer) {
        buttonElement.classList.add('correct');
        correctCount++;

        if (answerDuration <= 2) {
            addExp(10); 
        } else if (answerDuration <= 5) {
            addExp(5);  
        } else {
            addExp(2);  
        }
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
    window.location.href = 'index.html';
}

function finishQuizCompletion() {
    let completedDays = JSON.parse(localStorage.getItem('completed_quiz_days')) || [];
    if (!completedDays.includes(selectedDay)) {
        completedDays.push(selectedDay);
        localStorage.setItem('completed_quiz_days', JSON.stringify(completedDays));
    }

    localStorage.removeItem('saved_quiz_day');
    localStorage.removeItem('saved_session_idx');
    localStorage.removeItem('saved_day_sessions');
    localStorage.removeItem('saved_correct_count');
    
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
function addExp(amount) {
    userExp += amount;
    let nextLevelExp = userLevel * 100;

    if (userExp >= nextLevelExp) {
        userExp -= nextLevelExp;
        userLevel++;
        alert(`🎉 SELAMAT! Kamu naik ke Level ${userLevel}!`);
    }

    localStorage.setItem('user_exp', userExp);
    localStorage.setItem('user_level', userLevel);
    updateUserStatsDisplay();
}

function updateUserStatsDisplay() {
    const levelEl = document.getElementById('userLevel');
    const expEl = document.getElementById('userExp');
    const nextExpEl = document.getElementById('nextLevelExp');

    if (levelEl) levelEl.textContent = userLevel;
    if (expEl) expEl.textContent = userExp;
    if (nextExpEl) nextExpEl.textContent = userLevel * 100;
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}
