const CHOICES = ["rock", "paper", "scissors"];
const BEATS = { rock: "scissors", paper: "rock", scissors: "paper" };

const RECORD_KEY = "rps-record-v1";
const STREAK_KEY = "rps-streak-v1";
const HISTORY_KEY = "rps-history-v1";
const HISTORY_LIMIT = 50;
const RANK_KEY = "rps-rank-v1";
const MATCH_TYPE_KEY = "rps-matchtype-v1";
const RANK_POINTS = { win: 15, draw: 2, loss: -10 };

const RANK_TIERS = [
  { min: 2200, name: "Master" },
  { min: 1800, name: "Diamond" },
  { min: 1500, name: "Platinum" },
  { min: 1200, name: "Gold" },
  { min: 900, name: "Silver" },
  { min: -Infinity, name: "Bronze" },
];

const statusEl = document.getElementById("status");
const rankEl = document.getElementById("rankDisplay");
const matchTypeChoiceEl = document.getElementById("matchTypeChoice");
const matchTypeButtons = Array.from(document.querySelectorAll(".matchtype-btn"));
const choicesEl = document.getElementById("choices");
const choiceButtons = Array.from(document.querySelectorAll(".choice-btn"));
const revealEl = document.getElementById("reveal");
const playerChoiceEl = document.getElementById("playerChoice");
const aiChoiceEl = document.getElementById("aiChoice");
const resultEl = document.getElementById("result");
const playAgainBtn = document.getElementById("playAgain");
const score1El = document.getElementById("score1");
const score2El = document.getElementById("score2");
const scoreDrawsEl = document.getElementById("scoreDraws");
const scoreRowEl = document.getElementById("scoreRow");

const tabButtons = Array.from(document.querySelectorAll(".tab-btn"));
const playViewEl = document.getElementById("playView");
const statsViewEl = document.getElementById("statsView");
const historyViewEl = document.getElementById("historyView");
const rankedViewEl = document.getElementById("rankedView");
const themesViewEl = document.getElementById("themesView");
const historyListEl = document.getElementById("historyList");
const historyDetailEl = document.getElementById("historyDetail");
const historyDetailContentEl = document.getElementById("historyDetailContent");
const historyRevealEl = document.getElementById("historyReveal");
const backToHistoryBtn = document.getElementById("backToHistory");
const statCurrentStreakEl = document.getElementById("statCurrentStreak");
const statBestStreakEl = document.getElementById("statBestStreak");
const statTotalGamesEl = document.getElementById("statTotalGames");
const statTotalRecordEl = document.getElementById("statTotalRecord");
const statWinRateEl = document.getElementById("statWinRate");
const statLast10El = document.getElementById("statLast10");
const statLast10LabelEl = document.getElementById("statLast10Label");
const rankedPointsEl = document.getElementById("rankedPoints");
const rankedTierEl = document.getElementById("rankedTier");
const rankChartEl = document.getElementById("rankChart");
const tierLadderEl = document.getElementById("tierLadder");
const themeButtons = Array.from(document.querySelectorAll(".theme-btn"));

let record = loadRecord();
let streak = loadStreak();
let history = loadHistory();
let rank = loadRank();
let matchType = loadMatchType();
let activeTab = "play";

// --- Persistence ---

function loadRecord() {
  const defaults = { wins: 0, losses: 0, draws: 0 };
  try {
    const saved = JSON.parse(localStorage.getItem(RECORD_KEY));
    return { ...defaults, ...saved };
  } catch {
    return defaults;
  }
}

function saveRecord() {
  localStorage.setItem(RECORD_KEY, JSON.stringify(record));
}

function loadStreak() {
  const defaults = { current: 0, best: 0 };
  try {
    const saved = JSON.parse(localStorage.getItem(STREAK_KEY));
    return { ...defaults, ...saved };
  } catch {
    return defaults;
  }
}

function saveStreak() {
  localStorage.setItem(STREAK_KEY, JSON.stringify(streak));
}

function bumpStreak(won) {
  if (won) {
    streak.current++;
    if (streak.current > streak.best) streak.best = streak.current;
  } else {
    streak.current = 0;
  }
  saveStreak();
}

function loadHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem(HISTORY_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveHistory() {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function recordHistory(entry) {
  history.unshift(entry);
  if (history.length > HISTORY_LIMIT) history.length = HISTORY_LIMIT;
  saveHistory();
}

function loadRank() {
  const raw = localStorage.getItem(RANK_KEY);
  if (raw === null) return 1000;
  const saved = Number(raw);
  return Number.isFinite(saved) ? saved : 1000;
}

function saveRank() {
  localStorage.setItem(RANK_KEY, String(rank));
}

function getTier(rating) {
  return RANK_TIERS.find((tier) => rating >= tier.min).name;
}

function applyRankDelta(delta) {
  rank = Math.max(0, rank + delta);
  saveRank();
  updateRankDisplay();
}

function updateRankDisplay() {
  const tier = getTier(rank);
  rankEl.textContent = `${tier} · ${rank}`;
  RANK_TIERS.forEach((t) => rankEl.classList.remove(`rank-${t.name.toLowerCase()}`));
  rankEl.classList.add(`rank-${tier.toLowerCase()}`);
}

function loadMatchType() {
  return localStorage.getItem(MATCH_TYPE_KEY) || "casual";
}

function saveMatchType() {
  localStorage.setItem(MATCH_TYPE_KEY, matchType);
}

function formatDelta(n) {
  return n >= 0 ? `+${n}` : `${n}`;
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// --- Game logic ---

function getAiChoice() {
  return CHOICES[Math.floor(Math.random() * CHOICES.length)];
}

function getOutcome(player, ai) {
  if (player === ai) return "draw";
  return BEATS[player] === ai ? "win" : "loss";
}

function playRound(playerChoice) {
  const aiChoice = getAiChoice();
  const outcome = getOutcome(playerChoice, aiChoice);

  playerChoiceEl.textContent = capitalize(playerChoice);
  aiChoiceEl.textContent = capitalize(aiChoice);

  choicesEl.classList.add("hidden");
  revealEl.classList.remove("hidden");

  resultEl.textContent =
    outcome === "win" ? "You win!" : outcome === "loss" ? "You lose!" : "It's a draw!";
  resultEl.className = `result ${outcome}`;
  resultEl.classList.remove("hidden");

  if (matchType === "casual") {
    statusEl.textContent = "Round over";
    playAgainBtn.classList.remove("hidden");
    return;
  }

  let delta;
  if (outcome === "win") {
    record.wins++;
    delta = RANK_POINTS.win;
    bumpStreak(true);
  } else if (outcome === "loss") {
    record.losses++;
    delta = RANK_POINTS.loss;
    bumpStreak(false);
  } else {
    record.draws++;
    delta = RANK_POINTS.draw;
    bumpStreak(false);
  }
  saveRecord();
  applyRankDelta(delta);
  recordHistory({
    timestamp: Date.now(),
    playerChoice,
    aiChoice,
    result: outcome,
    rankDelta: delta,
  });

  statusEl.textContent = `Round over (${formatDelta(delta)} rank)`;
  updateScoreDisplay();
  playAgainBtn.classList.remove("hidden");
}

function resetRound() {
  choicesEl.classList.remove("hidden");
  revealEl.classList.add("hidden");
  resultEl.classList.add("hidden");
  playAgainBtn.classList.add("hidden");
  statusEl.textContent = "Choose your move";
}

function updateScoreDisplay() {
  score1El.textContent = record.wins;
  score2El.textContent = record.losses;
  scoreDrawsEl.textContent = record.draws;
}

function updatePlayVisibility() {
  const isRanked = matchType === "ranked";
  rankEl.classList.toggle("hidden", !isRanked);
  scoreRowEl.classList.toggle("hidden", !isRanked);
}

function updateMatchTypeButtons() {
  matchTypeButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.matchtype === matchType);
  });
}

function setMatchType(newMatchType) {
  matchType = newMatchType;
  saveMatchType();
  updateMatchTypeButtons();
  updatePlayVisibility();
  updateScoreDisplay();
  resetRound();
}

// --- Tabs ---

function setTab(tab) {
  activeTab = tab;
  tabButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.tab === tab));
  playViewEl.classList.toggle("hidden", tab !== "play");
  statsViewEl.classList.toggle("hidden", tab !== "stats");
  historyViewEl.classList.toggle("hidden", tab !== "history");
  rankedViewEl.classList.toggle("hidden", tab !== "ranked");
  themesViewEl.classList.toggle("hidden", tab !== "themes");

  if (tab === "stats") updateStatsView();
  if (tab === "history") {
    historyDetailEl.classList.add("hidden");
    historyListEl.classList.remove("hidden");
    renderHistoryList();
  }
  if (tab === "ranked") updateRankedView();
}

function updateStatsView() {
  const totalGames = record.wins + record.losses + record.draws;
  const winRate = totalGames ? Math.round((record.wins / totalGames) * 100) : 0;

  const last10 = history.slice(0, 10);
  const last10Wins = last10.filter((entry) => entry.result === "win").length;
  const last10Rate = last10.length ? Math.round((last10Wins / last10.length) * 100) : 0;

  statCurrentStreakEl.textContent = streak.current;
  statBestStreakEl.textContent = streak.best;
  statTotalGamesEl.textContent = totalGames;
  statTotalRecordEl.textContent = `${record.wins}-${record.losses}-${record.draws}`;
  statWinRateEl.textContent = `${winRate}%`;
  statLast10El.textContent = `${last10Rate}%`;
  statLast10LabelEl.textContent = last10.length < 10 ? `Last ${last10.length} Win Rate` : "Last 10 Win Rate";
}

// --- History ---

function formatDate(ts) {
  const d = new Date(ts);
  return `${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })} · ${d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
}

function describeEntry(entry) {
  const outcome = entry.result === "win" ? "Win" : entry.result === "loss" ? "Loss" : "Draw";
  return `${outcome} (${formatDelta(entry.rankDelta)}) · ${capitalize(entry.playerChoice)} vs ${capitalize(entry.aiChoice)}`;
}

function resultClass(entry) {
  return `result-${entry.result}`;
}

function renderHistoryList() {
  historyListEl.innerHTML = "";
  if (history.length === 0) {
    historyListEl.innerHTML = '<p class="empty-state">No games played yet.</p>';
    return;
  }
  history.forEach((entry, idx) => {
    const item = document.createElement("button");
    item.className = `history-item ${resultClass(entry)}`;
    item.innerHTML = `<span>${describeEntry(entry)}</span><span class="history-date">${formatDate(entry.timestamp)}</span>`;
    item.addEventListener("click", () => showHistoryDetail(idx));
    historyListEl.appendChild(item);
  });
}

function showHistoryDetail(idx) {
  const entry = history[idx];
  historyListEl.classList.add("hidden");
  historyDetailEl.classList.remove("hidden");
  const outcome = entry.result === "win" ? "You win!" : entry.result === "loss" ? "You lose!" : "It's a draw!";
  historyDetailContentEl.innerHTML = `
    <p>${outcome} (${formatDelta(entry.rankDelta)} rank)</p>
    <p>${formatDate(entry.timestamp)}</p>
  `;
  historyRevealEl.innerHTML = `
    <div class="reveal-side">
      <span class="reveal-label">You</span>
      <span class="reveal-choice">${capitalize(entry.playerChoice)}</span>
    </div>
    <span class="reveal-vs">VS</span>
    <div class="reveal-side">
      <span class="reveal-label">AI</span>
      <span class="reveal-choice">${capitalize(entry.aiChoice)}</span>
    </div>
  `;
}

// --- Ranked ---

function computeRankSeries() {
  const points = [];
  let r = rank;
  for (const entry of history) {
    points.unshift(r);
    r -= entry.rankDelta;
  }
  points.unshift(r);
  return points;
}

function buildRankChartSvg(points, width = 560, height = 220) {
  const padding = 36;
  if (points.length < 2) points = [points[0], points[0]];

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const stepX = (width - padding * 2) / (points.length - 1);

  const coords = points.map((v, i) => {
    const x = padding + i * stepX;
    const y = height - padding - ((v - min) / range) * (height - padding * 2);
    return [x, y];
  });

  const linePoints = coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const areaPoints = `${padding},${height - padding} ${linePoints} ${width - padding},${height - padding}`;
  const [lastX, lastY] = coords[coords.length - 1];

  return `
    <svg viewBox="0 0 ${width} ${height}" class="rank-chart-svg" preserveAspectRatio="none">
      <defs>
        <linearGradient id="rankFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style="stop-color: var(--accent); stop-opacity: 0.35" />
          <stop offset="100%" style="stop-color: var(--accent); stop-opacity: 0" />
        </linearGradient>
      </defs>
      <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" style="stroke: var(--border)" stroke-width="1" />
      <text x="${padding - 8}" y="${padding + 4}" text-anchor="end" style="fill: var(--text-dim)" font-size="11">${Math.round(max)}</text>
      <text x="${padding - 8}" y="${height - padding}" text-anchor="end" style="fill: var(--text-dim)" font-size="11">${Math.round(min)}</text>
      <polygon points="${areaPoints}" fill="url(#rankFade)" />
      <polyline points="${linePoints}" fill="none" style="stroke: var(--accent)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
      <circle cx="${lastX}" cy="${lastY}" r="4.5" style="fill: var(--accent-text); stroke: var(--accent)" stroke-width="2" />
    </svg>
  `;
}

function updateRankedView() {
  const tier = getTier(rank);
  rankedPointsEl.textContent = rank;
  rankedTierEl.textContent = tier;
  rankedTierEl.className = `ranked-tier rank-${tier.toLowerCase()}`;

  if (history.length === 0) {
    rankChartEl.innerHTML = '<p class="empty-state">Play some ranked games to start tracking your rank over time.</p>';
  } else {
    rankChartEl.innerHTML = buildRankChartSvg(computeRankSeries());
  }

  renderTierLadder();
}

function renderTierLadder() {
  const currentTier = getTier(rank);
  tierLadderEl.innerHTML = RANK_TIERS.map((tier) => {
    const threshold = tier.min === -Infinity ? 0 : tier.min;
    const isCurrent = tier.name === currentTier;
    return `
      <div class="tier-row rank-${tier.name.toLowerCase()}${isCurrent ? " current" : ""}">
        <span class="tier-name">${tier.name}</span>
        <span class="tier-points">${threshold}+</span>
      </div>
    `;
  }).join("");
}

choiceButtons.forEach((btn) =>
  btn.addEventListener("click", () => playRound(btn.dataset.choice))
);
playAgainBtn.addEventListener("click", resetRound);
matchTypeButtons.forEach((btn) =>
  btn.addEventListener("click", () => setMatchType(btn.dataset.matchtype))
);
tabButtons.forEach((btn) => btn.addEventListener("click", () => setTab(btn.dataset.tab)));
themeButtons.forEach((btn) => btn.addEventListener("click", () => setTheme(btn.dataset.theme)));
backToHistoryBtn.addEventListener("click", () => {
  historyDetailEl.classList.add("hidden");
  historyListEl.classList.remove("hidden");
});

updateMatchTypeButtons();
updatePlayVisibility();
updateScoreDisplay();
updateRankDisplay();
setTab("play");
