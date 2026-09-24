import { useEffect } from 'react';
import './Toast.css';

const DEFAULT_DURATION_MS = 5000;

// A brief message above the bottom of the screen, with an optional action
// (e.g. Undo). Pass a new `toast.id` to show another message; `toast.duration`
// overrides how long it stays up (e.g. for a message that's easy to miss).
function Toast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(onDismiss, toast.duration ?? DEFAULT_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [toast, onDismiss]);

  return (
    <div className="toast-region" role="status" aria-live="polite">
      {toast && (
        <div key={toast.id} className="toast">
          <span className="toast-message">{toast.message}</span>
          {toast.action && (
            <button
              type="button"
              className="toast-action"
              onClick={() => {
                toast.action.onClick();
                onDismiss();
              }}
            >
              {toast.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default Toast;
