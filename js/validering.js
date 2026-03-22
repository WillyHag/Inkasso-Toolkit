function erGyldigDato(d) {
  return d instanceof Date && !isNaN(d.getTime());
}

function settDatoFeil(input, melding) {
  input.classList.add('dato-ugyldig');
  const feil = document.getElementById(input.id + '-feil');
  if (feil) { feil.textContent = melding; feil.style.display = 'block'; }
}

function fjernDatoFeil(input) {
  input.classList.remove('dato-ugyldig');
  const feil = document.getElementById(input.id + '-feil');
  if (feil) feil.style.display = 'none';
}

// Datoer som ikke bør ligge frem i tid
const DATO_IKKE_FREMTID = ['a-forfall', 'a-bo-dato', 'rn-fra'];

function autoFormatDato(input) {
  let val = input.value.replace(/\D/g, '');
  let formatted = null;

  if (val.length === 6) {
    formatted = val.slice(0,2) + '.' + val.slice(2,4) + '.20' + val.slice(4,6);
  } else if (val.length === 8) {
    formatted = val.slice(0,2) + '.' + val.slice(2,4) + '.' + val.slice(4,8);
  } else if (input.value.length === 10) {
    formatted = input.value; // allerede formatert
  } else {
    if (input.value.trim()) settDatoFeil(input, 'Fyll inn dato: dd.mm.åååå');
    return;
  }

  const dato = parseNO(formatted);
  if (!erGyldigDato(dato)) {
    input.value = formatted;
    settDatoFeil(input, 'Ugyldig dato');
    return;
  }

  // Sjekk om datoen er fremtidig der det ikke gir mening
  const iDag = new Date(); iDag.setHours(0,0,0,0);
  if (DATO_IKKE_FREMTID.includes(input.id) && dato > iDag) {
    input.value = formatted;
    settDatoFeil(input, 'Datoen kan ikke ligge frem i tid');
    return;
  }

  // Spesialvalidering for første forfall – kan ikke ligge i fortiden
  if (input.id === 'a-dato') {
    const iDag2 = new Date(); iDag2.setHours(0,0,0,0);
    if (dato < iDag2) {
      input.value = formatted;
      settDatoFeil(input, 'Første forfall kan ikke ligge i fortiden');
      return;
    }
  }
  if (input.id === 'a-iv-forfall') {
    const forfDato = parseNO(document.getElementById('a-forfall').value.trim());
    if (forfDato) {
      const minIVDato = new Date(forfDato);
      minIVDato.setDate(minIVDato.getDate() + 14);
      if (dato < forfDato) {
        input.value = formatted;
        settDatoFeil(input, 'IV kan ikke sendes før fakturaens forfallsdato');
        return;
      } else if (dato < minIVDato) {
        input.value = formatted;
        settDatoFeil(input, `Minimum 14 dager etter forfallsdato (tidligst ${formatDato(minIVDato)})`);
        return;
      }
    }
  }
// validering.js – legg til etter a-iv-forfall-blokken

if (input.id === 'a-bo-dato') {
  const forfDato = parseNO(document.getElementById('a-forfall').value.trim());
  if (forfDato) {
    const minBODato = new Date(forfDato);
    minBODato.setDate(minBODato.getDate() + 14);
    if (dato < minBODato) {
      input.value = formatted;
      settDatoFeil(input, `BO kan ikke sendes før inkassovarselet (14 dagers frist) har løpt ut (tidligst ${formatDato(minBODato)})`);
      return;
    }
  }
}
  fjernDatoFeil(input);
  input.value = formatted;
  triggerBeregning(input);
}

function triggerBeregning(input) {
  const id = input.id;
  if (id === 'rn-fra' || id === 'rn-til') {
    beregnRenteFraDato();
  } else if (id === 'sim-startdato') {
    simBeregn();
  } else {
    beregnAvdrag();
  }
}

// Koble auto-format til alle datofelt ved oppstart
document.addEventListener('DOMContentLoaded', () => {
  // Musehjul på alle slidere
  document.querySelectorAll('input[type="range"]').forEach(slider => {
    slider.addEventListener('wheel', e => {
      e.preventDefault();
      const step = parseFloat(slider.step) || 1;
      const min  = parseFloat(slider.min)  || 0;
      const max  = parseFloat(slider.max);
      const retning = e.deltaY < 0 ? 1 : -1;
      const nyVerdi = Math.min(max, Math.max(min, parseFloat(slider.value) + retning * step));
      slider.value = nyVerdi;
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    }, { passive: false });
  });

  // Dato-felt: formater og valider på blur + legg til kalenderknapp
  document.querySelectorAll('input[placeholder="dd.mm.åååå"]').forEach(input => {
    // Wrap i dp-wrap
    const wrap = document.createElement('div');
    wrap.className = 'dp-wrap';
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);

    // Kalenderknapp
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dp-btn';
    btn.textContent = '📅';
    btn.title = 'Velg dato';
    btn.onclick = (e) => { e.stopPropagation(); dpÅpne(input); };
    wrap.appendChild(btn);

    input.addEventListener('blur', () => autoFormatDato(input));
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') autoFormatDato(input);
      if (e.key === 'Escape') dpLukk();
    });
    input.addEventListener('input', () => fjernDatoFeil(input));
  });

  // Smart default første forfall: 14 dager fra i dag, kun når tomt
  const aDato = document.getElementById('a-dato');
  if (aDato && !aDato.value.trim()) {
    const defaultDato = new Date();
    defaultDato.setDate(defaultDato.getDate() + 14);
    aDato.value = formatDato(defaultDato);
    aDato.title = 'Startdato foreslått: 14 dager fra i dag';
  }

  // Beløps-felt: live tusenskilletegn mens man skriver
  const belopIds = ['f-hovedstol','f-gebyr','f-renter','f-rettslige','f-direkte',
                    'a-hoofdstol','a-purregebyr','a-salar','a-tung-salar','a-rettslige','a-mnd-belop','rn-hoved'];
  belopIds.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;

    el.addEventListener('input', () => {
      const cursorPos = el.selectionStart;
      const oldLen = el.value.length;

      // Bevar alt etter komma/punktum uendret – formater kun heltallsdelen
      const raw = el.value;
      const kommaIdx = raw.search(/[,\.]/);
      const heltallDel = kommaIdx >= 0 ? raw.slice(0, kommaIdx) : raw;
      const desimalDel = kommaIdx >= 0 ? raw.slice(kommaIdx) : '';

      // Kun sifrene i heltallsdelen
      const siffer = heltallDel.replace(/[^\d]/g, '');
      const formatted = siffer.replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');

      el.value = formatted + desimalDel;

      // Bevar cursor-posisjon (juster for endring i lengde)
      const newLen = el.value.length;
      const newPos = Math.max(0, cursorPos + (newLen - oldLen));
      try { el.setSelectionRange(newPos, newPos); } catch(e) {}
    });

    el.addEventListener('blur', () => formatBelopFelt(el));
    el.addEventListener('focus', () => {
      const n = parseKr(el.value);
      if (n) el.value = String(n).replace('.', ',');
    });
  });

  const simSaldoEl = document.getElementById('sim-saldo');
  if (simSaldoEl) {
    simSaldoEl.addEventListener('blur', () => formatBelopFelt(simSaldoEl));
    simSaldoEl.addEventListener('focus', () => {
      const n = parseKr(simSaldoEl.value);
      if (n) simSaldoEl.value = String(n).replace('.', ',');
    });
  }

  // 4. Auto-fokus på første felt ved oppstart
  setTimeout(() => {
    const forsteFelt = document.getElementById('a-hovedstol');
    if (forsteFelt) forsteFelt.focus();
  }, 100);
});

// 2. Kopier avdragsplan-sammendrag som tekst
function kopierAvdragSammendrag() {
  const meta = window._avdragsMeta;
  const rader = window._avdragsMeta ? beregnAvdragsPlan(window._avdragsTerminer, window._avdragsMeta) : null;
  if (!meta || !rader) { toast('Ingen beregning å kopiere.', 'info'); return; }

  const totalBetalt = rader.reduce((s, r) => s + r.betaling, 0);
  const totalRenter = rader.reduce((s, r) => s + r.nyeRenter, 0);

  let tekst = 'AVDRAGSPLAN – SAMMENDRAG\n';
  tekst += '─'.repeat(40) + '\n';
  tekst += `Hovedstol:             ${kr(meta.startSaldoHovedstol)}\n`;
  if (meta.startSaldoSalar > 0)
    tekst += `Inkassosalær:          ${kr(meta.startSaldoSalar)}\n`;
  if (meta.startSaldoRettslige > 0)
    tekst += `Rettslige kostnader:   ${kr(meta.startSaldoRettslige)}\n`;
  if (meta.startSaldoRenter > 0)
    tekst += `Renter ved avtaleinng: ${kr(meta.startSaldoRenter)}\n`;
  tekst += `Renter i avtaleperiode: ${kr(totalRenter)}\n`;
  tekst += '─'.repeat(40) + '\n';
  tekst += `Totalt betalt:         ${kr(totalBetalt)}\n`;
  tekst += `Antall terminer:       ${rader.length}\n`;
  if (rader[0]) tekst += `Første forfall:        ${formatDato(rader[0].forfallDato)}\n`;
  if (rader[rader.length-1]) tekst += `Siste forfall:         ${formatDato(rader[rader.length-1].forfallDato)}\n`;

  kopierTekst(tekst, 'Sammendrag kopiert!');
}

function formatBelopFelt(input) {
  const n = parseKr(input.value);
  if (!n && n !== 0) return;
  if (n === 0 && !input.value) return;
  input.value = n.toLocaleString('no-NO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ════════════════════════════════
   FORLIK
════════════════════════════════ */
