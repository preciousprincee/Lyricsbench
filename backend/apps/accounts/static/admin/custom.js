/*
 * Real, manual dark-mode toggle for the admin — see custom.css for why
 * this exists instead of Jazzmin's own dark_mode_theme setting.
 * Persists the choice in localStorage so it survives navigation and
 * future visits.
 */
(function () {
  var STORAGE_KEY = "lyricsbench-admin-theme";

  function applyTheme(theme) {
    if (theme === "dark") {
      document.documentElement.classList.add("dark-mode");
    } else {
      document.documentElement.classList.remove("dark-mode");
    }
  }

  // Apply immediately (before the button exists) so there's no flash of
  // the wrong theme on page load.
  var saved = localStorage.getItem(STORAGE_KEY);
  applyTheme(saved === "dark" ? "dark" : "light");

  document.addEventListener("DOMContentLoaded", function () {
    var btn = document.createElement("button");
    btn.id = "lyricsbench-theme-toggle";
    btn.type = "button";
    btn.title = "Toggle dark mode";
    btn.setAttribute("aria-label", "Toggle dark mode");

    function updateIcon() {
      var isDark = document.documentElement.classList.contains("dark-mode");
      btn.textContent = isDark ? "\u2600" : "\u263D"; // sun : moon
    }

    btn.addEventListener("click", function () {
      var isDark = document.documentElement.classList.contains("dark-mode");
      var next = isDark ? "light" : "dark";
      applyTheme(next);
      localStorage.setItem(STORAGE_KEY, next);
      updateIcon();
    });

    updateIcon();
    document.body.appendChild(btn);
  });
})();
