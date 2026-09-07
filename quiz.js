let allQuizData = [];
let daySessions = [];       
let currentSessionIdx = 0;  
let currentSessionQuestions = [];
let currentQuestionIndex = 0;
let correctCount = 0;
let questionStartTime = 0;
let selectedDay = null;

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
    
    // Ambil daftar hari yang sudah selesai total dan hari yang sedang berlangsung
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
        const count = allQuizData.filter(i => item => item.day === dayNum).length; // perbaikan filter count
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

    // Jika ada progress tersimpan yang belum selesai untuk hari ini
    if (savedDay && parseInt(savedDay) === selectedDay && savedDaySessions) {
        daySessions = savedDaySessions;
        currentSessionIdx = savedSessionIdx;
        correctCount = isNaN(savedCorrectCount) ? 0 : savedCorrectCount;
        
        alert(`Melanjutkan progress di Sesi ${currentSessionIdx + 1}!`);
    } else {
        // Mulai sesi baru (jika mau diulang dari awal)
        daySessions = [];
        let shuffledDayData = shuffleArray([...dayData]);
        const chunkSize = Math.ceil(shuffledDayData.length / 8);
        
        for (let i = 0; i < shuffledDayData.length; i += chunkSize) {
            daySessions.push(shuffledDayData.slice(i, i + chunkSize));
        }

        currentSessionIdx = 0;
        correctCount = 0;
        
        // Hapus data paused lama jika ada, tapi biarkan status completed tetap aman
        localStorage.removeItem('saved_quiz_day');
        localStorage.removeItem('saved_session_idx');
        localStorage.removeItem('saved_day_sessions');
        localStorage.removeItem('saved_correct_count');
    }

    document.getElementById('quizSelectionCard').style.display = 'none';
    document.getElementById('quizBreakScreen').style.display = 'none';
    document.getElementById('quizArea').style.display = 'block';
    document.getElementById('quizCompletionScreen').style.display = 'none';

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

    const wrongChoices = allQuizData
        .filter(item => item.back !== currentQuestion.back)
        .map(item => item.back);
    
    const shuffledWrong = shuffleArray(wrongChoices).slice(0, 3);
    const choices = shuffleArray([currentQuestion.back, ...shuffledWrong]);

    choices.forEach(choiceText => {
        const btn = document.createElement('button');
        btn.className = 'quiz-option-btn';
        btn.textContent = choiceText;
        btn.onclick = () => selectQuizAnswer(btn, choiceText, currentQuestion.back);
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

function triggerSessionBreak() {
    document.getElementById('quizArea').style.display = 'none';
    
    // Simpan progress sesi saat rehat
    localStorage.setItem('saved_quiz_day', selectedDay);
    localStorage.setItem('saved_session_idx', currentSessionIdx);
    localStorage.setItem('saved_day_sessions', JSON.stringify(daySessions));
    localStorage.setItem('saved_correct_count', correctCount);

    const breakTextEl = document.getElementById('breakText');
    if (currentSessionIdx < daySessions.length - 1) {
        breakTextEl.innerHTML = `☕ Sesi ${currentSessionIdx + 1} Selesai!<br>Progress aman tersimpan. Kamu bisa lanjut atau kembali ke beranda.`;
    } else {
        breakTextEl.innerHTML = `☕ Sesi terakhir selesai!<br>Siap-siap melihat hasil akhir kuis hari ini.`;
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
        loadCurrentSession();
    }
}

function goHomeFromBreak() {
    window.location.href = 'index.html';
}

function finishQuizCompletion() {
    // Tandai hari ini sebagai hari yang sudah selesai secara permanen
    let completedDays = JSON.parse(localStorage.getItem('completed_quiz_days')) || [];
    if (!completedDays.includes(selectedDay)) {
        completedDays.push(selectedDay);
        localStorage.setItem('completed_quiz_days', JSON.stringify(completedDays));
    }
    
    // Hapus temporary saved ongoing karena sudah selesai total
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
        Hari ke-${selectedDay} resmi ditandai **Selesai (✅)**!
    `;
}

function exitQuiz() {
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
