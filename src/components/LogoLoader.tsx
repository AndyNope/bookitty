const LogoLoader = ({ text = 'Laden…' }: { text?: string }) => (
  <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-5 bg-white/85 backdrop-blur-sm">
    <div className="relative flex items-center justify-center">
      <span className="absolute inline-flex h-24 w-24 rounded-full bg-slate-200 opacity-30 animate-ping" />
      <img
        src="/logo.svg"
        alt="Bookitty"
        className="w-20 h-20 animate-spin-slow drop-shadow-md"
      />
    </div>
    <p className="text-sm font-semibold text-slate-600 tracking-wide">{text}</p>
  </div>
);

export default LogoLoader;
