(() => {
  const button = document.getElementById("theme-toggle");
  if (!button) return;
  const root = document.documentElement;
  function setTheme(theme) {
    const light = theme === "light";
    root.dataset.theme = light ? "light" : "dark";
    document.querySelector('meta[name="theme-color"]').content = light ? "#fafafa" : "#050505";
    button.setAttribute("aria-pressed", String(light));
    button.setAttribute("aria-label", light ? "Switch to dark mode" : "Switch to light mode");
    button.title = button.getAttribute("aria-label");
  }
  setTheme(root.dataset.theme === "dark" ? "dark" : "light");
  button.addEventListener("click", () => {
    const theme = root.dataset.theme === "light" ? "dark" : "light";
    setTheme(theme);
    try { localStorage.setItem("navworld-theme", theme); } catch (_) {}
  });
})();
