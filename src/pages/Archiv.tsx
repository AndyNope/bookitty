import { useState } from 'react';
import JSZip from 'jszip';
import { useBookkeeping } from '../store/BookkeepingContext';
import type { Booking } from '../types';

/* ── Helpers ─────────────────────────────────────────────────────── */
const fmt = (n: number) =>
  n.toLocaleString('de-CH', { style: 'currency', currency: 'CHF', minimumFractionDigits: 2 });

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const currentYear = () => new Date().getFullYear();

/** Convert bookings array to CSV string (de-CH compatible) */
const toCSV = (bookings: Booking[]): string => {
  const header = ['Datum', 'Beschreibung', 'Konto', 'Gegenkonto', 'Kategorie', 'Betrag CHF', 'MwSt %', 'MwSt CHF', 'Währung', 'Typ', 'Status'];
  const rows = bookings.map((b) => [
    b.date,
    `"${b.description.replace(/"/g, '""')}"`,
    b.account,
    b.contraAccount,
    b.category,
    b.amount.toFixed(2),
    b.vatRate,
    (b.vatAmount ?? 0).toFixed(2),
    b.currency,
    b.type,
    b.paymentStatus,
  ]);
  return [header.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
};

/* ── Component ───────────────────────────────────────────────────── */
export default function Archiv() {
  const { bookings, documents } = useBookkeeping();
  const [zipping, setZipping] = useState(false);
  const [progress, setProgress] = useState('');

  const year = currentYear();
  const totalBookings = bookings.length;
  const totalDocuments = documents.length;
  const totalCHF = bookings.reduce((s, b) => s + (b.type === 'Einnahme' ? b.amount : -b.amount), 0);

  /* ── JSON export ─────────────────────────────────────────────────── */
  const handleJsonExport = () => {
    const payload = {
      exportDate: new Date().toISOString(),
      gebüvNote: 'GeBüV Art. 958f OR – 10-jährige Aufbewahrungspflicht',
      bookings,
      documents: documents.map(({ previewUrl: _p, ...d }) => d),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `bookitty-archiv-${year}.json`);
  };

  /* ── CSV export ─────────────────────────────────────────────────── */
  const handleCsvExport = () => {
    const blob = new Blob(['\ufeff' + toCSV(bookings)], { type: 'text/csv;charset=utf-8' });
    downloadBlob(blob, `bookitty-buchungen-${year}.csv`);
  };

  /* ── ZIP archive ─────────────────────────────────────────────────── */
  const handleZipExport = async () => {
    setZipping(true);
    try {
      const zip = new JSZip();
      const root = zip.folder(`bookitty-archiv-${year}`)!;

      /* JSON export */
      setProgress('Buchungsdaten …');
      const payload = {
        exportDate: new Date().toISOString(),
        gebüvNote: 'GeBüV Art. 958f OR – 10-jährige Aufbewahrungspflicht',
        bookings,
        documents: documents.map(({ previewUrl: _p, ...d }) => d),
      };
      root.file(`buchungen-${year}.json`, JSON.stringify(payload, null, 2));
      root.file(`buchungen-${year}.csv`, '\ufeff' + toCSV(bookings));

      /* Documents */
      const docsFolder = root.folder('belege')!;
      let docCount = 0;
      for (const doc of documents) {
        docCount++;
        setProgress(`Beleg ${docCount} / ${documents.length} …`);
        if (!doc.previewUrl) continue;

        try {
          if (doc.previewUrl.startsWith('data:')) {
            /* Base64 data URI */
            const [header, b64] = doc.previewUrl.split(',');
            const mime = header.match(/:(.*?);/)?.[1] ?? 'application/octet-stream';
            const ext = mime.includes('pdf') ? 'pdf' : mime.includes('png') ? 'png' : mime.includes('jpeg') ? 'jpg' : 'bin';
            const binaryStr = atob(b64);
            const bytes = new Uint8Array(binaryStr.length);
            for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
            docsFolder.file(`beleg-${doc.id}.${ext}`, bytes);
          } else if (doc.previewUrl.startsWith('blob:') || doc.previewUrl.startsWith('http')) {
            const res = await fetch(doc.previewUrl);
            if (res.ok) {
              const ab = await res.arrayBuffer();
              const ext = doc.previewUrl.includes('.pdf') ? 'pdf' : 'bin';
              docsFolder.file(`beleg-${doc.id}.${ext}`, ab);
            }
          }
        } catch {
          /* Skip unreadable documents silently */
        }
      }

      /* README */
      const readme = `BOOKITTY – GeBüV-Archiv ${year}
=============================================
Exportiert: ${new Date().toLocaleString('de-CH')}
Buchungen: ${bookings.length}
Belege: ${documents.length}

Rechtsgrundlage: Art. 958f OR, GeBüV SR 221.431
Aufbewahrungspflicht: 10 Jahre ab Buchungsjahr

Enthaltene Dateien:
  buchungen-${year}.json  — alle Buchungen (maschinenlesbar)
  buchungen-${year}.csv   — alle Buchungen (Excel-kompatibel, UTF-8 BOM)
  belege/                 — alle hochgeladenen Dokumente/Belege

Hinweis: Dieses Archiv ersetzt keine offizielle Zertifizierung.
Konsultieren Sie Ihren Treuhänder für GeBüV-konforme Langzeitarchivierung.
`;
      root.file('README.txt', readme);

      setProgress('ZIP wird erstellt …');
      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
      downloadBlob(blob, `bookitty-archiv-${year}.zip`);
    } finally {
      setZipping(false);
      setProgress('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Archivierung (GeBüV-konform)</h1>
        <p className="mt-1 text-sm text-slate-500">
          Gesetzliche Aufbewahrungspflicht: 10 Jahre (Art. 958f OR, GeBüV SR 221.431). ZIP-Download aller Belege und Buchungsdaten.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Buchungen', value: totalBookings.toString(), color: 'text-slate-900' },
          { label: 'Belege / Dokumente', value: totalDocuments.toString(), color: 'text-slate-900' },
          { label: 'Netto-Ergebnis', value: fmt(totalCHF), color: totalCHF >= 0 ? 'text-emerald-700' : 'text-rose-600' },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{s.label}</p>
            <p className={`mt-1 text-2xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Legal notice */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 space-y-2">
        <h2 className="font-semibold text-amber-900 flex items-center gap-2">
          <svg className="h-5 w-5 text-amber-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Gesetzliche Aufbewahrungspflicht – Schweiz
        </h2>
        <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
          <li><strong>10 Jahre</strong> für Geschäftsbücher, Buchungsbelege, Geschäftsberichte (Art. 958f OR)</li>
          <li>Aufbewahrung digital zulässig, sofern jederzeit lesbar und unveränderlich (GeBüV Art. 9)</li>
          <li>Originalbelege können nach Digitalisierung vernichtet werden, wenn Integrität gesichert</li>
          <li>Frist beginnt mit Ablauf des Geschäftsjahres, auf das sich die Buchung bezieht</li>
        </ul>
        <p className="text-xs text-amber-600 mt-2">
          Empfehlung: Exportieren Sie das Archiv jährlich und speichern Sie es an zwei verschiedenen Orten (z. B. lokal + Cloud).
        </p>
      </div>

      {/* Export actions */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-base font-semibold text-slate-900">Exportoptionen</h2>

        <div className="grid gap-4 sm:grid-cols-3">
          {/* JSON */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-blue-100 p-2">
                <svg className="h-5 w-5 text-blue-700" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="font-medium text-slate-900 text-sm">JSON</span>
            </div>
            <p className="text-xs text-slate-500">Maschinenlesbarer Export aller Buchungen + Dokumentmetadaten. Ideal für Langzeitarchivierung und Datenmigrationen.</p>
            <button onClick={handleJsonExport} className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
              JSON exportieren
            </button>
          </div>

          {/* CSV */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-emerald-100 p-2">
                <svg className="h-5 w-5 text-emerald-700" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="font-medium text-slate-900 text-sm">CSV / Excel</span>
            </div>
            <p className="text-xs text-slate-500">Excel-kompatibler Export aller Buchungen mit UTF-8 BOM. Direkt in Excel, LibreOffice Calc oder Treuhänder-Software öffnen.</p>
            <button onClick={handleCsvExport} className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700">
              CSV exportieren
            </button>
          </div>

          {/* ZIP */}
          <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-indigo-100 p-2">
                <svg className="h-5 w-5 text-indigo-700" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </div>
              <span className="font-medium text-slate-900 text-sm">ZIP-Vollarchiv</span>
            </div>
            <p className="text-xs text-slate-500">Komplettarchiv: JSON + CSV + alle Belege in einem ZIP. Empfohlen für die gesetzliche 10-Jahres-Archivierung.</p>
            <button onClick={handleZipExport} disabled={zipping}
              className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
              {zipping ? (progress || 'Erstelle ZIP …') : 'ZIP herunterladen'}
            </button>
          </div>
        </div>
      </div>

      {/* Archive checklist */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
        <h2 className="text-base font-semibold text-slate-900">Archivierungs-Checkliste</h2>
        <div className="space-y-2 text-sm">
          {[
            { label: 'Jahresabschluss erstellt und unterzeichnet', sub: 'Bilanz + Erfolgsrechnung + Anhang' },
            { label: 'Buchungsbelege vollständig und lesbar', sub: 'Alle Ausgaben mit Originalbeleg belegt' },
            { label: 'Buchungen auf Vollständigkeit geprüft', sub: 'Kein Monat fehlt, alle Konten ausgeglichen' },
            { label: 'MwSt-Abrechnung eingereicht', sub: 'Quartal / Saldo-Methode an ESTV übermittelt' },
            { label: 'Archiv-Export durchgeführt (ZIP)', sub: 'Backup an mindestens 2 physisch getrennten Orten' },
            { label: 'Löschdatum vorgemerkt', sub: `Buchungen ${year} dürfen frühestens ${year + 10} gelöscht werden` },
          ].map((item) => (
            <label key={item.label} className="flex cursor-pointer items-start gap-3 rounded-lg p-2 hover:bg-slate-50">
              <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600" />
              <div>
                <p className="font-medium text-slate-800">{item.label}</p>
                <p className="text-xs text-slate-400">{item.sub}</p>
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
