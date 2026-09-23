import { useState, useEffect, useRef, useCallback } from 'react';
import { FiX } from 'react-icons/fi';
import { vibrate } from '../../haptics';
import './Modal.css';

// Keep in sync with the mobile breakpoint in Modal.css / BottomNav.css
const MOBILE_QUERY = '(max-width: 768px)';
const CLOSE_DURATION_MS = 200;
// How far (px) or how fast (px/ms) a downward swipe must go to dismiss the sheet
const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 0.5;
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Shared modal shell: a right-side panel on desktop and a swipe-to-dismiss
// bottom sheet on mobile. `children` may be a function that receives a
// `close` callback, so content can dismiss the modal with its exit animation.
function Modal({ label, className = '', onClose, children }) {
  const [closing, setClosing] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const contentRef = useRef(null);
  const dragRef = useRef(null);
  const crossedThresholdRef = useRef(false);

  const requestClose = useCallback(() => {
    setClosing(true);
    setDragging(false);
    setDragOffset(0);
  }, []);

  useEffect(() => {
    if (!closing) return;
    const timeout = setTimeout(onClose, CLOSE_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [closing, onClose]);

  // Close on Escape, keep Tab inside the dialog, lock background scrolling,
  // and move focus into the dialog (returning it to the trigger on close)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        requestClose();
        return;
      }
      if (e.key !== 'Tab' || !contentRef.current) return;
      const focusable = [...contentRef.current.querySelectorAll(FOCUSABLE)].filter(
        (el) => el.tabIndex >= 0 && el.getClientRects().length > 0
      );
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const inside = contentRef.current.contains(document.activeElement);
      if (
        e.shiftKey &&
        (!inside ||
          document.activeElement === first ||
          document.activeElement === contentRef.current)
      ) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (!inside || document.activeElement === last)) {
        e.preventDefault();
        first.focus();
      }
    };
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement;
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    contentRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, [requestClose]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) requestClose();
  };

  // Dragging starts from the handle or any element marked data-sheet-drag
  // (e.g. a sheet's header), but never from a button inside it.
  const handlePointerDown = (e) => {
    if (!window.matchMedia(MOBILE_QUERY).matches) return;
    if (!e.target.closest('[data-sheet-drag]') || e.target.closest('button')) return;
    dragRef.current = { startY: e.clientY, startTime: e.timeStamp };
    crossedThresholdRef.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  };

  const handlePointerMove = (e) => {
    if (!dragRef.current) return;
    const distance = Math.max(0, e.clientY - dragRef.current.startY);
    setDragOffset(distance);
    // A light tick right as the drag crosses into "will dismiss on release"
    const crossed = distance > DISMISS_DISTANCE;
    if (crossed !== crossedThresholdRef.current) {
      crossedThresholdRef.current = crossed;
      if (crossed) vibrate(10);
    }
  };

  const handlePointerUp = (e) => {
    if (!dragRef.current) return;
    const distance = Math.max(0, e.clientY - dragRef.current.startY);
    const velocity = distance / Math.max(1, e.timeStamp - dragRef.current.startTime);
    dragRef.current = null;
    setDragging(false);
    if (distance > DISMISS_DISTANCE || velocity > DISMISS_VELOCITY) {
      vibrate(20);
      requestClose();
    } else {
      setDragOffset(0);
    }
  };

  return (
    <div
      className={`modal ${closing ? 'closing' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onClick={handleBackdropClick}
    >
      <div
        ref={contentRef}
        tabIndex={-1}
        className={`modal-content ${className} ${closing ? 'closing' : ''} ${
          dragging ? 'dragging' : ''
        }`}
        style={dragOffset ? { transform: `translateY(${dragOffset}px)` } : undefined}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="sheet-handle" data-sheet-drag aria-hidden="true">
          <span />
        </div>
        <button type="button" className="close-button" onClick={requestClose} aria-label="Close">
          <FiX />
        </button>
        {typeof children === 'function' ? children(requestClose) : children}
      </div>
    </div>
  );
}

export default Modal;
