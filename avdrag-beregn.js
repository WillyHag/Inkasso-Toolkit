function beregnAvdrag() {
  const mndEl   = document.getElementById('a-mnd');
  const belopEl = document.getElementById('a-mnd-belop');
  if (!mndEl || !belopEl) return;
  const hovedstol  = parseKr(document.getElementById('a-hovedstol').value) || 0;
  const lettSalar  = parseKr(document.getElementById('a-salar').value)      || 0;
  const purregebyr    = parseKr(document.getElementById('a-purregebyr').value) || 0;
  const rettsligeRaw = parseKr(document.getElementById('a-rettslige').value) || 0;
  const rettslige    = rettsligeRaw + purregebyr;
  const mndInput   = parseInt(mndEl.value)      || 0;
  const belopInput = parseKr(belopEl.value)     || 0;
  const forfallStr    = document.getElementById('a-forfall').value.trim();
  const ivForfallStr  = document.getElementById('a-iv-forfall').value.trim();
  const boStr         = document.getElementById('a-bo-dato').value.trim();
  const datoStr       = document.getElementById('a-dato').value.trim();
  const dekning       = document.getElementById('a-dekning').value;

  const iDag = new Date(); iDag.setHours(0,0,0,0);
  const boDato       = parseNO(boStr);
  const forfDato     = parseNO(forfallStr);           // fakturadato – brukes til renteberegning
  const ivForfallDato = parseNO(ivForfallStr) || forfDato; // IV-forfall – brukes til foerBO-logikk

  // ── Tungt salær: automatisk basert på BO ──
  let tungPalopDato   = null;
  let tungPaloppt     = false;
  let tungSalar       = 0;

  if (boDato) {
    // Forfallsdato på BO = BO-dato + 14 dager, forskyves til neste virkedag
    const boForfall = new Date(boDato);
    boForfall.setDate(boForfall.getDate() + BO_BETALINGSFRIST);
    const boForfallJustert = nesteUkedag(boForfall);

    // Tungt salær: forfallsdato oversittet med mer enn 28 dager (ingen helg-justering)
    tungPalopDato = new Date(boForfallJustert);
    tungPalopDato.setDate(tungPalopDato.getDate() + BO_OVERSITTELSE + 1);
    tungPaloppt = iDag >= tungPalopDato;
  }

  // Auto-fyll tungt salær fra satsene hvis hovedstol er satt
  if (hovedstol > 0) {
    const satser = hentSalar(hovedstol);
    if (tungPaloppt) {
      const el = document.getElementById('a-tung-salar');
      if (el && !el.value) el.value = satser.tungt;
    } else if (boDato) {
      const el = document.getElementById('a-tung-salar-fremtidig');
      if (el && !el.value) el.value = satser.tungt;
    }
  }

  // Vis/skjul tungt salær UI
  document.getElementById('tung-salar-wrap').style.display     = tungPaloppt ? 'block' : 'none';
  document.getElementById('tung-salar-fremtidig').style.display = (boDato && !tungPaloppt) ? 'block' : 'none';

  if (boDato && !tungPaloppt && tungPalopDato) {
    document.getElementById('tung-salar-dato').textContent = formatDato(tungPalopDato);
    tungSalar = parseKr(document.getElementById('a-tung-salar-fremtidig').value) || 0;
  } else if (tungPaloppt) {
    tungSalar = parseKr(document.getElementById('a-tung-salar').value) || 0;
  }

  // ── IV ikke forfalt: ingen salær, kun purregebyr ──
  // IV ikke forfalt: kun relevant hvis forfallsdato er gyldig og ikke i fremtiden for fakturaen
  const forfDatoGyldig = forfDato && forfDato <= iDag;
  const ivIkkeForfalt = forfDatoGyldig && ivForfallDato && ivForfallDato > iDag;
  const salarWrap = document.getElementById('inkasso-salar-wrap');
  if (salarWrap) salarWrap.style.display = ivIkkeForfalt ? 'none' : 'block';

  // Sett varsel dersom IV ikke har forfalt
  const ivVarselEl = document.getElementById('iv-ikke-forfalt-varsel');
  if (ivVarselEl) ivVarselEl.style.display = ivIkkeForfalt ? 'block' : 'none';

  // Effektivt salær = 0 hvis IV ikke har forfalt ennå
  const effektivLettSalar = ivIkkeForfalt ? 0 : lettSalar;
  const boIkkeSendtTidlig = document.getElementById('a-bo-ikke-sendt')?.checked;
  const foerBOTidlig = boIkkeSendtTidlig;

  if (!hovedstol || (!mndInput && !belopInput && !foerBOTidlig)) {
    document.getElementById('avdrag-summary').innerHTML =
      '<span style="color:var(--text-muted)">Fyll inn hovedstol og antall måneder eller månedlig beløp.</span>';
    document.getElementById('avdrag-tabell-panel').style.display = 'none';
    return;
  }

  // ── Renter på hovedstol fra forfallsdato til i dag (med historiske satser) ──
  let rentHovedstolIdag = 0;
  let dagerHovedstol    = 0;
  if (forfDato && forfDato < iDag) {
    dagerHovedstol = dagMellom(forfDato, iDag);
    const r = beregnRenterMedSatser(hovedstol, forfDato, iDag);
    rentHovedstolIdag = r.totalRente;
  }

  // ── Renter på inkassosalær (lett) ──
  // Fra BO+14 dager hvis BO er satt, ellers fra forfallsdato+14 dager (IV-fristen)
  let rentSalarIdag = 0;
  let rentSalarFraDato = null;
  if (effektivLettSalar > 0) {
    if (boDato) {
      rentSalarFraDato = new Date(boDato);
      rentSalarFraDato.setDate(rentSalarFraDato.getDate() + 14);
    } else if (forfDato) {
      rentSalarFraDato = new Date(forfDato);
      rentSalarFraDato.setDate(rentSalarFraDato.getDate() + 14);
    }
    if (rentSalarFraDato && rentSalarFraDato < iDag) {
      rentSalarIdag = beregnRenterMedSatser(effektivLettSalar, rentSalarFraDato, iDag).totalRente;
    }
  }

  // ── Renter på tungt salær (fra påløpsdato til i dag hvis påløpt) ──
  // Tungt erstatter lett – legg til differansen i renter fra tungt påløpsdato
  let rentTungIdag = 0;
  if (tungPaloppt && tungSalar > 0 && tungPalopDato < iDag) {
    rentTungIdag = beregnRenterMedSatser(tungSalar, tungPalopDato, iDag).totalRente;
    // Trekk fra renter av lett salær etter tungt påløp (de er erstattet)
    if (rentSalarFraDato) {
      const rentLettEtterTung = beregnRenterMedSatser(effektivLettSalar, tungPalopDato, iDag).totalRente;
      rentTungIdag -= rentLettEtterTung;
    }
  }

  // Samlet renter av inkassosalær (lett + tungt er samme krav, ikke separat)
  const rentSalarTotaltIdag = rentSalarIdag + rentTungIdag;

  const mndBeregnet   = mndEl.dataset.beregnet === '1';
  const belopBeregnet = belopEl.dataset.beregnet === '1';

  // ── Avdragssalær – vis varsel ved ≥5, respekter fritak ──
  let mnd, fastMndBelop;
  if (belopInput && !belopBeregnet) {
    // Beløp er manuelt tastet – beregn antall måneder
    fastMndBelop = belopInput;
    mnd          = null;
  } else if (mndInput && !mndBeregnet) {
    // Antall måneder er manuelt tastet – beregn terminbeløp
    mnd          = mndInput;
    fastMndBelop = null;
  } else if (mndInput) {
    // Begge er beregnet – bruk antall måneder
    mnd          = mndInput;
    fastMndBelop = null;
  } else if (!foerBOTidlig) {
    return;
  }

  // ── Avdragsavtale før BO: begrens til maks 4 avdrag, krev 25% første avdrag ──
  const ivForfalt = ivForfallDato && ivForfallDato < iDag;
  const ivIkkeForfaltFoerBO = foerBOTidlig && ivForfallDato && ivForfallDato >= iDag;
  const boIkkeSendt = boIkkeSendtTidlig;
  const foerBO    = boIkkeSendt;
  const foerBOVarsel = document.getElementById('foer-bo-varsel');
  const foerBOTekst  = document.getElementById('foer-bo-varsel-tekst');

  if (foerBO) {
    // Maks avdrag: 3 hvis IV ikke forfalt (25% + 3 avdrag), 4 hvis IV forfalt
    const maksAvdrag = ivIkkeForfaltFoerBO ? 3 : 4;

    if (!mnd && !fastMndBelop) {
      mnd = maksAvdrag;
      mndEl.value = maksAvdrag;
      mndEl.dataset.beregnet = '1';
      fastMndBelop = null;
    } else if (mnd && mnd > maksAvdrag) {
      mnd = maksAvdrag;
      mndEl.value = maksAvdrag;
      mndEl.dataset.beregnet = '1';
      fastMndBelop = null;
    }

    if (foerBOVarsel) foerBOVarsel.style.display = 'block';
  } else {
    if (foerBOVarsel) foerBOVarsel.style.display = 'none';
  }

  // Advarsel ved mer enn 4 avdrag
  // Når beløp er manuelt tastet: estimer antall avdrag fra total/beløp
  const antallVarsel = document.getElementById('avdrag-antall-varsel');
  if (antallVarsel) {
    let estimertMnd = mnd;
    if (!estimertMnd && fastMndBelop) {
      const totalVedForfallEst = hovedstol + (effektivLettSalar || 0) + rettslige;
      estimertMnd = totalVedForfallEst > 0 ? Math.ceil(totalVedForfallEst / fastMndBelop) : null;
    }
    antallVarsel.style.display = (estimertMnd && estimertMnd > 4) ? 'block' : 'none';
  }

  // Avdragssalær: ikke tillatt ved rettslig inkasso (rettslige kostnader er lagt til)
  const erRettsligInkasso = rettslige > 0;

  // Avdragssalær kun ved 5+ avdrag og ikke rettslig inkasso
  const estimertMndForSalar = mnd ?? (fastMndBelop ? Math.ceil((hovedstol + (effektivLettSalar||0) + rettslige) / fastMndBelop) : 0);
  const visAvdragsVarsel = estimertMndForSalar >= 5 && !erRettsligInkasso;
  document.getElementById('avdragssalar-varsel').style.display = visAvdragsVarsel ? 'block' : 'none';

  // Vis info-melding hvis rettslig inkasso blokkerer avdragssalær
  let rettsligInfoEl = document.getElementById('avdragssalar-rettslig-info');
  if (!rettsligInfoEl) {
    rettsligInfoEl = document.createElement('div');
    rettsligInfoEl.id = 'avdragssalar-rettslig-info';
    rettsligInfoEl.style.cssText = 'display:none;background:#f0fdf4;border-left:3px solid var(--normal);border-radius:6px;padding:10px 14px;margin-bottom:16px;font-size:13px;color:#166534;';
    rettsligInfoEl.innerHTML = '✓ Avdragssalær beregnes ikke ved rettslig inkasso.';
    const varselEl = document.getElementById('avdragssalar-varsel');
    if (varselEl) varselEl.parentNode.insertBefore(rettsligInfoEl, varselEl);
  }
  rettsligInfoEl.style.display = (erRettsligInkasso && estimertMndForSalar >= 5) ? 'block' : 'none';

  // Oppdater maks-beløp i varselet
  const maksAvdragsgebyr = beregnAvdragsgebyr();
  const maksEl = document.getElementById('avdragssalar-maks');
  const maksLabelEl = document.getElementById('avdragssalar-maks-label');
  if (maksEl) maksEl.textContent = kr(maksAvdragsgebyr);
  if (maksLabelEl) maksLabelEl.textContent = kr(maksAvdragsgebyr);

  // Beregn faktisk avdragsgebyr basert på slider (0–100%) – aldri ved rettslig inkasso
  const sliderPst = (visAvdragsVarsel && !erRettsligInkasso)
    ? parseInt(document.getElementById('sl-avdragssalar')?.value || 100) / 100
    : 0;
  const avdragsgebyr = Math.round(maksAvdragsgebyr * sliderPst * 100) / 100;

  // ── Totalt salær: tungt erstatter lett (er ikke et tillegg) ──
  const effektivtSalar = tungPaloppt ? tungSalar : (boDato && tungSalar > 0 ? tungSalar : effektivLettSalar);
  const totalSalar = effektivtSalar + avdragsgebyr;

  // Splitt: hva som er påløpt nå vs. hva som legges til når tungt salær påløper
  // Hvis tungt ikke har påløpt: start med lett salær, legg til differansen på tungPalopDato
  // Splitt: hva som er påløpt nå vs. hva som legges til når lett salær påløper (før BO)
  const salarDatoStr   = document.getElementById('a-salar-dato')?.value.trim();
  const salarPalopDato = foerBO && salarDatoStr ? parseNO(salarDatoStr) : null;
  const lettSalarIkkeEndaPaloppt = salarPalopDato && salarPalopDato > iDag;
  // Hvis BO ikke sendt og ingen dato for salær er satt → salær påløper ikke i avtalen
  const foerBOUtenSalarDato = foerBO && !salarDatoStr;

  // salarNaa: påløpt salær per i dag
  const salarNaa = tungPaloppt ? tungSalar
                 : (lettSalarIkkeEndaPaloppt || foerBOUtenSalarDato) ? 0
                 : effektivLettSalar;

  const lettSalarDifferanse = lettSalarIkkeEndaPaloppt ? effektivLettSalar : 0;
  const salarDifferanse = (!tungPaloppt && tungSalar > 0) ? (tungSalar - effektivLettSalar)
                        : lettSalarIkkeEndaPaloppt ? effektivLettSalar
                        : 0;

  // ── Total renter per i dag ──
  const totalRenterIdag = rentHovedstolIdag + rentSalarTotaltIdag;

  // ── Startdato ──
  let startDato = parseNO(datoStr) || (() => {
    const d = new Date(); d.setMonth(d.getMonth()+1); d.setDate(1); return d;
  })();

  // Scenario: IV ikke forfalt og BO ikke sendt → første forfall = forfallsdato på IV
  if (ivIkkeForfaltFoerBO && ivForfallDato) startDato = new Date(ivForfallDato);

  // ── Renter fra i dag til første forfall – separat for hovedstol og salær ──
  const dagerTilForfall = dagMellom(iDag, startDato);
  const rentFremTilForfallHovedstol = dagerTilForfall > 0
    ? beregnRenterMedSatser(hovedstol, iDag, startDato).totalRente : 0;
  const rentFremTilForfallSalar = dagerTilForfall > 0
    ? beregnRenterMedSatser(effektivtSalar, iDag, startDato).totalRente : 0;
  const rentFremTilForfall = rentFremTilForfallHovedstol + rentFremTilForfallSalar;

  // ── Totalt ved første forfall ──
  const totalVedForfall = hovedstol + totalSalar + rettslige + totalRenterIdag + rentFremTilForfall;

  // ── Sammendrag ──
  let varsler = '';

  // Advarsel for avdragsavtale før BO
  if (foerBO) {
    const salarDatoStr = document.getElementById('a-salar-dato')?.value.trim();
    const salarDato    = parseNO(salarDatoStr);
    let foerBOMsg;
    if (ivIkkeForfaltFoerBO) {
      if (hovedstol < 2500) {
        foerBOMsg = `⚠ <strong>Kravet er under kr 2 500</strong> – det skal ikke inngås avdragsavtale. Skyldner betaler innen fristen i inkassovarselet.`;
      } else {
        const minFoerste = totalVedForfall * 0.25;
        foerBOMsg = `⚠ <strong>IV ikke forfalt:</strong> 25% (${kr(minFoerste)}) betales innen <strong>${ivForfallDato ? formatDato(ivForfallDato) : '–'}</strong>. Restbeløp deles i maks 3 avdrag. Ingen salær legges på.`;
      }
    } else {
      const minFoerste = totalVedForfall * 0.25;
      foerBOMsg = `⚠ <strong>IV forfalt, BO ikke sendt:</strong> Maks 4 avdrag. Første avdrag ≥ <strong>${kr(minFoerste)}</strong> (25% av ${kr(totalVedForfall)}).`;
      if (salarDato) foerBOMsg += ` Lett salær påføres <strong>${formatDato(salarDato)}</strong>. Husk saksnotat.`;
      else foerBOMsg += ` Husk å angi dato for lett salær og dokumentere i saksnotat.`;
    }
    if (foerBOTekst) foerBOTekst.innerHTML = foerBOMsg;
  }

  if (mnd >= 5 && avdragsgebyr > 0) {
    varsler += `<div class="varsel varsel-advarsel">
      ⚠ <strong>Avdragssalær ${kr(avdragsgebyr)}</strong> er lagt til (${mnd || '?'} avdrag).
    </div>`;
  } else if (mnd >= 5 && avdragsgebyr === 0) {
    varsler += `<div class="varsel varsel-ok">
      ✓ Avdragssalær er satt til kr 0.
    </div>`;
  }
  if (!tungPaloppt && tungSalar > 0) {
    varsler += `<div class="varsel varsel-advarsel">
      ⏰ Tungt salær <strong>${kr(tungSalar)}</strong> er inkludert i avtalen – påløper <strong>${formatDato(tungPalopDato)}</strong>.
    </div>`;
  }

  document.getElementById('avdrag-summary').innerHTML = varsler + `
    <div class="rente-result" style="margin-bottom:16px;">
      <div class="rente-box" style="border-left-color:var(--ink)" id="summary-totalbetalt">
        <div class="rente-box-label">Totalt betalt i avtalen</div>
        <div class="rente-box-value">beregner…</div>
      </div>
      <div class="rente-box" style="border-left-color:var(--high)" id="summary-renter-avtalen">
        <div class="rente-box-label">Renter i avtalen</div>
        <div class="rente-box-value">beregner…</div>
      </div>
      <div class="rente-box" style="border-left-color:var(--high)">
        <div class="rente-box-label">Daglig rente</div>
        <div class="rente-box-value">${kr((hovedstol + totalSalar) * dagligRenteNaa())}</div>
      </div>
    </div>
    <div class="breakdown">
      ${hovedstol ? `<div class="breakdown-row"><span class="breakdown-label">Hovedstol</span><span class="breakdown-amount">${kr(hovedstol)}</span></div>` : ''}
      ${!tungPaloppt && tungSalar === 0 && effektivLettSalar ? `<div class="breakdown-row"><span class="breakdown-label">Inkassosalær (lett)</span><span class="breakdown-amount">${kr(effektivLettSalar)}</span></div>` : ''}
      ${tungPaloppt ? `<div class="breakdown-row"><span class="breakdown-label">Inkassosalær (tungt, erstatter lett)</span><span class="breakdown-amount">${kr(tungSalar)}</span></div>` : ''}
      ${!tungPaloppt && tungSalar > 0 ? `<div class="breakdown-row"><span class="breakdown-label">Inkassosalær – vil bli tungt ${formatDato(tungPalopDato)}</span><span class="breakdown-amount">${kr(tungSalar)}</span></div>` : ''}
      ${avdragsgebyr ? `<div class="breakdown-row"><span class="breakdown-label">Avdragssalær</span><span class="breakdown-amount">${kr(avdragsgebyr)}</span></div>` : ''}
      ${rettslige ? `<div class="breakdown-row"><span class="breakdown-label">Rettslige kostnader</span><span class="breakdown-amount">${kr(rettslige)}</span></div>` : ''}
      ${rentHovedstolIdag > 0 ? `<div class="breakdown-row"><span class="breakdown-label">Renter av hovedstol per i dag</span><span class="breakdown-amount">${kr(rentHovedstolIdag)}</span></div>` : ''}
      ${rentSalarTotaltIdag > 0 ? `<div class="breakdown-row"><span class="breakdown-label">Renter av inkassosalær per i dag</span><span class="breakdown-amount">${kr(rentSalarTotaltIdag)}</span></div>` : ''}
      <div class="breakdown-row" id="breakdown-renter-avtalen"><span class="breakdown-label">Renter i avtaleperioden</span><span class="breakdown-amount">beregner…</span></div>
      <div class="breakdown-row total" id="breakdown-totalbetalt"><span class="breakdown-label">Totalt betalt i avtalen</span><span class="breakdown-amount">beregner…</span></div>
    </div>
  `;

  // ── Bygg avdragsplan med daglige renter og dekningsrekkefølge ──
  let saldoHovedstol = hovedstol;
  let saldoSalar     = salarNaa + avdragsgebyr; // kun påløpt salær per i dag
  let saldoRettslige = rettslige;
  let saldoRenter    = totalRenterIdag + rentFremTilForfall;
  let tungLagtTil    = tungPaloppt; // allerede inkludert hvis påløpt

  let forrigeDato = new Date(startDato);

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

  // ── Beregn riktig fast terminbeløp via iterasjon ──
  // Enkel divisjon gir feil fordi renter løper mellom terminene.
  // Vi simulerer avdragsplanen med et prøvebeløp og justerer til saldo = 0 etter siste termin.

  function simuleringTotalRest(prøveBelop, antMnd) {
    let sh = hovedstol;
    let ss = salarNaa + avdragsgebyr;
    let sr = rettslige;
    let sRent = totalRenterIdag + rentFremTilForfall;
    let tLagtTil = tungPaloppt;
    let lLagtTil = !lettSalarIkkeEndaPaloppt;
    let forrige = new Date(startDato);

    for (let i = 0; i < antMnd; i++) {
      const forf = leggTilAvdragDato(startDato, i);

      if (!lLagtTil && salarPalopDato && forf >= salarPalopDato) {
        ss += salarDifferanse; lLagtTil = true;
      }
      if (!tLagtTil && tungPalopDato && forf >= tungPalopDato) {
        ss += salarDifferanse; tLagtTil = true;
      }

      const dager = dagMellom(forrige, forf);
      const sats  = dagligRenteForDato(forrige);
      // Renter kun på hovedstol og inkassosalær – ikke avdragsgebyr eller rettslige
      const renteBase = sh + Math.max(0, Math.min(ss, salarNaa));
      sRent += renteBase * sats * dager;

      const gjenstaar = ss + sr + sh + sRent;
      // Siste termin: ta eksakt rest – dette speiler beregnAvdragsPlan
      const bet = i === antMnd - 1
        ? Math.round(gjenstaar * 100) / 100
        : Math.min(prøveBelop, gjenstaar);

      let r = bet;
      const tR2 = Math.min(r, sr); sr -= tR2; r -= tR2;
      const rek = dekning === 'SHR' ? ['S','H','R'] : dekning === 'HSR' ? ['H','S','R'] :
                  dekning === 'RHS' ? ['R','H','S'] : ['R','S','H'];
      for (const p of rek) {
        if (r <= 0) break;
        if (p === 'S') { const t = Math.min(r, ss); ss -= t; r -= t; }
        if (p === 'H') { const t = Math.min(r, sh); sh -= t; r -= t; }
        if (p === 'R') { const t = Math.min(r, sRent); sRent -= t; r -= t; }
      }
      forrige = new Date(forf);
    }
    return Math.max(0, ss + sr + sh + sRent);
  }

  if (mnd && !fastMndBelop) {
    // Finn terminbeløp med binærsøk slik at rest ≈ 0 etter siste termin
    let lo = totalVedForfall / mnd;
    let hi = totalVedForfall / mnd * 1.5;
    for (let iter = 0; iter < 60; iter++) {
      const mid = (lo + hi) / 2;
      if (simuleringTotalRest(mid, mnd) > 0.01) lo = mid;
      else hi = mid;
    }
    fastMndBelop = Math.ceil(hi * 100) / 100;
    document.getElementById('a-mnd-belop').value = Math.round(fastMndBelop);
    document.getElementById('a-mnd-belop').dataset.beregnet = '1';
  } else if (fastMndBelop && !mnd) {
    // Finn antall måneder ved å simulere til saldo = 0
    mnd = 1;
    while (mnd < 1200) {
      if (simuleringTotalRest(fastMndBelop, mnd) <= 0.01) break;
      mnd++;
    }
    document.getElementById('a-mnd').value = mnd;
    document.getElementById('a-mnd').dataset.beregnet = '1';
  }

  // ── Bygg avdragsplan som datastruktur ──
  window._avdragsMeta = {
    startSaldoHovedstol: hovedstol,
    startSaldoSalar: salarNaa + avdragsgebyr,
    startSaldoRettslige: rettslige,
    startSaldoRenter: totalRenterIdag + rentFremTilForfall,
    forrigeDato: new Date(startDato),
    fastMndBelop,
    dekning,
    tungPalopDato,
    tungPaloppt,
    salarDifferanse,
    salarPalopDato,
    lettSalarIkkeEndaPaloppt,
    mnd,
    manuellRedigering: false,
  };

  // Bygg terminer – bevar manuelle beløp selv om antall terminer endres
  const gammleTerminer = window._avdragsTerminer;
  const harManuelle = gammleTerminer?.some(t => t.belop !== null) || false;
  window._avdragsMeta.manuellRedigering = harManuelle;

  window._avdragsTerminer = [];
  for (let i = 0; i < mnd; i++) {
    const gammel = gammleTerminer?.[i] || null;
    window._avdragsTerminer.push({
      dato:          leggTilAvdragDato(startDato, i),
      belop:         gammel ? gammel.belop         : null,
      _manuellBelop: gammel ? (gammel._manuellBelop || false) : false,
    });
  }

  renderAvdragsplan();
}
