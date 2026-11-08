import type { Booking } from '../types';

export type FinancialReportPeriod = {
  year: number;
  start: string;
  end: string;
  balanceAsOf: string;
};

export const financialReportPeriod = (year: number, today: string): FinancialReportPeriod => {
  const end = year === Number(today.slice(0, 4)) ? today : `${year}-12-31`;
  return { year, start: `${year}-01-01`, end, balanceAsOf: end };
};

export const splitFinancialBookings = (bookings: Booking[], period: FinancialReportPeriod) => ({
  incomeStatement: bookings.filter((booking) => booking.date >= period.start && booking.date <= period.end),
  balanceSheet: bookings.filter((booking) => booking.date <= period.balanceAsOf),
});