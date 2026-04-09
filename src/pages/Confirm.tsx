import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const Confirm = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const token = params.get('token');
    if (!token) {
      navigate('/login?error=invalid_token', { replace: true });
      return;
    }

    fetch(`/api/confirm.php?token=${encodeURIComponent(token)}`)
      .then((res) => {
        // fetch follows the PHP redirect; res.url is the final URL
        if (res.url.includes('confirmed=1') || res.ok) {
          navigate('/login?confirmed=1', { replace: true });
        } else {
          navigate('/login?error=invalid_token', { replace: true });
        }
      })
      .catch(() => setIsError(true));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center max-w-sm w-full shadow-sm">
          <p className="text-sm text-rose-600 font-medium">Fehler bei der Bestätigung. Bitte versuche es erneut.</p>
          <a href="/login" className="mt-4 inline-block text-sm text-slate-500 hover:text-slate-700 underline">
            Zum Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <p className="text-sm text-slate-400">E-Mail wird bestätigt …</p>
    </div>
  );
};

export default Confirm;
