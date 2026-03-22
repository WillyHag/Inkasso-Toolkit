function kr(n) {
  return 'kr ' + Number(n).toLocaleString('no-NO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Parser beløp – støtter både komma og punktum som desimalskilletegn
function parseKr(val) {
  if (!val) return 0;
  // Fjern mellomrom og kr-prefix, bytt komma med punktum
  const cleaned = String(val).replace(/\s/g, '').replace(/^kr\s*/i, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function tbl(n) {
  return Number(n).toLocaleString('no-NO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDecimalInput(input) {
  if (!input || !input.value) return;
  const parsed = parseKr(input.value);
  if (isNaN(parsed)) return;
  if (parsed === 0 && !/[1-9]/.test(input.value)) { input.value = ''; return; }
  input.value = parsed.toLocaleString('no-NO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function initAmountFormatting() {
  document.querySelectorAll('input[inputmode="decimal"]').forEach(input => {
    input.addEventListener('blur', () => formatDecimalInput(input));
    input.addEventListener('change', () => formatDecimalInput(input));
  });
}

function pst(n, av) {
  if (!av) return '0%';
  return (n / av * 100).toFixed(1) + '%';
}

function parseNO(str) {
  if (!str) return null;
  const parts = str.split('.');
  if (parts.length !== 3) return null;
  const d = parseInt(parts[0]), m = parseInt(parts[1]) - 1, y = parseInt(parts[2]);
  if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
  // Valider at dag/måned er innenfor gyldige verdier – Date ruller ellers over automatisk
  if (m < 0 || m > 11 || d < 1 || d > 31) return null;
  const dato = new Date(y, m, d);
  // Sjekk at datoen ikke har rullet over (f.eks. 31.02 → mars, 01.15 → neste år)
  if (dato.getFullYear() !== y || dato.getMonth() !== m || dato.getDate() !== d) return null;
  return dato;
}

function dagMellom(fra, til) {
  const diff = til - fra;
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

function leggTilMnd(dato, n) {
  const d = new Date(dato);
  d.setMonth(d.getMonth() + n);
  return d;
}

let avdragsFrekvens = 'maned';
function leggTilAvdragDato(dato, n) {
  const d = new Date(dato);
  if (avdragsFrekvens === 'uke') {
    d.setDate(d.getDate() + n * 7);
  } else if (avdragsFrekvens === 'touker') {
    // 2 ganger per måned (ca. hver 15. dag), ikke nøyaktig hver 14. dag.
    d.setDate(d.getDate() + n * 15);
  } else {
    d.setMonth(d.getMonth() + n);
  }
  return d;
}
function settFrekvens(freq) {
  avdragsFrekvens = freq;
  const labels = { uke: 'Ukentlig beløp', touker: 'Beløp per 2. uke', maned: 'Månedlig beløp' };
  const maks   = { uke: 520, touker: 260, maned: 120 };
  const belopLabel = document.getElementById('a-belop-label');
  if (belopLabel) belopLabel.textContent = labels[freq];
  const mndEl = document.getElementById('a-mnd');
  if (mndEl) mndEl.max = maks[freq];
  ['uke','touker','maned'].forEach(f => {
    const btn = document.getElementById('freq-' + f);
    if (!btn) return;
    btn.style.background  = f===freq ? 'var(--ink)'    : 'var(--bg-dark)';
    btn.style.color       = f===freq ? 'var(--white)'  : 'var(--text)';
    btn.style.borderColor = f===freq ? 'var(--ink)'    : 'var(--border)';
  });
  window._avdragsTerminer = null;
  if (mndEl) { mndEl.value=''; mndEl.dataset.beregnet=0; }
  const belopEl = document.getElementById('a-mnd-belop');
  if (belopEl) { belopEl.value=''; belopEl.dataset.beregnet=0; }
  beregnAvdrag();
}

function formatDato(d) {
  return d.toLocaleDateString('no-NO', { day:'2-digit', month:'2-digit', year:'numeric' });
}

/* ════════════════════════════════
   DATEPICKER
════════════════════════════════ */

let _dpAktiv = null;

/* ════════════════════════════════
   TOAST
════════════════════════════════ */

function toast(melding, type = 'ok', varighet = 2800) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  const ikon = { ok: '✓', feil: '✕', info: 'ℹ' }[type] ?? '✓';
  el.innerHTML = `<span>${ikon}</span><span>${melding}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add('toast-out');
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }, varighet);
}
