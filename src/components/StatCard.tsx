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
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-2 break-words text-xl font-semibold leading-tight tabular-nums text-slate-900">{value}</p>
      {helper ? <p className="mt-2 min-h-8 text-xs leading-4 text-slate-500">{helper}</p> : null}
    </>
  );

  if (to) {
    return (
      <Link
        to={to}
        className="block rounded-lg border border-slate-200 border-t-2 border-t-slate-300 bg-white p-4 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        aria-label={label}
      >
        {inner}
      </Link>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      {inner}
    </div>
  );
};

export default StatCard;
