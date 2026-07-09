const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

const RECORDS_KEY = "tictactoe-records-v1";
const DIFFICULTY_KEY = "tictactoe-difficulty-v1";
const SYMBOL_KEY = "tictactoe-symbol-v1";
const MODE_KEY = "tictactoe-mode-v1";
const TWO_PLAYER_KEY = "tictactoe-2p-record-v1";

const boardEl = document.getElementById("board");
const cells = Array.from(document.querySelectorAll(".cell"));
const statusEl = document.getElementById("status");
const youAreEl = document.getElementById("youAre");
const resetBtn = document.getElementById("reset");
const modeButtons = Array.from(document.querySelectorAll(".mode-btn"));
const symbolChoiceEl = document.getElementById("symbolChoice");
const diffButtons = Array.from(document.querySelectorAll(".diff-btn"));
const difficultyEl = document.getElementById("difficulty");
const symbolButtons = Array.from(document.querySelectorAll(".symbol-btn"));
const scoreLabel1El = document.getElementById("scoreLabel1");
const scoreLabel2El = document.getElementById("scoreLabel2");
const score1El = document.getElementById("score1");
const score2El = document.getElementById("score2");
const scoreDrawsEl = document.getElementById("scoreDraws");

let board = Array(9).fill(null);
let gameOver = false;
let humanTurn = true;
let mode = loadMode();
let difficulty = loadDifficulty();
let records = loadRecords();
let symbolChoice = loadSymbolChoice();
let humanSymbol = "X";
let aiSymbol = "O";
let currentPlayer = "X";
let twoPlayerRecord = loadTwoPlayerRecord();

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
  playTone({ freq: symbol === "X" ? 440 : 330, duration: 0.12 });
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
  const defaults = { xWins: 0, oWins: 0, draws: 0 };
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
  return localStorage.getItem(SYMBOL_KEY) || "X";
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

function getWinner(bd) {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (bd[a] && bd[a] === bd[b] && bd[a] === bd[c]) {
      return { player: bd[a], line };
    }
  }
  return null;
}

function emptyIndices(bd) {
  return bd.reduce((acc, v, i) => (v ? acc : [...acc, i]), []);
}

// --- AI move selection ---

function randomMove(bd) {
  const options = emptyIndices(bd);
  return options[Math.floor(Math.random() * options.length)];
}

function findWinningMove(bd, player) {
  for (const i of emptyIndices(bd)) {
    bd[i] = player;
    const won = getWinner(bd) !== null;
    bd[i] = null;
    if (won) return i;
  }
  return null;
}

function heuristicMove(bd) {
  return findWinningMove(bd, aiSymbol) ?? findWinningMove(bd, humanSymbol) ?? randomMove(bd);
}

function minimax(bd, depth, isMaximizing) {
  const result = getWinner(bd);
  if (result) return result.player === aiSymbol ? 10 - depth : depth - 10;
  if (emptyIndices(bd).length === 0) return 0;

  if (isMaximizing) {
    let best = -Infinity;
    for (const i of emptyIndices(bd)) {
      bd[i] = aiSymbol;
      best = Math.max(best, minimax(bd, depth + 1, false));
      bd[i] = null;
    }
    return best;
  }

  let best = Infinity;
  for (const i of emptyIndices(bd)) {
    bd[i] = humanSymbol;
    best = Math.min(best, minimax(bd, depth + 1, true));
    bd[i] = null;
  }
  return best;
}

function bestMove(bd) {
  let bestScore = -Infinity;
  let move = null;
  for (const i of emptyIndices(bd)) {
    bd[i] = aiSymbol;
    const score = minimax(bd, 0, false);
    bd[i] = null;
    if (score > bestScore) {
      bestScore = score;
      move = i;
    }
  }
  return move;
}

function getAiMove(bd) {
  switch (difficulty) {
    case "easy":
      return randomMove(bd);
    case "medium":
      return Math.random() < 0.5 ? heuristicMove(bd) : randomMove(bd);
    case "hard":
      return heuristicMove(bd);
    case "impossible":
      return bestMove(bd);
    default:
      return randomMove(bd);
  }
}

// --- Game flow ---

function handleCellClick(e) {
  if (gameOver) return;
  const index = Number(e.currentTarget.dataset.index);
  if (board[index]) return;

  if (mode === "twoPlayer") {
    const ended = playMove(index, currentPlayer);
    if (ended) return;
    currentPlayer = currentPlayer === "X" ? "O" : "X";
    statusEl.textContent = `${currentPlayer}'s turn`;
    return;
  }

  if (!humanTurn) return;
  const ended = playMove(index, humanSymbol);
  if (ended) return;

  humanTurn = false;
  statusEl.textContent = "AI is thinking...";
  setBoardDisabled(true);
  setTimeout(aiMove, 400);
}

function aiMove() {
  const index = getAiMove(board);
  const ended = playMove(index, aiSymbol);
  if (!ended) {
    humanTurn = true;
    setBoardDisabled(false);
    statusEl.textContent = "Your turn";
  }
}

function playMove(index, player) {
  board[index] = player;
  renderCell(index, player);
  playPlaceSound(player);

  const result = getWinner(board);
  if (result) {
    gameOver = true;
    highlightWin(result.line);
    setBoardDisabled(true);
    handleWin(result.player);
    return true;
  }

  if (emptyIndices(board).length === 0) {
    gameOver = true;
    handleDraw();
    return true;
  }

  return false;
}

function handleWin(winner) {
  if (mode === "twoPlayer") {
    if (winner === "X") twoPlayerRecord.xWins++;
    else twoPlayerRecord.oWins++;
    saveTwoPlayerRecord();
    statusEl.textContent = `${winner} wins!`;
    playWinSound();
  } else if (winner === humanSymbol) {
    records[difficulty].wins++;
    saveRecords();
    statusEl.textContent = "You win!";
    playWinSound();
  } else {
    records[difficulty].losses++;
    saveRecords();
    statusEl.textContent = "AI wins!";
    playLoseSound();
  }
  updateScoreDisplay();
}

function handleDraw() {
  if (mode === "twoPlayer") {
    twoPlayerRecord.draws++;
    saveTwoPlayerRecord();
  } else {
    records[difficulty].draws++;
    saveRecords();
  }
  statusEl.textContent = "It's a draw!";
  updateScoreDisplay();
}

function renderCell(index, player) {
  const cell = cells[index];
  cell.textContent = player;
  cell.classList.add(player.toLowerCase());
  cell.disabled = true;
}

function highlightWin(line) {
  line.forEach((i) => cells[i].classList.add("win"));
}

function setBoardDisabled(disabled) {
  cells.forEach((cell) => {
    if (disabled || board[Number(cell.dataset.index)]) {
      cell.disabled = true;
    } else {
      cell.disabled = false;
    }
  });
}

function updateScoreDisplay() {
  if (mode === "twoPlayer") {
    scoreLabel1El.textContent = "X Wins";
    score1El.textContent = twoPlayerRecord.xWins;
    scoreLabel2El.textContent = "O Wins";
    score2El.textContent = twoPlayerRecord.oWins;
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
  symbolChoiceEl.classList.toggle("hidden", !isAi);
  difficultyEl.classList.toggle("hidden", !isAi);
  youAreEl.classList.toggle("hidden", !isAi);
}

function resolveSymbols() {
  humanSymbol = symbolChoice === "random" ? (Math.random() < 0.5 ? "X" : "O") : symbolChoice;
  aiSymbol = humanSymbol === "X" ? "O" : "X";
  youAreEl.textContent = `You are ${humanSymbol} · AI is ${aiSymbol}`;
}

function resetBoard() {
  board = Array(9).fill(null);
  gameOver = false;
  cells.forEach((cell) => {
    cell.textContent = "";
    cell.disabled = false;
    cell.classList.remove("x", "o", "win");
  });

  if (mode === "twoPlayer") {
    currentPlayer = "X";
    statusEl.textContent = "X's turn";
    return;
  }

  resolveSymbols();
  humanTurn = humanSymbol === "X";
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

cells.forEach((cell) => cell.addEventListener("click", handleCellClick));
resetBtn.addEventListener("click", resetBoard);
modeButtons.forEach((btn) =>
  btn.addEventListener("click", () => setMode(btn.dataset.mode))
);
diffButtons.forEach((btn) =>
  btn.addEventListener("click", () => setDifficulty(btn.dataset.difficulty))
);
symbolButtons.forEach((btn) =>
  btn.addEventListener("click", () => setSymbolChoice(btn.dataset.symbol))
);

updateModeButtons();
updatePanelVisibility();
updateDifficultyButtons();
updateSymbolButtons();
updateScoreDisplay();
resetBoard();
