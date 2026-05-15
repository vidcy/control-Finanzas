import { type ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type ModalProps = {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    maxWidth?: string;
};

export default function Modal({ isOpen, onClose, title, children, maxWidth = "max-w-lg" }: ModalProps) {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => { document.body.style.overflow = "unset"; };
    }, [isOpen]);

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
            {/* BACKDROP */}
            <div
                className="absolute inset-0 bg-gray-900/60 backdrop-blur-md transition-opacity duration-300"
                onClick={onClose}
            ></div>

            {/* MODAL CONTENT */}
            <div
                className={`relative bg-white rounded-[2.5rem] w-full ${maxWidth} shadow-[0_32px_64px_-15px_rgba(0,0,0,0.3)] flex flex-col animate-fade-in-up border border-white/40 overflow-hidden z-50`}
                style={{ maxHeight: 'calc(100vh - 4rem)' }}
            >
                {/* HEADER */}
                {title && (
                    <div className="flex-shrink-0 flex items-center justify-between p-5 sm:p-7 border-b border-gray-100 bg-white/80 backdrop-blur-sm z-10">
                        <h2 className="text-xl sm:text-2xl font-black text-gray-800 tracking-tight">{title}</h2>
                        <button
                            onClick={onClose}
                            className="p-2.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-2xl transition-all active:scale-90"
                        >
                            <X className="w-5 h-5 sm:w-6 sm:h-6" />
                        </button>
                    </div>
                )}

                {/* BODY */}
                <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar flex-1 relative bg-gradient-to-b from-white to-gray-50/30">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
}
