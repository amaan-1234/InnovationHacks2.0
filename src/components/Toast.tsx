'use client';

import { useState, useEffect } from 'react';

export default function Toast() {
  const [toast, setToast] = useState({ message: '', type: '', visible: false });

  useEffect(() => {
    const handleShowToast = (e: any) => {
      setToast({ message: e.detail.message, type: e.detail.type, visible: true });
      setTimeout(() => setToast((t) => ({ ...t, visible: false })), 4000);
    };

    window.addEventListener('show-toast', handleShowToast);
    return () => window.removeEventListener('show-toast', handleShowToast);
  }, []);

  if (!toast.visible) return null;

  return (
    <div className={`fixed bottom-4 right-4 z-[9999] px-6 py-3 rounded-lg shadow-xl font-medium transition-all ${
      toast.type === 'success' ? 'bg-emerald-500/90 text-white' : 'bg-blue-500/90 text-white'
    }`}>
      {toast.message}
    </div>
  );
}
