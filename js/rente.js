function beregnRente() {
  const hoved  = parseKr(document.getElementById('rn-hoved').value) || 0;
  const fraStr = document.getElementById('rn-fra').value.trim();
  const tilStr = document.getElementById('rn-til').value.trim();

  if (!hoved || !fraStr || !tilStr) {
    document.getElementById('rente-resultat').innerHTML =
      '<span style="color:var(--text-muted)">Fyll inn hovedstol og datoer.</span>';
    return;
  }

  const fra = parseNO(fraStr);
  const til = parseNO(tilStr);
  if (!fra || !til || til <= fra) {
    document.getElementById('rente-resultat').innerHTML =
      '<span style="color:var(--text-muted)">Ugyldig datoperiode.</span>';
    return;
  }

  const { totalRente, perioder } = beregnRenterMedSatser(hoved, fra, til);
  const totalDager = dagMellom(fra, til);

  let perioderHtml = perioder.map(p => `
    <tr>
      <td>${formatDato(p.fra)}</td>
      <td>${formatDato(p.til)}</td>
      <td style="text-align:right">${p.dager}</td>
      <td style="text-align:right">${p.sats.toFixed(2)}%</td>
      <td style="text-align:right;font-family:'DM Mono',monospace;font-weight:600">${kr(p.rente)}</td>
    </tr>`).join('');

  autolagreSak();
  document.getElementById('rente-resultat').innerHTML = `
    <div class="rente-result" style="margin-bottom:20px;">
      <div class="rente-box" style="border-left-color:var(--high)">
        <div class="rente-box-label">Totale renter</div>
        <div class="rente-box-value">${kr(totalRente)}</div>
      </div>
      <div class="rente-box" style="border-left-color:var(--ink)">
        <div class="rente-box-label">Hovedstol + renter</div>
        <div class="rente-box-value">${kr(hoved + totalRente)}</div>
      </div>
      <div class="rente-box" style="border-left-color:var(--text-muted)">
        <div class="rente-box-label">Antall dager</div>
        <div class="rente-box-value" style="font-size:20px">${totalDager}</div>
      </div>
    </div>

    <table class="avdrag-table">
      <thead><tr>
        <th>Fra dato</th>
        <th>Til dato</th>
        <th style="text-align:right">Dager</th>
        <th style="text-align:right">Sats</th>
        <th style="text-align:right">Rentebeløp</th>
      </tr></thead>
      <tbody>${perioderHtml}</tbody>
      <tfoot><tr style="font-weight:700;background:var(--bg)">
        <td colspan="4" style="padding:10px 12px;">Totalt</td>
        <td style="text-align:right;padding:10px 12px;font-family:'DM Mono',monospace">${kr(totalRente)}</td>
      </tr></tfoot>
    </table>
  `;
}

function settDagensDato() {
  const iDag = new Date();
  const dd   = String(iDag.getDate()).padStart(2, '0');
  const mm   = String(iDag.getMonth() + 1).padStart(2, '0');
  const yyyy = iDag.getFullYear();
  document.getElementById('rn-til').value = `${dd}.${mm}.${yyyy}`;
  beregnRente();
}

function beregnRenteFraDato() {
  beregnRente();
}
