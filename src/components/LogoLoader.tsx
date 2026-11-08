export const LoadingLogo = ({ size = 'small' }: { size?: 'small' | 'medium' | 'large' }) => (
  <span aria-hidden="true" className={`loading-logo loading-logo--${size}`}>
    <span className="loading-logo__ink"><span className="loading-logo__surface" /></span>
  </span>
);

export const LoadingIndicator = ({ text = 'Laden…', size = 'medium' }: { text?: string; size?: 'small' | 'medium' }) => (
  <span role="status" aria-live="polite" className="inline-flex items-center gap-3 text-sm text-slate-500">
    <LoadingLogo size={size} />
    <span>{text}</span>
  </span>
);

const LogoLoader = ({ text = 'Laden…', onCancel }: { text?: string; onCancel?: () => void }) => (
  <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-5 bg-white/90 px-6 text-center backdrop-blur-sm">
    <div role="status" aria-live="polite" aria-atomic="true" className="flex flex-col items-center gap-5">
      <LoadingLogo size="large" />
      <p className="text-sm font-semibold text-slate-600">{text}</p>
    </div>
    {onCancel && <button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Stapel stoppen</button>}
  </div>
);

export default LogoLoader;
