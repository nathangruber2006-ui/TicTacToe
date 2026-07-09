const GAMES = [
  { id: "tictactoe", name: "Tic Tac Toe", path: "index.html" },
  { id: "rps", name: "Rock Paper Scissors", path: "rock-paper-scissors/index.html" },
  { id: "connect4", name: "Connect Four", path: "connect-four/index.html" },
];

function renderSidebar() {
  const container = document.getElementById("sidebar");
  if (!container) return;

  const root = window.SITE_ROOT || "./";
  const activeId = document.body.dataset.game;

  container.innerHTML = `
    <p class="sidebar-title">Games</p>
    <nav class="sidebar-nav">
      ${GAMES.map(
        (game) =>
          `<a class="sidebar-link${game.id === activeId ? " active" : ""}" href="${root}${game.path}">${game.name}</a>`
      ).join("")}
    </nav>
  `;
}

renderSidebar();
