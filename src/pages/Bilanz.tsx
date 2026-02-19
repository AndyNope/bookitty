import { jsPDF } from 'jspdf';
import SectionHeader from '../components/SectionHeader';
import { useBookkeeping } from '../store/BookkeepingContext';
import { accountCategories, accounts, formatAccount } from '../data/chAccounts';

const currency = (value: number, currencyCode: string) =>
  new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: currencyCode,
  }).format(value);

const Bilanz = () => {
  const { bookings } = useBookkeeping();
  const income = bookings
    .filter((item) => item.type === 'Einnahme')
    .reduce((sum, item) => sum + item.amount, 0);
  const expenses = bookings
    .filter((item) => item.type === 'Ausgabe')
    .reduce((sum, item) => sum + item.amount, 0);
  const balance = income - expenses;
  const primaryCurrency = bookings[0]?.currency ?? 'CHF';

  const byCategory = bookings.reduce<Record<string, number>>((acc, booking) => {
    const sign = booking.type === 'Einnahme' ? 1 : -1;
    acc[booking.category] = (acc[booking.category] ?? 0) + sign * booking.amount;
    return acc;
  }, {});

  const exportPdf = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const marginX = 14;
    const lineHeight = 6;
    const chartWidth = pageWidth - marginX * 2;

    const addTitle = () => {
      doc.setFontSize(20);
      doc.text('Bookitty Jahresbericht', marginX, 20);
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Berichtsjahr: ${new Date().getFullYear()}`, marginX, 27);
      doc.text(`Währung: ${primaryCurrency}`, pageWidth - marginX - 50, 27);
      doc.setTextColor(0);
    };

    const addSection = (title: string, y: number) => {
      doc.setFontSize(13);
      doc.setTextColor(20);
      doc.text(title, marginX, y);
      doc.setDrawColor(220);
      doc.line(marginX, y + 2, pageWidth - marginX, y + 2);
      doc.setTextColor(0);
      return y + 8;
    };

    const addStatRow = (y: number) => {
      const stats = [
        { label: 'Einnahmen', value: currency(income, primaryCurrency) },
        { label: 'Ausgaben', value: currency(expenses, primaryCurrency) },
        { label: 'Ergebnis', value: currency(balance, primaryCurrency) },
      ];
      const cardWidth = (pageWidth - marginX * 2 - 12) / 3;
      stats.forEach((stat, index) => {
        const x = marginX + index * (cardWidth + 6);
        doc.setDrawColor(230);
        doc.roundedRect(x, y, cardWidth, 18, 2, 2);
        doc.setFontSize(9);
        doc.setTextColor(120);
        doc.text(stat.label, x + 4, y + 6);
        doc.setFontSize(12);
        doc.setTextColor(20);
        doc.text(stat.value, x + 4, y + 14);
      });
      doc.setTextColor(0);
      return y + 24;
    };

    const addChart = (y: number) => {
      const maxValue = Math.max(Math.abs(income), Math.abs(expenses), 1);
      const barHeight = 8;
      const barGap = 6;
      const values = [
        { label: 'Einnahmen', value: income, color: [16, 185, 129] },
        { label: 'Ausgaben', value: expenses, color: [239, 68, 68] },
      ];
      doc.setFontSize(10);
      values.forEach((item, index) => {
        const barY = y + index * (barHeight + barGap);
        const width = (Math.abs(item.value) / maxValue) * chartWidth;
        doc.setFillColor(item.color[0], item.color[1], item.color[2]);
        doc.rect(marginX, barY, width, barHeight, 'F');
        doc.setTextColor(60);
        doc.text(item.label, marginX, barY - 2);
        doc.text(currency(item.value, primaryCurrency), marginX + width + 2, barY + 6);
      });
      doc.setTextColor(0);
      return y + values.length * (barHeight + barGap) + 4;
    };

    const addFooter = () => {
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text('Bookitty · Finanzbuchhaltung', marginX, pageHeight - 10);
      doc.text(`Seite ${doc.getNumberOfPages()}`, pageWidth - marginX - 20, pageHeight - 10);
      doc.setTextColor(0);
    };

    addTitle();
    let y = 38;

    y = addSection('Kennzahlen', y);
    y = addStatRow(y);

    y = addSection('Analyse', y + 4);
    y = addChart(y + 2);

    y = addSection('Erfolgsrechnung', y + 2);
    doc.setFontSize(10);
    doc.text(`Einnahmen gesamt: ${currency(income, primaryCurrency)}`, marginX, y);
    doc.text(`Ausgaben gesamt: ${currency(expenses, primaryCurrency)}`, marginX, y + lineHeight);
    doc.text(`Jahresergebnis: ${currency(balance, primaryCurrency)}`, marginX, y + lineHeight * 2);
    y += lineHeight * 3 + 4;

    y = addSection('Bilanz nach Kategorien', y);
    doc.setFontSize(9);
    Object.entries(byCategory).forEach(([category, value]) => {
      if (y > pageHeight - 20) {
        addFooter();
        doc.addPage();
        addTitle();
        y = 38;
      }
      doc.text(category, marginX, y);
      doc.text(currency(value, primaryCurrency), pageWidth - marginX - 40, y);
      y += lineHeight;
    });

    y += 4;
    y = addSection('Bilanz (alle Konten)', y);
    doc.setFontSize(9);

    const totalsByAccount = bookings.reduce<Record<string, number>>((acc, booking) => {
      acc[booking.account] = (acc[booking.account] ?? 0) + booking.amount;
      return acc;
    }, {});

    accountCategories.forEach((category) => {
      if (y > pageHeight - 20) {
        addFooter();
        doc.addPage();
        addTitle();
        y = 38;
      }
      doc.setFontSize(10);
      doc.setTextColor(60);
      doc.text(`${category.code} ${category.name}`, marginX, y);
      doc.setTextColor(0);
      y += lineHeight;

      accounts
        .filter((account) => account.categoryCode === category.code)
        .forEach((account) => {
          if (y > pageHeight - 20) {
            addFooter();
            doc.addPage();
            addTitle();
            y = 38;
          }
          const label = formatAccount(account);
          const amountValue = totalsByAccount[label] ?? 0;
          doc.setFontSize(9);
          doc.text(label, marginX + 4, y);
          doc.text(currency(amountValue, primaryCurrency), pageWidth - marginX - 40, y);
          y += lineHeight;
        });

      y += 2;
    });

    addFooter();
    doc.save('bookitty-jahresbericht.pdf');
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Bilanz"
        subtitle="Automatische Auswertung aller Buchungen."
        action={
          <button
            type="button"
            onClick={exportPdf}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            PDF herunterladen
          </button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Einnahmen</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-600">
            {currency(income, primaryCurrency)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Ausgaben</p>
          <p className="mt-2 text-2xl font-semibold text-rose-600">
            {currency(expenses, primaryCurrency)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Ergebnis</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {currency(balance, primaryCurrency)}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Bilanz nach Kategorien</h3>
        <ul className="mt-4 space-y-3 text-sm text-slate-600">
          {Object.entries(byCategory).map(([category, value]) => (
            <li
              key={category}
              className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3"
            >
              <span>{category}</span>
              <span className="font-semibold text-slate-900">
                {currency(value, primaryCurrency)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Bilanz;
