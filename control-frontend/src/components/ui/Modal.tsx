import { type ReactNode, useEffect } from "react";
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

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 sm:p-6">
            {/* BACKDROP */}
            <div
                className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            {/* MODAL CONTENT */}
            <div
                className={`relative bg-white rounded-3xl w-full ${maxWidth} shadow-2xl flex flex-col animate-fade-in-up border border-white/50 overflow-hidden`}
                style={{ maxHeight: 'calc(100vh - 2rem)' }}
            >
                {/* HEADER */}
                <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-gray-100 bg-white z-10">
                    <h2 className="text-xl font-bold text-gray-800">{title}</h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* BODY */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1 relative">
                    {children}
                </div>
            </div>
        </div>
    );
}
