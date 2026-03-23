function simInit() {
  const sats = rentesatsForDato(new Date());
  document.getElementById('sim-rente-auto').textContent = String(sats).replace('.', ',') + '%';
  const iDag = new Date();
  const dd = String(iDag.getDate()).padStart(2,'0');
  const mm = String(iDag.getMonth()+1).padStart(2,'0');
  document.getElementById('sim-startdato').value = `${dd}.${mm}.${iDag.getFullYear()}`;
}

function simOppdaterSaldo(el) {
  // Live tusenskilletegn
  const raw = el.value;
  const kommaIdx = raw.search(/[,.]/);
  const heltall = (kommaIdx >= 0 ? raw.slice(0, kommaIdx) : raw).replace(/[^\d]/g, '');
  const desimal = kommaIdx >= 0 ? raw.slice(kommaIdx) : '';
  el.value = heltall.replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f') + desimal;

  // Sett slider-maks til halvparten av saldo (= 2 avdrag)
  const saldo = parseKr(el.value) || 0;
  if (saldo > 0) {
    const sliderMaks = Math.ceil(saldo / 2 / 50) * 50;
    const slider = document.getElementById('sim-avdrag-slider');
    slider.max = sliderMaks;
    slider.step = Math.max(50, Math.round(sliderMaks / 100 / 50) * 50);
    document.getElementById('sim-slider-maks-label').textContent = 'kr ' + sliderMaks.toLocaleString('no-NO');
    // Behold gjeldende verdi hvis den er innenfor, ellers sett til 10% av saldo
    if (parseFloat(slider.value) > sliderMaks) {
      const forslag = Math.round(saldo * 0.1 / 50) * 50;
      slider.value = Math.min(forslag, sliderMaks);
      document.getElementById('sim-avdrag').value = Math.min(forslag, sliderMaks);
      document.getElementById('sim-avdrag-val').textContent = 'kr ' + Math.min(forslag, sliderMaks).toLocaleString('no-NO');
    }
  }

  simBeregn();
}

function simOppdaterAvdragSlider(val) {
  val = parseInt(val);
  document.getElementById('sim-avdrag-val').textContent = 'kr ' + val.toLocaleString('no-NO');
  document.getElementById('sim-avdrag').value = val;
  simBeregn();
}

function simOppdaterAvdragInput(val) {
  const n     = parseKr(val) || 0;
  const saldo = parseKr(document.getElementById('sim-saldo').value) || 0;
  // Maks = halvparten av saldo (2 avdrag), men aldri lavere enn n
  const sliderMaks = saldo > 0 ? Math.max(Math.ceil(saldo / 2 / 50) * 50, n) : Math.max(parseInt(document.getElementById('sim-avdrag-slider').max), n);
  const kappet = n; // inputfeltet har ingen øvre grense – kun slider har det
  const slider = document.getElementById('sim-avdrag-slider');
  slider.max = sliderMaks;
  slider.value = Math.min(n, sliderMaks);
  document.getElementById('sim-slider-maks-label').textContent = 'kr ' + sliderMaks.toLocaleString('no-NO');
  document.getElementById('sim-avdrag-val').textContent = 'kr ' + kappet.toLocaleString('no-NO');
  simBeregn();
}

function simSettAvdrag(val) {
  document.getElementById('sim-avdrag-slider').value = val;
  document.getElementById('sim-avdrag').value = val;
  document.getElementById('sim-avdrag-val').textContent = 'kr ' + val.toLocaleString('no-NO');
  simBeregn();
}

function simBeregn() {
  const saldoRå     = parseKr(document.getElementById('sim-saldo').value) || 0;
  const avdrag      = parseKr(document.getElementById('sim-avdrag').value) || 0;
  const rentePst    = rentesatsForDato(new Date());
  const startDatoEl = document.getElementById('sim-startdato').value.trim();
  const startDato   = parseNO(startDatoEl) || new Date();

  if (!saldoRå || !avdrag) {
    document.getElementById('sim-resultat').innerHTML = '<span style="color:var(--text-muted)">Fyll inn saldo og månedlig avdrag for å simulere.</span>';
    document.getElementById('sim-tabell-wrap').style.display = 'none';
    document.getElementById('sim-indikator').style.display = 'none';
    return;
  }

  // Bruk forliksreduksjon
  const saldo = saldoRå;
  const dagligRente = rentePst / 100 / 365;

  // Simuleringsfunksjon med korrekte datoer og lik terminbeløp
  function simuler(mndAvdrag) {
    let rest = saldo;
    if (rest <= 0) return { terminer: [], totalBetalt: 0, totalRenter: 0, måneder: 0 };

    // Bygg liste med forfallsdatoer
    const datoer = [];
    let d = new Date(startDato);
    for (let i = 0; i < 600; i++) {
      datoer.push(new Date(d));
      d = new Date(d);
      d.setMonth(d.getMonth() + 1);
    }

    // Tell antall terminer som trengs med dette terminbeløpet
    function tellTerminer(terminBelop) {
      let r = rest;
      let forrige = new Date(startDato);
      forrige.setMonth(forrige.getMonth() - 1); // fiktiv forrige dato
      // Bruk startdato direkte som første forfallsdato
      let prevDato = new Date(startDato);
      prevDato.setMonth(prevDato.getMonth() - 1);

      for (let i = 0; i < 600; i++) {
        const dagerMellom = Math.round((datoer[i] - prevDato) / 86400000);
        const renter = r * (rentePst / 100 / 365) * dagerMellom;
        r += renter;
        r -= Math.min(terminBelop, r);
        prevDato = datoer[i];
        if (r <= 0.005) return i + 1;
      }
      return 600;
    }

    // Finn jevnt terminbeløp via binærsøk
    let lo = rest / 600, hi = rest + rest * (rentePst / 100);
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2;
      if (tellTerminer(mid) <= tellTerminer(mndAvdrag)) hi = mid;
      else lo = mid;
    }
    // Bruk mndAvdrag direkte (ikke binærsøk-resultatet) med korrekte datoer
    const terminer = [];
    let r = rest;
    let prevDato = new Date(startDato);
    prevDato.setMonth(prevDato.getMonth() - 1);
    let totalBetalt = 0;
    let totalRenter = 0;
    let måneder = 0;

    for (let i = 0; i < 600 && r > 0.005; i++) {
      const dagerMellom = Math.round((datoer[i] - prevDato) / 86400000);
      const renter = r * (rentePst / 100 / 365) * dagerMellom;
      r += renter;
      totalRenter += renter;

      // Siste termin: betal nøyaktig det som gjenstår
      const erSiste = r <= mndAvdrag + 0.005;
      const betaling = erSiste ? Math.round(r * 100) / 100 : mndAvdrag;
      r = erSiste ? 0 : Math.round((r - betaling) * 100) / 100;
      totalBetalt += betaling;
      måneder++;
      prevDato = datoer[i];

      const dd = String(datoer[i].getDate()).padStart(2,'0');
      const mm = String(datoer[i].getMonth()+1).padStart(2,'0');
      const yyyy = datoer[i].getFullYear();
      terminer.push({
        dato: `${dd}.${mm}.${yyyy}`,
        betaling: Math.round(betaling * 100) / 100,
        renter: Math.round(renter * 100) / 100,
        rest: Math.max(0, r)
      });
    }

    return { terminer, totalBetalt: Math.round(totalBetalt*100)/100, totalRenter: Math.round(totalRenter*100)/100, måneder };
  }

  const res = simuler(avdrag);

  if (res.måneder >= 600) {
    document.getElementById('sim-resultat').innerHTML = `<div class="varsel varsel-feil">⚠ Avdraget er for lavt – renter vokser raskere enn nedbetalingen. Øk månedlig avdrag.</div>`;
    document.getElementById('sim-tabell-wrap').style.display = 'none';
    document.getElementById('sim-indikator').style.display = 'none';
    document.getElementById('sim-antall-varsel').style.display = 'none';
    return;
  }

  // Advarsel: mer enn 4 avdrag
  document.getElementById('sim-antall-varsel').style.display = res.måneder > 4 ? 'block' : 'none';

  // Nedbetalingstid som tekst
  const år = Math.floor(res.måneder / 12);
  const mnd = res.måneder % 12;
  const tidTekst = år > 0 ? `${år} år${mnd > 0 ? ', ' + mnd + ' mnd' : ''}` : `${mnd} mnd`;

  const sisteDato = res.terminer.length > 0 ? res.terminer[res.terminer.length-1].dato : '–';
  const renteAndel = res.totalBetalt > 0 ? (res.totalRenter / res.totalBetalt * 100) : 0;

  // Realitetsindikator
  let indFarge, indBgFarge, indLabel, indTekst;
  if (res.måneder <= 36) {
    indFarge = '#166534'; indBgFarge = '#f0fdf4'; indLabel = '✓ Realistisk';
    indTekst = `${tidTekst} – god plan med lav risiko for mislighold`;
  } else if (res.måneder <= 60) {
    indFarge = '#92400e'; indBgFarge = '#fff8e1'; indLabel = '⚠ Moderat';
    indTekst = `${tidTekst} – akseptabelt, men vurder om skyldner klarer dette over tid`;
  } else {
    indFarge = '#991b1b'; indBgFarge = '#fde8e8'; indLabel = '⛔ Høy risiko';
    indTekst = `${tidTekst} – høy sannsynlighet for mislighold. Vurder forlik eller høyere avdrag`;
  }

  const ind = document.getElementById('sim-indikator');
  ind.style.display = 'block';
  ind.style.background = indBgFarge;
  ind.style.borderLeft = `3px solid ${indFarge}`;
  document.getElementById('sim-indikator-label').style.color = indFarge;
  document.getElementById('sim-indikator-label').textContent = indLabel;
  document.getElementById('sim-indikator-tekst').style.color = indFarge;
  document.getElementById('sim-indikator-tekst').textContent = indTekst;

  document.getElementById('sim-resultat').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
      <div style="background:var(--panel-primary-bg);border-radius:8px;padding:14px 16px;">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:rgba(255,255,255,0.9);margin-bottom:4px;">Nedbetalingstid</div>
        <div style="font-family:'DM Mono',monospace;font-size:22px;font-weight:500;color:#fff;">${tidTekst}</div>
      </div>
      <div style="background:var(--bg);border-radius:8px;padding:14px 16px;border:1px solid var(--border);">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-muted);margin-bottom:4px;">Totalt betalt</div>
        <div style="font-family:'DM Mono',monospace;font-size:22px;font-weight:500;color:var(--ink);">${kr(res.totalBetalt)}</div>
      </div>
      <div style="background:var(--bg);border-radius:8px;padding:14px 16px;border:1px solid var(--border);">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-muted);margin-bottom:4px;">Totale renter</div>
        <div style="font-family:'DM Mono',monospace;font-size:22px;font-weight:500;color:var(--high);">${kr(res.totalRenter)}</div>
      </div>
      <div style="background:var(--bg);border-radius:8px;padding:14px 16px;border:1px solid var(--border);">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-muted);margin-bottom:4px;">Renteandel</div>
        <div style="font-family:'DM Mono',monospace;font-size:22px;font-weight:500;color:var(--ink);">${renteAndel.toFixed(1)}%</div>
      </div>
    </div>
    <div style="font-size:13px;color:var(--text-muted);line-height:1.7;">
      Første betaling: <strong style="color:var(--ink)">${res.terminer[0]?.dato || '–'}</strong><br>
      Siste betaling: <strong style="color:var(--ink)">${sisteDato}</strong>
    </div>
    ${res.måneder > 1 ? `
    <div style="margin-top:16px;background:#eef4ff;border-left:3px solid #3a7bd5;border-radius:6px;padding:10px 14px;font-size:13px;color:#1e3a6e;">
      💬 <em>"Hvis du øker til ${kr(simAvdragForMåneder(saldo, dagligRente, res.måneder - 1))}, er du ferdig på ${(()=>{ const m=res.måneder-1; const å=Math.floor(m/12); const mn=m%12; return å>0?å+' år'+(mn>0?', '+mn+' mnd':''):mn+' mnd'; })()}"</em>
    </div>` : ''}
  `;

  // Tabell (vis maks 60 rader for ytelse)
  const visTerminer = res.terminer.slice(0, 60);
  const harFlere = res.terminer.length > 60;

  let tblHtml = `<thead><tr>
    <th>Mnd</th><th>Forfall</th><th style="text-align:right">Avdrag</th>
    <th style="text-align:right">Renter</th><th style="text-align:right">Restsaldo</th>
  </tr></thead><tbody>`;

  visTerminer.forEach((t, i) => {
    const zebra = i % 2 === 0 ? '' : 'background:var(--bg);';
    tblHtml += `<tr style="${zebra}">
      <td class="label">${i+1}</td>
      <td>${t.dato}</td>
      <td style="text-align:right;font-weight:600">${tbl(t.betaling)}</td>
      <td style="text-align:right;color:var(--high)">${tbl(t.renter)}</td>
      <td style="text-align:right;font-weight:${t.rest < 0.01 ? '700' : '400'}">${tbl(t.rest)}</td>
    </tr>`;
  });

  if (harFlere) {
    tblHtml += `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);font-size:12px;padding:10px;">… og ${res.terminer.length - 60} terminer til</td></tr>`;
  }
  tblHtml += '</tbody>';

  document.getElementById('sim-tabell').innerHTML = tblHtml;
  document.getElementById('sim-tabell-wrap').style.display = 'block';

  // Lagre for kopiering
  window._simData = { res, saldo, avdrag, rentePst, tidTekst };
}

function simBestForslag() {
  const saldoRå = parseKr(document.getElementById('sim-saldo').value) || 0;
  if (!saldoRå) return;
  const saldo = saldoRå;
  const rentePst   = rentesatsForDato(new Date());
  const dagligRente = rentePst / 100 / 365;

  // Dynamisk målmåneder basert på saldo – korte avtaler for små krav
  const målMåneder = saldo < 10000  ?  3
                   : saldo < 25000  ?  6
                   : saldo < 50000  ? 12
                   : saldo < 100000 ? 18
                   : saldo < 250000 ? 24
                   :                  36;

  const optimalt = simAvdragForMåneder(saldo, dagligRente, målMåneder);
  simSettAvdrag(optimalt);
  document.getElementById('sim-avdrag').value = optimalt;
}

function simAvdragForMåneder(saldo, dagligRente, målMåneder) {
  const rentePst = rentesatsForDato(new Date());
  const startDato = parseNO(document.getElementById('sim-startdato').value.trim()) || new Date();

  // Bygg datoer
  const datoer = [];
  let d = new Date(startDato);
  for (let i = 0; i < målMåneder + 5; i++) {
    datoer.push(new Date(d));
    d.setMonth(d.getMonth() + 1);
  }

  function tellTerminer(terminBelop) {
    let r = saldo;
    let prevDato = new Date(startDato); prevDato.setMonth(prevDato.getMonth() - 1);
    for (let i = 0; i < 600; i++) {
      const dager = Math.round((datoer[i] - prevDato) / 86400000);
      r += r * (rentePst / 100 / 365) * dager;
      r -= Math.min(terminBelop, r);
      prevDato = datoer[i];
      if (r <= 0.005) return i + 1;
    }
    return 600;
  }

  let lo = saldo / (målMåneder + 2), hi = saldo * 1.5;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (tellTerminer(mid) > målMåneder) lo = mid; else hi = mid;
  }
  return Math.ceil(hi / 10) * 10;
}

function simOptimaltAvdrag(saldo, dagligRente, målMåneder) {
  return simAvdragForMåneder(saldo, null, målMåneder || 36);
}

function simSett4Avdrag() {
  const saldo = parseKr(document.getElementById('sim-saldo').value) || 0;
  if (!saldo) return;
  const optimalt = simAvdragForMåneder(saldo, null, 4);
  simSettAvdrag(optimalt);
  document.getElementById('sim-avdrag').value = optimalt;
}

function simKopier() {
  const d = window._simData;
  if (!d) return;
  const { res, saldo, avdrag, rentePst, tidTekst } = d;

  let tekst = `NEDBETALINGSPLAN\n${'─'.repeat(60)}\n`;
  tekst += `Saldo:            ${kr(saldo)}\n`;
  tekst += `Månedlig avdrag:  ${kr(avdrag)}\n`;
  tekst += `Rentesats:        ${rentePst}% p.a.\n`;
  tekst += `Nedbetalingstid:  ${tidTekst}\n`;
  tekst += `Totalt betalt:    ${kr(res.totalBetalt)}\n`;
  tekst += `Totale renter:    ${kr(res.totalRenter)}\n`;
  tekst += `${'─'.repeat(60)}\n`;
  tekst += `${'Mnd'.padEnd(5)}${'Forfall'.padEnd(14)}${'Avdrag'.padEnd(13)}${'Renter'.padEnd(13)}Restsaldo\n`;
  tekst += `${'─'.repeat(60)}\n`;
  res.terminer.forEach((t, i) => {
    tekst += `${String(i+1).padEnd(5)}${t.dato.padEnd(14)}${kr(t.betaling).padEnd(13)}${kr(t.renter).padEnd(13)}${kr(t.rest)}\n`;
  });

  kopierTekst(tekst, 'Nedbetalingsplan kopiert!');
}

// Init simulator når fanen åpnes
document.addEventListener('DOMContentLoaded', () => {
  simInit();
});
