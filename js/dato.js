function dpÅpne(input) {
  dpLukk();
  const parsed = parseNO(input.value.trim());
  const start  = parsed && !isNaN(parsed) ? parsed : new Date();
  const år = start.getFullYear();
  const mnd = start.getMonth();
  _dpAktiv = { input, år, mnd };
  dpRender();
}

function dpLukk() {
  document.querySelectorAll('.dp-popup').forEach(e => e.remove());
  _dpAktiv = null;
}

function dpRender() {
  if (!_dpAktiv) return;
  document.querySelectorAll('.dp-popup').forEach(e => e.remove());

  const { input, år, mnd, visVelgMnd } = _dpAktiv;
  const iDag = new Date(); iDag.setHours(0,0,0,0);
  const valgt = parseNO(input.value.trim());

  const popup = document.createElement('div');
  popup.className = 'dp-popup';
  const rect = input.getBoundingClientRect();
  if (rect.left + 252 > window.innerWidth - 20) popup.classList.add('dp-right');

  const månNavn = ['Januar','Februar','Mars','April','Mai','Juni',
                   'Juli','August','September','Oktober','November','Desember'];
  const månKort = ['Jan','Feb','Mar','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Des'];

  // ── Header ──
  const head = document.createElement('div');
  head.className = 'dp-head';

  if (visVelgMnd) {
    // År-navigasjon i månedvelger
    head.innerHTML = `
      <button onclick="dpÅrNaviger(-1)">◀</button>
      <span style="cursor:default;">${år}</span>
      <button onclick="dpÅrNaviger(1)">▶</button>`;
  } else {
    head.innerHTML = `
      <button onclick="dpNaviger(-1)">◀</button>
      <span onclick="dpToggleMndVelger()" style="cursor:pointer;border-bottom:1px dashed var(--text-muted);">${månNavn[mnd]} ${år}</span>
      <button onclick="dpNaviger(1)">▶</button>`;
  }
  popup.appendChild(head);

  if (visVelgMnd) {
    // ── Månedvelger grid ──
    const mgrid = document.createElement('div');
    mgrid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:4px;padding:4px 0;';
    månKort.forEach((navn, idx) => {
      const btn = document.createElement('button');
      btn.textContent = navn;
      btn.style.cssText = `padding:7px 4px;border:none;border-radius:5px;cursor:pointer;font-size:12px;font-family:'DM Sans',sans-serif;
        background:${idx === mnd ? 'var(--ink)' : 'var(--bg)'};
        color:${idx === mnd ? 'var(--white)' : 'var(--text)'};`;
      btn.onmouseenter = () => { if (idx !== mnd) btn.style.background = 'var(--bg-dark)'; };
      btn.onmouseleave = () => { if (idx !== mnd) btn.style.background = 'var(--bg)'; };
      btn.onclick = () => { _dpAktiv.mnd = idx; _dpAktiv.visVelgMnd = false; dpRender(); };
      mgrid.appendChild(btn);
    });
    popup.appendChild(mgrid);
  } else {
    // ── Dager-grid ──
    const grid = document.createElement('div');
    grid.className = 'dp-grid';

    ['Ma','Ti','On','To','Fr','Lø','Sø'].forEach(d => {
      const el = document.createElement('div');
      el.className = 'dp-dow';
      el.textContent = d;
      grid.appendChild(el);
    });

    const førsteDag = new Date(år, mnd, 1);
    let startUkedag = (førsteDag.getDay() + 6) % 7; // mandag=0
    const dagerIMnd = new Date(år, mnd + 1, 0).getDate();
    const dagerForrigeMnd = new Date(år, mnd, 0).getDate();

    // Forrige måneds dager (grå)
    for (let i = 0; i < startUkedag; i++) {
      const dag = dagerForrigeMnd - startUkedag + i + 1;
      const el = document.createElement('div');
      el.className = 'dp-day other-month';
      el.textContent = dag;
      el.onclick = () => { dpNaviger(-1); };
      grid.appendChild(el);
    }

    // Denne måneds dager
    for (let dag = 1; dag <= dagerIMnd; dag++) {
      const d = new Date(år, mnd, dag);
      const el = document.createElement('div');
      el.className = 'dp-day';
      el.textContent = dag;
      if (d.toDateString() === iDag.toDateString()) el.classList.add('today');
      if (valgt && d.toDateString() === valgt.toDateString()) el.classList.add('selected');
      if (norskHelligdag(d)) el.classList.add('helligdag');
      else if (d.getDay() === 0 || d.getDay() === 6) el.classList.add('weekend');
      el.onclick = () => dpVelg(dag);
      grid.appendChild(el);
    }

    // Neste måneds dager (grå) – fyll opp til 6 rader
    const totaltVist = startUkedag + dagerIMnd;
    const nesteDager = totaltVist % 7 === 0 ? 0 : 7 - (totaltVist % 7);
    for (let dag = 1; dag <= nesteDager; dag++) {
      const el = document.createElement('div');
      el.className = 'dp-day other-month';
      el.textContent = dag;
      el.onclick = () => { dpNaviger(1); };
      grid.appendChild(el);
    }

    popup.appendChild(grid);
  }

  const wrap = input.closest('.dp-wrap') || input.parentElement;
  wrap.style.position = 'relative';
  wrap.appendChild(popup);
}

function dpToggleMndVelger() {
  if (!_dpAktiv) return;
  _dpAktiv.visVelgMnd = !_dpAktiv.visVelgMnd;
  dpRender();
}

function dpÅrNaviger(retning) {
  if (!_dpAktiv) return;
  _dpAktiv.år += retning;
  dpRender();
}

function dpNaviger(retning) {
  if (!_dpAktiv) return;
  _dpAktiv.mnd += retning;
  if (_dpAktiv.mnd > 11) { _dpAktiv.mnd = 0; _dpAktiv.år++; }
  if (_dpAktiv.mnd < 0)  { _dpAktiv.mnd = 11; _dpAktiv.år--; }
  dpRender();
}

function dpVelg(dag) {
  if (!_dpAktiv) return;
  const { input, år, mnd } = _dpAktiv;
  const d = new Date(år, mnd, dag);
  const dd   = String(d.getDate()).padStart(2,'0');
  const mm   = String(d.getMonth()+1).padStart(2,'0');
  const yyyy = d.getFullYear();
  input.value = `${dd}.${mm}.${yyyy}`;
  dpLukk();
  autoFormatDato(input); // validerer og triggerBeregning
}

// Lukk ved klikk utenfor
document.addEventListener('click', e => {
  if (_dpAktiv && !e.target.closest('.dp-popup') && !e.target.closest('.dp-btn')) {
    dpLukk();
  }
});

// ════════════════════════════════
// PDF & EKSPORT FUNKSJONER
// ════════════════════════════════
