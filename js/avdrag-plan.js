function beregnAvdragsPlan(terminer, meta) {
  const { startSaldoHovedstol, startSaldoSalar, startSaldoRettslige,
          startSaldoRenter, fastMndBelop, dekning,
          tungPalopDato, tungPaloppt, salarDifferanse,
          salarPalopDato, lettSalarIkkeEndaPaloppt, mnd } = meta;

  let saldoHovedstol = startSaldoHovedstol;
  let saldoSalar     = startSaldoSalar;
  let saldoRettslige = startSaldoRettslige;
  let saldoRenter    = startSaldoRenter;
  let tungLagtTil    = tungPaloppt;
  let lettLagtTil    = !lettSalarIkkeEndaPaloppt; // allerede påløpt hvis ikke forsinket
  let forrigeDato    = new Date(meta.forrigeDato);

  const rader = [];

  for (let i = 0; i < terminer.length; i++) {
    const forfallDato = new Date(terminer[i].dato);
    const erSiste = i === terminer.length - 1;

    // Legg til lett salær på salarPalopDato (før BO-scenario)
    if (!lettLagtTil && salarPalopDato && forfallDato >= salarPalopDato) {
      saldoSalar  += salarDifferanse;
      lettLagtTil  = true;
    }

    // Legg til tungt salær på riktig dato
    if (!tungLagtTil && tungPalopDato && forfallDato >= tungPalopDato) {
      saldoSalar  += salarDifferanse;
      tungLagtTil  = true;
    }

    const dagerSiden = dagMellom(forrigeDato, forfallDato);
    const dagligSats = dagligRenteForDato(forrigeDato);
    const nyeRenterHovedstol = saldoHovedstol * dagligSats * dagerSiden;
    const nyeRenterSalar     = saldoSalar * dagligSats * dagerSiden;
    const nyeRenter          = nyeRenterHovedstol + nyeRenterSalar;
    saldoRenter            += nyeRenter;

    const gjenstaar = saldoSalar + saldoRettslige + saldoHovedstol + saldoRenter;

    // Terminbeløp:
    // 1. Manuelt satt beløp brukes direkte (capper til gjenstående)
    // 2. Ingenting gjenstår → hopp over terminen (betaling = 0)
    // 3. Siste planlagte termin tar alltid eksakt rest
    // 4. Øvrige terminer: fastMndBelop (capper til gjenstående)
    let betaling;
    if (gjenstaar <= 0.005) {
      betaling = 0;
    } else if (terminer[i].belop !== null) {
      betaling = Math.min(terminer[i].belop, Math.round(gjenstaar * 100) / 100);
    } else if (erSiste) {
      betaling = Math.round(gjenstaar * 100) / 100;
    } else {
      betaling = Math.min(fastMndBelop, Math.round(gjenstaar * 100) / 100);
    }

    let rest = betaling;
    let tilSalar = 0, tilHovedstol = 0, tilRenter = 0;

    const tRettslige = Math.min(rest, saldoRettslige);
    tilSalar += tRettslige; saldoRettslige -= tRettslige; rest -= tRettslige;

    const rek = dekning === 'SHR' ? ['S','H','R'] : dekning === 'HSR' ? ['H','S','R'] :
                dekning === 'RHS' ? ['R','H','S'] : ['R','S','H'];
    for (const p of rek) {
      if (rest <= 0) break;
      if (p === 'S') { const t = Math.min(rest, saldoSalar);     tilSalar     += t; saldoSalar     -= t; rest -= t; }
      if (p === 'H') { const t = Math.min(rest, saldoHovedstol); tilHovedstol += t; saldoHovedstol -= t; rest -= t; }
      if (p === 'R') { const t = Math.min(rest, saldoRenter);    tilRenter    += t; saldoRenter    -= t; rest -= t; }
    }

    const rentePaForfall = saldoRenter + nyeRenter - (saldoRenter + nyeRenter - Math.max(0, saldoRenter));
    const restTotal     = Math.max(0, saldoSalar + saldoRettslige + saldoHovedstol + saldoRenter);
    const restSalar     = Math.max(0, saldoSalar + saldoRettslige);
    const restHovedstol = Math.max(0, saldoHovedstol);

    rader.push({
      nr: i + 1, forfallDato, betaling, tilSalar, tilHovedstol, tilRenter,
      restSalar, restHovedstol, rentePaForfall: saldoRenter + nyeRenter,
      restTotal, nyeRenter, erSiste,
    });

    forrigeDato = new Date(forfallDato);
  }

  // Legg til ekstra terminer så lenge det gjenstår noe – aldri overstig fastMndBelop
  let ekstraIdx = 0;
  const MAX_EKSTRA = 120;
  while (rader[rader.length - 1].restTotal > 0.01 && ekstraIdx < MAX_EKSTRA) {
    ekstraIdx++;
    const sisteForfall = new Date(rader[rader.length - 1].forfallDato);
    const ekstraDato = leggTilMnd(sisteForfall, 1);

    if (!tungLagtTil && tungPalopDato && ekstraDato >= tungPalopDato) {
      saldoSalar += salarDifferanse; tungLagtTil = true;
    }
    if (!lettLagtTil && salarPalopDato && ekstraDato >= salarPalopDato) {
      saldoSalar += salarDifferanse; lettLagtTil = true;
    }

    const dagerSiden = dagMellom(forrigeDato, ekstraDato);
    const dagligSats = dagligRenteForDato(forrigeDato);
    const nyeRenterHovedstol = saldoHovedstol * dagligSats * dagerSiden;
    const nyeRenterSalar     = saldoSalar * dagligSats * dagerSiden;
    const nyeRenter          = nyeRenterHovedstol + nyeRenterSalar;
    saldoRenter            += nyeRenter;

    const gjenstaar  = saldoSalar + saldoRettslige + saldoHovedstol + saldoRenter;
    // Cap på fastMndBelop – neste ekstra termin tar resten
    const betaling   = Math.min(fastMndBelop, Math.round(gjenstaar * 100) / 100);

    let rest = betaling;
    let tilSalar = 0, tilHovedstol = 0, tilRenter = 0;
    const tR = Math.min(rest, saldoRettslige); tilSalar += tR; saldoRettslige -= tR; rest -= tR;
    const rek2 = dekning === 'SHR' ? ['S','H','R'] : dekning === 'HSR' ? ['H','S','R'] :
                 dekning === 'RHS' ? ['R','H','S'] : ['R','S','H'];
    for (const p of rek2) {
      if (rest <= 0) break;
      if (p === 'S') { const t = Math.min(rest, saldoSalar);     tilSalar     += t; saldoSalar     -= t; rest -= t; }
      if (p === 'H') { const t = Math.min(rest, saldoHovedstol); tilHovedstol += t; saldoHovedstol -= t; rest -= t; }
      if (p === 'R') { const t = Math.min(rest, saldoRenter);    tilRenter    += t; saldoRenter    -= t; rest -= t; }
    }

    const restTotal     = Math.max(0, saldoSalar + saldoRettslige + saldoHovedstol + saldoRenter);
    const restSalar     = Math.max(0, saldoSalar + saldoRettslige);
    const restHovedstol = Math.max(0, saldoHovedstol);

    rader.push({
      nr: rader.length + 1, forfallDato: ekstraDato, betaling,
      tilSalar, tilHovedstol, tilRenter,
      restSalar, restHovedstol,
      rentePaForfall: saldoRenter + nyeRenter,
      restTotal, nyeRenter, erSiste: restTotal <= 0.01, ekstraTermin: true,
    });

    forrigeDato = new Date(ekstraDato);
  }

  return rader;
}

function renderAvdragsplan() {
  const meta    = window._avdragsMeta;
  const terminer = window._avdragsTerminer;
  if (!meta || !terminer) return;

  const rader = beregnAvdragsPlan(terminer, meta);

  let totalBetalt = 0, totalRenterIAvtalen = 0;
  const merknader = [];

  // Lagre beregnede verdier tilbake til window._avdragsTerminer for PDF-eksport
  rader.forEach((r) => {
    if (r.nr <= window._avdragsTerminer.length) {
      window._avdragsTerminer[r.nr - 1].belop = r.betaling;
      window._avdragsTerminer[r.nr - 1].rente = r.tilRenter;
      window._avdragsTerminer[r.nr - 1].hovedstol = r.tilHovedstol;
      window._avdragsTerminer[r.nr - 1].rest = r.restTotal;
    }
  });

  let html = `<thead><tr>
    <th>#</th>
    <th>Forfall</th>
    <th>Innbetaling</th>
    <th>→ Salær/kost.</th>
    <th>→ Hovedstol</th>
    <th>→ Renter</th>
    <th style="border-left:2px solid var(--border)">Rest salær</th>
    <th>Rest hovedstol</th>
    <th>Renter på forfallsdato</th>
    <th>Rest total</th>
  </tr></thead><tbody>`;

  const raderVist = rader.filter(r => r.betaling > 0.005);
  raderVist.forEach((r, idx) => {
    totalBetalt         += r.betaling;
    totalRenterIAvtalen += r.nyeRenter;

    // Merknader
    if (meta.tungPalopDato && !meta.tungPaloppt) {
      const forrigeF = idx === 0 ? new Date(0) : new Date(raderVist[idx - 1].forfallDato);
      if (meta.tungPalopDato > forrigeF && meta.tungPalopDato <= r.forfallDato) {
        merknader.push({ termin: r.nr, dato: formatDato(r.forfallDato), tekst: `Tungt salær påløper ${formatDato(meta.tungPalopDato)}` });
      }
    }
    if (r.erSiste && r.betaling > meta.fastMndBelop + 0.01) {
      merknader.push({ termin: r.nr, dato: formatDato(r.forfallDato), tekst: 'Inkl. løpende renter' });
    }

    const manuellBelop = !r.ekstraTermin && terminer[r.nr - 1] && terminer[r.nr - 1].belop !== null;

    html += `<tr${r.ekstraTermin ? ' style="background:#fff8e1;opacity:0.85;"' : ''}>
      <td class="label">${r.nr}${r.ekstraTermin ? ' <span style="font-size:10px;color:#92400e;" title="Ekstra termin – dekker restbeløp">+</span>' : ''}</td>
      <td style="white-space:nowrap;${r.ekstraTermin ? '' : 'cursor:pointer;'}" ${r.ekstraTermin ? '' : `onclick="redigerDato(${r.nr-1})" title="Klikk for å endre dato"`}>
        <span style="${r.ekstraTermin ? '' : 'border-bottom:1px dashed var(--text-muted)'}">${formatDato(r.forfallDato)}</span>
      </td>
      <td style="white-space:nowrap;${r.ekstraTermin ? '' : 'cursor:pointer;'}" ${r.ekstraTermin ? '' : `onclick="redigerBelop(${r.nr-1})" title="Klikk for å endre beløp"`}>
        <strong style="${r.ekstraTermin ? '' : `border-bottom:1px dashed ${manuellBelop ? 'var(--high)' : 'var(--text-muted)'}`}">${tbl(r.betaling)}</strong>
        ${manuellBelop && !r.ekstraTermin ? '<span style="font-size:10px;color:var(--high);margin-left:4px;">✎</span>' : ''}
      </td>
      <td style="color:var(--text-muted);white-space:nowrap">${r.tilSalar > 0 ? tbl(r.tilSalar) : '–'}</td>
      <td style="color:var(--text-muted);white-space:nowrap">${r.tilHovedstol > 0 ? tbl(r.tilHovedstol) : '–'}</td>
      <td style="color:var(--high);white-space:nowrap">${r.tilRenter > 0 ? tbl(r.tilRenter) : '–'}</td>
      <td style="border-left:2px solid var(--border);color:var(--text-muted);white-space:nowrap">${r.restSalar > 0 ? tbl(r.restSalar) : '–'}</td>
      <td style="color:var(--text-muted);white-space:nowrap">${r.restHovedstol > 0 ? tbl(r.restHovedstol) : '–'}</td>
      <td style="color:var(--high);white-space:nowrap">${tbl(r.rentePaForfall)}</td>
      <td style="white-space:nowrap"><strong>${tbl(r.restTotal)}</strong></td>
    </tr>`;
  });

  html += '</tbody>';
  document.getElementById('avdrag-tabell').innerHTML = html;

  // Merknader
  const merknadEl = document.getElementById('avdrag-merknader');
  if (merknadEl) {
    merknadEl.innerHTML = merknader.map(m =>
      `<div style="background:#fff8e1;border-left:3px solid #f59e0b;border-radius:6px;padding:8px 14px;margin-bottom:6px;font-size:13px;color:#92400e;">
        ⚠ Termin ${m.termin} (${m.dato}): ${m.tekst}
      </div>`
    ).join('');
  }

  document.getElementById('avdrag-tabell-panel').style.display = 'block';

  // Lagre sammendrag-verdier for PDF-eksport
  window._avdragsSammendrag = {
    totalBetalt: totalBetalt,
    totalRenter: Math.max(0, totalRenterIAvtalen)
  };

  // Oppdater sammendrag
  const totalBetaltEl = document.getElementById('summary-totalbetalt');
  if (totalBetaltEl) totalBetaltEl.innerHTML = `<div class="rente-box-label">Totalt betalt i avtalen</div><div class="rente-box-value">${kr(totalBetalt)}</div>`;
  const renterEl = document.getElementById('summary-renter-avtalen');
  if (renterEl) renterEl.innerHTML = `<div class="rente-box-label">Renter i avtalen</div><div class="rente-box-value">${kr(Math.max(0, totalRenterIAvtalen))}</div>`;
  const brRenter = document.getElementById('breakdown-renter-avtalen');
  if (brRenter) brRenter.innerHTML = `<span class="breakdown-label">Renter i avtaleperioden</span><span class="breakdown-amount">${kr(Math.max(0, totalRenterIAvtalen))}</span>`;
  const brTotal = document.getElementById('breakdown-totalbetalt');
  if (brTotal) brTotal.innerHTML = `<span class="breakdown-label">Totalt betalt i avtalen</span><span class="breakdown-amount">${kr(totalBetalt)}</span>`;
}

function redigerDato(idx) {
  const terminer = window._avdragsTerminer;
  const meta     = window._avdragsMeta;
  if (!terminer || !meta || idx >= terminer.length) return;
  const td = document.querySelectorAll('#avdrag-tabell tbody tr')[idx].cells[1];
  const gjeldende = new Date(terminer[idx].dato);

  const dd = String(gjeldende.getDate()).padStart(2,'0');
  const mm = String(gjeldende.getMonth()+1).padStart(2,'0');
  const yyyy = gjeldende.getFullYear();

  const inp = document.createElement('input');
  inp.type = 'text';
  inp.value = `${dd}.${mm}.${yyyy}`;
  inp.style.cssText = `width:100px;font-family:'DM Mono',monospace;font-size:13px;border:1px solid var(--ink);border-radius:4px;padding:2px 6px;outline:none;`;
  td.innerHTML = '';
  td.appendChild(inp);
  inp.focus(); inp.select();

  function bekreft() {
    const ny = parseNO(inp.value) || autoFormatOgParse(inp.value);
    if (ny) {
      // Valider at datoen er etter forrige termin
      const forrigeDato = idx > 0 ? new Date(terminer[idx - 1].dato) : null;
      if (forrigeDato && ny <= forrigeDato) {
        inp.style.border = '1px solid var(--high)';
        inp.title = `Dato må være etter termin ${idx} (${formatDato(forrigeDato)})`;
        inp.select();
        return;
      }

      const gammel = new Date(terminer[idx].dato);
      terminer[idx].dato = ny;

      // Beregn månedsdiff mellom gammel og ny dato
      const månedsDiff = (ny.getFullYear() - gammel.getFullYear()) * 12
                       + (ny.getMonth() - gammel.getMonth());

      if (månedsDiff !== 0) {
        // Forskyv påfølgende terminer med samme antall hele måneder
        // men behold opprinnelig dag-i-måneden fra startDato
        for (let j = idx + 1; j < terminer.length; j++) {
          const orig = new Date(terminer[j].dato);
          const nyMnd = orig.getMonth() + månedsDiff;
          const nyÅr  = orig.getFullYear() + Math.floor(nyMnd / 12);
          const normMnd = ((nyMnd % 12) + 12) % 12;
          // Bruk siste dag i måneden hvis original dag ikke finnes
          const dagerIMnd = new Date(nyÅr, normMnd + 1, 0).getDate();
          const nyDag = Math.min(orig.getDate(), dagerIMnd);
          terminer[j].dato = new Date(nyÅr, normMnd, nyDag);
        }
      }

      // Nullstill kun beløp som IKKE er manuelt satt – bevar manuelle beløp
      for (let j = 0; j < terminer.length; j++) {
        if (!terminer[j]._manuellBelop) terminer[j].belop = null;
      }
      meta.manuellRedigering = true;
    }
    renderAvdragsplan();
  }

  inp.addEventListener('blur', bekreft);
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); inp.blur(); }
    if (e.key === 'Escape') renderAvdragsplan();
  });
}

function autoFormatOgParse(val) {
  const digits = val.replace(/\D/g,'');
  if (digits.length === 6) return parseNO(digits.slice(0,2)+'.'+digits.slice(2,4)+'.20'+digits.slice(4,6));
  if (digits.length === 8) return parseNO(digits.slice(0,2)+'.'+digits.slice(2,4)+'.'+digits.slice(4,8));
  return null;
}

function redigerBelop(idx) {
  const terminer = window._avdragsTerminer;
  const meta     = window._avdragsMeta;
  if (!terminer || !meta || idx >= terminer.length) return;
  const rader    = beregnAvdragsPlan(terminer, meta);
  if (!rader[idx]) { renderAvdragsplan(); return; }
  const allRows   = document.querySelectorAll('#avdrag-tabell tbody tr');
  const domIdx    = Array.from(allRows).findIndex(tr => tr.cells[0]?.textContent.trim().replace(/[^0-9]/,'') == String(idx + 1));
  if (domIdx < 0) { renderAvdragsplan(); return; }
  const td        = allRows[domIdx].cells[2];
  const gjeldende = rader[idx].betaling;

  const inp = document.createElement('input');
  inp.type = 'text';
  inp.value = String(gjeldende).replace('.', ',');
  inp.style.cssText = `width:100px;font-family:'DM Mono',monospace;font-size:13px;border:1px solid var(--ink);border-radius:4px;padding:2px 6px;outline:none;`;
  td.innerHTML = '';
  td.appendChild(inp);
  inp.focus(); inp.select();

  function bekreft() {
    const nyBelop = parseKr(inp.value);
    if (nyBelop > 0) {
      terminer[idx].belop = nyBelop;
      terminer[idx]._manuellBelop = true; // bevar ved datoendring
      // Bevar alle andre manuelle beløp uendret - ikke nullstill etterfølgende terminer.
      // Siste termin settes til null (restgjeld) kun hvis den ikke allerede er manuelt satt
      // og vi ikke redigerer selve siste termin.
      if (idx < terminer.length - 1 && terminer[terminer.length - 1].belop === null) {
        terminer[terminer.length - 1].belop = null; // allerede null, ingen endring
      }
    }
    meta.manuellRedigering = true;
    renderAvdragsplan();
  }

  inp.addEventListener('blur', bekreft);
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); inp.blur(); } if (e.key === 'Escape') renderAvdragsplan(); });
}

function lastNedAvdragPDF() {
  const meta    = window._avdragsMeta;
  const terminer = window._avdragsTerminer;
  if (!meta || !terminer) { toast('Beregn avdragsplan først.', 'info'); return; }
  if (!window.jspdf) { toast('PDF-biblioteket er ikke lastet ennå. Prøv igjen om et øyeblikk.', 'feil'); return; }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const marg = 16;
  const sw   = 210 - marg * 2;
  let y = 0;

  // ── Hjelpefunksjoner ──
  const linje = (tekst, x, yPos, size=10, bold=false, farge=[30,30,46]) => {
    doc.setFontSize(size);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(...farge);
    doc.text(tekst, x, yPos);
  };

  const linjeR = (tekst, x, yPos, size=10, bold=false, farge=[30,30,46]) => {
    doc.setFontSize(size);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(...farge);
    doc.text(tekst, x, yPos, { align: 'right' });
  };

  const hLinje = (yPos, farge=[220,220,215]) => {
    doc.setDrawColor(...farge);
    doc.setLineWidth(0.3);
    doc.line(marg, yPos, 210 - marg, yPos);
  };

  const sjekkNySide = (høyde = 10) => {
    if (y + høyde > 278) {
      doc.addPage();
      y = 20;
    }
  };

  // ── Header ──
  doc.setFillColor(30, 30, 46);
  doc.rect(0, 0, 210, 24, 'F');
  doc.setFillColor(230, 245, 53);
  doc.rect(0, 21, 210, 3, 'F');
  linje('Inkasso Toolkit', marg, 15, 14, true, [255,255,255]);
  linje('Avdragsplan', marg + 52, 15, 9, false, [180,180,200]);
  linjeR(new Date().toLocaleDateString('no-NO'), 210 - marg, 15, 8, false, [180,180,200]);

  y = 33;

  // ── Beregn data ──
  const rader = beregnAvdragsPlan(terminer, meta);
  const totalBetalt = rader.reduce((s, r) => s + r.betaling, 0);
  const totalRenter = rader.reduce((s, r) => s + r.nyeRenter, 0);
  const totalSalar  = rader.reduce((s, r) => s + (r.tilSalar || 0), 0);

  // Åpningsbalanse (hva skyldner faktisk skylder ved start)
  const åpningsbalanse = meta.startSaldoHovedstol + meta.startSaldoSalar
    + (meta.startSaldoRettslige || 0) + meta.startSaldoRenter;

  // Finn første faktiske terminbeløp (for konsistens-visning)
  const førsteTermin = rader[0]?.betaling ?? 0;
  const sisteTermin  = rader[rader.length - 1]?.betaling ?? 0;

  // Sjekk om renter kun er på siste termin
  const renterKunSiste = rader.length > 1 &&
    rader.slice(0, -1).every(r => (r.tilRenter || 0) < 0.005) &&
    (rader[rader.length - 1]?.tilRenter || 0) > 0.005;

  // Finn terminer med salær
  const terminerMedSalar = rader.filter(r => (r.tilSalar || 0) > 0.005);

  // ── Åpningsbalanse boks ──
  doc.setFillColor(241, 245, 249);
  doc.rect(marg, y, sw, 18, 'F');
  doc.setDrawColor(180, 190, 210);
  doc.setLineWidth(0.3);
  doc.rect(marg, y, sw, 18, 'S');

  linje('Hva skylder du totalt ved avtaleinngåelse?', marg + 4, y + 6, 8, false, [80,90,110]);
  linje(kr(åpningsbalanse), 210 - marg - 4, y + 6, 8, true, [30,30,46]);
  doc.setFontSize(8); doc.setFont('helvetica','bold'); doc.setTextColor(30,30,46);
  doc.text(kr(åpningsbalanse), 210 - marg - 4, y + 6, { align: 'right' });

  // Dekomponering i én linje
  let delTekst = `Hovedstol ${kr(meta.startSaldoHovedstol)}`;
  if (meta.startSaldoSalar > 0)       delTekst += `  +  Salær ${kr(meta.startSaldoSalar)}`;
  if (meta.startSaldoRettslige > 0)   delTekst += `  +  Rettslige ${kr(meta.startSaldoRettslige)}`;
  if (meta.startSaldoRenter > 0)      delTekst += `  +  Renter ${kr(meta.startSaldoRenter)}`;
  linje(delTekst, marg + 4, y + 13, 7, false, [100,110,130]);

  y += 24;

  // ── Avdragsdetaljer ──
  linje('Avdragsdetaljer', marg, y, 10, true); y += 5;
  hLinje(y); y += 4;

  const detaljeRader = [
    ['Totalt skyldbeløp ved start', kr(åpningsbalanse)],
    ['Beløp per termin',            kr(førsteTermin)],
    ['Antall terminer',             String(rader.length)],
    ['Renter i avtaleperioden',     kr(totalRenter)],
    ['Totalt betalt i avtalen',     kr(totalBetalt)],
  ];

  detaljeRader.forEach(([label, val], idx) => {
    sjekkNySide(6);
    const erTotal = idx === detaljeRader.length - 1;
    if (erTotal) { hLinje(y - 1); y += 2; }
    linje(label, marg, y, erTotal ? 10 : 9, erTotal, erTotal ? [30,30,46] : [80,80,100]);
    linjeR(val, 210 - marg, y, erTotal ? 10 : 9, erTotal, [30,30,46]);
    y += erTotal ? 6 : 5;
  });

  // Merknad om siste termin avviker
  if (Math.abs(sisteTermin - førsteTermin) > 0.5) {
    sjekkNySide(8);
    linje(`* Siste termin er ${kr(sisteTermin)} – restbeløp etter renter.`, marg, y, 7.5, false, [120,120,140]);
    y += 6;
  }

  y += 4;

  // ── Avdragstabell ──
  sjekkNySide(14);
  linje('Avdragsplan termin for termin', marg, y, 10, true); y += 5;

  // Kolonner – «Nedbetaling» istedenfor «Hovedstol»
  const harSalarKol = totalSalar > 0.005;
  let kol;
  if (harSalarKol) {
    kol = [
      { label: '#',            x: marg,      w: 8,  align: 'left'  },
      { label: 'Forfall',      x: marg+9,    w: 24, align: 'left'  },
      { label: 'Innbetaling',  x: marg+34,   w: 26, align: 'right' },
      { label: '→ Salær',      x: marg+61,   w: 21, align: 'right' },
      { label: '→ Nedbetaling',x: marg+83,   w: 27, align: 'right' },
      { label: '→ Renter',     x: marg+111,  w: 21, align: 'right' },
      { label: 'Restgjeld',    x: marg+133,  w: 29, align: 'right' },
    ];
  } else {
    kol = [
      { label: '#',            x: marg,      w: 8,  align: 'left'  },
      { label: 'Forfall',      x: marg+9,    w: 26, align: 'left'  },
      { label: 'Innbetaling',  x: marg+36,   w: 29, align: 'right' },
      { label: '→ Nedbetaling',x: marg+66,   w: 32, align: 'right' },
      { label: '→ Renter',     x: marg+99,   w: 25, align: 'right' },
      { label: 'Restgjeld',    x: marg+125,  w: 37, align: 'right' },
    ];
  }

  // Header-rad
  sjekkNySide(10);
  doc.setFillColor(30, 30, 46);
  doc.rect(marg, y - 4, sw, 6, 'F');
  kol.forEach(k => {
    doc.setFontSize(7.5); doc.setFont('helvetica','bold'); doc.setTextColor(255,255,255);
    if (k.align === 'right') doc.text(k.label, k.x + k.w, y, { align: 'right' });
    else doc.text(k.label, k.x, y);
  });
  y += 4;

  // Dataradene
  rader.forEach((r, i) => {
    sjekkNySide(6);

    if (i % 2 === 0) {
      doc.setFillColor(248, 248, 245);
      doc.rect(marg, y - 3.5, sw, 5.5, 'F');
    }
    if (r.ekstraTermin) {
      doc.setFillColor(255, 248, 225);
      doc.rect(marg, y - 3.5, sw, 5.5, 'F');
    }

    const erSiste = r.restTotal < 0.01;

    let celler;
    if (harSalarKol) {
      celler = [
        r.nr + (r.ekstraTermin ? '+' : ''),
        formatDato(r.forfallDato),
        kr(r.betaling),
        r.tilSalar > 0.005 ? kr(r.tilSalar) : '–',
        r.tilHovedstol > 0.005 ? kr(r.tilHovedstol) : '–',
        r.tilRenter > 0.005 ? kr(r.tilRenter) : '–',
        kr(r.restTotal),
      ];
    } else {
      celler = [
        r.nr + (r.ekstraTermin ? '+' : ''),
        formatDato(r.forfallDato),
        kr(r.betaling),
        r.tilHovedstol > 0.005 ? kr(r.tilHovedstol) : '–',
        r.tilRenter > 0.005 ? kr(r.tilRenter) : '–',
        kr(r.restTotal),
      ];
    }

    celler.forEach((tekst, ci) => {
      const k = kol[ci];
      doc.setFontSize(8);
      doc.setFont('helvetica', (ci === 2 || erSiste) ? 'bold' : 'normal');
      doc.setTextColor(30, 30, 46);
      if (k.align === 'right') doc.text(tekst, k.x + k.w, y, { align: 'right' });
      else doc.text(tekst, k.x, y);
    });
    y += 5.5;
  });

  hLinje(y); y += 5;

  // ── Fotnoter ──
  sjekkNySide(8);
  if (renterKunSiste) {
    linje('* Renter beregnes og legges til ved siste termin.', marg, y, 7.5, false, [100,100,120]);
    y += 5;
  }

  if (harSalarKol && terminerMedSalar.length > 0) {
    sjekkNySide(6);
    const termNr = terminerMedSalar.map(r => `termin ${r.nr}`).join(', ');
    linje(`* Salær (${kr(totalSalar)}) er inkludert i ${termNr}.`, marg, y, 7.5, false, [100,100,120]);
    y += 5;
  }

  y += 3;
  sjekkNySide(8);
  linje(`Kontroller: Totalt innbetalt ${kr(totalBetalt)} = Skyldbeløp ${kr(åpningsbalanse)} + Renter i perioden ${kr(totalRenter)}`,
    marg, y, 7.5, false, [120,130,150]);
  y += 6;

  // ── Footer ──
  const sider = doc.internal.getNumberOfPages();
  for (let i = 1; i <= sider; i++) {
    doc.setPage(i);
    doc.setFontSize(7); doc.setFont('helvetica','normal'); doc.setTextColor(160,160,175);
    doc.text(`© ${new Date().getFullYear()} William H.B. – Inkasso Toolkit`, marg, 295);
    doc.text(`Side ${i} av ${sider}`, 210 - marg, 295, { align: 'right' });
  }

  doc.save('avdragsplan.pdf');
}
function kopierAvdrag() {
  const rows = document.querySelectorAll('#avdrag-tabell tbody tr');
  let tekst = 'AVDRAGSPLAN\n' + '─'.repeat(70) + '\n';
  tekst += `${'#'.padEnd(4)}${'Forfall'.padEnd(14)}${'Innbet.'.padEnd(14)}${'Salær'.padEnd(14)}${'Hovedstol'.padEnd(14)}${'Renter'.padEnd(14)}${'Rest total'}\n`;
  tekst += '─'.repeat(70) + '\n';
  rows.forEach(r => {
    const c = r.querySelectorAll('td');
    tekst += `${c[0].textContent.trim().padEnd(4)}${c[1].textContent.trim().padEnd(14)}${c[2].textContent.replace(/\s+/g,' ').trim().padEnd(14)}${c[3].textContent.trim().padEnd(14)}${c[4].textContent.trim().padEnd(14)}${c[5].textContent.trim().padEnd(14)}${c[9].textContent.trim()}\n`;
  });
  kopierTekst(tekst, 'Avdragsplan kopiert!');
}

function nullstillAvdrag() {
  window._avdragsTerminer = null;
  window._avdragsMeta = null;
  ['a-hovedstol','a-salar','a-rettslige','a-mnd','a-mnd-belop','a-dato','a-forfall','a-iv-forfall','a-bo-dato','a-tung-salar','a-tung-salar-fremtidig','a-salar-dato'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const slAvd = document.getElementById('sl-avdragssalar'); if(slAvd){slAvd.value=100;}
  const slAvdVal = document.getElementById('sl-avdragssalar-val'); if(slAvdVal){slAvdVal.textContent='100%';}
  document.getElementById('a-bo-ikke-sendt').checked        = false;
  const boDatoEl = document.getElementById('a-bo-dato');
  boDatoEl.disabled = false; boDatoEl.style.opacity = '1';
  document.getElementById('avdragssalar-varsel').style.display  = 'none';
  document.getElementById('tung-salar-wrap').style.display      = 'none';
  document.getElementById('tung-salar-fremtidig').style.display = 'none';
  document.getElementById('iv-ikke-forfalt-varsel').style.display = 'none';
  document.getElementById('inkasso-salar-wrap').style.display      = 'block';
  document.getElementById('foer-bo-varsel').style.display       = 'none';
  document.getElementById('avdrag-summary').innerHTML =
    '<span style="color:var(--text-muted)">Fyll inn bestanddeler og datoer for å beregne totalbeløp.</span>';
  document.getElementById('avdrag-tabell-panel').style.display = 'none';
}
