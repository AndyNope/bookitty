import { useState } from 'react';
import SectionHeader from '../components/SectionHeader';

/* ── Data ─────────────────────────────────────────────────────────────── */
const FOERDER_CH = [
  {
    name: 'Innosuisse – Innovationsagentur des Bundes',
    short: 'Innosuisse',
    type: 'Innovationsförderung',
    amount: 'Bis CHF 3 Mio. / Projekt',
    eligibility: 'Forschungsprojekte mit Schweizer Hochschule als Partner',
    url: 'https://www.innosuisse.ch',
    tag: 'Bund',
  },
  {
    name: 'SECO – Startup-Finanzierung Export',
    short: 'SECO',
    type: 'Exportförderung',
    amount: 'Zuschüsse & Beratung',
    eligibility: 'KMU mit Exportpotenzial',
    url: 'https://www.seco.admin.ch/seco/de/home/Standortfoerderung.html',
    tag: 'Bund',
  },
  {
    name: 'CTI Startup Label (jetzt Innosuisse Startup Label)',
    short: 'Startup Label',
    type: 'Zertifizierung & Netzwerk',
    amount: 'Coaching, Netzwerk, Sichtbarkeit',
    eligibility: 'Innovative Startups in der Schweiz',
    url: 'https://www.innosuisse.ch/inno/de/home/foerderangebote/startup-programmes.html',
    tag: 'Bund',
  },
  {
    name: 'Bürgschaftsgenossenschaft (z. B. BG Ost/West)',
    short: 'Bürgschaft',
    type: 'Kreditbürgschaft',
    amount: 'Bis CHF 1 Mio. Bürgschaft',
    eligibility: 'KMU mit fehlendem Eigenkapital / Sicherheiten',
    url: 'https://www.garantie.ch',
    tag: 'National',
  },
  {
    name: 'Kantonale Wirtschaftsförderung (je nach Kanton)',
    short: 'Kantone',
    type: 'Standortansiedlung',
    amount: 'Steuerrabatte, Beratung, Investitionszuschüsse',
    eligibility: 'Unternehmen die sich in Kanton ansiedeln oder erweitern',
    url: 'https://www.seco.admin.ch/seco/de/home/Standortfoerderung/kantons.html',
    tag: 'Kanton',
  },
  {
    name: 'HSG Startup Navigator / START Programm',
    short: 'HSG',
    type: 'Mentoring & Netzwerk',
    amount: 'Mentoring, Infrastruktur, Investoren-Netzwerk',
    eligibility: 'Startups, Alumni, Studenten der Universität St. Gallen',
    url: 'https://start.unisg.ch',
    tag: 'Universität',
  },
  {
    name: 'W.A. de Vigier Stiftung',
    short: 'de Vigier',
    type: 'Jungunternehmer-Preis',
    amount: 'CHF 100\'000 (5 Preisträger/Jahr)',
    eligibility: 'Innovative Startups unter 35 Jahre, max. 3 Jahre am Markt',
    url: 'https://staging.devigier.ch',
    tag: 'Stiftung',
  },
  {
    name: 'IFJ Institut für Jungunternehmen',
    short: 'IFJ',
    type: 'Beratung & KMU-Kredit',
    amount: 'Bis CHF 100\'000 zinsfreier Kredit',
    eligibility: 'Gründer bis 5 Jahre nach Gründung',
    url: 'https://www.ifj.ch',
    tag: 'National',
  },
  {
    name: 'Climate-KIC / Eurostars / EIC Accelerator (EU)',
    short: 'EU-Förderung',
    type: 'Europäische Forschungsförderung',
    amount: 'Bis EUR 2.5 Mio. (EIC Accelerator)',
    eligibility: 'Innovative KMU, Startups mit europäischem Fokus',
    url: 'https://eic.ec.europa.eu/eic-funding-opportunities/eic-accelerator_en',
    tag: 'EU',
  },
];

const SUBVENTIONS_DIRECT = [
  { label: 'ALV-Beiträge', desc: 'Rückerstattung von Kurzarbeit-Entschädigungen (KAE)', konto: '3800 Sonstige betriebliche Erträge' },
  { label: 'COVID-Hilfe / HÄRTEFALLGELDER (historisch)', desc: 'Soforthilfe Corona: a-fonds-perdu-Beiträge', konto: '3850 Staatsbeiträge und Subventionen' },
  { label: 'Umweltsubventionen', desc: 'Energie-Rückvergütung, PV-Anlagen-Förderung', konto: '3850 Staatsbeiträge und Subventionen' },
  { label: 'Exportförderung OSEC/S-GE', desc: 'Zuschüsse für Messebeteiligungen, Exportmarktforschung', konto: '3800 Sonstige betriebliche Erträge' },
  { label: 'Lehrlingsprämien', desc: 'Kantonale Beiträge für Berufsausbildung', konto: '5800 Sonstiger Personalaufwand (Gegenkonto)' },
];

const TAG_COLOR: Record<string, string> = {
  Bund: 'bg-blue-100 text-blue-700',
  National: 'bg-slate-100 text-slate-600',
  Kanton: 'bg-emerald-100 text-emerald-700',
  Universität: 'bg-indigo-100 text-indigo-700',
  Stiftung: 'bg-amber-100 text-amber-700',
  EU: 'bg-purple-100 text-purple-700',
};

/* ── Component ───────────────────────────────────────────────────────── */
export default function Subventionen() {
  const [activeTab, setActiveTab] = useState<'foerder' | 'buchhaltung' | 'hsg'>('foerder');
  const [search, setSearch] = useState('');

  const filtered = FOERDER_CH.filter(f =>
    !search || f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.type.toLowerCase().includes(search.toLowerCase()) ||
    f.tag.toLowerCase().includes(search.toLowerCase())
  );

  const tabCls = (t: string) =>
    `px-4 py-2 text-sm font-medium rounded-xl transition-colors ${activeTab === t ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <SectionHeader
        title="Subventionen & Fördergelder"
        subtitle="Staatliche Förderprogramme, Startup-Stipendien und korrekte Buchungskonten für Schweizer KMU."
      />

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setActiveTab('foerder')}  className={tabCls('foerder')}>🏦 Förderprogramme</button>
        <button onClick={() => setActiveTab('buchhaltung')} className={tabCls('buchhaltung')}>📒 Buchungshinweise</button>
        <button onClick={() => setActiveTab('hsg')}      className={tabCls('hsg')}>🎓 HSG Startup</button>
      </div>

      {/* ── Förderprogramme ───────────────────────────────────────────────── */}
      {activeTab === 'foerder' && (
        <div className="space-y-4">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Programme filtern (Name, Typ, Kanton…)"
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
          />
          <div className="space-y-3">
            {filtered.map(prog => (
              <div key={prog.name} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-slate-800">{prog.name}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${TAG_COLOR[prog.tag] ?? 'bg-slate-100 text-slate-500'}`}>{prog.tag}</span>
                    </div>
                    <p className="mt-1 text-xs text-indigo-600 font-medium">{prog.type}</p>
                    <p className="mt-1.5 text-sm text-slate-600">{prog.eligibility}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-slate-400">Förderumfang</p>
                    <p className="text-sm font-semibold text-slate-800 mt-0.5">{prog.amount}</p>
                  </div>
                </div>
                <div className="mt-3 flex">
                  <a href={prog.url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-indigo-600">
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Website öffnen
                  </a>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 text-center">
            Alle Angaben ohne Gewähr. Förderbedingungen können sich ändern – bitte stets offizielle Quellen prüfen.
          </p>
        </div>
      )}

      {/* ── Buchungshinweise für Subventionen ─────────────────────────────── */}
      {activeTab === 'buchhaltung' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            <p className="font-semibold">Buchhaltungshinweis</p>
            <p className="mt-1">Staatliche Subventionen werden gemäss OR Art. 959c unter den sonstigen Erträgen ausgewiesen. Sie sind in der Regel MwSt-befreit. Rückzahlungsverpflichtungen müssen als Verbindlichkeit erfasst werden.</p>
          </div>
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left">Subventionsart</th>
                  <th className="px-4 py-3 text-left">Beschreibung</th>
                  <th className="px-4 py-3 text-left">Empfohlenes Konto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {SUBVENTIONS_DIRECT.map(s => (
                  <tr key={s.label} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{s.label}</td>
                    <td className="px-4 py-3 text-slate-500">{s.desc}</td>
                    <td className="px-4 py-3 font-mono text-xs text-indigo-700">{s.konto}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <p className="font-semibold">MwSt-Hinweis</p>
            <p className="mt-0.5">Subventionen von Bund, Kanton oder Gemeinden sind gemäss MWSTG Art. 18 Abs. 2 lit. a von der MwSt ausgenommen. Verwenden Sie bei der Buchung MwSt-Satz 0%.</p>
          </div>
        </div>
      )}

      {/* ── HSG Startup ───────────────────────────────────────────────────── */}
      {activeTab === 'hsg' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-800 mb-1">Universität St. Gallen – Startup-Ökosystem</h3>
            <p className="text-sm text-slate-500">Die HSG bietet eines der führenden Startup-Ökosysteme der Schweiz mit verschiedenen Programmen für Gründerinnen und Gründer.</p>
          </div>
          {[
            {
              name: 'START Fellowship',
              type: 'Accelerator',
              desc: 'Einjähriges Förderprogramm mit Mentoring, Events und Zugang zu Investoren-Netzwerk. Offen für alle Schweizer Startups.',
              url: 'https://start.unisg.ch/de/accelerator',
              highlight: true,
            },
            {
              name: 'HSG Startup Navigator',
              type: 'Beratung',
              desc: 'Kostenloses Online-Tool zur Bewertung deiner Startup-Idee. Zeigt Stärken, Schwächen und empfohlene nächste Schritte.',
              url: 'https://navigator.startupbranding.ch',
              highlight: false,
            },
            {
              name: 'Swiss Startup Association',
              type: 'Verband',
              desc: 'Interessenvertretung der Schweizer Startup-Szene. Lobbying, Events, Netzwerk.',
              url: 'https://www.swissupstartupassociation.ch/',
              highlight: false,
            },
            {
              name: 'Venture Leaders',
              type: 'Talent-Programm',
              desc: 'Jährliches Programm für 20 beste Jungunternehmer der Schweiz. Roadshow nach Silicon Valley, New York, etc.',
              url: 'https://www.venturelab.swiss/Venture-Leaders',
              highlight: false,
            },
            {
              name: 'Switzerland Innovation',
              type: 'Innovationspark',
              desc: 'Infrastruktur in 5 Standorten (Zürich, Basel, Bern, Lausanne, Lugano) für F&E-intensive Startups.',
              url: 'https://www.switzerland-innovation.com',
              highlight: false,
            },
          ].map(prog => (
            <div key={prog.name} className={`rounded-xl border p-5 ${prog.highlight ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 bg-white'} shadow-sm`}>
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-sm font-semibold text-slate-800">{prog.name}</h4>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">{prog.type}</span>
                {prog.highlight && <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] text-white font-medium">Empfohlen</span>}
              </div>
              <p className="text-sm text-slate-600">{prog.desc}</p>
              <a href={prog.url} target="_blank" rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:underline">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                {prog.url}
              </a>
            </div>
          ))}
          <p className="text-xs text-slate-400 text-center">Kein Affiliate-Link. Alle Programme sind kostenfrei oder öffentlich gefördert.</p>
        </div>
      )}
    </div>
  );
}
