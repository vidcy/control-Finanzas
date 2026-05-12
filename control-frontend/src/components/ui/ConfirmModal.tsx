import React from "react";
import Modal from "./Modal";
import { AlertCircle, Trash2, X } from "lucide-react";

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "danger" | "warning" | "info";
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "Eliminar",
    cancelText = "Cancelar",
    variant = "danger",
}) => {
    const variantStyles = {
        danger: {
            icon: <Trash2 className="w-8 h-8 text-rose-500" />,
            bg: "bg-rose-50",
            button: "bg-rose-500 hover:bg-rose-600 shadow-rose-200",
            ring: "ring-rose-50",
            border: "border-rose-100",
        },
        warning: {
            icon: <AlertCircle className="w-8 h-8 text-amber-500" />,
            bg: "bg-amber-50",
            button: "bg-amber-500 hover:bg-amber-600 shadow-amber-200",
            ring: "ring-amber-50",
            border: "border-amber-100",
        },
        info: {
            icon: <AlertCircle className="w-8 h-8 text-indigo-500" />,
            bg: "bg-indigo-50",
            button: "bg-indigo-500 hover:bg-indigo-600 shadow-indigo-200",
            ring: "ring-indigo-50",
            border: "border-indigo-100",
        },
    };

    const styles = variantStyles[variant];

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="" maxWidth="max-w-md">
            <div className="flex flex-col items-center text-center p-2">
                <div className={`p-5 ${styles.bg} rounded-3xl mb-6 ring-8 ${styles.ring} border ${styles.border} animate-bounce-slow`}>
                    {styles.icon}
                </div>
                
                <h3 className="text-2xl font-black text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 font-medium mb-8 leading-relaxed px-4">
                    {message}
                </p>

                <div className="flex items-center gap-4 w-full">
                    <button
                        onClick={onClose}
                        className="flex-1 px-6 py-4 bg-gray-50 text-gray-500 font-bold rounded-2xl hover:bg-gray-100 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        <X className="w-5 h-5" />
                        {cancelText}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`flex-1 px-6 py-4 text-white font-black rounded-2xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 ${styles.button}`}
                    >
                        {variant === "danger" && <Trash2 className="w-5 h-5" />}
                        {confirmText}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default ConfirmModal;
