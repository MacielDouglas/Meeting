// Aplica o tema salvo antes da primeira pintura (evita flash claro/escuro).
(function () {
  try {
    var t = localStorage.getItem("reuniones-theme");
    if (t === "dark") document.documentElement.classList.add("dark");
    else if (t === "light") document.documentElement.classList.add("light");
  } catch (e) {
    /* armazenamento indisponível: segue o prefers-color-scheme */
  }
})();
