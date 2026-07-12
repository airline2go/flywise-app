// Ports app.js's showToast() exactly — a single #fw-toast element appended
// to <body>, faded in via a `.show` class after a 10ms tick, then removed
// 3.5s later (matching the original timings). Styling lives in styles.css
// (.fw-toast / .fw-toast-{info,success,error} / .fw-toast.show).
export function showToast(message, type) {
  if (typeof document === 'undefined') return;
  const existing = document.getElementById('fw-toast');
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.id = 'fw-toast';
  el.className = 'fw-toast fw-toast-' + (type || 'info');
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => { el.classList.add('show'); }, 10);
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => { if (el.parentNode) el.remove(); }, 400);
  }, 3500);
}
