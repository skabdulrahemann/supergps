import { useState } from 'react';
import { Copy, CheckCircle2 } from 'lucide-react';

export default function CreatedCredentials({ credentials, onDone }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(`Email: ${credentials.email}\nPassword: ${credentials.password}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
        <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
        <p className="text-sm font-medium">Account created successfully</p>
      </div>
      <div className="bg-dark-50 rounded-xl p-4 space-y-2">
        <p className="text-xs text-dark-500 uppercase tracking-wide">Login Email</p>
        <p className="font-mono text-sm font-semibold text-dark-800">{credentials.email}</p>
        <p className="text-xs text-dark-500 uppercase tracking-wide mt-3">Password</p>
        <p className="font-mono text-sm font-semibold text-dark-800">{credentials.password}</p>
      </div>
      <p className="text-xs text-dark-400">Share these credentials securely. This password won't be shown again.</p>
      <div className="flex gap-3">
        <button onClick={copy} className="btn-secondary flex-1 flex items-center justify-center gap-2">
          <Copy className="w-4 h-4" /> {copied ? 'Copied!' : 'Copy'}
        </button>
        <button onClick={onDone} className="btn-primary flex-1">Done</button>
      </div>
    </div>
  );
}
