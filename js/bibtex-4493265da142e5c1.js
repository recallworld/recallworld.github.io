(() => {
  const button = document.getElementById("copy-btn");
  const content = document.getElementById("bibtex-content");
  if (!button || !content) return;
  let reset;
  function copied() {
    button.classList.add("copied");
    button.innerHTML = '<i class="fas fa-check" aria-hidden="true"></i>';
    button.setAttribute("aria-label", "BibTeX copied");
    clearTimeout(reset);
    reset = setTimeout(() => {
      button.classList.remove("copied");
      button.innerHTML = '<i class="fa fa-copy" aria-hidden="true"></i>';
      button.setAttribute("aria-label", "Copy BibTeX to clipboard");
    }, 2000);
  }
  function fallback(text) {
    const field = document.createElement("textarea");
    const focused = document.activeElement;
    field.value = text;
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.focus();
    field.select();
    try {
      if (document.execCommand("copy")) copied();
    } finally {
      field.remove();
      if (focused && focused.isConnected) focused.focus({preventScroll: true});
    }
  }
  button.addEventListener("click", async event => {
    event.preventDefault();
    const text = content.textContent;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        copied();
        return;
      } catch (_) {}
    }
    fallback(text);
  });
})();
