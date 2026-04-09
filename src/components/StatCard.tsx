import { Link } from 'react-router-dom';

type StatCardProps = {
  label: string;
  value: string;
  helper?: string;
  to?: string;
};

const StatCard = ({ label, value, helper, to }: StatCardProps) => {
  const inner = (
    <>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
      {helper ? <p className="mt-1 text-xs text-slate-400">{helper}</p> : null}
    </>
  );

  if (to) {
    return (
      <Link
        to={to}
        className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        aria-label={label}
      >
        {inner}
      </Link>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {inner}
    </div>
  );
};

export default StatCard;
