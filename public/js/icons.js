/**
 * Ikon SVG (Lucide) — menggantikan emoji yang dipakai sebagai ikon UI.
 *
 * Karena ikon emoji sudah tersimpan di database (tabel features) dan tersebar
 * di banyak template, mesin ini memetakan emoji → nama ikon Lucide dan
 * menukar teks emoji di DOM menjadi <i data-lucide="..."> secara otomatis.
 *
 * Yang TIDAK diubah: emoji avatar (data pengguna), emoji motivasi, dan
 * notasi matematika (→, ↔, ∧, ∨, ⊕, ¬) karena bukan ikon UI.
 */

export const EMOJI_ICON_MAP = {
  /* navigasi & fitur */
  '📊': 'bar-chart-3',
  '🗓': 'calendar-days',
  '📅': 'calendar',
  '📚': 'book-open',
  '📝': 'pen-line',
  '🎯': 'target',
  '🪪': 'id-card',
  '✅': 'circle-check',
  '📤': 'upload',
  '🏛': 'landmark',
  '🛠': 'wrench',
  '🔗': 'link',
  '💻': 'laptop',
  '🧾': 'receipt',
  '🏗': 'hard-hat',
  '⚖': 'scale',
  '📗': 'book',
  '🏅': 'medal',
  '⚙': 'settings',
  'ℹ': 'info',
  '🧮': 'calculator',

  /* aksi & tombol */
  '🗑': 'trash-2',
  '✏': 'pencil',
  '➕': 'plus',
  '💾': 'save',
  '📎': 'paperclip',
  '📥': 'download',
  '⬇': 'download',
  '⬆': 'arrow-up',
  '🔍': 'search',
  '🔎': 'search',
  '🖨': 'printer',
  '🔄': 'refresh-cw',
  '♻': 'refresh-cw',
  '🔁': 'repeat',
  '✕': 'x',
  '✗': 'x',
  '✓': 'check',
  '✔': 'check',
  '❌': 'circle-x',
  '⭕': 'circle',
  '🟢': 'circle',
  '🟦': 'square',
  '▶': 'play',
  '⏸': 'pause',
  '⏳': 'hourglass',
  '⏱': 'timer',
  '🕐': 'clock',
  '🕘': 'clock',
  '☰': 'menu',
  '⚠': 'triangle-alert',
  '⚡': 'zap',
  '🔒': 'lock',
  '🔐': 'lock-keyhole',
  '🔑': 'key',
  '✂': 'scissors',
  '📌': 'pin',
  '🧷': 'pin',
  '📢': 'megaphone',
  '📧': 'mail',
  '📭': 'inbox',
  '🗄': 'archive',
  '📁': 'folder',
  '📂': 'folder-open',
  '🗃': 'database',
  '🗒': 'clipboard-list',
  '🗂': 'layers',
  '📋': 'clipboard-list',
  '📄': 'file-text',
  '📜': 'scroll',
  '📖': 'book-open',
  '📘': 'book',
  '📇': 'book-marked',
  '🖼': 'image',
  '📸': 'camera',
  '📦': 'package',
  '🧺': 'shopping-basket',
  '🧹': 'brush',
  '🧭': 'compass',
  '🗺': 'map',
  '📍': 'map-pin',
  '🚪': 'door-open',
  '🏠': 'home',
  '🏫': 'school',
  '🏭': 'factory',
  '🏆': 'trophy',
  '🎖': 'award',
  '🎨': 'palette',
  '🎲': 'dices',
  '🎉': 'party-popper',
  '✨': 'sparkles',
  '💡': 'lightbulb',
  '💰': 'wallet',
  '💹': 'trending-up',
  '📈': 'trending-up',
  '📉': 'trending-down',
  '🧮': 'calculator',
  '🔢': 'hash',
  '🔩': 'settings',
  '🧱': 'layout-grid',
  '🧠': 'brain',
  '🛡': 'shield',
  '🛟': 'life-buoy',
  '👥': 'users',
  '👤': 'user',
  '👁': 'eye',
  '👨‍🏫': 'user',
  '🤝': 'handshake',
  '💼': 'briefcase',
  '🤒': 'thermometer',
  '🪜': 'list',
  '🚧': 'hard-hat',
  '🕸': 'share-2',
  '🔷': 'diamond',
  '🫧': 'circle-dot',
  '📏': 'ruler',
  '📐': 'pencil-ruler',
  '↕': 'arrow-up-down',
  '🆔': 'id-card',
  '👋': 'hand',
  '🚀': 'rocket',
  '🌐': 'globe',
  '🧩': 'puzzle',
  '🖥': 'monitor',
  '🏷': 'tag',
  '🕊': 'bird',
  '🔻': 'chevron-down'
};

const KEYS = Object.keys(EMOJI_ICON_MAP).sort((a, b) => b.length - a.length);
const RE = new RegExp('(' + KEYS.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')', 'g');

function convertTextNode(node) {
  const raw = node.nodeValue;
  if (!raw) return false;
  const v = raw.replace(/\uFE0F/g, '');
  if (!RE.test(v)) return false;
  RE.lastIndex = 0;

  const esc = v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  let hit = false;
  const out = esc.replace(RE, (m) => {
    hit = true;
    return `<i data-lucide="${EMOJI_ICON_MAP[m]}" class="g-ic"></i>`;
  });
  if (!hit) return false;

  const span = document.createElement('span');
  span.innerHTML = out;
  node.replaceWith(...span.childNodes);
  return true;
}

/** Tukar emoji ikon di dalam root menjadi SVG Lucide. */
export function applyIcons(root = document.body) {
  if (!window.lucide) return false;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  let changed = false;
  for (const n of nodes) changed = convertTextNode(n) || changed;
  if (changed) window.lucide.createIcons();
  return changed;
}

let started = false;

/** Aktifkan mesin ikon untuk seluruh halaman (otomatis mengikuti konten baru). */
export function startIconEngine() {
  if (started) return;
  started = true;

  const boot = () => {
    applyIcons(document.documentElement);
    const obs = new MutationObserver(muts => {
      for (const m of muts) {
        for (const n of m.addedNodes) {
          if (n.nodeType === 1) applyIcons(n);
        }
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
  };

  if (window.lucide) boot();
  else window.addEventListener('load', boot);
}
