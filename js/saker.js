/* ════════════════════════════════
   TABS
════════════════════════════════ */

/* ════════════════════════════════
   LAGREDE SAKER (LocalStorage)
════════════════════════════════ */

const SAKER_KEY = 'kred_saker';
const THEME_KEY = 'forlikskalkulator_theme';

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.textContent = theme === 'dark' ? '☀️ Lys modus' : '🌙 Mørk modus';
  }
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const prefer = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  const theme = saved || prefer;
  applyTheme(theme);
}

function toggleTheme() {
  const current = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
}

function hentAlleSaker() {
  try { return JSON.parse(localStorage.getItem(SAKER_KEY)) || []; }
  catch { return []; }
}

function lagreSaker(saker) {
  localStorage.setItem(SAKER_KEY, JSON.stringify(saker));
}

function samleSakData() {
  // Samler alle relevante feltverdier fra alle tre moduler
  const ids = [
    'f-hovedstol','f-gebyr','f-renter','f-rettslige','f-direkte','f-tilbyr','f-kontonummer','f-kid',
    'sl-total','sl-renter','sl-salar','sl-hoved',
    'a-skyldner','a-mva','a-hovedstol','a-purregebyr','a-salar','a-rettslige',
    'a-forfall','a-iv-forfall','a-bo-dato','a-tung-salar','a-tung-salar-fremtidig',
    'a-mnd','a-mnd-belop','a-dato','a-dekning','a-salar-dato',
    'a-avdragssalar-fritak','a-bo-ikke-sendt',
    'rn-hoved','rn-fra','rn-til',
  ];
  const data = {};
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    data[id] = el.type === 'checkbox' ? el.checked : el.value;
  });
  return data;
}

function gjenopprettSakData(data) {
  Object.entries(data).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.type === 'checkbox') {
      el.checked = val;
    } else {
      el.value = val;
      if (el.dataset) el.dataset.beregnet = '0';
    }
  });
  // Kjør beregninger på nytt
  oppdaterFoerBO();
  beregnAvdrag();
  beregnForlik();
  beregnRente();
}

function lagreSak() {
  const navn = document.getElementById('sak-navn').value.trim();
  if (!navn) { document.getElementById('sak-navn').focus(); return; }

  const saker = hentAlleSaker();
  saker.unshift({
    id: Date.now(),
    navn,
    dato: new Date().toLocaleDateString('no-NO'),
    data: samleSakData(),
  });

  lagreSaker(saker);
  document.getElementById('sak-navn').value = '';
  visSakerListe();
  toast(`Sak "${navn}" er lagret!`);
}

function slettSak(id) {
  const saker = hentAlleSaker().filter(s => s.id !== id);
  lagreSaker(saker);
  visSakerListe();
}

let _aktivSakId = null;

function lastSak(id) {
  const sak = hentAlleSaker().find(s => s.id === id);
  if (!sak) return;
  _aktivSakId = id;
  gjenopprettSakData(sak.data);
  lukkSaker();
  visAktivSakIndikator();
}

function visAktivSakIndikator() {
  const saker = hentAlleSaker();
  const sak = saker.find(s => s.id === _aktivSakId);
  let el = document.getElementById('aktiv-sak-banner');
  if (!el) {
    el = document.createElement('div');
    el.id = 'aktiv-sak-banner';
    el.style.cssText = 'background:#eef4ff;border-bottom:2px solid #3a7bd5;padding:6px 40px;font-size:12px;color:#1e3a6e;display:flex;justify-content:space-between;align-items:center;';
    document.querySelector('header').after(el);
  }
  if (sak) {
    el.innerHTML = `
      <span>✏ Redigerer: <strong>${sak.navn}</strong> – endringer lagres automatisk <span style="opacity:0.6;font-weight:400;">· Ctrl+S for å lagre manuelt</span></span>
      <button onclick="_aktivSakId=null;document.getElementById('aktiv-sak-banner').remove()" style="background:none;border:none;color:#3a7bd5;font-size:12px;font-weight:600;cursor:pointer;">Koble fra</button>
    `;
    el.style.display = 'flex';
  } else {
    el.style.display = 'none';
  }
}

function autolagreSak() {
  if (!_aktivSakId) return;
  const saker = hentAlleSaker();
  const idx = saker.findIndex(s => s.id === _aktivSakId);
  if (idx === -1) { _aktivSakId = null; return; }
  saker[idx].data = samleSakData();
  saker[idx].dato = new Date().toLocaleDateString('no-NO');
  lagreSaker(saker);
}

function visSakerListe() {
  const saker = hentAlleSaker();
  const liste = document.getElementById('saker-liste');
  if (!liste) return;

  if (saker.length === 0) {
    liste.innerHTML = '<div style="color:var(--text-muted);font-size:13px;text-align:center;padding:20px 0;">Ingen lagrede saker ennå.</div>';
    return;
  }

  liste.innerHTML = saker.map(s => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border:1px solid var(--border);border-radius:8px;margin-bottom:8px;background:var(--bg);">
      <div>
        <div style="font-weight:600;font-size:14px;color:var(--ink);">${s.navn}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">Lagret ${s.dato}</div>
      </div>
      <div style="display:flex;gap:8px;">
        <button onclick="lastSak(${s.id})" style="background:var(--ink);color:var(--white);border:none;border-radius:6px;padding:6px 14px;font-size:12px;font-weight:600;cursor:pointer;">Hent</button>
        <button onclick="slettSak(${s.id})" style="background:var(--bg-dark);color:var(--text-muted);border:1px solid var(--border);border-radius:6px;padding:6px 10px;font-size:12px;cursor:pointer;" title="Slett">✕</button>
      </div>
    </div>
  `).join('');
}

function visSaker() {
  visSakerListe();
  const modal = document.getElementById('saker-modal');
  modal.style.display = 'flex';
}

function lukkSaker() {
  document.getElementById('saker-modal').style.display = 'none';
}

// Lukk modal ved klikk utenfor
document.addEventListener('click', e => {
  const modal = document.getElementById('saker-modal');
  if (e.target === modal) lukkSaker();
});

function switchTab(name) {
  // Håndter direkte hopp til verktøy-undertaber
  if (name === 'simulator') { switchTab('verktoy'); switchVerktoy('simulator'); return; }
  if (name === 'rente')     { switchTab('verktoy'); switchVerktoy('rente');     return; }

  // Når vi forlater verktøy-fanen, reset simulator sub-tab tilbake til rente
  if (name !== 'verktoy') {
    const vtabSim = document.getElementById('vtab-simulator');
    const vtabRente = document.getElementById('vtab-rente');
    if (vtabSim && vtabSim.style.display === 'block') {
      switchVerktoy('rente');
    }
  }

  const tabNames = ['avdrag', 'forlik', 'verktoy'];
  document.querySelectorAll('.tab').forEach((t, i) => {
    t.classList.toggle('active', tabNames[i] === name);
  });
  document.querySelectorAll('.tab-content').forEach(c => {
    const isActive = c.id === 'tab-' + name;
    c.classList.toggle('active', isActive);
    // Tving skjuling via inline style – sikrer riktig oppførsel uavhengig av CSS-spesifisitet
    c.style.display = isActive ? '' : 'none';
  });

  // Scroll til toppen ved fanebytte
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Ctrl+S – lagre aktiv sak
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    if (_aktivSakId) {
      autolagreSak();
      toast('Sak lagret (Ctrl+S)', 'ok', 2000);
    } else {
      visSaker();
      setTimeout(() => document.getElementById('sak-navn')?.focus(), 100);
      toast('Skriv inn navn og lagre saken', 'info', 3000);
    }
  }
});

function switchVerktoy(navn) {
  const visRente = navn === 'rente';
  document.getElementById('vtab-rente').style.display     = visRente ? 'block' : 'none';
  document.getElementById('vtab-simulator').style.display = visRente ? 'none'  : 'block';

  const btnR = document.getElementById('vtab-rente-btn');
  const btnS = document.getElementById('vtab-simulator-btn');
  if (btnR) {
    btnR.style.borderBottomColor = visRente ? 'var(--ink)' : 'transparent';
    btnR.style.fontWeight        = visRente ? '700' : '400';
    btnR.style.color             = visRente ? 'var(--ink)' : 'var(--text-muted)';
  }
  if (btnS) {
    btnS.style.borderBottomColor = !visRente ? 'var(--ink)' : 'transparent';
    btnS.style.fontWeight        = !visRente ? '700' : '400';
    btnS.style.color             = !visRente ? 'var(--ink)' : 'var(--text-muted)';
  }
}

/* ════════════════════════════════
   UTILITIES
════════════════════════════════ */
