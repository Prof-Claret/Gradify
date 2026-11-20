/**
 * Utilitas UI kecil yang dipakai bersama oleh halaman Kampus.
 */

export function injectFormStyles() {
  if (document.getElementById('g-ui-style')) return;
  const s = document.createElement('style');
  s.id = 'g-ui-style';
  s.textContent = `.g-lbl{font-size:11px;font-weight:600;color:#475569;display:block;margin-bottom:4px}
  .g-inp{width:100%;border:1px solid #cbd5e1;border-radius:0.6rem;padding:0.55rem 0.8rem;font-size:0.85rem;outline:none;background:#fff}
  .g-inp:focus{border-color:#6366f1;box-shadow:0 0 0 3px #e0e7ff}
  .chip-btn{font-size:11px;padding:.3rem .7rem;border-radius:9999px;font-weight:600;cursor:pointer;transition:.15s}
  .file-chip{display:inline-flex;align-items:center;gap:.35rem;font-size:11px;background:#eef2ff;color:#4338ca;border-radius:9999px;padding:.25rem .55rem}
  .file-chip a{text-decoration:underline;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .file-chip.ok{background:#ecfdf5;color:#047857}`;
  document.head.appendChild(s);
}

export const todayStr = () => new Date().toISOString().slice(0, 10);

export function fmtDate(value, withYear = true) {
  if (!value) return '—';
  const raw = String(value);
  const parsed = raw.length <= 10 ? raw + 'T00:00:00' : raw.replace(' ', 'T');
  const d = new Date(parsed);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('id-ID', withYear
    ? { day: '2-digit', month: 'short', year: 'numeric' }
    : { day: '2-digit', month: 'short' });
}

export function daysLeft(due) {
  if (!due) return null;
  const end = new Date(String(due).length <= 10 ? due + 'T23:59:59' : due);
  return Math.ceil((end - new Date()) / 86400000);
}
