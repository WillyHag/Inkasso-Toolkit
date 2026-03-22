function eksporterForlikTilPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const data = samleSakData();
  const dato = new Date().toLocaleDateString('no-NO');

  // ── Hjelpefunksjoner ──
  const noKr = (v) => kr(parseKr(v || '0'));
  const noPst = (n, av) => {
    if (!av) return '0,0%';
    return (n / av * 100).toFixed(1).replace('.', ',') + '%';
  };
  const linje = (label, verdi, xLabel, xVerdi, yPos, bold=false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.text(label, xLabel, yPos);
    doc.text(verdi, xVerdi, yPos, { align: 'right' });
  };

  // Hent kravverdier
  const hoved = parseKr(data['f-hovedstol'] || '0');
  const gebyr = parseKr(data['f-gebyr'] || '0');
  const renter = parseKr(data['f-renter'] || '0');
  const rettslig = parseKr(data['f-rettslige'] || '0');
  const total = hoved + gebyr + renter + rettslig;

  // Hent forliksresultat fra DOM
  const forlikBelop = parseKr(
    document.getElementById('r-forlik')?.textContent?.replace(/[^\d,]/g, '').replace(',', '.') || '0'
  );
  const ettergitt = total - forlikBelop;
  const forlikAndel = forlikBelop > 0 && total > 0
    ? noPst(forlikBelop, total)
    : '–';
  const ettergittPst = ettergitt > 0 && total > 0
    ? noPst(ettergitt, total)
    : '–';

  // Betalingsfrist: 14 dager fra i dag
  const frist = new Date();
  frist.setDate(frist.getDate() + 14);
  const betalingsfrist = frist.toLocaleDateString('no-NO');

  let y = 0;

  // ── HEADER ──
  doc.setFillColor(30, 30, 46);
  doc.rect(0, 0, 210, 28, 'F');
  doc.setFillColor(230, 245, 53);
  doc.rect(0, 25, 210, 3, 'F');
  doc.setFontSize(15); doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Inkasso Toolkit', 20, 17);
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 180, 200);
  doc.text('FORLIKSBEREGNING', 130, 17);
  doc.text(`Generert: ${dato}`, 190, 17, { align: 'right' });

  doc.setTextColor(30, 30, 46);
  y = 38;

  // ── KRAVETS POSTER ──
  doc.setFontSize(10); doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 100, 120);
  doc.text('KRAVETS POSTER', 20, y); y += 6;
  doc.setDrawColor(220, 220, 215); doc.setLineWidth(0.3);
  doc.line(20, y, 190, y); y += 7;

  doc.setFontSize(11); doc.setTextColor(30, 30, 46);

  // Kun poster med verdi > 0
  const poster = [
    ['Hovedstol', hoved],
    ['Inkassogebyr/salær', gebyr],
    ['Renter', renter],
    ['Rettslige kostnader', rettslig],
  ].filter(([, v]) => v > 0);

  poster.forEach(([label, v]) => {
    linje(label, kr(v), 25, 185, y);
    y += 8;
  });

  // Strek og total
  y += 2;
  doc.setDrawColor(30, 30, 46); doc.setLineWidth(0.5);
  doc.line(25, y, 185, y); y += 6;
  linje('Totalkrav', kr(total), 25, 185, y, true);
  y += 16;

  // ── FORLIKSANDEL ──
  doc.setFontSize(10); doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 100, 120);
  doc.text('FORLIKSANDEL', 20, y); y += 6;
  doc.setDrawColor(220, 220, 215); doc.setLineWidth(0.3);
  doc.line(20, y, 190, y); y += 7;

  doc.setFontSize(11); doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 30, 46);
  linje('Totalkrav', kr(total), 25, 185, y); y += 8;

  if (ettergitt > 0) {
    linje(`Ettergitt beløp (${ettergittPst})`, `– ${kr(ettergitt)}`, 25, 185, y);
    y += 8;

    // Forliksbeløp uthevet
    doc.setFillColor(245, 245, 240);
    doc.rect(20, y - 5, 170, 10, 'F');
    linje(`Forliksbeløp (${forlikAndel} av totalkrav)`, kr(forlikBelop), 25, 185, y, true);
    y += 16;

    // Forklaringslinje
    doc.setFontSize(9); doc.setFont('helvetica', 'italic'); doc.setTextColor(100, 100, 120);
    doc.text(
      `Forliksbeløpet tilsvarer ${forlikAndel} av totalkravet. Skyldner sparer kr ${(ettergitt).toLocaleString('no-NO', {minimumFractionDigits:2, maximumFractionDigits:2})} (${ettergittPst}).`,
      25, y
    );
    y += 16;
  }

  // ── BETALINGSINFORMASJON ──
  doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(100, 100, 120);
  doc.text('BETALINGSINFORMASJON', 20, y); y += 6;
  doc.setDrawColor(220, 220, 215); doc.setLineWidth(0.3);
  doc.line(20, y, 190, y); y += 7;

  doc.setFontSize(11); doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 30, 46);

  const betInfo = [
    ['Betalingsbeløp', kr(forlikBelop)],
    ['Betalingsfrist', betalingsfrist],
    ['Kontonummer', data['f-kontonummer'] || '–'],
    ['KID', data['f-kid'] || '–'],
  ];

  betInfo.forEach(([label, verdi]) => {
    linje(label, verdi, 25, 185, y);
    y += 8;
  });

  // ── FOOTER ──
  const sider = doc.internal.getNumberOfPages();
  for (let i = 1; i <= sider; i++) {
    doc.setPage(i);
    doc.setFontSize(7); doc.setFont('helvetica', 'normal');
    doc.setTextColor(160, 160, 175);
    doc.text('Inkasso Toolkit – Forliksberegning', 20, 290);
    doc.text(`Side ${i} av ${sider} · ${dato}`, 190, 290, { align: 'right' });
  }

  doc.save('forliksberegning.pdf');
}

function eksporterAvdragTilPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const data = samleSakData();
  const dato = new Date().toLocaleDateString('no-NO');

  // ── Hjelpefunksjoner ──
  const linje = (label, verdi, xLabel, xVerdi, yPos, bold=false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.text(label, xLabel, yPos);
    doc.text(verdi, xVerdi, yPos, { align: 'right' });
  };

  let y = 0;

  // ── HEADER ──
  doc.setFillColor(30, 30, 46);
  doc.rect(0, 0, 210, 28, 'F');
  doc.setFillColor(230, 245, 53);
  doc.rect(0, 25, 210, 3, 'F');
  doc.setFontSize(15); doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Inkasso Toolkit', 20, 17);
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 180, 200);
  doc.text('AVDRAGSPLAN', 130, 17);
  doc.text(`Generert: ${dato}`, 190, 17, { align: 'right' });

  doc.setTextColor(30, 30, 46);
  y = 38;

  // ── AVDRAGSDETALJER ──
  doc.setFontSize(10); doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 100, 120);
  doc.text('AVDRAGSDETALJER', 20, y); y += 6;
  doc.setDrawColor(220, 220, 215); doc.setLineWidth(0.3);
  doc.line(20, y, 190, y); y += 7;

  doc.setFontSize(11); doc.setTextColor(30, 30, 46);

  const detaljer = [
    ['Hovedstol', data['a-hovedstol'] || '0'],
    ['Purregebyr', data['a-purregebyr'] || '0'],
    ['Salær', data['a-salar'] || '0'],
    ['Rettslige kostnader', data['a-rettslige'] || '0'],
    ['Månedlig avdrag', data['a-mnd-belop'] || '0'],
    ['Antall terminer', data['a-mnd'] || '0']
  ];

  detaljer.forEach(([label, verdi]) => {
    linje(label, label.includes('Antall') ? verdi : kr(parseKr(verdi)), 25, 185, y);
    y += 8;
  });

  y += 10;

  // ── AVDRAGSPLAN TABELL ──
  if (window._avdragsTerminer && window._avdragsTerminer.length > 0) {
    doc.setFontSize(10); doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 100, 120);
    doc.text('AVDRAGSPLAN', 20, y); y += 6;
    doc.setDrawColor(220, 220, 215); doc.setLineWidth(0.3);
    doc.line(20, y, 190, y); y += 7;

    // Tabell header
    doc.setFontSize(9); doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 100);
    doc.text('Mnd', 22, y);
    doc.text('Dato', 35, y);
    doc.text('Avdrag', 70, y);
    doc.text('Renter', 105, y);
    doc.text('Restsaldo', 145, y, { align: 'right' });

    y += 2;
    doc.setLineWidth(0.2);
    doc.line(20, y, 190, y);
    y += 6;

    // Tabell data
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 46);
    const terminer = window._avdragsTerminer.slice(0, 25);

    terminer.forEach((termin, index) => {
      if (y > 260) {
        doc.addPage();
        // Gjenta header på ny side
        y = 20;
        doc.setFontSize(10); doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 100, 120);
        doc.text('AVDRAGSPLAN (forts.)', 20, y); y += 6;
        doc.setDrawColor(220, 220, 215); doc.setLineWidth(0.3);
        doc.line(20, y, 190, y); y += 7;

        doc.setFontSize(9); doc.setFont('helvetica', 'bold');
        doc.setTextColor(80, 80, 100);
        doc.text('Mnd', 22, y);
        doc.text('Dato', 35, y);
        doc.text('Avdrag', 70, y);
        doc.text('Renter', 105, y);
        doc.text('Restsaldo', 145, y, { align: 'right' });

        y += 2;
        doc.setLineWidth(0.2);
        doc.line(20, y, 190, y);
        y += 6;

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 30, 46);
      }

      const mndStr = String(index + 1);
      const datoStr = termin.dato || '–';
      const avdragStr = kr(termin.belop || 0);
      const renterStr = kr(termin.rente || 0);
      const restStr = kr(termin.rest || 0);

      doc.text(mndStr, 22, y);
      doc.text(datoStr, 35, y);
      doc.text(avdragStr, 70, y);
      doc.text(renterStr, 105, y);
      doc.text(restStr, 145, y, { align: 'right' });

      y += 5;
    });

    // Sammendrag
    if (window._avdragsSammendrag) {
      y += 6;
      doc.setDrawColor(30, 30, 46); doc.setLineWidth(0.5);
      doc.line(20, y, 190, y); y += 7;

      doc.setFontSize(10); doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 30, 46);

      const sammendrag = window._avdragsSammendrag;
      linje('Totalt betalt', kr(sammendrag.totalBetalt || 0), 25, 185, y); y += 8;
      linje('Totale renter', kr(sammendrag.totalRenter || 0), 25, 185, y); y += 8;

      const renteandel = sammendrag.totalBetalt > 0
        ? (sammendrag.totalRenter / sammendrag.totalBetalt * 100).toFixed(1).replace('.', ',') + '%'
        : '–';
      linje('Renteandel', renteandel, 25, 185, y);
    }
  }

  // ── FOOTER ──
  const sider = doc.internal.getNumberOfPages();
  for (let i = 1; i <= sider; i++) {
    doc.setPage(i);
    doc.setFontSize(7); doc.setFont('helvetica', 'normal');
    doc.setTextColor(160, 160, 175);
    doc.text('Inkasso Toolkit – Avdragsplan', 20, 290);
    doc.text(`Side ${i} av ${sider} · ${dato}`, 190, 290, { align: 'right' });
  }

  doc.save('avdragsplan.pdf');
}

function eksporterTilCSV() {
  if (!window._avdragsTerminer || window._avdragsTerminer.length === 0) {
    toast('Ingen avdragsplan å eksportere. Beregn først.', 'info');
    return;
  }

  let csv = 'Termin,Dato,Beløp,Renter,Hovedstol,Rest\n';

  window._avdragsTerminer.forEach((termin, index) => {
    csv += `${index + 1},${termin.dato || ''},${termin.belop || 0},${termin.rente || 0},${termin.hovedstol || 0},${termin.rest || 0}\n`;
  });

  // Legg til sammendrag
  if (window._avdragsSammendrag) {
    csv += '\nSammendrag:\n';
    csv += `Totalt betalt,${window._avdragsSammendrag.totalBetalt || 0}\n`;
    csv += `Totale renter,${window._avdragsSammendrag.totalRenter || 0}\n`;
    csv += `Renteandel,${(window._avdragsSammendrag.totalRenter / window._avdragsSammendrag.totalBetalt * 100).toFixed(1).replace('.', ',')}%\n`;
  }

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'avdragsplan.csv';
  link.click();
}

// Initialiser tema tidlig
initTheme();
// Initialiser autoformat for beløp
initAmountFormatting();
