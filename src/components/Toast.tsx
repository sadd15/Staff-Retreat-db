import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X, Loader2, HelpCircle } from 'lucide-react';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning' | 'loading';
  duration?: number;
}

// Global Event-based Toast Trigger
export const toast = {
  show: (message: string, type: ToastMessage['type'] = 'info', duration = 3000) => {
    const id = Math.random().toString(36).substring(2, 9);
    const event = new CustomEvent<ToastMessage>('app-toast', {
      detail: { id, message, type, duration }
    });
    window.dispatchEvent(event);
    return id;
  },
  success: (message: string, duration = 3000) => toast.show(message, 'success', duration),
  error: (message: string, duration = 4000) => toast.show(message, 'error', duration),
  info: (message: string, duration = 3000) => toast.show(message, 'info', duration),
  warning: (message: string, duration = 3500) => toast.show(message, 'warning', duration),
  loading: (message: string, duration = 120000) => toast.show(message, 'loading', duration),
  dismiss: (id: string) => {
    const event = new CustomEvent<string>('app-toast-dismiss', { detail: id });
    window.dispatchEvent(event);
  }
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Listen to custom toast events
  useEffect(() => {
    const handleAddToast = (e: Event) => {
      const customEvent = e as CustomEvent<ToastMessage>;
      const newToast = customEvent.detail;
      
      setToasts((prev) => {
        // If a loading toast is already present with the same message, avoid duplicates
        if (newToast.type === 'loading' && prev.some(t => t.message === newToast.message && t.type === 'loading')) {
          return prev;
        }
        return [...prev, newToast];
      });

      // Auto dismiss after duration unless it's a loading toast (loading toasts are usually dismissed manually)
      if (newToast.type !== 'loading' && newToast.duration && newToast.duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
        }, newToast.duration);
      }
    };

    const handleDismissToast = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      const targetId = customEvent.detail;
      setToasts((prev) => prev.filter((t) => t.id !== targetId));
    };

    window.addEventListener('app-toast', handleAddToast);
    window.addEventListener('app-toast-dismiss', handleDismissToast);

    return () => {
      window.removeEventListener('app-toast', handleAddToast);
      window.removeEventListener('app-toast-dismiss', handleDismissToast);
    };
  }, []);

  const handleDismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <div 
      className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 w-full max-w-[380px] pointer-events-none px-4 sm:px-0"
      id="global-toast-container"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => {
          // Style configurations based on Toast type
          const config = {
            success: {
              bg: 'bg-white',
              border: 'border-emerald-100',
              text: 'text-slate-800',
              accent: 'bg-emerald-500',
              icon: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
              progressBg: 'bg-emerald-500'
            },
            error: {
              bg: 'bg-white',
              border: 'border-rose-100',
              text: 'text-slate-800',
              accent: 'bg-rose-500',
              icon: <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />,
              progressBg: 'bg-rose-500'
            },
            warning: {
              bg: 'bg-white',
              border: 'border-amber-100',
              text: 'text-slate-800',
              accent: 'bg-amber-500',
              icon: <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />,
              progressBg: 'bg-amber-500'
            },
            info: {
              bg: 'bg-white',
              border: 'border-indigo-100',
              text: 'text-slate-800',
              accent: 'bg-indigo-500',
              icon: <Info className="w-5 h-5 text-indigo-500 shrink-0" />,
              progressBg: 'bg-indigo-500'
            },
            loading: {
              bg: 'bg-white',
              border: 'border-slate-100',
              text: 'text-slate-800',
              accent: 'bg-indigo-600',
              icon: <Loader2 className="w-5 h-5 text-indigo-600 animate-spin shrink-0" />,
              progressBg: 'bg-indigo-600'
            }
          }[t.type];

          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: -20, scale: 0.9, x: 20 }}
              animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.85, x: 30, transition: { duration: 0.2 } }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className={`pointer-events-auto flex flex-col ${config.bg} ${config.border} border rounded-2xl shadow-[0_10px_30px_rgba(15,23,42,0.08)] overflow-hidden relative group`}
              id={`toast-item-${t.id}`}
            >
              <div className="flex items-start gap-3 p-4">
                {/* Accent line on left */}
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${config.accent}`} />
                
                {/* Icon */}
                <div className="ml-1 shrink-0 mt-0.5">
                  {config.icon}
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0 pr-2">
                  <p className={`text-xs font-semibold ${config.text} leading-relaxed break-words`}>
                    {t.message}
                  </p>
                </div>

                {/* Close Button */}
                {t.type !== 'loading' && (
                  <button
                    onClick={() => handleDismiss(t.id)}
                    className="text-slate-400 hover:text-slate-600 p-0.5 hover:bg-slate-50 rounded-lg transition-all shrink-0 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Dynamic Progress Bar */}
              {t.type !== 'loading' && t.duration && t.duration > 0 && (
                <motion.div
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: t.duration / 1000, ease: 'linear' }}
                  className={`h-1 ${config.progressBg} opacity-40 absolute bottom-0 left-0 right-0`}
                />
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
