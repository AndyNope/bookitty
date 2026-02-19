export type AccountCategory = {
  code: string;
  name: string;
};

export type Account = {
  code: string;
  name: string;
  categoryCode: string;
};

export const accountCategories: AccountCategory[] = [
  { code: '1', name: 'Aktiven' },
  { code: '2', name: 'Passiven' },
  { code: '3', name: 'Betrieblicher Ertrag aus Lieferungen/Leistungen' },
  { code: '4', name: 'Aufwand für Material, Handelswaren, Dienstleistungen und Energie' },
  { code: '5', name: 'Personalaufwand' },
  { code: '6', name: 'Übriger betrieblicher Aufwand, Abschreibungen, Wertberichtigungen sowie Finanzergebnis' },
  { code: '7', name: 'Betrieblicher Nebenerfolg' },
  { code: '8', name: 'Betriebsfremder/ausserordentlicher Aufwand und Ertrag' },
  { code: '9', name: 'Abschluss' },
];

export const accounts: Account[] = [
  { code: '1000', name: 'Kasse', categoryCode: '1' },
  { code: '1010', name: 'Post', categoryCode: '1' },
  { code: '1020', name: 'Bankguthaben', categoryCode: '1' },
  { code: '1045', name: 'Kreditkarten / Debitkarten', categoryCode: '1' },
  { code: '1060', name: 'Wertschriften kf.', categoryCode: '1' },
  { code: '1100', name: 'FLL Debitoren', categoryCode: '1' },
  { code: '1109', name: 'WB FLL (Delkredere)', categoryCode: '1' },
  { code: '1140', name: 'Vorschüsse, Darlehen', categoryCode: '1' },
  { code: '1170', name: 'Vorsteuer MWST Material/Waren/DL/Energie', categoryCode: '1' },
  { code: '1171', name: 'Vorsteuer MWST Investitionen/übriger Betriebsaufwand', categoryCode: '1' },
  { code: '1176', name: 'Verrechnungssteuer Guthaben', categoryCode: '1' },
  { code: '1200', name: 'Handelswaren (Vorräte)', categoryCode: '1' },
  { code: '1210', name: 'Rohstoffe (Material)', categoryCode: '1' },
  { code: '1280', name: 'Nicht fakturierte Dienstleistungen', categoryCode: '1' },
  { code: '1300', name: 'ARA Aktive Rechnungsabgrenzung', categoryCode: '1' },
  { code: '1400', name: 'Wertschriften des AV', categoryCode: '1' },
  { code: '1440', name: 'Darlehen (Aktivdarlehen)', categoryCode: '1' },
  { code: '1480', name: 'Beteiligungen', categoryCode: '1' },
  { code: '1500', name: 'Maschinen und Apparate', categoryCode: '1' },
  { code: '1509', name: 'AWB Maschinen und Apparate', categoryCode: '1' },
  { code: '1510', name: 'Mobiliar und Einrichtungen', categoryCode: '1' },
  { code: '1520', name: 'Büromaschinen, Informatik', categoryCode: '1' },
  { code: '1530', name: 'Fahrzeuge', categoryCode: '1' },
  { code: '1540', name: 'Werkzeuge und Geräte', categoryCode: '1' },
  { code: '1600', name: 'Immobilien (Geschäftsliegenschaften)', categoryCode: '1' },
  { code: '1700', name: 'Patente, Marken, Lizenzen, Goodwill', categoryCode: '1' },
  { code: '1850', name: 'Nicht einbezahltes Kapital', categoryCode: '1' },
  { code: '2000', name: 'VLL Kreditoren', categoryCode: '2' },
  { code: '2100', name: 'Bankverbindlichkeiten (Bankschulden)', categoryCode: '2' },
  { code: '2140', name: 'Übrige verzinsliche Verbindlichkeiten', categoryCode: '2' },
  { code: '2200', name: 'Geschuldete MWST', categoryCode: '2' },
  { code: '2206', name: 'Verrechnungssteuer Schulden', categoryCode: '2' },
  { code: '2269', name: 'Beschlossene Ausschüttungen', categoryCode: '2' },
  { code: '2270', name: 'Sozialversicherungen Kreditor', categoryCode: '2' },
  { code: '2300', name: 'PRA Passive Rechnungsabgrenzung', categoryCode: '2' },
  { code: '2330', name: 'Kurzfristige Rückstellungen', categoryCode: '2' },
  { code: '2400', name: 'Bankverbindlichkeiten (Bankdarlehen lf.)', categoryCode: '2' },
  { code: '2430', name: 'Obligationenanleihen', categoryCode: '2' },
  { code: '2450', name: 'Darlehen (Passivdarlehen lf.)', categoryCode: '2' },
  { code: '2451', name: 'Hypotheken', categoryCode: '2' },
  { code: '2600', name: 'Rückstellungen lf.', categoryCode: '2' },
  { code: '2800', name: 'Eigenkapital / Aktienkapital', categoryCode: '2' },
  { code: '2820', name: 'Kapitaleinlagen und Kapitalrückzüge', categoryCode: '2' },
  { code: '2850', name: 'Privat', categoryCode: '2' },
  { code: '2891', name: 'Jahresgewinn oder -verlust', categoryCode: '2' },
  { code: '2950', name: 'Gesetzliche Gewinnreserve', categoryCode: '2' },
  { code: '2970', name: 'Gewinn- oder Verlustvortrag', categoryCode: '2' },
  { code: '2979', name: 'Jahresgewinn oder -verlust', categoryCode: '2' },
  { code: '3000', name: 'Produktionserlöse', categoryCode: '3' },
  { code: '3200', name: 'Handelserlöse', categoryCode: '3' },
  { code: '3400', name: 'Dienstleistungserlöse', categoryCode: '3' },
  { code: '3600', name: 'Übrige Erlöse aus Lieferungen und Leistungen', categoryCode: '3' },
  { code: '3700', name: 'Eigenleistungen', categoryCode: '3' },
  { code: '3710', name: 'Eigenverbrauch', categoryCode: '3' },
  { code: '3800', name: 'Erlösminderungen', categoryCode: '3' },
  { code: '3805', name: 'Verluste Forderungen / WB', categoryCode: '3' },
  { code: '3810', name: 'Kredit-/Debitkartenkommissionen', categoryCode: '3' },
  { code: '4000', name: 'Materialaufwand Produktion', categoryCode: '4' },
  { code: '4200', name: 'Handelswarenaufwand', categoryCode: '4' },
  { code: '4400', name: 'Aufwand für bezogene Dienstleistungen', categoryCode: '4' },
  { code: '4500', name: 'Energieaufwand zur Leistungserstellung', categoryCode: '4' },
  { code: '4900', name: 'Aufwandsminderungen', categoryCode: '4' },
  { code: '5000', name: 'Lohnaufwand', categoryCode: '5' },
  { code: '5700', name: 'Sozialversicherungsaufwand', categoryCode: '5' },
  { code: '5800', name: 'Übriger Personalaufwand', categoryCode: '5' },
  { code: '5900', name: 'Leistungen Dritter', categoryCode: '5' },
  { code: '6000', name: 'Raumaufwand (Mietaufwand)', categoryCode: '6' },
  { code: '6100', name: 'URE Unterhalt/Reparaturen mobile Sachanlagen', categoryCode: '6' },
  { code: '6105', name: 'Leasingaufwand Sachanlagen', categoryCode: '6' },
  { code: '6200', name: 'Fahrzeug- und Transportaufwand', categoryCode: '6' },
  { code: '6260', name: 'Fahrzeugleasing und -mieten', categoryCode: '6' },
  { code: '6300', name: 'Sachversicherungen/Abgaben/Gebühren', categoryCode: '6' },
  { code: '6400', name: 'Energie- und Entsorgungsaufwand', categoryCode: '6' },
  { code: '6500', name: 'Verwaltungsaufwand', categoryCode: '6' },
  { code: '6570', name: 'Informatikaufwand inkl. Leasing', categoryCode: '6' },
  { code: '6600', name: 'Werbeaufwand', categoryCode: '6' },
  { code: '6700', name: 'Sonstiger betrieblicher Aufwand', categoryCode: '6' },
  { code: '6800', name: 'Abschreibungen und Wertberichtigungen', categoryCode: '6' },
  { code: '6900', name: 'Finanzaufwand (Zinsaufwand)', categoryCode: '6' },
  { code: '6950', name: 'Finanzertrag (Zinsertrag)', categoryCode: '6' },
  { code: '7000', name: 'Ertrag Nebenbetrieb', categoryCode: '7' },
  { code: '7010', name: 'Aufwand Nebenbetrieb', categoryCode: '7' },
  { code: '7500', name: 'Ertrag betriebliche Liegenschaften', categoryCode: '7' },
  { code: '7510', name: 'Aufwand betriebliche Liegenschaften', categoryCode: '7' },
  { code: '8000', name: 'Betriebsfremder Aufwand', categoryCode: '8' },
  { code: '8100', name: 'Betriebsfremder Ertrag', categoryCode: '8' },
  { code: '8500', name: 'Ausserordentlicher Aufwand', categoryCode: '8' },
  { code: '8510', name: 'Ausserordentlicher Ertrag', categoryCode: '8' },
  { code: '8900', name: 'Direkte Steuern', categoryCode: '8' },
  { code: '9200', name: 'Jahresgewinn oder -verlust', categoryCode: '9' },
];

export const formatAccount = (account: Account) =>
  `${account.code} ${account.name}`;

export const findAccount = (code?: string) =>
  accounts.find((account) => account.code === code);

export const getCategoryLabel = (categoryCode: string) =>
  accountCategories.find((category) => category.code === categoryCode)?.name ??
  '';
