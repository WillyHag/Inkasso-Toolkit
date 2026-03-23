const INKASSOSATS = 750; // Finanstilsynet – oppdater ved endring

function beregnAvdragsgebyr() {
  const mva = document.getElementById('a-mva')?.value || 'nei';
  const grunnlag = INKASSOSATS * 1.5;
  return Math.round((mva === 'nei' ? grunnlag * 1.25 : grunnlag) * 100) / 100;
}
// Forfallsdato på BO = BO-dato + 14 dager, forskyves til neste virkedag (§ 2-3)
// Tungt salær påløper forfallsdato + 28 dager (ingen justering – kan falle på helg/helligdag)
const BO_BETALINGSFRIST = 14;
const BO_OVERSITTELSE = 28;

/* ════════════════════════════════
   HELLIGDAGER OG UKEDAG-JUSTERING
════════════════════════════════ */

function norskHelligdag(dato) {
  const d = new Date(dato); d.setHours(0,0,0,0);
  const år = d.getFullYear();
  const md = d.getMonth() * 100 + d.getDate(); // måneds-dag som tall

  // Faste helligdager
  const faste = [101, 501, 517, 1225, 1226]; // nyttår, 1.mai, 17.mai, 1.juledag, 2.juledag
  if (faste.includes(md)) return true;

  // Påske – beregn via Gauß-algoritmen
  function paaskeDate(y) {
    const a = y % 19, b = Math.floor(y/100), c = y % 100;
    const d = Math.floor(b/4), e = b % 4;
    const f = Math.floor((b+8)/25), g = Math.floor((b-f+1)/3);
    const h = (19*a + b - d - g + 15) % 30;
    const i = Math.floor(c/4), k = c % 4;
    const l = (32 + 2*e + 2*i - h - k) % 7;
    const m = Math.floor((a + 11*h + 22*l) / 451);
    const mnd = Math.floor((h + l - 7*m + 114) / 31) - 1;
    const dag = ((h + l - 7*m + 114) % 31) + 1;
    return new Date(y, mnd, dag);
  }

  const paaskedag = paaskeDate(år);
  const helligPaaskedager = [-3, -2, -1, 0, 1, 39, 49, 50]; // skjærtorsdag–2.pinsedag
  for (const offset of helligPaaskedager) {
    const hd = new Date(paaskedag);
    hd.setDate(paaskedag.getDate() + offset);
    if (hd.toDateString() === d.toDateString()) return true;
  }
  return false;
}

function nesteUkedag(dato) {
  const d = new Date(dato); d.setHours(0,0,0,0);
  while (d.getDay() === 0 || d.getDay() === 6 || norskHelligdag(d)) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}


/* ════════════════════════════════
   FORSINKELSESRENTE – historiske satser
   Kilde: Finanstilsynet
   Oppdater RENTE_SATSER når nye satser publiseres (1. jan og 1. jul hvert år)
════════════════════════════════ */

const RENTE_SATSER = [
  { fra: new Date(1994,  0,  1), sats: 12.00 },
  { fra: new Date(2004,  0,  1), sats:  9.25 },
  { fra: new Date(2004,  6,  1), sats:  8.75 },
  { fra: new Date(2005,  0,  1), sats:  8.75 },
  { fra: new Date(2005,  6,  1), sats:  9.00 },
  { fra: new Date(2006,  0,  1), sats:  9.25 },
  { fra: new Date(2006,  6,  1), sats:  9.75 },
  { fra: new Date(2007,  0,  1), sats: 10.50 },
  { fra: new Date(2007,  6,  1), sats: 11.50 },
  { fra: new Date(2008,  0,  1), sats: 12.25 },
  { fra: new Date(2008,  6,  1), sats: 12.75 },
  { fra: new Date(2009,  0,  1), sats: 10.00 },
  { fra: new Date(2009,  6,  1), sats:  8.25 },
  { fra: new Date(2010,  0,  1), sats:  8.75 },
  { fra: new Date(2010,  6,  1), sats:  9.00 },
  { fra: new Date(2011,  0,  1), sats:  9.00 },
  { fra: new Date(2011,  6,  1), sats:  9.25 },
  { fra: new Date(2012,  0,  1), sats:  8.75 },
  { fra: new Date(2012,  6,  1), sats:  8.50 },
  { fra: new Date(2013,  0,  1), sats:  8.50 },
  { fra: new Date(2013,  6,  1), sats:  9.50 },
  { fra: new Date(2014,  0,  1), sats:  9.50 },
  { fra: new Date(2014,  6,  1), sats:  9.50 },
  { fra: new Date(2015,  0,  1), sats:  9.25 },
  { fra: new Date(2015,  6,  1), sats:  9.00 },
  { fra: new Date(2016,  0,  1), sats:  8.75 },
  { fra: new Date(2016,  6,  1), sats:  8.50 },
  { fra: new Date(2017,  0,  1), sats:  8.50 },
  { fra: new Date(2017,  6,  1), sats:  8.50 },
  { fra: new Date(2018,  0,  1), sats:  8.50 },
  { fra: new Date(2018,  6,  1), sats:  8.50 },
  { fra: new Date(2019,  0,  1), sats:  8.75 },
  { fra: new Date(2019,  6,  1), sats:  9.25 },
  { fra: new Date(2020,  0,  1), sats:  9.50 },
  { fra: new Date(2020,  6,  1), sats:  8.00 },
  { fra: new Date(2021,  0,  1), sats:  8.00 },
  { fra: new Date(2021,  6,  1), sats:  8.00 },
  { fra: new Date(2022,  0,  1), sats:  8.50 },
  { fra: new Date(2022,  6,  1), sats:  9.25 },
  { fra: new Date(2023,  0,  1), sats: 10.75 },
  { fra: new Date(2023,  6,  1), sats: 11.75 },
  { fra: new Date(2024,  0,  1), sats: 12.50 },
  { fra: new Date(2024,  6,  1), sats: 12.50 },
  { fra: new Date(2025,  0,  1), sats: 12.50 },
  { fra: new Date(2025,  6,  1), sats: 12.25 },
  { fra: new Date(2026,  0,  1), sats: 12.00 },
  // ↑ Legg til nye satser her når Finanstilsynet publiserer dem
];

/** Henter rentesats for en gitt dato */
function rentesatsForDato(dato) {
  let sats = RENTE_SATSER[0].sats;
  for (const r of RENTE_SATSER) {
    if (dato >= r.fra) sats = r.sats;
    else break;
  }
  return sats;
}

/**
 * Beregner renter med korrekte halvårlige satser.
 * Splitter perioden ved hver 1. jan og 1. jul.
 * Returnerer { totalRente, perioder: [{fra, til, dager, sats, rente}] }
 */
function beregnRenterMedSatser(beloep, fraDato, tilDato) {
  if (!fraDato || !tilDato || tilDato <= fraDato || beloep <= 0) {
    return { totalRente: 0, perioder: [] };
  }

  const perioder = [];
  let gjeldende = new Date(fraDato);

  while (gjeldende < tilDato) {
    // Finn neste skjæringspunkt (1. jan eller 1. jul)
    const year = gjeldende.getFullYear();
    const kandidater = [
      new Date(year,  6, 1),   // 1. jul samme år
      new Date(year + 1, 0, 1) // 1. jan neste år
    ].filter(d => d > gjeldende);

    const nesteSplitt = kandidater.reduce((a, b) => a < b ? a : b);
    const periodeSlutt = nesteSplitt < tilDato ? nesteSplitt : tilDato;

    const dager = dagMellom(gjeldende, periodeSlutt);
    const sats  = rentesatsForDato(gjeldende);
    const rente = beloep * (sats / 100) * (dager / 365);

    perioder.push({ fra: new Date(gjeldende), til: new Date(periodeSlutt), dager, sats, rente });
    gjeldende = new Date(periodeSlutt);
  }

  const totalRente = perioder.reduce((s, p) => s + p.rente, 0);
  return { totalRente, perioder };
}

/** Daglig rente for gjeldende dato (brukes i avdragsplan) */
function dagligRenteNaa() {
  const iDag = new Date();
  return rentesatsForDato(iDag) / 100 / 365;
}

/** Daglig rente for en gitt dato */
function dagligRenteForDato(dato) {
  return rentesatsForDato(dato) / 100 / 365;
}

// Satser fra Finanstilsynet 2026
// Struktur: { grense, forbruker_ja, forbruker_nei, naring_ja, naring_nei }
// Verdiene er [lett, tungt]
const SALAR_SATSER = [
  { grense:    500, fja: [187.50,  375],    fnei: [234.38,  468.75], nja: [281.25,  562.50], nnei: [351.56,  703.13] },
  { grense:   1000, fja: [262.50,  525],    fnei: [328.13,  656.25], nja: [393.75,  787.50], nnei: [492.19,  984.38] },
  { grense:   2500, fja: [300,     600],    fnei: [375,     750],    nja: [450,     900],    nnei: [562.50, 1125]    },
  { grense:  10000, fja: [600,    1200],    fnei: [750,    1500],    nja: [900,    1800],    nnei: [1125,   2250]    },
  { grense:  50000, fja: [1200,   2400],    fnei: [1500,   3000],    nja: [1800,   3600],    nnei: [2250,   4500]    },
  { grense: 250000, fja: [2700,   5400],    fnei: [3375,   6750],    nja: [4050,   8100],    nnei: [5062.50,10125]   },
  { grense: Infinity, fja:[5400, 10800],    fnei: [6750,  13500],    nja: [8100,  16200],    nnei: [10125, 20250]    },
];

function hentSalar(hovedstol) {
  const skyldner = document.getElementById('a-skyldner').value;
  const mva      = document.getElementById('a-mva').value;
  const key      = skyldner === 'forbruker' ? (mva === 'ja' ? 'fja' : 'fnei')
                                            : (mva === 'ja' ? 'nja' : 'nnei');
  for (const rad of SALAR_SATSER) {
    if (hovedstol <= rad.grense) return { lett: rad[key][0], tungt: rad[key][1] };
  }
  const siste = SALAR_SATSER[SALAR_SATSER.length - 1];
  return { lett: siste[key][0], tungt: siste[key][1] };
}

function oppdaterAvdragssalar(pst) {
  pst = parseInt(pst);
  const maks = beregnAvdragsgebyr();
  document.getElementById('sl-avdragssalar-val').textContent = pst + '%';
  document.getElementById('sl-avdragssalar').value = pst;
  beregnAvdrag();
}

function validerPurregebyr() {
  const beloep    = parseKr(document.getElementById('a-purregebyr').value) || 0;
  const skyldner  = document.getElementById('a-skyldner').value;
  const varsel    = document.getElementById('a-purregebyr-varsel');
  if (!varsel) return;

  const maks = skyldner === 'naring' ? 460 : 76;
  const type = skyldner === 'naring' ? 'næringsdrivende' : 'privatperson';

  if (beloep > maks) {
    varsel.style.display = 'block';
    varsel.textContent   = `⚠ Maks purregebyr/standardkompensasjon for ${type} er kr ${maks}`;
  } else {
    varsel.style.display = 'none';
  }
}

function oppdaterFoerBO() {
  const forfDato     = parseNO(document.getElementById('a-forfall').value.trim());
  const ivForfallStr = document.getElementById('a-iv-forfall').value.trim();
  const ivForfallDato = parseNO(ivForfallStr) || forfDato;
  const boDato       = parseNO(document.getElementById('a-bo-dato').value.trim());
  const iDag         = new Date(); iDag.setHours(0,0,0,0);
  const boIkkeSendt  = document.getElementById('a-bo-ikke-sendt').checked;

  // Valideringen av IV-forfallsdato skjer i autoFormatDato

  const panel = document.getElementById('foer-bo-panel');
  if (!panel) { beregnAvdrag(); return; }

  if (boIkkeSendt) {
    panel.style.display = 'block';

    const ivForfalt = ivForfallDato && ivForfallDato <= iDag;

    document.getElementById('foer-bo-iv-ikke-forfalt').style.display = ivForfalt ? 'none' : 'block';
    document.getElementById('foer-bo-iv-forfalt').style.display      = ivForfalt ? 'block' : 'none';
    document.getElementById('foer-bo-salar-dato-wrap').style.display = ivForfalt ? 'block' : 'none';

    // Scenario 1: vis under/over 2500-panel
    if (!ivForfalt) {
      const hovedstol = parseKr(document.getElementById('a-hovedstol').value) || 0;
      const under2500 = document.getElementById('foer-bo-under-2500');
      const over2500  = document.getElementById('foer-bo-over-2500');
      if (under2500) under2500.style.display = (hovedstol > 0 && hovedstol < 2500) ? 'block' : 'none';
      if (over2500)  over2500.style.display  = (hovedstol >= 2500) ? 'block' : 'none';
    }

    if (!ivForfalt && ivForfallDato) {
      document.getElementById('foer-bo-forfall-dato').textContent = formatDato(ivForfallDato);
    }
  } else {
    panel.style.display = 'none';
  }

  // Vis purregebyr og IV-forfallsdato kun når BO ikke er sendt
  const purregebyrWrap = document.getElementById('a-purregebyr-wrap');
  const ivForfallWrap  = document.getElementById('a-iv-forfall-wrap');
  if (purregebyrWrap) purregebyrWrap.style.display = boIkkeSendt ? 'block' : 'none';
  if (ivForfallWrap)  ivForfallWrap.style.display  = boIkkeSendt ? 'block' : 'none';
  if (!boIkkeSendt) {
    const purregebyrEl = document.getElementById('a-purregebyr');
    const ivForfallEl  = document.getElementById('a-iv-forfall');
    if (purregebyrEl) purregebyrEl.value = '';
    if (ivForfallEl)  ivForfallEl.value  = '';
  }

  const boDatoEl = document.getElementById('a-bo-dato');
  if (boIkkeSendt) {
    boDatoEl.value = '';
    boDatoEl.disabled = true;
    boDatoEl.style.opacity = '0.4';
  } else {
    boDatoEl.disabled = false;
    boDatoEl.style.opacity = '1';
  }

  beregnAvdrag();
}

function oppdaterSalar() {
  const hovedstol = parseKr(document.getElementById('a-hovedstol').value) || 0;
  if (hovedstol > 0) {
    const s = hentSalar(hovedstol);
    // Lett salær settes alltid
    document.getElementById('a-salar').value = s.lett;
    // Tungt salær er totalt salær (erstatter lett) – sett begge felt
    const tungInput = document.getElementById('a-tung-salar');
    if (tungInput && document.getElementById('tung-salar-wrap').style.display !== 'none') {
      tungInput.value = s.tungt;
    }
    const tungFremtidig = document.getElementById('a-tung-salar-fremtidig');
    if (tungFremtidig && document.getElementById('tung-salar-fremtidig').style.display !== 'none') {
      tungFremtidig.value = s.tungt;
    }
  }
  validerPurregebyr();
  beregnAvdrag();
}

function synkMndBelop(kilde) {
  const hovedstol = parseKr(document.getElementById('a-hovedstol').value) || 0;
  if (!hovedstol) { beregnAvdrag(); return; }
  const mndEl   = document.getElementById('a-mnd');
  const belopEl = document.getElementById('a-mnd-belop');
  if (kilde === 'mnd') {
    // Nullstill terminer kun hvis antall måneder endres
    const nyMnd = parseInt(mndEl.value) || 0;
    const gammeltMnd = window._avdragsTerminer?.length || 0;
    if (nyMnd !== gammeltMnd) window._avdragsTerminer = null;
    belopEl.value = '';
    belopEl.dataset.beregnet = '0';
    mndEl.dataset.beregnet = '0';
    beregnAvdrag();
  } else {
    // Beløp endret – ikke null terminer, bevar manuelle beløp
    mndEl.value = '';
    mndEl.dataset.beregnet = '0';
    belopEl.dataset.beregnet = '0';
    beregnAvdrag();
  }
}
