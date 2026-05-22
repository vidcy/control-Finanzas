// src/contexts/TransactionModalContext.tsx
import { createContext, useContext, useState, type ReactNode } from "react";

type ModalType = "INCOME" | "EXPENSE" | "PENDING";
type ModalTab = "RECEIVABLES" | "PAYABLES";

type TransactionModalContextType = {
    modalState: {
        isOpen: boolean;
        type: ModalType | null;
        category?: string;
        tab?: ModalTab;
    };
    openModal: (type: ModalType, category?: string, tab?: ModalTab) => void;
    closeModal: () => void;
};

const TransactionModalContext = createContext<TransactionModalContextType | undefined>(undefined);

export const TransactionModalProvider = ({ children }: { children: ReactNode }) => {
    const [modalState, setModalState] = useState<{
        isOpen: boolean;
        type: ModalType | null;
        category?: string;
        tab?: ModalTab;
    }>({
        isOpen: false,
        type: null,
    });

    const openModal = (type: ModalType, category?: string, tab?: ModalTab) => {
        setModalState({ isOpen: true, type, category, tab });
    };

    const closeModal = () => {
        setModalState({ isOpen: false, type: null });
    };

    return (
        <TransactionModalContext.Provider value={{ modalState, openModal, closeModal }}>
            {children}
        </TransactionModalContext.Provider>
    );
};

export const useTransactionModal = () => {
    const context = useContext(TransactionModalContext);
    if (!context) {
        throw new Error("useTransactionModal debe usarse dentro de TransactionModalProvider");
    }
    return context;
};