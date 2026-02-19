import { Link } from 'react-router-dom';

const NotFound = () => (
  <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
    <h2 className="text-2xl font-semibold text-slate-900">Seite nicht gefunden</h2>
    <p className="mt-2 text-sm text-slate-500">
      Die angeforderte Seite existiert nicht oder wurde verschoben.
    </p>
    <Link
      to="/"
      className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
    >
      Zurück zum Dashboard
    </Link>
  </div>
);

export default NotFound;
