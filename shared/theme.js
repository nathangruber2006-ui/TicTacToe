const THEME_KEY = "games-theme-v1";

function loadTheme() {
  return localStorage.getItem(THEME_KEY) || "indigo";
}

function saveTheme() {
  localStorage.setItem(THEME_KEY, theme);
}

let theme = loadTheme();

function applyTheme() {
  document.documentElement.setAttribute("data-theme", theme);
  document.querySelectorAll(".theme-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.theme === theme);
  });
}

function setTheme(newTheme) {
  theme = newTheme;
  saveTheme();
  applyTheme();
}

applyTheme();
