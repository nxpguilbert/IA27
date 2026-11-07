/* Comportements communs : thème, apparition au scroll, sommaire actif */
(function () {
  const root = document.documentElement;
  try {
    const saved = localStorage.getItem('theme');
    if (saved) root.setAttribute('data-theme', saved);
  } catch (e) {}

  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.querySelector('.theme-btn');
    const isDark = () => root.getAttribute('data-theme') === 'dark' ||
      (!root.getAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches);
    const paint = () => { if (btn) btn.textContent = isDark() ? '☀' : '☾'; };
    paint();
    if (btn) btn.addEventListener('click', () => {
      const next = isDark() ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
      paint();
      document.dispatchEvent(new CustomEvent('themechange'));
    });

    // apparition progressive
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0 });
    setTimeout(() => document.querySelectorAll(".reveal").forEach((el) => el.classList.add("in")), 1500);
    document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

    // sommaire actif
    const links = [...document.querySelectorAll('.toc a[href^="#"]')];
    if (links.length) {
      const map = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
      const so = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            links.forEach((l) => l.classList.remove('active'));
            const a = map.get(e.target.id); if (a) a.classList.add('active');
          }
        });
      }, { rootMargin: '-30% 0px -60% 0px' });
      map.forEach((_, id) => { const s = document.getElementById(id); if (s) so.observe(s); });
    }
  });
})();
