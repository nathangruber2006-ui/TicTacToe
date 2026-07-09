const ROWS = 6;
const COLS = 7;
const COLUMN_ORDER = [3, 2, 4, 1, 5, 0, 6];

const RECORDS_KEY = "connect4-records-v1";
const DIFFICULTY_KEY = "connect4-difficulty-v1";
const SYMBOL_KEY = "connect4-symbol-v1";
const MODE_KEY = "connect4-mode-v1";
const MATCH_TYPE_KEY = "connect4-matchtype-v1";
const TWO_PLAYER_KEY = "connect4-2p-record-v1";
const RANK_KEY = "connect4-rank-v1";
const STREAK_KEY = "connect4-streak-v1";
const HISTORY_KEY = "connect4-history-v1";
const HISTORY_LIMIT = 50;

const RANK_POINTS = {
  easy: { win: 5, draw: -2, loss: -15 },
  medium: { win: 10, draw: 0, loss: -10 },
  hard: { win: 20, draw: 2, loss: -8 },
  impossible: { win: 40, draw: 5, loss: -3 },
};

const SEARCH_DEPTH = {
  hard: 3,
  impossible: 5,
};

const RANK_TIERS = [
  { min: 2200, name: "Master" },
  { min: 1800, name: "Diamond" },
  { min: 1500, name: "Platinum" },
  { min: 1200, name: "Gold" },
  { min: 900, name: "Silver" },
  { min: -Infinity, name: "Bronze" },
];

const boardEl = document.getElementById("board");
const cells = Array.from(document.querySelectorAll(".c4-cell"));
const statusEl = document.getElementById("status");
const youAreEl = document.getElementById("youAre");
const rankEl = document.getElementById("rankDisplay");
const resetBtn = document.getElementById("reset");
const modeButtons = Array.from(document.querySelectorAll(".mode-btn"));
const matchTypeChoiceEl = document.getElementById("matchTypeChoice");
const matchTypeButtons = Array.from(document.querySelectorAll(".matchtype-btn"));
const symbolChoiceEl = document.getElementById("symbolChoice");
const diffButtons = Array.from(document.querySelectorAll(".diff-btn"));
const difficultyEl = document.getElementById("difficulty");
const symbolButtons = Array.from(document.querySelectorAll(".symbol-btn"));
const scoreLabel1El = document.getElementById("scoreLabel1");
const scoreLabel2El = document.getElementById("scoreLabel2");
const score1El = document.getElementById("score1");
const score2El = document.getElementById("score2");
const scoreDrawsEl = document.getElementById("scoreDraws");
const scoreRowEl = document.getElementById("scoreRow");

const tabButtons = Array.from(document.querySelectorAll(".tab-btn"));
const playViewEl = document.getElementById("playView");
const statsViewEl = document.getElementById("statsView");
const historyViewEl = document.getElementById("historyView");
const statCurrentStreakEl = document.getElementById("statCurrentStreak");
const statBestStreakEl = document.getElementById("statBestStreak");
const statTotalGamesEl = document.getElementById("statTotalGames");
const statTotalRecordEl = document.getElementById("statTotalRecord");
const statWinRateEl = document.getElementById("statWinRate");
const statLast10El = document.getElementById("statLast10");
const statLast10LabelEl = document.getElementById("statLast10Label");
const historyListEl = document.getElementById("historyList");
const historyDetailEl = document.getElementById("historyDetail");
const historyDetailContentEl = document.getElementById("historyDetailContent");
const historyBoardEl = document.getElementById("historyBoard");
const backToHistoryBtn = document.getElementById("backToHistory");
const rankedViewEl = document.getElementById("rankedView");
const rankedPointsEl = document.getElementById("rankedPoints");
const rankedTierEl = document.getElementById("rankedTier");
const rankChartEl = document.getElementById("rankChart");
const tierLadderEl = document.getElementById("tierLadder");
const themesViewEl = document.getElementById("themesView");
const themeButtons = Array.from(document.querySelectorAll(".theme-btn"));

let board = Array(ROWS * COLS).fill(null);
let gameOver = false;
let humanTurn = true;
let mode = loadMode();
let matchType = loadMatchType();
let difficulty = loadDifficulty();
let records = loadRecords();
let symbolChoice = loadSymbolChoice();
let humanSymbol = "R";
let aiSymbol = "Y";
let currentPlayer = "R";
let twoPlayerRecord = loadTwoPlayerRecord();
let rank = loadRank();
let streak = loadStreak();
let history = loadHistory();
let activeTab = "play";

// --- Sound ---

let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playTone({ freq, start = 0, duration = 0.12, type = "sine", volume = 0.15, glideTo = null }) {
  const ctx = getAudioCtx();
  const startTime = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  if (glideTo !== null) {
    osc.frequency.linearRampToValueAtTime(glideTo, startTime + duration);
  }
  gain.gain.setValueAtTime(volume, startTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}

function playPlaceSound(symbol) {
  playTone({ freq: symbol === "R" ? 440 : 330, duration: 0.12 });
}

function playWinSound() {
  [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
    playTone({ freq, start: i * 0.1, duration: 0.15, type: "triangle", volume: 0.2 });
  });
}

function playLoseSound() {
  playTone({ freq: 300, start: 0, duration: 0.35, type: "sawtooth", volume: 0.18, glideTo: 200 });
  playTone({ freq: 260, start: 0.38, duration: 0.55, type: "sawtooth", volume: 0.18, glideTo: 130 });
}

// --- Persistence ---

function loadRecords() {
  const defaults = {
    easy: { wins: 0, losses: 0, draws: 0 },
    medium: { wins: 0, losses: 0, draws: 0 },
    hard: { wins: 0, losses: 0, draws: 0 },
    impossible: { wins: 0, losses: 0, draws: 0 },
  };
  try {
    const saved = JSON.parse(localStorage.getItem(RECORDS_KEY));
    return { ...defaults, ...saved };
  } catch {
    return defaults;
  }
}

function saveRecords() {
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
}

function loadTwoPlayerRecord() {
  const defaults = { rWins: 0, yWins: 0, draws: 0 };
  try {
    const saved = JSON.parse(localStorage.getItem(TWO_PLAYER_KEY));
    return { ...defaults, ...saved };
  } catch {
    return defaults;
  }
}

function saveTwoPlayerRecord() {
  localStorage.setItem(TWO_PLAYER_KEY, JSON.stringify(twoPlayerRecord));
}

function loadDifficulty() {
  return localStorage.getItem(DIFFICULTY_KEY) || "easy";
}

function saveDifficulty() {
  localStorage.setItem(DIFFICULTY_KEY, difficulty);
}

function loadSymbolChoice() {
  return localStorage.getItem(SYMBOL_KEY) || "R";
}

function saveSymbolChoice() {
  localStorage.setItem(SYMBOL_KEY, symbolChoice);
}

function loadMode() {
  return localStorage.getItem(MODE_KEY) || "ai";
}

function saveMode() {
  localStorage.setItem(MODE_KEY, mode);
}

function loadMatchType() {
  return localStorage.getItem(MATCH_TYPE_KEY) || "casual";
}

function saveMatchType() {
  localStorage.setItem(MATCH_TYPE_KEY, matchType);
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

function getTotalRecord() {
  return Object.values(records).reduce(
    (acc, r) => ({
      wins: acc.wins + r.wins,
      losses: acc.losses + r.losses,
      draws: acc.draws + r.draws,
    }),
    { wins: 0, losses: 0, draws: 0 }
  );
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

// --- Board helpers ---

function getValidColumns(bd) {
  const cols = [];
  for (let c = 0; c < COLS; c++) {
    if (bd[c] === null) cols.push(c);
  }
  return cols;
}

function getNextOpenRow(bd, col) {
  for (let row = ROWS - 1; row >= 0; row--) {
    if (bd[row * COLS + col] === null) return row;
  }
  return -1;
}

function checkLine(bd, idxs) {
  const v = bd[idxs[0]];
  return v !== null && idxs.every((i) => bd[i] === v);
}

function getWinner(bd) {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col <= COLS - 4; col++) {
      const idxs = [0, 1, 2, 3].map((i) => row * COLS + col + i);
      if (checkLine(bd, idxs)) return { player: bd[idxs[0]], line: idxs };
    }
  }
  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row <= ROWS - 4; row++) {
      const idxs = [0, 1, 2, 3].map((i) => (row + i) * COLS + col);
      if (checkLine(bd, idxs)) return { player: bd[idxs[0]], line: idxs };
    }
  }
  for (let row = 0; row <= ROWS - 4; row++) {
    for (let col = 0; col <= COLS - 4; col++) {
      const idxs = [0, 1, 2, 3].map((i) => (row + i) * COLS + col + i);
      if (checkLine(bd, idxs)) return { player: bd[idxs[0]], line: idxs };
    }
  }
  for (let row = 3; row < ROWS; row++) {
    for (let col = 0; col <= COLS - 4; col++) {
      const idxs = [0, 1, 2, 3].map((i) => (row - i) * COLS + col + i);
      if (checkLine(bd, idxs)) return { player: bd[idxs[0]], line: idxs };
    }
  }
  return null;
}

// --- AI move selection ---

function randomMove(bd) {
  const cols = getValidColumns(bd);
  return cols[Math.floor(Math.random() * cols.length)];
}

function findWinningColumn(bd, player) {
  for (const col of getValidColumns(bd)) {
    const row = getNextOpenRow(bd, col);
    bd[row * COLS + col] = player;
    const won = getWinner(bd) !== null;
    bd[row * COLS + col] = null;
    if (won) return col;
  }
  return null;
}

function heuristicMove(bd) {
  return findWinningColumn(bd, aiSymbol) ?? findWinningColumn(bd, humanSymbol) ?? randomMove(bd);
}

function scoreWindow(cellsInWindow) {
  const aiCount = cellsInWindow.filter((c) => c === aiSymbol).length;
  const humanCount = cellsInWindow.filter((c) => c === humanSymbol).length;
  const emptyCount = cellsInWindow.filter((c) => c === null).length;

  if (aiCount === 4) return 100;
  if (aiCount === 3 && emptyCount === 1) return 5;
  if (aiCount === 2 && emptyCount === 2) return 2;
  if (humanCount === 3 && emptyCount === 1) return -4;
  if (humanCount === 2 && emptyCount === 2) return -1;
  return 0;
}

function evaluateBoard(bd) {
  let score = 0;

  for (let row = 0; row < ROWS; row++) {
    score += (bd[row * COLS + 3] === aiSymbol ? 1 : 0) * 3;
  }

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col <= COLS - 4; col++) {
      score += scoreWindow([0, 1, 2, 3].map((i) => bd[row * COLS + col + i]));
    }
  }
  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row <= ROWS - 4; row++) {
      score += scoreWindow([0, 1, 2, 3].map((i) => bd[(row + i) * COLS + col]));
    }
  }
  for (let row = 0; row <= ROWS - 4; row++) {
    for (let col = 0; col <= COLS - 4; col++) {
      score += scoreWindow([0, 1, 2, 3].map((i) => bd[(row + i) * COLS + col + i]));
    }
  }
  for (let row = 3; row < ROWS; row++) {
    for (let col = 0; col <= COLS - 4; col++) {
      score += scoreWindow([0, 1, 2, 3].map((i) => bd[(row - i) * COLS + col + i]));
    }
  }

  return score;
}

function minimax(bd, depth, alpha, beta, maximizing) {
  const result = getWinner(bd);
  if (result) {
    if (result.player === aiSymbol) return { score: 1000000 + depth };
    return { score: -1000000 - depth };
  }
  const validCols = COLUMN_ORDER.filter((c) => bd[c] === null);
  if (validCols.length === 0) return { score: 0 };
  if (depth === 0) return { score: evaluateBoard(bd) };

  const player = maximizing ? aiSymbol : humanSymbol;
  let best = { score: maximizing ? -Infinity : Infinity, column: validCols[0] };

  for (const col of validCols) {
    const row = getNextOpenRow(bd, col);
    bd[row * COLS + col] = player;
    const outcome = minimax(bd, depth - 1, alpha, beta, !maximizing);
    bd[row * COLS + col] = null;

    if (maximizing) {
      if (outcome.score > best.score) best = { score: outcome.score, column: col };
      alpha = Math.max(alpha, best.score);
    } else {
      if (outcome.score < best.score) best = { score: outcome.score, column: col };
      beta = Math.min(beta, best.score);
    }
    if (alpha >= beta) break;
  }

  return best;
}

function getAiMove(bd) {
  switch (difficulty) {
    case "easy":
      return randomMove(bd);
    case "medium":
      return Math.random() < 0.5 ? heuristicMove(bd) : randomMove(bd);
    case "hard":
      return minimax(bd, SEARCH_DEPTH.hard, -Infinity, Infinity, true).column;
    case "impossible":
      return minimax(bd, SEARCH_DEPTH.impossible, -Infinity, Infinity, true).column;
    default:
      return randomMove(bd);
  }
}

// --- Game flow ---

function handleColumnClick(col) {
  if (gameOver) return;
  if (board[col] !== null) return;

  if (mode === "twoPlayer") {
    const ended = playMove(col, currentPlayer);
    if (ended) return;
    currentPlayer = currentPlayer === "R" ? "Y" : "R";
    statusEl.textContent = `${currentPlayer === "R" ? "Red" : "Yellow"}'s turn`;
    return;
  }

  if (!humanTurn) return;
  const ended = playMove(col, humanSymbol);
  if (ended) return;

  humanTurn = false;
  statusEl.textContent = "AI is thinking...";
  setBoardDisabled(true);
  setTimeout(aiMove, 400);
}

function aiMove() {
  const col = getAiMove(board);
  const ended = playMove(col, aiSymbol);
  if (!ended) {
    humanTurn = true;
    setBoardDisabled(false);
    statusEl.textContent = "Your turn";
  }
}

function playMove(col, player) {
  const row = getNextOpenRow(board, col);
  if (row === -1) return false;

  board[row * COLS + col] = player;
  renderCell(row * COLS + col, player);
  playPlaceSound(player);

  const result = getWinner(board);
  if (result) {
    gameOver = true;
    highlightWin(result.line);
    setBoardDisabled(true);
    handleWin(result.player, result.line);
    return true;
  }

  if (getValidColumns(board).length === 0) {
    gameOver = true;
    handleDraw();
    return true;
  }

  return false;
}

function handleWin(winner, winLine) {
  if (mode === "twoPlayer") {
    if (winner === "R") twoPlayerRecord.rWins++;
    else twoPlayerRecord.yWins++;
    saveTwoPlayerRecord();
    statusEl.textContent = `${winner === "R" ? "Red" : "Yellow"} wins!`;
    playWinSound();
    recordHistory({
      timestamp: Date.now(),
      mode: "twoPlayer",
      difficulty: null,
      result: winner,
      board: [...board],
      winLine,
      rankDelta: null,
    });
  } else if (matchType === "casual") {
    statusEl.textContent = winner === humanSymbol ? "You win!" : "AI wins!";
    if (winner === humanSymbol) playWinSound();
    else playLoseSound();
    return;
  } else if (winner === humanSymbol) {
    records[difficulty].wins++;
    saveRecords();
    const delta = RANK_POINTS[difficulty].win;
    applyRankDelta(delta);
    bumpStreak(true);
    statusEl.textContent = `You win! (${formatDelta(delta)} rank)`;
    playWinSound();
    recordHistory({
      timestamp: Date.now(),
      mode: "ai",
      difficulty,
      result: "win",
      board: [...board],
      winLine,
      rankDelta: delta,
    });
  } else {
    records[difficulty].losses++;
    saveRecords();
    const delta = RANK_POINTS[difficulty].loss;
    applyRankDelta(delta);
    bumpStreak(false);
    statusEl.textContent = `AI wins! (${formatDelta(delta)} rank)`;
    playLoseSound();
    recordHistory({
      timestamp: Date.now(),
      mode: "ai",
      difficulty,
      result: "loss",
      board: [...board],
      winLine,
      rankDelta: delta,
    });
  }
  updateScoreDisplay();
}

function formatDelta(n) {
  return n >= 0 ? `+${n}` : `${n}`;
}

function handleDraw() {
  if (mode === "twoPlayer") {
    twoPlayerRecord.draws++;
    saveTwoPlayerRecord();
    statusEl.textContent = "It's a draw!";
    recordHistory({
      timestamp: Date.now(),
      mode: "twoPlayer",
      difficulty: null,
      result: "draw",
      board: [...board],
      winLine: null,
      rankDelta: null,
    });
  } else if (matchType === "casual") {
    statusEl.textContent = "It's a draw!";
    return;
  } else {
    records[difficulty].draws++;
    saveRecords();
    const delta = RANK_POINTS[difficulty].draw;
    applyRankDelta(delta);
    bumpStreak(false);
    statusEl.textContent = `It's a draw! (${formatDelta(delta)} rank)`;
    recordHistory({
      timestamp: Date.now(),
      mode: "ai",
      difficulty,
      result: "draw",
      board: [...board],
      winLine: null,
      rankDelta: delta,
    });
  }
  updateScoreDisplay();
}

function renderCell(index, player) {
  const cell = cells[index];
  cell.classList.add(player === "R" ? "red" : "yellow");
  cell.disabled = true;
}

function highlightWin(line) {
  line.forEach((i) => cells[i].classList.add("win"));
}

function setBoardDisabled(disabled) {
  cells.forEach((cell) => {
    const col = Number(cell.dataset.index) % COLS;
    cell.disabled = disabled || board[col] !== null;
  });
}

function updateScoreDisplay() {
  if (mode === "twoPlayer") {
    scoreLabel1El.textContent = "Red Wins";
    score1El.textContent = twoPlayerRecord.rWins;
    scoreLabel2El.textContent = "Yellow Wins";
    score2El.textContent = twoPlayerRecord.yWins;
    scoreDrawsEl.textContent = twoPlayerRecord.draws;
  } else {
    const record = records[difficulty];
    scoreLabel1El.textContent = "Wins";
    score1El.textContent = record.wins;
    scoreLabel2El.textContent = "Losses";
    score2El.textContent = record.losses;
    scoreDrawsEl.textContent = record.draws;
  }
}

function updateModeButtons() {
  modeButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.mode === mode);
  });
}

function updateMatchTypeButtons() {
  matchTypeButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.matchtype === matchType);
  });
}

function updateDifficultyButtons() {
  diffButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.difficulty === difficulty);
  });
}

function updateSymbolButtons() {
  symbolButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.symbol === symbolChoice);
  });
}

function updatePanelVisibility() {
  const isAi = mode === "ai";
  matchTypeChoiceEl.classList.toggle("hidden", !isAi);
  symbolChoiceEl.classList.toggle("hidden", !isAi);
  difficultyEl.classList.toggle("hidden", !isAi);
  youAreEl.classList.toggle("hidden", !isAi);
  const isRanked = isAi && matchType === "ranked";
  rankEl.classList.toggle("hidden", !isRanked);
  scoreRowEl.classList.toggle("hidden", isAi && matchType !== "ranked");
}

function resolveSymbols() {
  humanSymbol = symbolChoice === "random" ? (Math.random() < 0.5 ? "R" : "Y") : symbolChoice;
  aiSymbol = humanSymbol === "R" ? "Y" : "R";
  youAreEl.textContent = `You are ${humanSymbol === "R" ? "Red" : "Yellow"} · AI is ${aiSymbol === "R" ? "Red" : "Yellow"}`;
}

function resetBoard() {
  board = Array(ROWS * COLS).fill(null);
  gameOver = false;
  cells.forEach((cell) => {
    cell.disabled = false;
    cell.classList.remove("red", "yellow", "win");
  });

  if (mode === "twoPlayer") {
    currentPlayer = "R";
    statusEl.textContent = "Red's turn";
    return;
  }

  resolveSymbols();
  humanTurn = humanSymbol === "R";
  if (humanTurn) {
    statusEl.textContent = "Your turn";
  } else {
    statusEl.textContent = "AI is thinking...";
    setBoardDisabled(true);
    setTimeout(aiMove, 400);
  }
}

function setMode(newMode) {
  mode = newMode;
  saveMode();
  updateModeButtons();
  updatePanelVisibility();
  updateScoreDisplay();
  resetBoard();
}

function setMatchType(newMatchType) {
  matchType = newMatchType;
  saveMatchType();
  updateMatchTypeButtons();
  updatePanelVisibility();
  updateScoreDisplay();
  resetBoard();
}

function setDifficulty(newDifficulty) {
  difficulty = newDifficulty;
  saveDifficulty();
  updateDifficultyButtons();
  updateScoreDisplay();
  resetBoard();
}

function setSymbolChoice(newChoice) {
  symbolChoice = newChoice;
  saveSymbolChoice();
  updateSymbolButtons();
  resetBoard();
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
  const total = getTotalRecord();
  const totalGames = total.wins + total.losses + total.draws;
  const winRate = totalGames ? Math.round((total.wins / totalGames) * 100) : 0;

  const aiHistory = history.filter((entry) => entry.mode === "ai");
  const last10 = aiHistory.slice(0, 10);
  const last10Wins = last10.filter((entry) => entry.result === "win").length;
  const last10Rate = last10.length ? Math.round((last10Wins / last10.length) * 100) : 0;

  statCurrentStreakEl.textContent = streak.current;
  statBestStreakEl.textContent = streak.best;
  statTotalGamesEl.textContent = totalGames;
  statTotalRecordEl.textContent = `${total.wins}-${total.losses}-${total.draws}`;
  statWinRateEl.textContent = `${winRate}%`;
  statLast10El.textContent = `${last10Rate}%`;
  statLast10LabelEl.textContent = last10.length < 10 ? `Last ${last10.length} Win Rate` : "Last 10 Win Rate";
}

// --- Ranked ---

function computeRankSeries() {
  const trackedEntries = history.filter((entry) => entry.mode === "ai" && entry.rankDelta != null);
  const points = [];
  let r = rank;
  for (const entry of trackedEntries) {
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

  const trackedCount = history.filter((entry) => entry.mode === "ai" && entry.rankDelta != null).length;
  if (trackedCount === 0) {
    rankChartEl.innerHTML = '<p class="empty-state">Play some ranked vs AI games to start tracking your rank over time.</p>';
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

// --- History ---

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDate(ts) {
  const d = new Date(ts);
  return `${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })} · ${d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
}

function describeEntry(entry) {
  if (entry.mode === "twoPlayer") {
    const outcome = entry.result === "draw" ? "Draw" : `${entry.result === "R" ? "Red" : "Yellow"} won`;
    return `2 Player · ${outcome}`;
  }
  const diffLabel = capitalize(entry.difficulty);
  if (entry.result === "draw") return `vs AI (${diffLabel}) · Draw`;
  const outcome = entry.result === "win" ? "Win" : "Loss";
  const deltaStr = entry.rankDelta != null ? ` (${formatDelta(entry.rankDelta)})` : "";
  return `vs AI (${diffLabel}) · ${outcome}${deltaStr}`;
}

function resultClass(entry) {
  if (entry.result === "draw") return "result-draw";
  if (entry.mode === "twoPlayer") return "result-draw";
  return entry.result === "win" ? "result-win" : "result-loss";
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

function renderHistoryBoard(entry) {
  historyBoardEl.innerHTML = "";
  entry.board.forEach((val, i) => {
    const cellDiv = document.createElement("div");
    let className = "c4-cell";
    if (val === "R") className += " red";
    if (val === "Y") className += " yellow";
    if (entry.winLine && entry.winLine.includes(i)) className += " win";
    cellDiv.className = className;
    historyBoardEl.appendChild(cellDiv);
  });
}

function showHistoryDetail(idx) {
  const entry = history[idx];
  historyListEl.classList.add("hidden");
  historyDetailEl.classList.remove("hidden");
  historyDetailContentEl.innerHTML = `
    <p>${describeEntry(entry)}</p>
    <p>${formatDate(entry.timestamp)}</p>
  `;
  renderHistoryBoard(entry);
}

cells.forEach((cell) =>
  cell.addEventListener("click", () => handleColumnClick(Number(cell.dataset.index) % COLS))
);
resetBtn.addEventListener("click", resetBoard);
modeButtons.forEach((btn) =>
  btn.addEventListener("click", () => setMode(btn.dataset.mode))
);
matchTypeButtons.forEach((btn) =>
  btn.addEventListener("click", () => setMatchType(btn.dataset.matchtype))
);
diffButtons.forEach((btn) =>
  btn.addEventListener("click", () => setDifficulty(btn.dataset.difficulty))
);
symbolButtons.forEach((btn) =>
  btn.addEventListener("click", () => setSymbolChoice(btn.dataset.symbol))
);
tabButtons.forEach((btn) => btn.addEventListener("click", () => setTab(btn.dataset.tab)));
themeButtons.forEach((btn) => btn.addEventListener("click", () => setTheme(btn.dataset.theme)));
backToHistoryBtn.addEventListener("click", () => {
  historyDetailEl.classList.add("hidden");
  historyListEl.classList.remove("hidden");
});

updateModeButtons();
updateMatchTypeButtons();
updatePanelVisibility();
updateDifficultyButtons();
updateSymbolButtons();
updateScoreDisplay();
updateRankDisplay();
setTab("play");
resetBoard();
