/* ════════════════════════════════
   SATSER-MODAL
   Viser gjeldende inkassosatser, salærtabell,
   purregebyr, EU-gebyr og lovlenker i en popup.
════════════════════════════════ */

const SATSER_INFO = {
  aar: 2026,
  gyldigFra: '1. januar 2026',
  inkassosats: 750,
  forsinkelsesrente: 12.00,
  purregebyr: 38,
  purregebyrMaks: 'Maks 2 purringer (eller 1 purring + 1 inkassovarsel) per krav',
  euGebyr: 460,
  euGebyrNote: 'Kun næringsdrivende skyldnere. Kan ikke kombineres med purregebyr eller salær.',
  avdragssalar: 1125,
  avdragssalarNote: 'Kan kreves ved avdragsordning med mer enn 4 avdrag (1,5 × inkassosats)',
  skrivesalar: 672,
  skrivesalarNote: 'For klage til forliksråd/namsmann (0,5 × rettsgebyr). Tillegg 25% mva der aktuelt.',
  rettsgebyr: 1345,
  rettsgebyrForliksrad: 2071,
  rettsgebyrUtlegg: 928,
  kilder: [
    { tekst: 'Finanstilsynet – Inkassosatsen 2026', url: 'https://www.finanstilsynet.no/nyhetsarkiv/nyheter/2026/inkassosatsen-i-2026-blir-750-kroner/' },
    { tekst: 'Finanstilsynet – Forsinkelsesrente og standardkompensasjon', url: 'https://www.finanstilsynet.no/analyser-og-statistikk/forsinkelsesrente-og-standardkompensasjon/forsinkelsesrente/' },
    { tekst: 'Finanstilsynet – Oversikt over utenrettslige inndrivingskostnader', url: 'https://www.finanstilsynet.no/forbrukerinformasjon/inkassovirksomhet/oversikt-over-utenrettslige-inndrivingskostnader/' },
    { tekst: 'Finanstilsynet – Inkassovirksomhet', url: 'https://www.finanstilsynet.no/forbrukerinformasjon/inkassovirksomhet/' },
    { tekst: 'Inkassoloven (lovdata.no)', url: 'https://lovdata.no/dokument/NL/lov/1988-05-13-26' },
    { tekst: 'Inkassoforskriften (lovdata.no)', url: 'https://lovdata.no/dokument/SF/forskrift/1989-07-14-562' },
    { tekst: 'Forsinkelsesrenteloven (lovdata.no)', url: 'https://lovdata.no/dokument/NL/lov/1976-12-17-100' },
  ]
};

// Salærtabell: [grense, forbruker_fradrag, forbruker_ikke, naring_fradrag, naring_ikke]
const SALAR_TABELL = [
  { til: 500,    fja: [187.50, 375],   fnei: [234.38, 468.75],  nja: [281.25, 562.50],  nnei: [351.56, 703.13] },
  { til: 1000,   fja: [262.50, 525],   fnei: [328.13, 656.25],  nja: [393.75, 787.50],  nnei: [492.19, 984.38] },
  { til: 2500,   fja: [300, 600],      fnei: [375, 750],         nja: [450, 900],         nnei: [562.50, 1125]   },
  { til: 10000,  fja: [600, 1200],     fnei: [750, 1500],        nja: [900, 1800],        nnei: [1125, 2250]     },
  { til: 50000,  fja: [1200, 2400],    fnei: [1500, 3000],       nja: [1800, 3600],       nnei: [2250, 4500]     },
  { til: 250000, fja: [2700, 5400],    fnei: [3375, 6750],       nja: [4050, 8100],       nnei: [5062.50, 10125] },
  { til: null,   fja: [5400, 10800],   fnei: [6750, 13500],      nja: [8100, 16200],      nnei: [10125, 20250]   },
];

// Lokal kr-formatering for satser-modal (minimumFractionDigits: 0 passer tabellen bedre)
function krSatser(n) {
  return 'kr ' + n.toLocaleString('nb-NO', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function byggSalarTabell() {
  const rader = SALAR_TABELL.map(r => {
    const grense = r.til ? 'opp til kr\u00a0' + r.til.toLocaleString('nb-NO') : 'over kr\u00a0250\u00a0000';
    return `<tr>
      <td>${grense}</td>
      <td>${krSatser(r.fja[0])}</td>
      <td>${krSatser(r.fja[1])}</td>
      <td>${krSatser(r.fnei[0])}</td>
      <td>${krSatser(r.fnei[1])}</td>
      <td>${krSatser(r.nja[0])}</td>
      <td>${krSatser(r.nja[1])}</td>
      <td>${krSatser(r.nnei[0])}</td>
      <td>${krSatser(r.nnei[1])}</td>
    </tr>`;
  }).join('');

  return `
  <div class="satser-modal-tabell-wrapper">
    <p style="font-size:11px;color:var(--text-muted);margin-bottom:6px;">Kilde: Finanstilsynet. Gjelder fra ${SATSER_INFO.gyldigFra}.</p>
    <table class="satser-salar-tabell">
      <thead>
        <tr>
          <th rowspan="2">Krav (hovedstol)</th>
          <th colspan="2">Forbruker, fradragsrett MVA</th>
          <th colspan="2">Forbruker, ikke fradragsrett</th>
          <th colspan="2">N\u00e6ring, fradragsrett MVA</th>
          <th colspan="2">N\u00e6ring, ikke fradragsrett</th>
        </tr>
        <tr>
          <th>Lett</th><th>Tungt</th>
          <th>Lett</th><th>Tungt</th>
          <th>Lett</th><th>Tungt</th>
          <th>Lett</th><th>Tungt</th>
        </tr>
      </thead>
      <tbody>${rader}</tbody>
    </table>
  </div>`;
}

function byggSatserModalInnhold() {
  const s = SATSER_INFO;
  const kilderHTML = s.kilder.map(k =>
    `<a href="${k.url}" target="_blank" rel="noopener" class="satser-kilde-lenke">${k.tekst}</a>`
  ).join('');

  return `
  <div class="satser-modal-grid">

    <div class="satser-kort">
      <div class="satser-kort-tittel">Inkassosats ${s.aar}</div>
      <div class="satser-kort-verdi">${krSatser(s.inkassosats)}</div>
      <div class="satser-kort-note">Grunnlag for beregning av salær og avdragssalær. Justeres årlig fra 2027 (KPI).</div>
    </div>

    <div class="satser-kort">
      <div class="satser-kort-tittel">Forsinkelsesrente</div>
      <div class="satser-kort-verdi">${s.forsinkelsesrente.toFixed(2).replace('.', ',')}\u00a0%</div>
      <div class="satser-kort-note">Per 1. januar ${s.aar}. Fastsettes hvert halv\u00e5r av Finanstilsynet.</div>
    </div>

    <div class="satser-kort">
      <div class="satser-kort-tittel">Purregebyr</div>
      <div class="satser-kort-verdi">${krSatser(s.purregebyr)}</div>
      <div class="satser-kort-note">${s.purregebyrMaks}</div>
    </div>

    <div class="satser-kort">
      <div class="satser-kort-tittel">Standardkompensasjon (EU-gebyr)</div>
      <div class="satser-kort-verdi">${krSatser(s.euGebyr)}</div>
      <div class="satser-kort-note">${s.euGebyrNote}</div>
    </div>

    <div class="satser-kort">
      <div class="satser-kort-tittel">Avdragssalær</div>
      <div class="satser-kort-verdi">${krSatser(s.avdragssalar)}</div>
      <div class="satser-kort-note">${s.avdragssalarNote}</div>
    </div>

    <div class="satser-kort">
      <div class="satser-kort-tittel">Skrivesalær</div>
      <div class="satser-kort-verdi">${krSatser(s.skrivesalar)}</div>
      <div class="satser-kort-note">${s.skrivesalarNote}</div>
    </div>

    <div class="satser-kort">
      <div class="satser-kort-tittel">Rettsgebyr (1R)</div>
      <div class="satser-kort-verdi">${krSatser(s.rettsgebyr)}</div>
      <div class="satser-kort-note">Forliksråd: ${krSatser(s.rettsgebyrForliksrad)} (1,54R) &mdash; Utlegg namsmann: ${krSatser(s.rettsgebyrUtlegg)} (0,69R)</div>
    </div>

  </div>

  <h4 style="margin: 20px 0 8px; font-size:13px; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em;">Sal\u00e6rtabell ${s.aar}</h4>
  ${byggSalarTabell()}

  <h4 style="margin: 20px 0 8px; font-size:13px; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em;">Lovhenvisninger og kilder</h4>
  <div class="satser-kilder">${kilderHTML}</div>
  `;
}

function apneSatserModal() {
  let modal = document.getElementById('satser-modal');
  if (!modal) {
    console.error('satser-modal ikke funnet i DOM');
    return;
  }
  document.getElementById('satser-modal-innhold').innerHTML = byggSatserModalInnhold();
  modal.style.display = 'flex';
  // Sett bakgrunn på modal-boksen basert på aktivt tema
  const boks = modal.querySelector('div');
  if (boks) {
    const mork = document.documentElement.getAttribute('data-theme') === 'dark';
    boks.style.background = mork ? '#1a1d2e' : '#ffffff';
    boks.style.color = mork ? '#e8ecf4' : '#1e1e2e';
  }
  document.body.style.overflow = 'hidden';
}

function lukkSatserModal() {
  const modal = document.getElementById('satser-modal');
  if (modal) modal.style.display = 'none';
  document.body.style.overflow = '';
}

// Lukk ved klikk utenfor modal-boksen
document.addEventListener('click', function(e) {
  const modal = document.getElementById('satser-modal');
  if (modal && e.target === modal) lukkSatserModal();
});

// Lukk med Escape
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') lukkSatserModal();
});
