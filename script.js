const timeEl = document.getElementById('time');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const goalInput = document.getElementById('goalInput');
const setGoalBtn = document.getElementById('setGoalBtn');
const progressBar = document.getElementById('progressBar');
const bestEl = document.getElementById('best');
const confettiRoot = document.getElementById('confetti-root');

let running = false;
let startTs = 0;
let elapsedBefore = 0; // ms
let rafId = null;
let goalMinutes = Math.max(1, parseInt(goalInput.value || '25', 10));

const STORAGE_KEY_BEST = 'chrono_best_ms';

function formatMs(ms){
  const s = Math.floor(ms/1000);
  const hh = Math.floor(s/3600);
  const mm = Math.floor((s%3600)/60);
  const ss = s%60;
  return [hh,mm,ss].map(n=>String(n).padStart(2,'0')).join(':');
}

function loadBest(){
  const v = localStorage.getItem(STORAGE_KEY_BEST);
  if (v) bestEl.textContent = formatMs(Number(v));
}

function saveBest(ms){
  localStorage.setItem(STORAGE_KEY_BEST, String(ms));
  bestEl.textContent = formatMs(ms);
}

function updateUI(){
  const now = Date.now();
  const elapsed = (running ? (now - startTs + elapsedBefore) : elapsedBefore);
  timeEl.textContent = formatMs(elapsed);

  const goalMs = goalMinutes * 60 * 1000;
  const pct = Math.min(100, (elapsed / goalMs) * 100);
  progressBar.style.width = pct + '%';

  // check reaching goal
  if (running && elapsed >= goalMs) {
    running = false; // auto-pause
    pauseTimerInternal();
    playBeep();
    spawnConfetti(40);
    checkBestAndSave(elapsed);
  }

  rafId = running ? requestAnimationFrame(updateUI) : null;
}

function startTimer(){
  if (running) return;
  startTs = Date.now();
  running = true;
  startBtn.disabled = true;
  pauseBtn.disabled = false;
  rafId = requestAnimationFrame(updateUI);
}

function pauseTimerInternal(){
  // internal pause without UI toggles
  elapsedBefore = (Date.now() - startTs) + elapsedBefore;
  running = false;
  startBtn.disabled = false;
  pauseBtn.disabled = true;
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
}

function pauseTimer(){
  if (!running) return;
  pauseTimerInternal();
  checkBestAndSave(elapsedBefore);
}

function resetTimer(){
  running = false;
  startTs = 0;
  elapsedBefore = 0;
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  timeEl.textContent = "00:00:00";
  progressBar.style.width = '0%';
  startBtn.disabled = false;
  pauseBtn.disabled = true;
}

function checkBestAndSave(ms){
  const prev = Number(localStorage.getItem(STORAGE_KEY_BEST) || 0);
  if (ms > prev) {
    saveBest(ms);
    playBeep();
    spawnConfetti(40);
  }
}

function playBeep(){
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = 880;
    o.connect(g); g.connect(ctx.destination);
    g.gain.value = 0.0001;
    const t = ctx.currentTime;
    g.gain.linearRampToValueAtTime(0.08, t+0.01);
    o.start(t);
    g.gain.exponentialRampToValueAtTime(0.0001, t+0.35);
    o.stop(t+0.36);
  } catch(e){}
}

function spawnConfetti(n){
  const colors = ['#ff5656','#ffd166','#06b6d4','#7c3aed','#60a5fa'];
  for (let i=0;i<n;i++){
    const el = document.createElement('div');
    el.className = 'confetti';
    el.style.left = (Math.random()*100) + 'vw';
    el.style.top = (-10 - Math.random()*20) + 'vh';
    el.style.background = colors[Math.floor(Math.random()*colors.length)];
    el.style.width = (6 + Math.random()*12) + 'px';
    el.style.height = (8 + Math.random()*16) + 'px';
    el.style.borderRadius = Math.random()>0.6 ? '3px' : '50%';
    el.style.transform = `rotate(${Math.random()*360}deg)`;
    el.style.animationDuration = (2 + Math.random()*3) + 's';
    confettiRoot.appendChild(el);
    setTimeout(()=> el.remove(), 5000);
  }
}

/* events */
startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);
resetBtn.addEventListener('click', resetTimer);
setGoalBtn.addEventListener('click', ()=>{
  goalMinutes = Math.max(1, parseInt(goalInput.value || '25',10));
});

document.addEventListener('keydown', (e)=>{
  if (e.code === 'Space') { e.preventDefault(); running ? pauseTimer() : startTimer(); }
  if (e.key.toLowerCase() === 'r') resetTimer();
});

/* init */
loadBest();
updateUI();