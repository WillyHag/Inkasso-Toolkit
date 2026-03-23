function kopierTekst(tekst, melding) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(tekst)
      .then(() => alert(melding || 'Kopiert!'))
      .catch(() => kopierFallback(tekst, melding));
  } else {
    kopierFallback(tekst, melding);
  }
}

function kopierFallback(tekst, melding) {
  const el = document.createElement('textarea');
  el.value = tekst;
  el.style.position = 'fixed';
  el.style.opacity = '0';
  document.body.appendChild(el);
  el.focus();
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
  alert(melding || 'Kopiert!');
}

function visPstInput(sliderId, valId, min, max, callback) {
  const valEl = document.getElementById(valId);
  const slider = document.getElementById(sliderId);
  const current = parseInt(slider.value) || 0;

  // Erstatt badge midlertidig med et lite input-felt
  const inp = document.createElement('input');
  inp.type = 'number';
  inp.min = min;
  inp.max = max;
  inp.value = current;
  inp.style.cssText = `width:56px;font-family:'DM Mono',monospace;font-size:13px;font-weight:700;
    background:var(--ink);color:var(--accent);border:none;border-radius:4px;
    padding:1px 6px;text-align:center;outline:none;`;

  valEl.replaceWith(inp);
  inp.focus();
  inp.select();

  function bekreft() {
    let v = Math.min(max, Math.max(min, parseInt(inp.value) || 0));
    slider.value = v;
    // Gjenopprett badge
    const span = document.createElement('span');
    span.className = 'slider-value';
    span.id = valId;
    span.textContent = v + '%';
    span.title = 'Klikk for å skrive inn prosent';
    span.style.cursor = 'pointer';
    span.onclick = () => visPstInput(sliderId, valId, min, max, callback);
    inp.replaceWith(span);
    callback(v);
  }

  inp.addEventListener('blur', bekreft);
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); bekreft(); }
    if (e.key === 'Escape') {
      const span = document.createElement('span');
      span.className = 'slider-value';
      span.id = valId;
      span.textContent = current + '%';
      span.title = 'Klikk for å skrive inn prosent';
      span.style.cursor = 'pointer';
      span.onclick = () => visPstInput(sliderId, valId, min, max, callback);
      inp.replaceWith(span);
    }
  });
}

function nullstillTotalSlider() {
  document.getElementById('sl-total').value = 0;
  document.getElementById('sl-total-val').textContent = '0%';
}

function beregnTotalRabatt(pst) {
  pst = parseInt(pst);
  document.getElementById('sl-total-val').textContent = pst + '%';
  document.getElementById('f-direkte').value = '';

  const v = getForlikInput();
  const total = v.hoved + v.gebyr + v.renter + v.rettslig;
  if (!total) return;

  const proporsjonal = document.getElementById('f-proporsjonal')?.checked;

  if (proporsjonal) {
    // Proporsjonal: samme prosent på alle poster (rettslige alltid 0% rabatt)
    const pstRenter = v.renter  > 0 ? pst : 0;
    const pstSalar  = v.gebyr   > 0 ? pst : 0;
    const pstHoved  = v.hoved   > 0 ? Math.min(pst, parseInt(document.getElementById('sl-hoved').max)) : 0;

    document.getElementById('sl-renter').value = pstRenter;
    document.getElementById('sl-renter-val').textContent = pstRenter + '%';
    document.getElementById('sl-salar').value = pstSalar;
    document.getElementById('sl-salar-val').textContent = pstSalar + '%';
    document.getElementById('sl-hoved').value = pstHoved;
    document.getElementById('sl-hoved-val').textContent = pstHoved + '%';
  } else {
    // Standard: renter frafalles først, deretter salær, så evt. hovedstol
    const rabattKroner = total * (pst / 100);
    let rest = rabattKroner;

    const rabattRenter = Math.min(rest, v.renter); rest -= rabattRenter;
    const pstRenter = v.renter > 0 ? Math.round((rabattRenter / v.renter) * 100) : 0;

    const rabattSalar = Math.min(rest, v.gebyr); rest -= rabattSalar;
    const pstSalar = v.gebyr > 0 ? Math.round((rabattSalar / v.gebyr) * 100) : 0;

    const rabattHoved = Math.min(rest, v.hoved);
    const pstHoved = v.hoved > 0 ? Math.min(parseInt(document.getElementById('sl-hoved').max), Math.round((rabattHoved / v.hoved) * 100)) : 0;

    document.getElementById('sl-renter').value = pstRenter;
    document.getElementById('sl-renter-val').textContent = pstRenter + '%';
    document.getElementById('sl-salar').value = pstSalar;
    document.getElementById('sl-salar-val').textContent = pstSalar + '%';
    document.getElementById('sl-hoved').value = pstHoved;
    document.getElementById('sl-hoved-val').textContent = pstHoved + '%';
  }

  beregnForlik();
}

function getForlikInput() {
  return {
    hoved:    parseKr(document.getElementById('f-hovedstol').value) || 0,
    gebyr:    parseKr(document.getElementById('f-gebyr').value)     || 0,
    renter:   parseKr(document.getElementById('f-renter').value)    || 0,
    rettslig: parseKr(document.getElementById('f-rettslige').value) || 0,
  };
}

function beregnForlik() {
  // Hvis direkte-beløp er fylt inn, bruk den logikken
  const direkteVal = document.getElementById('f-direkte').value;
  if (direkteVal && !isNaN(parseFloat(direkteVal))) {
    beregnForlikDirekte();
    return;
  }

  const v = getForlikInput();
  const total = v.hoved + v.gebyr + v.renter + v.rettslig;

  const rabattSalar  = parseInt(document.getElementById('sl-salar').value)  / 100;
  const rabattRenter = parseInt(document.getElementById('sl-renter').value) / 100;
  const rabattHoved  = parseInt(document.getElementById('sl-hoved').value)  / 100;

  const nyGebyr    = v.gebyr    * (1 - rabattSalar);
  const nyRenter   = v.renter   * (1 - rabattRenter);
  const nyRettslig = v.rettslig;
  const nyHoved    = v.hoved    * (1 - rabattHoved);

  const forlik = nyHoved + nyGebyr + nyRenter + nyRettslig;
  const sparer = total - forlik;
  const hovedstolAvslag = Math.max(0, v.hoved - nyHoved);

  // Oppdater total-slideren basert på faktisk rabatt
  if (total > 0) {
    const totalPst = Math.round((sparer / total) * 100);
    document.getElementById('sl-total').value = totalPst;
    document.getElementById('sl-total-val').textContent = totalPst + '%';
  }

  visForlikResultat(v, total, forlik, sparer, nyHoved, nyGebyr, nyRenter, nyRettslig, hovedstolAvslag);
}

function beregnForlikDirekte() {
  const direkte = parseKr(document.getElementById('f-direkte').value);
  if (isNaN(direkte)) return;

  const v = getForlikInput();
  const total = v.hoved + v.gebyr + v.renter + v.rettslig;
  const sparer = total - direkte;
  const proporsjonal = document.getElementById('f-proporsjonal')?.checked;

  // Nullstill slidere
  ['sl-salar','sl-renter','sl-hoved'].forEach(id => {
    document.getElementById(id).value = 0;
    document.getElementById(id + '-val').textContent = '0%';
  });

  let nyHoved, nyGebyr, nyRenter, nyRettslig, hovedstolAvslag;
  nyRettslig = v.rettslig; // alltid fullt

  if (proporsjonal) {
    // Proporsjonal: fordel likt mellom renter, salær og hovedstol
    const fordelbar = v.hoved + v.gebyr + v.renter;
    const tilResterende = Math.max(0, direkte - v.rettslig);
    const andel = fordelbar > 0 ? Math.min(tilResterende / fordelbar, 1) : 0;
    nyRenter = Math.round(v.renter * andel * 100) / 100;
    nyGebyr  = Math.round(v.gebyr  * andel * 100) / 100;
    nyHoved  = Math.round(v.hoved  * andel * 100) / 100;
    hovedstolAvslag = Math.max(0, v.hoved - nyHoved);

    // Oppdater individuelle slidere med riktig prosent per post
    const pstRenter = v.renter > 0 ? Math.round((1 - andel) * 100) : 0;
    const pstSalar  = v.gebyr  > 0 ? Math.round((1 - andel) * 100) : 0;
    const pstHoved  = v.hoved  > 0 ? Math.min(Math.round((1 - andel) * 100), parseInt(document.getElementById('sl-hoved').max)) : 0;
    document.getElementById('sl-renter').value = pstRenter; document.getElementById('sl-renter-val').textContent = pstRenter + '%';
    document.getElementById('sl-salar').value  = pstSalar;  document.getElementById('sl-salar-val').textContent  = pstSalar  + '%';
    document.getElementById('sl-hoved').value  = pstHoved;  document.getElementById('sl-hoved-val').textContent  = pstHoved  + '%';
  } else {
    // Standard: rettslige alltid, renter og salær frafalles, evt. avslag på hoved
    const tilHovedstol = direkte - v.rettslig;
    nyRenter = 0;
    nyGebyr  = 0;
    nyHoved  = Math.max(0, Math.min(tilHovedstol, v.hoved));
    hovedstolAvslag = Math.max(0, v.hoved - nyHoved);

    // Oppdater individuelle slidere basert på faktisk reduksjon
    const pstRenter = v.renter > 0 ? 100 : 0;
    const pstSalar  = v.gebyr  > 0 ? 100 : 0;
    const pstHoved  = v.hoved  > 0 ? Math.min(Math.round((1 - nyHoved / v.hoved) * 100), parseInt(document.getElementById('sl-hoved').max)) : 0;
    document.getElementById('sl-renter').value = pstRenter; document.getElementById('sl-renter-val').textContent = pstRenter + '%';
    document.getElementById('sl-salar').value  = pstSalar;  document.getElementById('sl-salar-val').textContent  = pstSalar  + '%';
    document.getElementById('sl-hoved').value  = pstHoved;  document.getElementById('sl-hoved-val').textContent  = pstHoved  + '%';
  }

  visForlikResultat(v, total, direkte, sparer, nyHoved, nyGebyr, nyRenter, nyRettslig, hovedstolAvslag);

  // Oppdater total-slideren
  if (total > 0) {
    const totalPst = Math.round((sparer / total) * 100);
    document.getElementById('sl-total').value = totalPst;
    document.getElementById('sl-total-val').textContent = totalPst + '%';
  }
}

function visForlikResultat(v, total, forlik, sparer, nyHoved, nyGebyr, nyRenter, nyRettslig, hovedstolAvslag = 0) {
  // Lagre beregnede verdier for bruk i kopierForlik
  window._forlikData = { v, total, forlik, sparer, nyHoved, nyGebyr, nyRenter, nyRettslig };
  document.getElementById('r-forlik').textContent = kr(forlik);
  document.getElementById('r-forlik-sub').textContent = pst(forlik, total) + ' av totalkrav';
  document.getElementById('r-sparer').textContent = kr(Math.max(0, sparer));
  document.getElementById('r-sparer-pst').textContent = pst(Math.max(0, sparer), total) + ' av totalkrav';
  document.getElementById('r-total').textContent = kr(total);

  const bd = document.getElementById('breakdown-forlik');

  // Advarsel hvis avslag på hovedstol
  let varselHtml = '';
  if (hovedstolAvslag > 0.01) {
    varselHtml = `<div class="varsel varsel-feil">
      ⚠ <strong>OBS: Forliket innebærer avslag på hovedstol med ${kr(hovedstolAvslag)}.</strong>
      Dette er kreditors penger – sørg for at dette er godkjent før forlik inngås.
    </div>`;
  }

  const rader = [
    { label: 'Renter',                             orig: v.renter,   ny: nyRenter  !== null ? nyRenter  : v.renter  },
    { label: 'Inkassogebyr/salær',                 orig: v.gebyr,    ny: nyGebyr   !== null ? nyGebyr   : v.gebyr   },
    { label: 'Rettslige kostnader',                orig: v.rettslig, ny: nyRettslig !== null ? nyRettslig : v.rettslig },
    { label: 'Hovedstol',                          orig: v.hoved,    ny: nyHoved   !== null ? nyHoved   : v.hoved   },
  ];

  let html = varselHtml;
  rader.forEach(r => {
    if (!r.orig) return;
    const frafallt = r.orig - r.ny;
    const redusert = frafallt > 0.01;
    if (redusert) {
      html += `<div class="breakdown-row striked">
        <span class="breakdown-label">${r.label}</span>
        <span>
          <span class="breakdown-amount">${kr(r.orig)}</span>
          <span class="breakdown-savings">→ ${kr(r.ny)} (−${kr(frafallt)})</span>
        </span>
      </div>`;
    } else {
      html += `<div class="breakdown-row">
        <span class="breakdown-label">${r.label}</span>
        <span class="breakdown-amount">${kr(r.ny)}</span>
      </div>`;
    }
  });

  html += `<div class="breakdown-row total">
    <span class="breakdown-label">Forliksbeløp</span>
    <span class="breakdown-amount">${kr(forlik)}</span>
  </div>`;

  bd.innerHTML = html;

  autolagreSak();
}

function kopierForlik() {
  const d = window._forlikData;
  if (!d) { alert('Beregn forlik først.'); return; }

  const { v, total, forlik, sparer, nyHoved, nyGebyr, nyRenter, nyRettslig } = d;

  const tekst =
    `FORLIKSFORSLAG\n` +
    `─────────────────────────\n` +
    `Totalkrav:       ${kr(total)}\n` +
    `Forliksbeløp:    ${kr(forlik)}\n` +
    `Reduksjon:       ${kr(Math.max(0, sparer))} (${pst(Math.max(0, sparer), total)})\n` +
    `─────────────────────────\n` +
    `Oversikt:\n` +
    (v.renter   ? `  Renter:               ${kr(nyRenter ?? v.renter)}${nyRenter !== null && nyRenter < v.renter ? ` (av ${kr(v.renter)})` : ''}\n` : '') +
    (v.gebyr    ? `  Inkassogebyr/salær:   ${kr(nyGebyr  ?? v.gebyr)} ${nyGebyr  !== null && nyGebyr  < v.gebyr  ? ` (av ${kr(v.gebyr)})` : ''}\n` : '') +
    (v.rettslig ? `  Rettslige kostnader:  ${kr(nyRettslig ?? v.rettslig)}\n` : '') +
    (v.hoved    ? `  Hovedstol:            ${kr(nyHoved  ?? v.hoved)} ${nyHoved  !== null && nyHoved  < v.hoved  ? ` (av ${kr(v.hoved)})` : ''}\n` : '');

  kopierTekst(tekst, 'Forliksforslag kopiert!');
}

function kopierEpostForlik() {
  const d = window._forlikData;
  if (!d) { alert('Beregn forlik først.'); return; }

  const { v, total, forlik } = d;

  // Frist: 14 dager fra i dag
  const frist = new Date();
  frist.setDate(frist.getDate() + 14);
  const fristStr = formatDato(frist);

  // Avdragsalternativ: 4 avdrag basert på totalkrav (uten reduksjon)
  const avdrag4 = Math.ceil(total / 4);

  const kontonummer = document.getElementById('f-kontonummer')?.value.trim();
  const kid         = document.getElementById('f-kid')?.value.trim();

  const betalingsinfo = kontonummer
    ? `Betales til konto ${kontonummer}${kid ? ` med KID ${kid}` : ''}.`
    : '';

  const tekst =
`Hei,

Vi kan tilby følgende løsning i saken:

Total saldo: ${kr(total)}

Dersom ${kr(forlik)} innbetales innen ${fristStr} vil saken anses oppgjort i sin helhet.
${betalingsinfo ? betalingsinfo + '\n' : ''}
Alternativt kan vi inngå en avdragsordning på kravet.

Ta kontakt dersom dette er aktuelt.

Med vennlig hilsen`;

  kopierTekst(tekst, 'E-posttekst kopiert!');
}


function toggleHovedstolMaks() {
  const slider  = document.getElementById('sl-hoved');
  const btn     = document.getElementById('sl-hoved-unlock');
  const marks   = document.getElementById('sl-hoved-marks');
  const låstOpp = slider.max === '100';

  if (låstOpp) {
    slider.max = 50;
    if (parseInt(slider.value) > 50) { slider.value = 50; document.getElementById('sl-hoved-val').textContent = '50%'; }
    btn.textContent   = '🔓 Opp til 100%';
    btn.style.color   = 'var(--text-muted)';
    marks.innerHTML   = '<span>0%</span><span>25%</span><span>50%</span>';
  } else {
    slider.max = 100;
    btn.textContent   = '🔒 Begrens til 50%';
    btn.style.color   = 'var(--high)';
    marks.innerHTML   = '<span>0%</span><span>50%</span><span>100%</span>';
  }
  beregnForlik();
}

function toggleProporsjonal() {
  const aktiv = document.getElementById('f-proporsjonal').checked;
  if (!aktiv) {
  }
  const pst = document.getElementById('sl-total').value;
  if (parseInt(pst) > 0) {
    beregnTotalRabatt(pst);
  } else {
    beregnForlik();
  }
}

function _proporsjonalData() {
  const hoved    = parseKr(document.getElementById('f-hovedstol').value) || 0;
  const gebyr    = parseKr(document.getElementById('f-gebyr').value)     || 0;
  const renter   = parseKr(document.getElementById('f-renter').value)    || 0;
  const rettslig = parseKr(document.getElementById('f-rettslige').value) || 0;
  const tilbyr   = parseKr(document.getElementById('f-direkte').value)   || 0;
  const total    = hoved + gebyr + renter + rettslig;
  const fordelbar = hoved + gebyr + renter;
  return { hoved, gebyr, renter, rettslig, tilbyr, total, fordelbar };
}



function fyllFraAvdrag(mål) {
  const hovedstol  = parseKr(document.getElementById('a-hovedstol').value) || 0;
  const salar      = parseKr(document.getElementById('a-salar').value)      || 0;
  const tungSalar  = parseKr(document.getElementById('a-tung-salar').value) || 0;
  const rettslige  = parseKr(document.getElementById('a-rettslige').value)  || 0;
  const purregebyr = parseKr(document.getElementById('a-purregebyr').value) || 0;
  const forfallStr = document.getElementById('a-forfall').value.trim();

  const effektivSalar = tungSalar > 0 ? tungSalar : salar;
  const renter = window._avdragsMeta
    ? window._avdragsMeta.startSaldoRenter || 0
    : 0;

  if (!hovedstol) {
    alert('Fyll inn kravets poster i Avdragsplan-fanen først.');
    return false;
  }

  if (mål === 'forlik') {
    document.getElementById('f-hovedstol').value = String(hovedstol).replace('.', ',');
    document.getElementById('f-gebyr').value      = String(effektivSalar).replace('.', ',');
    document.getElementById('f-renter').value     = String(Math.round(renter * 100) / 100).replace('.', ',');
    document.getElementById('f-rettslige').value  = String(rettslige + purregebyr).replace('.', ',');
    ['f-hovedstol','f-gebyr','f-renter','f-rettslige'].forEach(id => {
      const el = document.getElementById(id);
      if (el) formatBelopFelt(el);
    });
    beregnForlik();

  } else if (mål === 'simulator') {
    const totalSaldo = hovedstol + effektivSalar + rettslige + purregebyr + renter;
    const el = document.getElementById('sim-saldo');
    el.value = String(Math.round(totalSaldo)).replace('.', ',');
    formatBelopFelt(el);
    simOppdaterSaldo(el);

  } else if (mål === 'rente') {
    document.getElementById('rn-hoved').value = String(hovedstol).replace('.', ',');
    const el = document.getElementById('rn-hoved');
    if (el) formatBelopFelt(el);
    // Fyll fra-dato fra fakturaens forfallsdato hvis tilgjengelig
    if (forfallStr) {
      document.getElementById('rn-fra').value = forfallStr;
      fjernDatoFeil(document.getElementById('rn-fra'));
    }
    beregnRente();
  }

  return true;
}

function nullstillForlik() {
  const bekreftEl = document.getElementById('nullstill-forlik-bekreft');
  if (bekreftEl) { bekreftEl.remove(); return; }

  const div = document.createElement('div');
  div.id = 'nullstill-forlik-bekreft';
  div.className = 'varsel varsel-advarsel';
  div.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;';
  div.innerHTML = `<span>⚠ Nullstille alle felt?</span>
    <div style="display:flex;gap:8px;">
      <button onclick="_nullstillForlikBekreft()" style="background:var(--high);color:#fff;border:none;border-radius:6px;padding:5px 14px;font-size:12px;font-weight:600;cursor:pointer;">Ja, nullstill</button>
      <button onclick="document.getElementById('nullstill-forlik-bekreft').remove()" style="background:var(--bg-dark);border:1px solid var(--border);border-radius:6px;padding:5px 12px;font-size:12px;cursor:pointer;">Avbryt</button>
    </div>`;
  const resultat = document.getElementById('result');
  if (resultat) resultat.before(div);
  else document.querySelector('#tab-forlik .panel').appendChild(div);
}

function _nullstillForlikBekreft() {
  const bekreftEl = document.getElementById('nullstill-forlik-bekreft');
  if (bekreftEl) bekreftEl.remove();
  ['f-hovedstol','f-gebyr','f-renter','f-rettslige','f-direkte','f-tilbyr','f-kontonummer','f-kid'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  ['sl-total','sl-salar','sl-renter','sl-hoved'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = 0;
    const val = document.getElementById(id + '-val'); if (val) val.textContent = '0%';
  });
  document.getElementById('breakdown-forlik').innerHTML = '';
  ['r-forlik','r-sparer','r-total'].forEach(id => {
    document.getElementById(id).textContent = 'kr 0';
  });
  document.getElementById('r-forlik-sub').textContent = '–';
  document.getElementById('r-sparer-pst').textContent = '0% av totalkrav';
  const propChk = document.getElementById('f-proporsjonal'); if (propChk) propChk.checked = false;
  const sl = document.getElementById('sl-hoved'); if (sl) sl.max = 50;
  const btn = document.getElementById('sl-hoved-unlock'); if (btn) { btn.textContent = '🔓 Opp til 100%'; btn.style.color = 'var(--text-muted)'; }
  const marks = document.getElementById('sl-hoved-marks'); if (marks) marks.innerHTML = '<span>0%</span><span>25%</span><span>50%</span>';
}

/* ════════════════════════════════
   AVDRAG
════════════════════════════════ */

// Avdragssalær = 1,5 × inkassosatsen
// Kreditor med fradragsrett: 1,5 × 750 = 1 125
// Kreditor uten fradragsrett: (1,5 × 750) + 25% MVA = 1 406,25
