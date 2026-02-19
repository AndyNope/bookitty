type StatCardProps = {
  label: string;
  value: string;
  helper?: string;
};

const StatCard = ({ label, value, helper }: StatCardProps) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <p className="text-sm text-slate-500">{label}</p>
    <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    {helper ? <p className="mt-1 text-xs text-slate-400">{helper}</p> : null}
  </div>
);

export default StatCard;
