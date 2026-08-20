import { X } from 'lucide-react';

export default function Modal({ open, onClose, title, subtitle, children, maxWidth = 'max-w-lg' }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className={`bg-white rounded-2xl w-full ${maxWidth} max-h-[90vh] overflow-y-auto shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-dark-100 flex items-start justify-between sticky top-0 bg-white z-10">
          <div>
            <h3 className="text-lg font-bold text-dark-800">{title}</h3>
            {subtitle && <p className="text-sm text-dark-500 mt-1">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-dark-100 rounded-lg">
            <X className="w-5 h-5 text-dark-500" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
