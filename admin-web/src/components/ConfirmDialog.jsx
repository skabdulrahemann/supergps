import { AlertTriangle } from 'lucide-react';

export default function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', onConfirm, onCancel, loading }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center mb-4">
          <AlertTriangle className="w-6 h-6 text-rose-600" />
        </div>
        <h3 className="text-lg font-bold text-dark-800">{title}</h3>
        <p className="text-sm text-dark-500 mt-2">{message}</p>
        <div className="flex gap-3 mt-6">
          <button onClick={onCancel} className="btn-secondary flex-1" disabled={loading}>
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-5 py-2.5 bg-rose-600 text-white rounded-xl font-medium hover:bg-rose-700 transition-all disabled:opacity-60"
          >
            {loading ? 'Deleting...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
