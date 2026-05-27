import { createClient }     from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON, SITE_NAME } from './config.js';

const sb = createClient(SUPABASE_URL, SUPABASE_ANON);

// ────────────────────────────────────────────
// كلمة المرور — مول السيت
// ────────────────────────────────────────────
const OWNER_PASSWORD = 'sba3';
const SESSION_KEY    = 'admin_auth_ok';

// ────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────
function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function uuid() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : 'id_' + Date.now().toString(36) + Math.random().toString(36).slice(2);
}
function genCode() {
  const ch = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = '';
  for (let i = 0; i < 8; i++) c += ch[Math.floor(Math.random() * ch.length)];
  return c.slice(0, 4) + '-' + c.slice(4);
}
function fmtDate(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}
function showModal(html) {
  const root = document.getElementById('modalRoot');
  root.innerHTML = html;
  root.querySelector('.modal-overlay')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });
}
function closeModal() { document.getElementById('modalRoot').innerHTML = ''; }

// ────────────────────────────────────────────
// AUTH — كلمة مرور محلية
// ────────────────────────────────────────────
function showAdminPanel() {
  document.getElementById('authModal').style.display = 'none';
  document.getElementById('adminApp').style.display  = 'flex';
  document.getElementById('adminEmailDisplay').textContent = '👑 مول السيت';
  initAdmin();
}

function showLoginScreen(errMsg) {
  document.getElementById('authModal').style.display = 'flex';
  document.getElementById('adminApp').style.display  = 'none';
  if (errMsg) {
    document.getElementById('authErr').innerHTML =
      `<div class="alert alert-error">${errMsg}</div>`;
  }
}

if (sessionStorage.getItem(SESSION_KEY) === '1') {
  showAdminPanel();
} else {
  showLoginScreen();
}

document.getElementById('authBtn').addEventListener('click', () => {
  const pass = document.getElementById('adminPass').value;
  const btn  = document.getElementById('authBtn');
  if (!pass) {
    document.getElementById('authErr').innerHTML =
      '<div class="alert alert-error">أدخل كلمة المرور.</div>';
    return;
  }
  if (pass === OWNER_PASSWORD) {
    sessionStorage.setItem(SESSION_KEY, '1');
    btn.innerHTML = '✅';
    setTimeout(() => showAdminPanel(), 300);
  } else {
    btn.disabled = true;
    document.getElementById('authErr').innerHTML =
      '<div class="alert alert-error">❌ كلمة المرور غلط. عاود حاول.</div>';
    setTimeout(() => { btn.disabled = false; btn.innerHTML = 'دخول 🚀'; }, 1500);
  }
});

document.getElementById('adminPass').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('authBtn').click();
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  sessionStorage.removeItem(SESSION_KEY);
  showLoginScreen();
  document.getElementById('adminPass').value = '';
});

// ────────────────────────────────────────────
// TABS
// ────────────────────────────────────────────
document.querySelectorAll('.admin-nav-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.admin-nav-item').forEach(i => i.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    item.classList.add('active');
    document.getElementById('tab-' + item.dataset.tab).classList.add('active');
    if (item.dataset.tab === 'dashboard') loadDashboard();
    if (item.dataset.tab === 'codes')     loadCodes();
    if (item.dataset.tab === 'courses')   showCourseList();
  });
});

function initAdmin() {
  loadDashboard();
  loadCodes();
  showCourseList();
  document.getElementById('addCodeBtn').addEventListener('click', showAddCodeModal);
  document.getElementById('genMultiBtn').addEventListener('click', showGenMultiModal);
}

// ────────────────────────────────────────────
// DASHBOARD
// ────────────────────────────────────────────
async function loadDashboard() {
  try {
    const { data: codes,   error: e1 } = await sb.from('codes').select('*');
    const { data: courses, error: e2 } = await sb.from('courses').select('id, chapters');
    if (e1) throw e1;
    if (e2) throw e2;

    const total   = codes?.length || 0;
    const active  = (codes || []).filter(c => c.active).length;
    const used    = (codes || []).filter(c => c.used).length;
    const lessons = (courses || []).reduce((n, c) => {
      return n + (c.chapters || []).reduce((m, ch) => m + (ch.lessons || []).length, 0);
    }, 0);

    document.getElementById('statsGrid').innerHTML = `
      <div class="stat-card"><div class="stat-val">${total}</div><div class="stat-lbl">Total codes</div></div>
      <div class="stat-card"><div class="stat-val">${active}</div><div class="stat-lbl">Codes actifs</div></div>
      <div class="stat-card"><div class="stat-val">${used}</div><div class="stat-lbl">Codes utilisés</div></div>
      <div class="stat-card"><div class="stat-val">${lessons}</div><div class="stat-lbl">Leçons</div></div>`;

    const recent = [...(codes || [])]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 8);

    document.getElementById('recentCodesTable').innerHTML = recent.length ? `
      <table>
        <thead><tr><th>Code</th><th>Label</th><th>Statut</th><th>Utilisé le</th></tr></thead>
        <tbody>
          ${recent.map(c => `
            <tr>
              <td><span class="code-mono">${esc(c.code)}</span></td>
              <td>${esc(c.label || '—')}</td>
              <td>${statusBadge(c)}</td>
              <td>${fmtDate(c.used_at)}</td>
            </tr>`).join('')}
        </tbody>
      </table>` : '<div class="empty-state"><div class="ei">🔑</div><p>Aucun code créé.</p></div>';
  } catch (e) {
    console.error('loadDashboard:', e);
  }
}

function statusBadge(c) {
  if (!c.active) return '<span class="badge badge-off">Désactivé</span>';
  if (c.used)    return '<span class="badge badge-used">Utilisé</span>';
  return '<span class="badge badge-free">Disponible</span>';
}

// ────────────────────────────────────────────
// CODES
// ────────────────────────────────────────────
async function loadCodes() {
  const tbody = document.getElementById('codesBody');
  const { data: codes, error } = await sb.from('codes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !codes) {
    tbody.innerHTML = '<tr><td colspan="5"><div class="alert alert-error">Erreur de chargement.</div></td></tr>';
    return;
  }
  if (!codes.length) {
    tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state"><div class="ei">🔑</div><p>Aucun code. Créez-en un !</p></div></td></tr>';
    return;
  }

  tbody.innerHTML = codes.map(c => `
    <tr>
      <td><span class="code-mono">${esc(c.code)}</span></td>
      <td>${esc(c.label || '—')}</td>
      <td>${statusBadge(c)}</td>
      <td style="font-size:.8rem;color:var(--text2)">${fmtDate(c.used_at)}</td>
      <td>
        <div class="td-actions">
          ${c.active
            ? `<button class="btn btn-danger btn-sm"   onclick="revokeCode('${c.id}')">Révoquer</button>`
            : `<button class="btn btn-success btn-sm"  onclick="reactivateCode('${c.id}')">Réactiver</button>`}
          <button class="btn btn-secondary btn-sm" onclick="deleteCode('${c.id}')">Supprimer</button>
        </div>
      </td>
    </tr>`).join('');
}

window.revokeCode = async (id) => {
  if (!confirm('Révoquer ce code ? Le client sera déconnecté immédiatement.')) return;
  const { error } = await sb.from('codes').update({ active: false }).eq('id', id);
  if (error) { alert('Erreur : ' + error.message); return; }
  loadCodes(); loadDashboard();
};
window.reactivateCode = async (id) => {
  const { error } = await sb.from('codes').update({ active: true }).eq('id', id);
  if (error) { alert('Erreur : ' + error.message); return; }
  loadCodes(); loadDashboard();
};
window.deleteCode = async (id) => {
  if (!confirm('Supprimer définitivement ce code ?')) return;
  const { error } = await sb.from('codes').delete().eq('id', id);
  if (error) { alert('Erreur : ' + error.message); return; }
  loadCodes(); loadDashboard();
};

function showAddCodeModal() {
  const suggestedCode = genCode();
  showModal(`
    <div class="modal-overlay">
      <div class="modal modal-sm">
        <h3>🔑 Nouveau code d'accès</h3>
        <div class="form-group">
          <label>Code (modifiable)</label>
          <input type="text" id="newCodeVal" value="${suggestedCode}"
            maxlength="20" style="font-family:'JetBrains Mono',monospace;font-weight:700;letter-spacing:2px;text-transform:uppercase"/>
        </div>
        <div class="form-group">
          <label>Label / Nom du client (optionnel)</label>
          <input type="text" id="newCodeLabel" placeholder="ex: Ahmed M."/>
        </div>
        <div id="addCodeErr"></div>
        <div class="modal-actions">
          <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
          <button class="btn btn-primary" id="saveCodeBtn">Créer</button>
        </div>
      </div>
    </div>`);

  document.getElementById('newCodeVal').addEventListener('input', e => {
    e.target.value = e.target.value.toUpperCase();
  });
  document.getElementById('saveCodeBtn').addEventListener('click', async () => {
    const code   = document.getElementById('newCodeVal').value.trim().toUpperCase();
    const label  = document.getElementById('newCodeLabel').value.trim();
    const errDiv = document.getElementById('addCodeErr');
    if (!code) { errDiv.innerHTML = '<div class="alert alert-error">Le code ne peut pas être vide.</div>'; return; }
    const btn = document.getElementById('saveCodeBtn');
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>';
    const { error } = await sb.from('codes').insert({
      code, label, active: true, used: false,
      session_token: null, device_id: null, used_at: null
    });
    if (error) {
      errDiv.innerHTML = `<div class="alert alert-error">❌ ${error.message}</div>`;
      btn.disabled = false; btn.innerHTML = 'Créer';
      return;
    }
    closeModal(); loadCodes(); loadDashboard();
  });
}

function showGenMultiModal() {
  showModal(`
    <div class="modal-overlay">
      <div class="modal modal-sm">
        <h3>⚡ Générer plusieurs codes</h3>
        <div class="form-group">
          <label>Nombre de codes à générer</label>
          <input type="number" id="genCount" value="5" min="1" max="50"/>
        </div>
        <div id="genErr"></div>
        <div class="modal-actions">
          <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
          <button class="btn btn-primary" id="genBtn">Générer</button>
        </div>
      </div>
    </div>`);

  document.getElementById('genBtn').addEventListener('click', async () => {
    const n   = Math.min(parseInt(document.getElementById('genCount').value) || 5, 50);
    const btn = document.getElementById('genBtn');
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Génération…';

    const rows = Array.from({ length: n }, () => ({
      code: genCode(), label: '', active: true, used: false,
      session_token: null, device_id: null, used_at: null
    }));

    const { error } = await sb.from('codes').insert(rows);
    if (error) {
      document.getElementById('genErr').innerHTML = `<div class="alert alert-error">❌ ${error.message}</div>`;
      btn.disabled = false; btn.innerHTML = 'Générer';
      return;
    }
    closeModal(); loadCodes(); loadDashboard();
  });
}

window.closeModal = closeModal;

// ────────────────────────────────────────────
// COURSES — state machine
// ────────────────────────────────────────────
let state = { view: 'list', courseId: null, chapterId: null, lessonId: null };
let coursesCache = {};

async function getCourse(id) {
  const { data, error } = await sb.from('courses').select('*').eq('id', id).single();
  if (error || !data) return null;
  coursesCache[id] = data;
  return data;
}

async function showCourseList() {
  state = { view: 'list', courseId: null, chapterId: null, lessonId: null };
  document.getElementById('coursePageTitle').textContent = 'Cours';
  document.getElementById('breadcrumb').style.display = 'none';
  document.getElementById('coursePageActions').innerHTML =
    `<button class="btn btn-primary" id="addCourseBtn">+ Ajouter un cours</button>`;
  document.getElementById('addCourseBtn').addEventListener('click', showAddCourseModal);

  const view = document.getElementById('coursesView');
  view.innerHTML = '<div style="padding:24px;color:var(--text2);text-align:center">⏳ Chargement…</div>';

  try {
    const { data: courses, error } = await sb.from('courses')
      .select('*')
      .order('order', { ascending: true });
    if (error) throw error;

    if (!courses || !courses.length) {
      view.innerHTML = '<div class="empty-state"><div class="ei">📚</div><p>Aucun cours. Créez-en un !</p></div>';
      return;
    }

    view.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead><tr><th>#</th><th>Titre du cours</th><th>Chapitres</th><th>Leçons</th><th>Actions</th></tr></thead>
          <tbody>
            ${courses.map(c => {
              const chs = c.chapters || [];
              const lsn = chs.reduce((n, ch) => n + (ch.lessons || []).length, 0);
              return `
                <tr>
                  <td style="color:var(--text3)">${c.order || 1}</td>
                  <td><strong>${esc(c.title)}</strong>${c.description ? `<br><span style="font-size:.8rem;color:var(--text2)">${esc(c.description)}</span>` : ''}</td>
                  <td>${chs.length}</td>
                  <td>${lsn}</td>
                  <td>
                    <div class="td-actions">
                      <button class="btn btn-secondary btn-sm" onclick="openCourse('${c.id}')">Gérer</button>
                      <button class="btn btn-danger btn-sm"    onclick="deleteCourse('${c.id}')">Supprimer</button>
                    </div>
                  </td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  } catch (e) {
    console.error('showCourseList:', e);
    view.innerHTML = `
      <div class="alert alert-error" style="margin:16px">
        ❌ Impossible de charger les cours.<br>
        <small style="opacity:.8">${e.message || e}</small>
      </div>`;
  }
}

window.openCourse = async (courseId) => {
  state = { view: 'chapters', courseId, chapterId: null, lessonId: null };
  const course = await getCourse(courseId);
  if (!course) return;

  document.getElementById('coursePageTitle').textContent = course.title;
  document.getElementById('coursePageActions').innerHTML =
    `<button class="btn btn-primary" id="addChBtn">+ Ajouter un chapitre</button>`;
  document.getElementById('addChBtn').addEventListener('click', () => showAddChapterModal(courseId));

  setBreadcrumb([
    { label: 'Cours', action: 'showCourseList()' },
    { label: esc(course.title) }
  ]);

  const chapters = (course.chapters || []).slice().sort((a, b) => a.order - b.order);
  const view = document.getElementById('coursesView');

  if (!chapters.length) {
    view.innerHTML = '<div class="empty-state"><div class="ei">📑</div><p>Aucun chapitre. Ajoutez-en un !</p></div>';
    return;
  }

  view.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>#</th><th>Titre du chapitre</th><th>Leçons</th><th>Actions</th></tr></thead>
        <tbody>
          ${chapters.map(ch => `
            <tr>
              <td style="color:var(--text3)">${ch.order}</td>
              <td><strong>${esc(ch.title)}</strong></td>
              <td>${(ch.lessons || []).length}</td>
              <td>
                <div class="td-actions">
                  <button class="btn btn-secondary btn-sm" onclick="openChapter('${courseId}','${ch.id}')">Gérer</button>
                  <button class="btn btn-danger btn-sm"    onclick="deleteChapter('${courseId}','${ch.id}')">Supprimer</button>
                </div>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
};

window.openChapter = async (courseId, chapterId) => {
  state = { view: 'lessons', courseId, chapterId, lessonId: null };
  const course  = await getCourse(courseId);
  const chapter = course?.chapters?.find(c => c.id === chapterId);
  if (!chapter) return;

  document.getElementById('coursePageTitle').textContent = chapter.title;
  document.getElementById('coursePageActions').innerHTML =
    `<button class="btn btn-primary" id="addLsnBtn">+ Ajouter une leçon</button>`;
  document.getElementById('addLsnBtn').addEventListener('click', () => showLessonEditor(courseId, chapterId, null));

  setBreadcrumb([
    { label: 'Cours', action: 'showCourseList()' },
    { label: esc(course.title), action: `openCourse('${courseId}')` },
    { label: esc(chapter.title) }
  ]);

  const lessons = (chapter.lessons || []).slice().sort((a, b) => a.order - b.order);
  const view = document.getElementById('coursesView');

  if (!lessons.length) {
    view.innerHTML = '<div class="empty-state"><div class="ei">🎬</div><p>Aucune leçon. Ajoutez-en une !</p></div>';
    return;
  }

  view.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>#</th><th>Titre de la leçon</th><th>Vidéo</th><th>Codes</th><th>Actions</th></tr></thead>
        <tbody>
          ${lessons.map(l => `
            <tr>
              <td style="color:var(--text3)">${l.order}</td>
              <td><strong>${esc(l.title)}</strong></td>
              <td>${l.videoUrl ? '<span class="badge badge-on">✓ Oui</span>' : '<span class="badge badge-off">Non</span>'}</td>
              <td>${(l.codeSnippets || []).length}</td>
              <td>
                <div class="td-actions">
                  <button class="btn btn-secondary btn-sm" onclick="showLessonEditor('${courseId}','${chapterId}','${l.id}')">Modifier</button>
                  <button class="btn btn-danger btn-sm"    onclick="deleteLesson('${courseId}','${chapterId}','${l.id}')">Supprimer</button>
                </div>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
};

// ── lesson editor ──
window.showLessonEditor = async (courseId, chapterId, lessonId) => {
  const course  = await getCourse(courseId);
  const chapter = course?.chapters?.find(c => c.id === chapterId);
  let lesson    = lessonId ? chapter?.lessons?.find(l => l.id === lessonId) : null;

  const isNew = !lesson;
  if (isNew) lesson = {
    id: uuid(), title: '', order: (chapter?.lessons?.length || 0) + 1,
    videoUrl: '', description: '', codeSnippets: []
  };

  document.getElementById('coursePageTitle').textContent = isNew ? 'Nouvelle leçon' : 'Modifier la leçon';
  document.getElementById('coursePageActions').innerHTML = '';

  setBreadcrumb([
    { label: 'Cours',            action: 'showCourseList()' },
    { label: esc(course.title),  action: `openCourse('${courseId}')` },
    { label: esc(chapter.title), action: `openChapter('${courseId}','${chapterId}')` },
    { label: isNew ? 'Nouvelle leçon' : esc(lesson.title) }
  ]);

  const snips = lesson.codeSnippets || [];

  document.getElementById('coursesView').innerHTML = `
    <div style="max-width:720px">
      <div class="form-group">
        <label>Titre de la leçon *</label>
        <input type="text" id="lsnTitle" value="${esc(lesson.title)}" placeholder="ex: Introduction à Python"/>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Ordre</label>
          <input type="number" id="lsnOrder" value="${lesson.order}" min="1"/>
        </div>
      </div>
      <div class="form-group">
        <label>URL de la vidéo (bunny.net embed)</label>
        <input type="url" id="lsnVideo" value="${esc(lesson.videoUrl || '')}"
          placeholder="https://iframe.mediadelivery.net/embed/…"/>
        <p style="font-size:.75rem;color:var(--text3);margin-top:4px">Copiez l'URL embed depuis votre tableau de bord bunny.net</p>
      </div>
      <div class="form-group">
        <label>Description (optionnel)</label>
        <textarea id="lsnDesc" rows="3" placeholder="Résumé de la leçon…">${esc(lesson.description || '')}</textarea>
      </div>

      <div class="divider"></div>

      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <p style="font-weight:600;font-size:.95rem">📋 Codes du cours</p>
        <button class="btn btn-secondary btn-sm" id="addSnipBtn">+ Ajouter un code</button>
      </div>
      <div id="snipsContainer">
        ${snips.map((s, i) => snippetEditorRow(s, i)).join('')}
      </div>

      <div class="divider"></div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-secondary" onclick="openChapter('${courseId}','${chapterId}')">Annuler</button>
        <button class="btn btn-primary" id="saveLsnBtn">💾 Enregistrer la leçon</button>
      </div>
      <div id="lsnMsg" style="margin-top:10px"></div>
    </div>`;

  let snipCount = snips.length;

  document.getElementById('addSnipBtn').addEventListener('click', () => {
    const container = document.getElementById('snipsContainer');
    const row = document.createElement('div');
    row.innerHTML = snippetEditorRow({ title: '', language: 'python', code: '' }, snipCount++);
    container.appendChild(row.firstElementChild);
  });

  document.getElementById('saveLsnBtn').addEventListener('click', async () => {
    const title = document.getElementById('lsnTitle').value.trim();
    const order = parseInt(document.getElementById('lsnOrder').value) || 1;
    const video = document.getElementById('lsnVideo').value.trim();
    const desc  = document.getElementById('lsnDesc').value.trim();
    const msg   = document.getElementById('lsnMsg');
    const btn   = document.getElementById('saveLsnBtn');

    if (!title) { msg.innerHTML = '<div class="alert alert-error">Le titre est requis.</div>'; return; }

    const snippets = [];
    document.querySelectorAll('.snip-row').forEach(row => {
      const t = row.querySelector('.snip-title-in').value.trim();
      const l = row.querySelector('.snip-lang-in').value;
      const c = row.querySelector('.snip-code-in').value;
      if (c.trim()) snippets.push({ id: uuid(), title: t || 'Code', language: l, code: c });
    });

    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Enregistrement…';

    const updatedLesson = { id: lesson.id, title, order, videoUrl: video, description: desc, codeSnippets: snippets };

    try {
      const freshCourse = await getCourse(courseId);
      const chs   = freshCourse.chapters || [];
      const chIdx = chs.findIndex(c => c.id === chapterId);
      if (chIdx === -1) throw new Error('Chapitre introuvable.');

      const lsns = chs[chIdx].lessons || [];
      const lIdx = lsns.findIndex(l => l.id === lesson.id);
      if (lIdx === -1) lsns.push(updatedLesson); else lsns[lIdx] = updatedLesson;
      chs[chIdx].lessons = lsns;

      const { error } = await sb.from('courses').update({ chapters: chs }).eq('id', courseId);
      if (error) throw error;
      delete coursesCache[courseId];

      msg.innerHTML = '<div class="alert alert-success">✓ Leçon enregistrée avec succès !</div>';
      btn.disabled = false; btn.innerHTML = '💾 Enregistrer la leçon';
      setTimeout(() => openChapter(courseId, chapterId), 1200);
    } catch (e) {
      console.error('saveLesson:', e);
      msg.innerHTML = `<div class="alert alert-error">❌ Erreur : ${e.message || e}</div>`;
      btn.disabled = false; btn.innerHTML = '💾 Enregistrer la leçon';
    }
  });
};

function snippetEditorRow(s, i) {
  const langs = ['python', 'javascript', 'html', 'css', 'php', 'java', 'cpp', 'bash', 'sql', 'json', 'text'];
  return `
    <div class="snip-row" id="snip_${i}">
      <div class="snip-row-head">
        <input type="text" class="snip-title-in" value="${esc(s.title || '')}" placeholder="Titre (ex: main.py)" style="flex:1"/>
        <select class="snip-lang-in" style="width:130px">
          ${langs.map(l => `<option value="${l}" ${l === s.language ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
        <button type="button" class="btn btn-danger btn-icon" onclick="this.closest('.snip-row').remove()" title="Supprimer">✕</button>
      </div>
      <textarea class="snip-code-in" rows="6" placeholder="Collez votre code ici…"
        style="font-family:'JetBrains Mono',monospace;font-size:.82rem">${esc(s.code || '')}</textarea>
    </div>`;
}

// ── delete helpers ──
window.deleteChapter = async (courseId, chapterId) => {
  if (!confirm('Supprimer ce chapitre et toutes ses leçons ?')) return;
  const course = await getCourse(courseId);
  const chs    = (course.chapters || []).filter(c => c.id !== chapterId);
  const { error } = await sb.from('courses').update({ chapters: chs }).eq('id', courseId);
  if (error) { alert('Erreur : ' + error.message); return; }
  delete coursesCache[courseId];
  openCourse(courseId);
};

window.deleteLesson = async (courseId, chapterId, lessonId) => {
  if (!confirm('Supprimer cette leçon ?')) return;
  const course = await getCourse(courseId);
  const chs    = course.chapters || [];
  const chIdx  = chs.findIndex(c => c.id === chapterId);
  if (chIdx === -1) return;
  chs[chIdx].lessons = (chs[chIdx].lessons || []).filter(l => l.id !== lessonId);
  const { error } = await sb.from('courses').update({ chapters: chs }).eq('id', courseId);
  if (error) { alert('Erreur : ' + error.message); return; }
  delete coursesCache[courseId];
  openChapter(courseId, chapterId);
};

window.deleteCourse = async (courseId) => {
  if (!confirm('Supprimer ce cours et tout son contenu ?')) return;
  const { error } = await sb.from('courses').delete().eq('id', courseId);
  if (error) { alert('Erreur : ' + error.message); return; }
  delete coursesCache[courseId];
  showCourseList();
};

// ── add course modal ──
function showAddCourseModal() {
  showModal(`
    <div class="modal-overlay">
      <div class="modal modal-sm">
        <h3>📚 Nouveau cours</h3>
        <div class="form-group">
          <label>Titre du cours *</label>
          <input type="text" id="newCourseTitle" placeholder="ex: Python pour débutants"/>
        </div>
        <div class="form-group">
          <label>Description (optionnel)</label>
          <textarea id="newCourseDesc" rows="2" placeholder="Brève description du cours…"></textarea>
        </div>
        <div class="form-group">
          <label>Ordre d'affichage</label>
          <input type="number" id="newCourseOrder" value="1" min="1"/>
        </div>
        <div id="saveCourseErr"></div>
        <div class="modal-actions">
          <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
          <button class="btn btn-primary" id="saveCourseBtn">Créer</button>
        </div>
      </div>
    </div>`);

  document.getElementById('saveCourseBtn').addEventListener('click', async () => {
    const title  = document.getElementById('newCourseTitle').value.trim();
    const desc   = document.getElementById('newCourseDesc').value.trim();
    const order  = parseInt(document.getElementById('newCourseOrder').value) || 1;
    const errDiv = document.getElementById('saveCourseErr');
    if (!title) { errDiv.innerHTML = '<div class="alert alert-error">Le titre est requis.</div>'; return; }
    const btn = document.getElementById('saveCourseBtn');
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Création…';
    errDiv.innerHTML = '';
    const { error } = await sb.from('courses').insert({
      title, description: desc, order, chapters: []
    });
    if (error) {
      errDiv.innerHTML = `<div class="alert alert-error">❌ ${error.message}</div>`;
      btn.disabled = false; btn.innerHTML = 'Créer';
      return;
    }
    closeModal(); showCourseList();
  });
}

// ── add chapter modal ──
function showAddChapterModal(courseId) {
  showModal(`
    <div class="modal-overlay">
      <div class="modal modal-sm">
        <h3>📑 Nouveau chapitre</h3>
        <div class="form-group">
          <label>Titre du chapitre *</label>
          <input type="text" id="newChTitle" placeholder="ex: Chapitre 1 — Introduction"/>
        </div>
        <div class="form-group">
          <label>Ordre</label>
          <input type="number" id="newChOrder" value="1" min="1"/>
        </div>
        <div id="saveChErr"></div>
        <div class="modal-actions">
          <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
          <button class="btn btn-primary" id="saveChBtn">Créer</button>
        </div>
      </div>
    </div>`);

  document.getElementById('saveChBtn').addEventListener('click', async () => {
    const title  = document.getElementById('newChTitle').value.trim();
    const order  = parseInt(document.getElementById('newChOrder').value) || 1;
    const errDiv = document.getElementById('saveChErr');
    if (!title) { errDiv.innerHTML = '<div class="alert alert-error">Le titre est requis.</div>'; return; }
    const btn = document.getElementById('saveChBtn');
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Création…';
    errDiv.innerHTML = '';
    try {
      const course = await getCourse(courseId);
      const chs    = course.chapters || [];
      chs.push({ id: uuid(), title, order, lessons: [] });
      const { error } = await sb.from('courses').update({ chapters: chs }).eq('id', courseId);
      if (error) throw error;
      delete coursesCache[courseId];
      closeModal(); openCourse(courseId);
    } catch (e) {
      errDiv.innerHTML = `<div class="alert alert-error">❌ ${e.message || e}</div>`;
      btn.disabled = false; btn.innerHTML = 'Créer';
    }
  });
}

// ── breadcrumb ──
function setBreadcrumb(items) {
  const bc = document.getElementById('breadcrumb');
  bc.style.display = 'flex';
  bc.innerHTML = items.map((item, i) => {
    if (i < items.length - 1) {
      return `<a onclick="${item.action}">${item.label}</a><span class="sep">›</span>`;
    }
    return `<span>${item.label}</span>`;
  }).join('');
}

window.showCourseList = showCourseList;
window.openCourse     = window.openCourse;
window.openChapter    = window.openChapter;
