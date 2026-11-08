export const parseSwissQr = (qrText: string): { amount: number; currency: 'CHF' | 'EUR' } | null => {
  const lines = qrText.split(/\r?\n/).map((line) => line.trim());
  if (lines[0] !== 'SPC' || lines[1] !== '0200' || lines[2] !== '1' || lines.length < 31 || lines[30] !== 'EPD') return null;
  const rawAmount = lines[18];
  const currency = lines[19];
  if (!/^(CHF|EUR)$/.test(currency) || (rawAmount !== '' && !/^\d{1,9}(?:\.\d{1,2})?$/.test(rawAmount))) return null;
  return { amount: rawAmount === '' ? 0 : Number(rawAmount), currency: currency as 'CHF' | 'EUR' };
};