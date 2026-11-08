const DEFAULT_CURRENCIES = ['CHF', 'EUR', 'USD', 'GBP'];
const FALLBACK_CURRENCIES = 'AED AFN ALL AMD ANG AOA ARS AUD AWG AZN BAM BBD BDT BGN BHD BIF BMD BND BOB BRL BSD BTN BWP BYN BZD CAD CDF CHF CLP CNY COP CRC CUC CUP CVE CZK DJF DKK DOP DZD EGP ERN ETB EUR FJD FKP GBP GEL GHS GIP GMD GNF GTQ GYD HKD HNL HRK HTG HUF IDR ILS INR IQD IRR ISK JMD JOD JPY KES KGS KHR KMF KPW KRW KWD KYD KZT LAK LBP LKR LRD LSL LYD MAD MDL MGA MKD MMK MNT MOP MRU MUR MVR MWK MXN MYR MZN NAD NGN NIO NOK NPR NZD OMR PAB PEN PGK PHP PKR PLN PYG QAR RON RSD RUB RWF SAR SBD SCR SDG SEK SGD SHP SLE SLL SOS SRD SSP STN SVC SYP SZL THB TJS TMT TND TOP TRY TTD TWD TZS UAH UGX USD UYU UZS VES VND VUV WST XAF XCD XCG XDR XOF XPF XSU YER ZAR ZMW ZWG ZWL'.split(' ');

export const availableCurrencies = (expanded: boolean, current = ''): string[] => {
  const supported = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('currency') : FALLBACK_CURRENCIES;
  const codes = expanded ? [...DEFAULT_CURRENCIES, ...supported] : [...DEFAULT_CURRENCIES];
  if (/^[A-Z]{3}$/.test(current)) codes.push(current);
  return [...new Set(codes)].sort((first, second) => first === 'CHF' ? -1 : second === 'CHF' ? 1 : first.localeCompare(second));
};