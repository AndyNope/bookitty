import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import QRCode from 'qrcode';
import { Link, Navigate } from 'react-router-dom';
import { isStartupNightActive } from '../utils/eventWindow';
import StartupNightGame from '../components/StartupNightGame';

const SCAN_CODE = 'BKTY-26-10810';
const QR_PAYLOAD = `BOOKITTY:STARTUP-NIGHT:2026:RECEIPT:${SCAN_CODE}`;
const reader = new BrowserMultiFormatReader();

const StartupNight = () => {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [scanMessage, setScanMessage] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(QR_PAYLOAD, {
      width: 300,
      margin: 1,
      errorCorrectionLevel: 'Q',
      color: { dark: '#12231d', light: '#ffffff' },
    }).then((dataUrl) => {
      if (active) setQrDataUrl(dataUrl);
    }).catch(() => {
      if (active) setScanMessage('Der QR-Code konnte nicht erstellt werden.');
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!cameraActive || !videoRef.current) return;
    let stopScanner: (() => void) | undefined;
    reader.decodeFromVideoDevice(undefined, videoRef.current, (result) => {
      if (!result) return;
      if (result.getText().trim() === QR_PAYLOAD) {
        setScanned(true);
        setScanMessage('Belegkarte erkannt. Das Rätsel ist freigeschaltet.');
        stopScanner?.();
        setCameraActive(false);
      } else {
        setScanMessage('Das ist nicht die Startup-Night-Belegkarte.');
      }
    }).then((controls) => {
      stopScanner = () => controls.stop();
    }).catch(() => {
      setCameraActive(false);
      setScanMessage('Kamera nicht verfügbar. Nutze den Code auf der Belegkarte.');
    });
    return () => stopScanner?.();
  }, [cameraActive]);

  if (!isStartupNightActive()) return <Navigate to="/" replace />;

  return (
    <main className="min-h-screen bg-[#f5f7f4] text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link to="/" className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <img src="/logo.svg" alt="" className="h-8 w-8" /> Bookitty
          </Link>
          <span className="text-xs font-semibold uppercase text-rose-800">Startup Night · 2026</span>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <section>
            <p className="text-xs font-semibold uppercase text-rose-800">Bookitty Stand-Challenge</p>
            <h1 className="mt-3 max-w-lg text-4xl font-bold leading-tight sm:text-5xl">Kitty Cash Dash</h1>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-slate-600">
              Scanne die Belegkarte, sammle in 30 Sekunden CHF-Belege und bring Kitty sicher durch den Papierstapel.
            </p>

            <div className="mt-8 border-y border-slate-200 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Belegkarte</p>
                  <p className="mt-1 text-xs text-slate-500">Für den Stand ausdrucken und auslegen.</p>
                </div>
                <button type="button" onClick={() => window.print()} className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-white print:hidden">
                  Belegkarte drucken
                </button>
              </div>
              {qrDataUrl && (
                <div className="mt-4 flex items-center gap-4 bg-white p-3 print:border print:border-slate-300">
                  <img src={qrDataUrl} alt="Startup-Night-Belegkarte als QR-Code" className="h-32 w-32" />
                  <div className="text-sm">
                    <p className="font-semibold text-slate-900">Lieferantenbeleg</p>
                    <p className="mt-1 text-slate-600">Bürobedarf · Brutto CHF 108.10</p>
                    <p className="mt-1 text-xs text-slate-500">Beleg-Nr. SN-10810</p>
                  </div>
                </div>
              )}

              {!scanned ? (
                <div className="mt-4 print:hidden">
                  {cameraActive && <video ref={videoRef} className="mb-3 aspect-video w-full max-w-sm bg-slate-950 object-cover" muted playsInline />}
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => { setScanMessage(''); setCameraActive(true); }} disabled={cameraActive} className="rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">
                      QR mit Kamera scannen
                    </button>
                    <button type="button" onClick={() => { setScanned(true); setScanMessage('Belegkarte geöffnet. Das Rätsel ist freigeschaltet.'); }} className="rounded-md border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-white">
                      Code manuell öffnen
                    </button>
                  </div>
                  {scanMessage && <p role="status" className="mt-2 text-xs text-slate-600">{scanMessage}</p>}
                </div>
              ) : (
                <p role="status" className="mt-4 border-l-2 border-emerald-700 pl-3 text-xs font-medium text-emerald-800 print:hidden">{scanMessage}</p>
              )}
            </div>
          </section>

          <section className="border-t border-slate-300 pt-6 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0" aria-labelledby="game-title">
            <StartupNightGame unlocked={scanned} />
            <div className="mt-8 border-t border-slate-200 pt-4 print:hidden">
              <Link to="/demo" className="text-xs font-semibold text-slate-600 hover:text-slate-950">Bookitty in der Demo ansehen →</Link>
            </div>
          </section>
        </div>
      </div>
      <style>{'@media print { header, main section:not(:first-child), .print\\:hidden { display: none !important; } body { background: white; } }'}</style>
    </main>
  );
};

export default StartupNight;