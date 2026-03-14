interface NotificationModalProps {
  open: boolean;
  type?: 'success' | 'error';
  title: string;
  message: string;
  onClose: () => void;
}

const NotificationModal = ({ open, type = 'success', title, message, onClose }: NotificationModalProps) => {
  if (!open) return null;

  const isSuccess = type === 'success';

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-slate-900/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${
          isSuccess ? 'bg-emerald-100' : 'bg-rose-100'
        }`}>
          {isSuccess ? (
            <svg className="h-7 w-7 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          ) : (
            <svg className="h-7 w-7 text-rose-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          )}
        </div>

        <h2 className="text-base font-bold text-slate-900 mb-1">{title}</h2>
        <p className="text-sm text-slate-500 mb-5">{message}</p>

        <button
          onClick={onClose}
          className={`w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition ${
            isSuccess ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
          }`}
        >
          OK
        </button>
      </div>
    </div>
  );
};

export default NotificationModal;
