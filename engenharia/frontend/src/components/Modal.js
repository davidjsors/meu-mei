
import React from 'react';

/**
 * Modal Component for Meu MEI
 * 
 * Props:
 * - isOpen: boolean
 * - title: string
 * - message: string or ReactNode
 * - type: 'info' | 'confirm' | 'danger'
 * - onConfirm: function (optional)
 * - onCancel: function (required to close)
 * - confirmText: string (default: "Confirmar")
 * - cancelText: string (default: "Cancelar")
 */
export default function Modal({
    isOpen,
    title,
    message,
    type = 'info',
    onConfirm,
    onCancel,
    confirmText = "Confirmar",
    cancelText = "Cancelar"
}) {
    if (!isOpen) return null;

    // Stop scroll on body when modal is open
    React.useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = 'unset'; };
    }, []);

    const isDanger = type === 'danger';
    const isConfirm = type === 'confirm' || isDanger;

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-card" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">{title}</h3>
                    <button className="modal-close-btn" onClick={onCancel}>✕</button>
                </div>

                <div className="modal-body">
                    {typeof message === 'string' ? <p>{message}</p> : message}
                </div>

                <div className="modal-footer">
                    {isConfirm && (
                        <button className="modal-btn ghost" onClick={onCancel}>
                            {cancelText}
                        </button>
                    )}

                    <button
                        className={`modal-btn ${isDanger ? 'danger' : 'primary'}`}
                        onClick={() => {
                            if (onConfirm) onConfirm();
                            else onCancel(); // Use as simple close for 'info' type
                        }}
                    >
                        {isConfirm ? confirmText : "Entendi"}
                    </button>
                </div>
            </div>
        </div>
    );
}
