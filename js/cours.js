import { initializeApp }   from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, doc, getDoc, collection, getDocs, query, orderBy }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { FIREBASE_CONFIG, SITE_NAME } from './config.js';

const app = initializeApp(FIREBASE_CONFIG);
const db  = getFirestore(app);

// ── auth guard ──
async function checkAuth() {
  const codeId = localStorage.getItem('_cid');
  const token  = localStorage.getItem('_tok');
  if (!codeId || !token) { location.href = 'index.html'; return false; }
  try {
    const snap = await getDoc(doc(db, 'codes', codeId));
    if (snap.exists() && snap.data().active && snap.data().sessionToken === token) return true;
  } catch(_) {}
  ['_cid','_tok','_code'].forEach(k => localStorage.removeItem(k));
  location.href = 'index.html';
  return false;
}

// ── escape HTML ──
function esc(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── render lesson ──
function renderLesson(lesson, el) {
  document.querySelectorAll('.lesson-item').forEach(li => li.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('headerTitle').textContent = lesson.title;

  const body = document.getElementById('courseBody');
  let html = '';

  if (lesson.videoUrl) {
    html += `
      <div class="video-wrap">
        <iframe src="${esc(lesson.videoUrl)}"
          allowfullscreen allow="autoplay; fullscreen; picture-in-picture"></iframe>
      </div>`;
  }

  html += `<h1 class="lesson-title">${esc(lesson.title)}</h1>`;
  if (lesson.description) html += `<p class="lesson-desc">${esc(lesson.description)}</p>`;

  const snips = lesson.codeSnippets || [];
  if (snips.length > 0) {
    html += `<div class="divider"></div><p class="snippets-title">📋 Code du cours</p>`;
    snips.forEach((s, i) => {
      html += `
        <div class="snippet-card">
          <div class="snippet-head">
            <span class="snippet-name">${esc(s.title || 'Code')}</span>
            <span class="snippet-lang-tag">${esc(s.language || 'text')}</span>
          </div>
          <div class="snippet-body">
            <button class="copy-btn" data-idx="${i}">Copier</button>
            <pre><code class="language-${esc(s.language || 'plaintext')}">${esc(s.code || '')}</code></pre>
          </div>
        </div>`;
    });
  }

  body.innerHTML = html;
  body.scrollTop = 0;

  // highlight.js
  if (window.hljs) {
    body.querySelectorAll('pre code').forEach(el => hljs.highlightElement(el));
  }

  // copy buttons
  body.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const code = btn.closest('.snippet-body').querySelector('code').textContent;
      navigator.clipboard.writeText(code).then(() => {
        btn.textContent = '✓ Copié';
        setTimeout(() => { btn.textContent = 'Copier'; }, 2000);
      });
    });
  });
}

// ── build sidebar ──
async function buildSidebar() {
  const nav = document.getElementById('sidebarNav');
  nav.innerHTML = '<div style="padding:20px;color:var(--text3);font-size:.85rem">Chargement…</div>';

  const snap = await getDocs(query(collection(db,'courses'), orderBy('order')));
  nav.innerHTML = '';

  if (snap.empty) {
    nav.innerHTML = '<div style="padding:20px;color:var(--text3);font-size:.85rem">Aucun contenu disponible.</div>';
    return;
  }

  let firstLesson = null, firstEl = null;

  snap.forEach(courseDoc => {
    const course   = courseDoc.data();
    const chapters = (course.chapters || []).slice().sort((a,b) => a.order - b.order);

    chapters.forEach((ch, ci) => {
      const lessons = (ch.lessons || []).slice().sort((a,b) => a.order - b.order);
      const chEl = document.createElement('div');
      chEl.className = 'chapter-item';

      chEl.innerHTML = `
        <div class="chapter-header">
          <div class="ch-num">${ci + 1}</div>
          <span style="flex:1">${esc(ch.title)}</span>
          <svg class="ch-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9,18 15,12 9,6"/>
          </svg>
        </div>
        <div class="chapter-lessons">
          ${lessons.map(l => `
            <div class="lesson-item" data-id="${esc(l.id)}">
              <div class="lesson-dot"></div>
              <span>${esc(l.title)}</span>
            </div>`).join('')}
        </div>`;

      chEl.querySelector('.chapter-header').addEventListener('click', () => {
        chEl.classList.toggle('open');
      });

      chEl.querySelectorAll('.lesson-item').forEach(li => {
        const lId = li.dataset.id;
        const lesson = lessons.find(x => x.id === lId);
        if (!firstLesson) { firstLesson = lesson; firstEl = li; }
        li.addEventListener('click', () => renderLesson(lesson, li));
      });

      nav.appendChild(chEl);
    });
  });

  // open first chapter by default
  const firstChapter = nav.querySelector('.chapter-item');
  if (firstChapter) firstChapter.classList.add('open');
}

// ── periodic revocation check (every 4 min) ──
setInterval(async () => {
  const ok = await checkAuth();
  if (!ok) { alert('Votre accès a été révoqué.'); location.href = 'index.html'; }
}, 4 * 60 * 1000);

// ── logout ──
document.getElementById('logoutBtn').addEventListener('click', () => {
  ['_cid','_tok','_code'].forEach(k => localStorage.removeItem(k));
  location.href = 'index.html';
});

// ── init ──
document.getElementById('siteNameEl').textContent = SITE_NAME;
document.title = SITE_NAME;

const ok = await checkAuth();
if (ok) {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('app').style.display     = 'flex';
  await buildSidebar();
}
