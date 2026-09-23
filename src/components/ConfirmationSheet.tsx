import { FiAlertTriangle, FiX } from "react-icons/fi";

interface ConfirmationSheetProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
}

const ConfirmationSheet = ({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  destructive = false,
}: ConfirmationSheetProps) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirmation-sheet-title"
        className="w-[min(92vw,360px)] rounded-2xl bg-white p-4 shadow-2xl sm:rounded-3xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${destructive ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"}`}>
            <FiAlertTriangle size={20} />
          </div>
          <button type="button" onClick={onCancel} aria-label={cancelLabel} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100">
            <FiX size={19} />
          </button>
        </div>
        <h2 id="confirmation-sheet-title" className="mt-3 text-lg font-bold text-slate-900 sm:mt-5 sm:text-xl">{title}</h2>
        <p className="mt-1.5 text-sm leading-5 text-slate-600 sm:mt-2 sm:leading-6">{message}</p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:mt-6 sm:gap-3">
          <button type="button" onClick={onCancel} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-base">
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} className={`rounded-xl px-3 py-2.5 text-sm font-semibold text-white sm:rounded-2xl sm:px-4 sm:py-3 sm:text-base ${destructive ? "bg-red-600" : "bg-blue-600"}`}>
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
};

export default ConfirmationSheet;
