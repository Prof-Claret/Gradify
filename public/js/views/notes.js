/**
 * CS Code & Lecture Notes Engine (Phase 1.4)
 * Markdown + syntax highlight + LaTeX + course tagging + snippet copy
 */
import { esc, toast, rerenderMath } from '../app.js';

export const subtitle = () => 'Editor Markdown dengan highlighting kode & LaTeX';

export const SNIPPETS = [
  { label: '``` Python', lang: 'python', code: '```python\nprint("hello")\n```' },
  { label: '``` C++', lang: 'cpp', code: '```cpp\n#include <iostream>\nint main() { std::cout << "hi"; }\n```' },
  { label: '``` Java', lang: 'java', code: '```java\npublic class Hello {\n  public static void main(String[] a) { System.out.println("hi"); }\n}\n```' },
  { label: '``` SQL', lang: 'sql', code: '```sql\nSELECT * FROM students;\n```' },
  { label: '``` JS', lang: 'javascript', code: '```javascript\nconsole.log("hi");\n```' },
  { label: '``` HTML', lang: 'html', code: '```html\n<p>Hello</p>\n```' },
  { label: 'LaTeX inline', lang: '', code: '$E = mc^2$' },
  { label: 'Rumus blok', lang: '', code: '$$ \\int_0^1 x^2 dx $$' },
  { label: 'Heading', lang: '', code: '## Judul Bagian' },
  { label: 'Bold', lang: '', code: '**teks penting**' },
  { label: 'Tabel', lang: '', code: '| A | B |\n|---|---|\n| 1 | 2 |' }
];

export async function render(main, ctx) {
  const { api, toast } = ctx;

  let noteId = null;
  let coursesCache = [];

  async function load() {
    const [{ notes }, { courses }] = await Promise.all([
      api.get('/api/notes/list'),
      api.get('/api/academics/courses').catch(() => ({ courses: [] }))
    ]);
    coursesCache = courses;
    drawList(notes);
  }

  function drawList(notes) {
    main.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-3 mb-5">
      <div>
        <h3 class="font-bold text-slate-800">📝 Catatan Perkuliahan CS</h3>
        <p class="text-xs text-slate-500">Grouped by Course & Semester · Markdown · Python/C++/Java/SQL/JS/HTML</p>
      </div>
      <button id="new-note" class="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl">+ Catatan Baru</button>
    </div>

    <div class="grid lg:grid-cols-3 gap-6" id="notes-layout">
      <!-- list -->
      <div class="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 lg:col-span-1">
        ${notes.length === 0 ? '<p class="text-sm text-slate-400 text-center py-6">Belum ada catatan. Buat catatan pertamamu!</p>' :
        `<div class="space-y-1.5 max-h-[70vh] overflow-y-auto pr-1">
          ${notes.map(n => `
          <div class="n-item flex items-center gap-2 rounded-xl p-3 cursor-pointer border ${n.id === noteId ? 'border-indigo-400 bg-indigo-50' : 'border-transparent hover:bg-slate-50'}" data-id="${n.id}">
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-slate-800 truncate">${esc(n.title)}</p>
              <p class="text-[11px] text-slate-500">${esc(n.course_name || 'Tanpa matkul')} · ${new Date(n.updated_at).toLocaleDateString('id-ID')}</p>
            </div>
            <button class="n-del text-slate-300 hover:text-rose-600 text-sm px-1" data-id="${n.id}">🗑</button>
          </div>`).join('')}
        </div>`}
      </div>

      <!-- editor -->
      <div class="lg:col-span-2" id="editor-panel">
        <div class="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 text-center">
          <p class="text-4xl">🗒️</p>
          <p class="font-semibold text-slate-700 mt-2">Pilih atau buat catatan</p>
          <p class="text-xs text-slate-400 mb-4">Snippet kode satu-klik, preview langsung, tag matkul.</p>
          <button id="new-note2" class="bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-xl">➕ Catatan Baru</button>
        </div>
      </div>
    </div>`;

    document.getElementById('new-note').addEventListener('click', newNote);
    document.getElementById('new-note2')?.addEventListener('click', newNote);
    main.querySelectorAll('.n-item').forEach(it => it.addEventListener('click', (e) => {
      if (e.target.closest('.n-del')) return;
      openEditor(it.dataset.id);
    }));
    main.querySelectorAll('.n-del').forEach(b => b.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm('Hapus catatan ini?')) return;
      await api.del(`/api/notes/${b.dataset.id}`);
      toast('Catatan dihapus', 'info');
      noteId = null;
      load();
    }));
  }

  /* ---------- editor ---------- */
  async function openEditor(id) {
    noteId = id;
    let note;
    try {
      ({ note } = await api.get(`/api/notes/${id}`));
    } catch (e) { toast(e.message, 'error'); return; }
    // refresh list highlight
    main.querySelectorAll('.n-item').forEach(it =>
      it.classList.toggle('border-indigo-400', String(it.dataset.id) === String(id)));
    mountEditor(note);
    if (window.innerWidth < 1024) {
      document.getElementById('editor-panel')?.scrollIntoView({ behavior: 'smooth' });
    }
  }

  function newNote() {
    mountEditor({ id: null, title: '', content: '', course_id: null });
    if (window.innerWidth < 1024) {
      document.getElementById('editor-panel')?.scrollIntoView({ behavior: 'smooth' });
    }
  }

  function mountEditor(note) {
    const panel = document.getElementById('editor-panel');
    const marked = window.marked;
    if (marked) marked.setOptions({ breaks: true, highlight: null });

    panel.innerHTML = `
    <div class="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <!-- toolbar -->
      <div class="border-b border-slate-200 p-2.5 sm:p-3 flex gap-1.5 items-center bg-slate-50 overflow-x-auto no-scrollbar">
        <span class="text-[10px] font-bold text-slate-400 mr-1 uppercase tracking-wider shrink-0">Snippet:</span>
        ${SNIPPETS.map((s, i) => `<button class="snip-btn shrink-0" data-i="${i}" title="Sisipkan ${esc(s.label)}">${esc(s.label)}</button>`).join('')}
      </div>
      <!-- title + course -->
      <div class="p-3 sm:p-4 pb-0 grid md:grid-cols-[2fr_1fr] gap-3">
        <div>
          <label class="text-[10px] font-bold text-slate-400 uppercase">Judul</label>
          <input id="n-title" value="${esc(note.title)}" class="g-inp" placeholder="cth. Menghapus instalasi — ADT Stack" />
        </div>
        <div>
          <label class="text-[10px] font-bold text-slate-400 uppercase">Tag Matkul</label>
          <select id="n-course" class="g-inp">
            <option value="">— Tanpa matkul —</option>
            ${coursesCache.map(c => `<option value="${c.id}" ${String(note.course_id) === String(c.id) ? 'selected' : ''}>${esc(c.course_name)}</option>`).join('')}
          </select>
        </div>
      </div>
      <!-- editor + preview -->
      <div class="grid md:grid-cols-2 gap-0 mt-3">
        <div class="p-3 sm:p-4 border-b md:border-b-0 md:border-r border-slate-200">
          <textarea id="n-content" class="w-full h-[320px] sm:h-[480px] font-mono text-[13px] leading-relaxed text-slate-700 outline-none resize-none" placeholder="Tulis catatan di sini. Gunakan \`\`\`python untuk blok kode, $x^2$ untuk LaTeX.">${esc(note.content)}</textarea>
        </div>
        <div class="p-3 sm:p-4 bg-slate-50 overflow-y-auto h-[320px] sm:h-[480px]">
          <p class="text-[10px] font-bold text-slate-400 uppercase mb-2">👁️ Preview</p>
          <div id="n-preview" class="note-content text-sm text-slate-700"></div>
          <p class="text-[10px] text-slate-400 mt-4 italic">Snippet disalin via tombol di toolbar.</p>
        </div>
      </div>
      <div class="p-3 sm:p-4 border-t border-slate-200 flex flex-wrap gap-2 justify-between items-center">
        <span class="text-[11px] text-slate-400" id="n-meta"></span>
        <div class="flex gap-2 w-full sm:w-auto justify-end">
          <button id="n-copy-all" class="text-xs px-3 sm:px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-semibold">📋 Salin</button>
          <button id="n-save" class="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 sm:px-6 py-2 rounded-xl text-xs sm:text-sm">💾 Simpan</button>
        </div>
      </div>
    </div>`;

    injectStyles();

    const ta = document.getElementById('n-content');
    const preview = document.getElementById('n-preview');

    function updatePreview() {
      preview.innerHTML = window.marked ? marked.parse(ta.value || '') : esc(ta.value);
      preview.querySelectorAll('pre code').forEach(b => {
        if (window.hljs) { b.className = ''; hljs.highlightElement(b); }
      });
      rerenderMath();
    }
    ta.addEventListener('input', updatePreview);
    let deb;
    ta.addEventListener('input', () => { clearTimeout(deb); deb = setTimeout(() => updatePreview(), 180); });
    updatePreview();

    main.querySelectorAll('.snip-btn').forEach(b => b.addEventListener('click', () => {
      const s = SNIPPETS[b.dataset.i];
      const before = ta.value.slice(0, ta.selectionStart);
      const after = ta.value.slice(ta.selectionEnd);
      const sel = ta.selectionStart;
      ta.value = before + s.code + after;
      const newPos = sel + s.code.length;
      ta.focus(); ta.setSelectionRange(newPos, newPos);
      updatePreview();
    }));

    document.getElementById('n-copy-all').addEventListener('click', () => {
      navigator.clipboard?.writeText(ta.value).then(() => toast('Seluruh catatan disalin!', 'info'));
    });

    document.getElementById('n-save').addEventListener('click', async () => {
      const payload = {
        title: document.getElementById('n-title').value.trim(),
        content: ta.value,
        course_id: document.getElementById('n-course').value || null
      };
      if (!payload.title) { toast('Judul wajib diisi.', 'warn'); return; }
      try {
        if (note.id) await api.put(`/api/notes/${note.id}`, payload);
        else await api.post('/api/notes', payload);
        toast('Catatan tersimpan! ✨');
        load();
      } catch (e) { toast(e.message, 'error'); }
    });
  }

  await load();
}

const injectStyles = () => {
  if (document.getElementById('g-notes-style')) return;
  const s = document.createElement('style');
  s.id = 'g-notes-style';
  s.textContent = `
  .snip-btn{font-size:10px;font-family:'JetBrains Mono',monospace;background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:3px 7px;cursor:pointer;font-weight:600;color:#475569}
  .snip-btn:hover{background:#eef2ff;border-color:#6366f1;color:#4338ca}
  .g-inp{width:100%;border:1px solid #cbd5e1;border-radius:0.6rem;padding:0.55rem 0.8rem;font-size:0.85rem;outline:none}
  .g-inp:focus{border-color:#6366f1;box-shadow:0 0 0 3px #e0e7ff}`;
  document.head.appendChild(s);
};
