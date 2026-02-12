document.addEventListener("DOMContentLoaded", () => {
  const loader = document.getElementById("loader");
  if (!loader) return;

  // Симуляция загрузки: прячем, когда страница отрендерилась
  window.addEventListener("load", () => {
    loader.style.opacity = "0";
    setTimeout(() => loader.remove(), 600);
  });
});
