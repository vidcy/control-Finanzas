import { useState, useEffect, useMemo } from "react";
import Appshell from "../components/layout/Appshell";
import {
  ChevronDown,
  Loader2,
  X,
  PiggyBank,
  AlertCircle,
  Calendar,
  FileText,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Search,
  Edit2,
  Trash2,
  Plus,
  Minus,
  Wallet,
  ArrowRightLeft
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  createTransactionRequest,
  getTransactionsRequest,
  updateTransactionRequest,
  deleteTransactionRequest
} from "../services/transaction.api";
import { listCategoriesRequest, seedDefaultCategoriesRequest } from "../services/category.api";
import ConfirmModal from "../components/ui/ConfirmModal";
import { toast } from "react-hot-toast";
import {
  getPeruTodayInputStr,
  utcToPeruInputDate,
  peruInputDateToUtcISO,
  formatPeruDate
} from "../utils/date.utils";
import Pagination from "../components/ui/Pagination";

// ── EXPORT COMPONENT FOR APPSHELL FLOATING BUTTON ──────────────────────────
export function FloatingSaveButton({
  onSaveSuccess,
}: {
  onSaveSuccess?: () => void;
}) {
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveAmount, setSaveAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  
  const [originAccount, setOriginAccount] = useState("Banco");
  const [destinationAccount, setDestinationAccount] = useState("Chanchito");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedSubCategoryId, setSelectedSubCategoryId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");

  const [showLiquidityWarning, setShowLiquidityWarning] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(null);

  const loadCategories = async () => {
    try {
      let data = await listCategoriesRequest();
      let transferCats = data.filter((c: any) => c.type === "TRANSFER");

      if (transferCats.length === 0) {
        try {
          await seedDefaultCategoriesRequest();
          const reloaded = await listCategoriesRequest();
          data = reloaded;
          transferCats = reloaded.filter((c: any) => c.type === "TRANSFER");
        } catch (e) {
          console.error("Error al sembrar categorías:", e);
        }
      }

      setCategories(Array.isArray(data) ? data : []);

      const ahorroCat = transferCats.find(
        (c: any) =>
          (!c.parentId || c.parentId === null) &&
          c.name.toLowerCase().includes("ahorro")
      );

      const defaultCatId = ahorroCat ? ahorroCat.id : (transferCats[0]?.id || "");
      setSelectedCategoryId(defaultCatId);
    } catch (error) {
      console.error("Error cargando categorías:", error);
    }
  };

  useEffect(() => {
    if (showSaveModal) {
      loadCategories();
    }
  }, [showSaveModal]);

  const parentTransferCategories = categories.filter(
    (c) => c.type === "TRANSFER" && (!c.parentId || c.parentId === null)
  );

  const subTransferCategories = categories.filter(
    (c) => c.parentId === selectedCategoryId
  );

  useEffect(() => {
    if (subTransferCategories.length > 0) {
      setSelectedSubCategoryId(subTransferCategories[0].id);
    } else {
      setSelectedSubCategoryId("");
    }
  }, [selectedCategoryId, categories]);

  const handleSaveSavings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveAmount || parseFloat(saveAmount) <= 0) {
      toast.error("Ingresa un monto válido");
      return;
    }
    if (!selectedCategoryId) {
      toast.error("Selecciona una categoría de transferencia");
      return;
    }
    if (!selectedSubCategoryId) {
      toast.error("Selecciona una subcategoría");
      return;
    }

    const executeSave = async (ignoreLiquidity = false) => {
      setSaving(true);
      try {
        let paymentMethodMapped = "TRANSFER";
        if (originAccount === "Efectivo") paymentMethodMapped = "CASH";
        else if (originAccount === "Yape") paymentMethodMapped = "YAPE";
        else if (originAccount === "Plin") paymentMethodMapped = "PLIN";

        const payload = {
          date: new Date(date + "T12:00:00Z"),
          paidAt: new Date(date + "T12:00:00Z"),
          name: `Ahorro a ${destinationAccount}`,
          description: description || `Ahorro registrado desde ${originAccount} hacia ${destinationAccount}`,
          amount: parseFloat(saveAmount),
          exchangeRate: 1,
          type: "TRANSFER",
          currency: "PEN",
          paymentMethod: paymentMethodMapped,
          status: "PAID",
          categoryId: selectedCategoryId,
          subCategoryId: selectedSubCategoryId,
          originAccount,
          destinationAccount,
          ignoreLiquidity,
        };

        await createTransactionRequest(payload as any);

        toast.success("¡Ahorro registrado con éxito! 🐷🎉");
        setShowSaveModal(false);
        setSaveAmount("");
        setDescription("");
        setDate(new Date().toISOString().split("T")[0]);
        onSaveSuccess?.();
        window.dispatchEvent(new CustomEvent("transactionCreated"));
      } catch (error: any) {
        const message = error?.message || "Error al registrar el ahorro";
        if (message.includes("Límite de liquidez superado")) {
          setPendingAction(() => () => executeSave(true));
          setShowLiquidityWarning(true);
        } else {
          toast.error(message);
        }
      } finally {
        setSaving(false);
      }
    };

    await executeSave(false);
  };

  return (
    <>
      <button
        onClick={() => setShowSaveModal(true)}
        className="fixed bottom-6 right-6 z-[9980] group"
        aria-label="Registrar ahorro rápido"
      >
        <div className="relative">
          <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
            Ahorro Rápido
          </span>
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
            className="p-4 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full shadow-xl shadow-green-200/50 border-4 border-white"
          >
            <PiggyBank className="w-7 h-7 text-white" />
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
              +
            </span>
          </motion.div>
        </div>
      </button>

      <AnimatePresence>
        {showSaveModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9990]"
            onClick={() => setShowSaveModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl w-full max-w-lg p-7 relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-green-50 rounded-full filter blur-xl opacity-70 pointer-events-none"></div>
              <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-50 rounded-full filter blur-xl opacity-70 pointer-events-none"></div>

              <div className="flex items-center justify-between mb-6 relative z-10">
                <div className="flex items-center gap-3.5">
                  <div className="p-3.5 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg shadow-green-100">
                    <PiggyBank className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-gray-800 tracking-tight">
                      Registrar Ahorro
                    </h2>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                      Transferencia Interna de Fondos
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSaveModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-all"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleSaveSavings} className="space-y-4 relative z-10">
                <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Cuenta Origen
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {["Banco", "Efectivo", "Yape", "Plin"].map((acc) => {
                        const active = originAccount === acc;
                        return (
                          <button
                            key={acc}
                            type="button"
                            onClick={() => setOriginAccount(acc)}
                            className={`py-2 px-3 text-xs font-black rounded-xl border transition-all ${
                              active
                                ? "bg-green-600 border-green-600 text-white shadow-sm"
                                : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                            }`}
                          >
                            {acc}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center justify-center py-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-400 bg-white px-3 py-1 rounded-full border border-gray-100">
                      <span>{originAccount}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-green-500" />
                      <span>{destinationAccount}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Cuenta Destino
                    </label>
                    <input
                      type="text"
                      required
                      value={destinationAccount}
                      onChange={(e) => setDestinationAccount(e.target.value)}
                      placeholder="Ej: Chanchito"
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm font-bold text-gray-700 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">
                      Categoría
                    </label>
                    <div className="relative">
                      <select
                        required
                        className="w-full pl-4 pr-9 py-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-xs font-bold text-gray-700 appearance-none shadow-sm"
                        value={selectedCategoryId}
                        onChange={(e) => setSelectedCategoryId(e.target.value)}
                      >
                        <option value="">Seleccionar...</option>
                        {parentTransferCategories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-green-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">
                      Subcategoría
                    </label>
                    <div className="relative">
                      <select
                        required
                        className="w-full pl-4 pr-9 py-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-xs font-bold text-gray-700 appearance-none shadow-sm"
                        value={selectedSubCategoryId}
                        onChange={(e) => setSelectedSubCategoryId(e.target.value)}
                      >
                        <option value="">Seleccionar...</option>
                        {subTransferCategories.map((sc) => (
                          <option key={sc.id} value={sc.id}>
                            {sc.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-green-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">
                      Monto (S/.)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">
                        S/.
                      </span>
                      <input
                        type="number"
                        required
                        value={saveAmount}
                        onChange={(e) => setSaveAmount(e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                        min="0.01"
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-sm font-bold text-gray-700 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">
                      Fecha de Registro
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        required
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-sm font-bold text-gray-700 transition-all"
                      />
                      <Calendar className="w-4 h-4 text-green-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">
                    Observación / Comentario
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Ej: Ahorro para gastos imprevistos"
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-sm font-bold text-gray-700 transition-all"
                    />
                    <FileText className="w-4 h-4 text-green-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saving || !saveAmount || !selectedSubCategoryId}
                  className="w-full mt-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black py-3.5 rounded-2xl hover:shadow-lg hover:shadow-green-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <PiggyBank className="w-5 h-5" />
                      Guardar Ahorro
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={showLiquidityWarning}
        onClose={() => setShowLiquidityWarning(false)}
        onConfirm={async () => {
          setShowLiquidityWarning(false);
          if (pendingAction) {
            await pendingAction();
          }
        }}
        title="Saldo Insuficiente"
        message="No tienes saldo para esto, si das en continuar, tu saldo será negativo y estarás registrando, ¿deseas continuar?"
        confirmText="Sí, continuar"
        cancelText="Cancelar"
        variant="warning"
        buttonIcon={<AlertCircle className="w-5 h-5" />}
      />
    </>
  );
}

// ── MAIN SAVINGS AND INTERNAL TRANSFERS MODULE PAGE ─────────────────────────
export default function PiggPage() {
  const [items, setItems] = useState<any[]>([]);
  const [rawTransactions, setRawTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"DEPOSIT" | "WITHDRAW" | "EDIT">("DEPOSIT");
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [idToDelete, setIdToDelete] = useState<string | null>(null);

  // Filters & Pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const itemsPerPage = 8;

  // Form Fields
  const [modalAmount, setModalAmount] = useState("");
  const [originAccount, setOriginAccount] = useState("Banco");
  const [destinationAccount, setDestinationAccount] = useState("Chanchito");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedSubCategoryId, setSelectedSubCategoryId] = useState("");
  const [date, setDate] = useState(getPeruTodayInputStr());
  const [description, setDescription] = useState("");

  const [categories, setCategories] = useState<any[]>([]);
  
  const [showLiquidityWarning, setShowLiquidityWarning] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(null);

  // Load Transactions & Categories
  const loadData = async () => {
    setLoading(true);
    try {
      const allTx = await getTransactionsRequest();
      const personalTx = Array.isArray(allTx) ? allTx.filter((t: any) => t.workspace === "PERSONAL") : [];
      setRawTransactions(personalTx);

      // Filter transfers containing "chanchito" in either origin or destination
      const savingsTx = personalTx.filter((t: any) => {
        return (
          t.type === "TRANSFER" &&
          (t.originAccount?.toLowerCase().includes("chanchito") ||
            t.destinationAccount?.toLowerCase().includes("chanchito"))
        );
      });
      setItems(savingsTx);

      const catsData = await listCategoriesRequest();
      setCategories(Array.isArray(catsData) ? catsData : []);
    } catch (e: any) {
      toast.error(e.message || "Error al cargar ahorros");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Escuchar cuando se crea una transacción
    const handleCreated = () => loadData();
    window.addEventListener("transactionCreated", handleCreated);
    return () => window.removeEventListener("transactionCreated", handleCreated);
  }, []);

  // Calculate dynamic metrics
  const { totalIncome, totalExpense, totalChanchito, totalDisponible } = useMemo(() => {
    let income = 0;
    let expense = 0;
    let chanchito = 0;

    rawTransactions.forEach((t) => {
      if (t.status !== "PAID") return;
      const amt = Number(t.amount || 0) * (t.currency === "USD" ? Number(t.exchangeRate || 1) : 1);

      if (t.type === "INCOME") {
        income += amt;
      } else if (t.type === "EXPENSE") {
        expense += amt;
      }
    });

    // Calculate Chanchito balance from all transfers
    rawTransactions.forEach((t) => {
      if (t.status !== "PAID") return;
      const amt = Number(t.amount || 0) * (t.currency === "USD" ? Number(t.exchangeRate || 1) : 1);

      if (t.type === "TRANSFER") {
        if (t.destinationAccount?.toLowerCase().includes("chanchito")) {
          chanchito += amt;
        }
        if (t.originAccount?.toLowerCase().includes("chanchito")) {
          chanchito -= amt;
        }
      }
    });

    const totalPatrimonio = income - expense;
    return {
      totalIncome: income,
      totalExpense: expense,
      totalChanchito: chanchito,
      totalDisponible: totalPatrimonio - chanchito,
    };
  }, [rawTransactions]);

  // Account Balances breakdown
  const accountBalances = useMemo(() => {
    const balances: Record<string, number> = {
      "Banco": 0,
      "Efectivo": 0,
      "Yape": 0,
      "Plin": 0,
      "Chanchito": 0,
    };

    const getAccountName = (method: string, customAccount?: string | null) => {
      if (customAccount) return customAccount;
      switch (method) {
        case "CASH": return "Efectivo";
        case "TRANSFER": return "Banco";
        case "YAPE": return "Yape";
        case "PLIN": return "Plin";
        case "CARD": return "Tarjeta";
        default: return "Efectivo";
      }
    };

    rawTransactions.forEach((t) => {
      if (t.status !== "PAID") return;
      const amt = Number(t.amount || 0) * (t.currency === "USD" ? Number(t.exchangeRate || 1) : 1);

      if (t.type === "INCOME") {
        const dest = getAccountName(t.paymentMethod, t.destinationAccount);
        if (balances[dest] === undefined) balances[dest] = 0;
        balances[dest] += amt;
      } else if (t.type === "EXPENSE") {
        const orig = getAccountName(t.paymentMethod, t.originAccount);
        if (balances[orig] === undefined) balances[orig] = 0;
        balances[orig] -= amt;
      } else if (t.type === "TRANSFER") {
        const orig = getAccountName(t.paymentMethod, t.originAccount);
        const dest = getAccountName(t.paymentMethod, t.destinationAccount);

        if (balances[orig] === undefined) balances[orig] = 0;
        if (balances[dest] === undefined) balances[dest] = 0;

        balances[orig] -= amt;
        balances[dest] += amt;
      }
    });

    return balances;
  }, [rawTransactions]);

  // Filter transfers based on mode (deposit vs withdraw)
  const transferCategories = useMemo(() => {
    const transferCats = categories.filter((c) => c.type === "TRANSFER" && (!c.parentId || c.parentId === null));
    if (modalMode === "DEPOSIT") {
      return transferCats.filter((c) => c.name.toLowerCase().includes("ahorro"));
    } else {
      return transferCats.filter((c) => !c.name.toLowerCase().includes("ahorro"));
    }
  }, [categories, modalMode]);

  const subTransferCategories = useMemo(() => {
    return categories.filter((c) => c.parentId === selectedCategoryId);
  }, [categories, selectedCategoryId]);

  // Select automatically first category & subcategory on modal load/toggle
  useEffect(() => {
    if (transferCategories.length > 0) {
      const containsTarget = transferCategories.find(
        (c) =>
          modalMode === "DEPOSIT"
            ? c.name.toLowerCase().includes("ahorro")
            : !c.name.toLowerCase().includes("ahorro")
      );
      setSelectedCategoryId(containsTarget ? containsTarget.id : transferCategories[0].id);
    } else {
      setSelectedCategoryId("");
    }
  }, [transferCategories, modalMode]);

  useEffect(() => {
    if (subTransferCategories.length > 0) {
      setSelectedSubCategoryId(subTransferCategories[0].id);
    } else {
      setSelectedSubCategoryId("");
    }
  }, [selectedCategoryId, subTransferCategories]);

  // Open Deposit/Withdrawal Modals
  const handleOpenDeposit = () => {
    setModalMode("DEPOSIT");
    setEditingId(null);
    setModalAmount("");
    setOriginAccount("Banco");
    setDestinationAccount("Chanchito");
    setDate(getPeruTodayInputStr());
    setDescription("");
    setIsModalOpen(true);
  };

  const handleOpenWithdraw = () => {
    setModalMode("WITHDRAW");
    setEditingId(null);
    setModalAmount("");
    setOriginAccount("Chanchito");
    setDestinationAccount("Banco");
    setDate(getPeruTodayInputStr());
    setDescription("");
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item: any) => {
    setEditingId(item.id);
    setModalAmount(item.amount.toString());
    setOriginAccount(item.originAccount || "Banco");
    setDestinationAccount(item.destinationAccount || "Chanchito");
    setDate(utcToPeruInputDate(item.date));
    setDescription(item.description || "");

    const isWithdraw = (item.originAccount || "").toLowerCase().includes("chanchito");
    setModalMode(isWithdraw ? "WITHDRAW" : "DEPOSIT");
    setSelectedCategoryId(item.categoryId || "");
    setSelectedSubCategoryId(item.subCategoryId || "");
    setIsModalOpen(true);
  };

  // Save Transaction
  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalAmount || parseFloat(modalAmount) <= 0) {
      toast.error("Ingresa un monto válido");
      return;
    }
    if (!selectedCategoryId) {
      toast.error("Selecciona una categoría");
      return;
    }
    if (!selectedSubCategoryId) {
      toast.error("Selecciona una subcategoría");
      return;
    }

    const executeSave = async (ignoreLiquidity = false) => {
      setSaving(true);
      try {
        const paymentAccount = modalMode === "DEPOSIT" ? originAccount : destinationAccount;
        let paymentMethodMapped = "TRANSFER";
        if (paymentAccount === "Efectivo") paymentMethodMapped = "CASH";
        else if (paymentAccount === "Yape") paymentMethodMapped = "YAPE";
        else if (paymentAccount === "Plin") paymentMethodMapped = "PLIN";

        const originalItem = editingId ? items.find((i) => i.id === editingId) : undefined;

        const payload = {
          date: peruInputDateToUtcISO(date, originalItem?.date),
          paidAt: peruInputDateToUtcISO(date, originalItem?.paidAt),
          name: modalMode === "DEPOSIT" ? `Ahorro a ${destinationAccount}` : `Disposición de Chanchito a ${destinationAccount}`,
          description: description || (modalMode === "DEPOSIT"
            ? `Ahorro registrado desde ${originAccount} hacia ${destinationAccount}`
            : `Retiro de ahorro hacia ${destinationAccount}`),
          amount: parseFloat(modalAmount),
          exchangeRate: 1,
          type: "TRANSFER",
          currency: "PEN" as "PEN",
          paymentMethod: paymentMethodMapped,
          status: "PAID" as "PAID",
          categoryId: selectedCategoryId,
          subCategoryId: selectedSubCategoryId,
          originAccount,
          destinationAccount,
          ignoreLiquidity,
        };

        if (editingId) {
          await updateTransactionRequest(editingId, payload as any);
          toast.success("Movimiento actualizado con éxito! 🐷🔧");
        } else {
          await createTransactionRequest(payload as any);
          toast.success(modalMode === "DEPOSIT" ? "¡Ahorro guardado! 🐷💰" : "¡Fondos retirados con éxito! 💸");
        }

        setIsModalOpen(false);
        loadData();
      } catch (error: any) {
        const message = error?.message || "Error al procesar la operación";
        if (message.includes("Límite de liquidez superado")) {
          setPendingAction(() => () => executeSave(true));
          setShowLiquidityWarning(true);
        } else {
          toast.error(message);
        }
      } finally {
        setSaving(false);
      }
    };

    await executeSave(false);
  };

  // Delete Transaction
  const handleOpenDelete = (id: string) => {
    setIdToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!idToDelete) return;
    try {
      await deleteTransactionRequest(idToDelete);
      toast.success("Movimiento eliminado con éxito");
      loadData();
    } catch (e: any) {
      toast.error(e.message || "Error al eliminar");
    } finally {
      setIsDeleteModalOpen(false);
      setIdToDelete(null);
    }
  };

  // Client Side Search Filter
  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;
    const term = searchTerm.toLowerCase();
    return items.filter((item: any) => {
      return (
        item.name.toLowerCase().includes(term) ||
        (item.description || "").toLowerCase().includes(term) ||
        (item.originAccount || "").toLowerCase().includes(term) ||
        (item.destinationAccount || "").toLowerCase().includes(term) ||
        item.amount.toString().includes(term)
      );
    });
  }, [items, searchTerm]);

  // Pagination
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, page]);

  return (
    <Appshell>
      <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 select-none font-sans">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
              <PiggyBank className="w-8 h-8 text-pink-500 animate-bounce" />
              Ahorros y Alcancía
            </h1>
            <p className="text-sm text-slate-500 font-medium">
              Transfiere fondos y gestiona tus reservas de dinero en el Chanchito
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleOpenDeposit}
              className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-black rounded-2xl shadow-lg shadow-emerald-100 transition-all active:scale-95"
            >
              <Plus className="w-4.5 h-4.5" />
              Ahorrar (Depositar)
            </button>
            <button
              onClick={handleOpenWithdraw}
              className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-black rounded-2xl shadow-lg shadow-rose-100 transition-all active:scale-95"
            >
              <Minus className="w-4.5 h-4.5" />
              Disponer (Retirar)
            </button>
          </div>
        </div>

        {/* ── KPI CARDS ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Patrimonio */}
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-100/50 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Patrimonio Total</span>
              <h3 className="text-3xl font-black text-slate-800">
                S/. {totalIncome - totalExpense >= 0 ? (totalIncome - totalExpense).toFixed(2) : `-${Math.abs(totalIncome - totalExpense).toFixed(2)}`}
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total reasignado + disponible</p>
            </div>
            <div className="p-4 bg-blue-50 text-blue-500 rounded-3xl">
              <Wallet className="w-6 h-6" />
            </div>
          </div>

          {/* Disponible */}
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-100/50 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Disponible (Cuentas Activas)</span>
              <h3 className={`text-3xl font-black ${totalDisponible >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                S/. {totalDisponible.toFixed(2)}
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Listo para gastar</p>
            </div>
            <div className="p-4 bg-emerald-50 text-emerald-500 rounded-3xl">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>

          {/* Chanchito */}
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-100/50 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Ahorro Reservado (Chancho)</span>
              <h3 className="text-3xl font-black text-pink-500">
                S/. {totalChanchito.toFixed(2)}
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Dinero bloqueado para gastos</p>
            </div>
            <div className="p-4 bg-pink-50 text-pink-500 rounded-3xl">
              <PiggyBank className="w-6 h-6 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Breakdown Panel */}
        <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 p-6 rounded-[2rem] border border-slate-200/60 shadow-inner">
          <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-indigo-500" />
            Distribución de Saldos por Cuenta
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(accountBalances).map(([acc, bal]) => (
              <div key={acc} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between space-y-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{acc}</span>
                <span className={`text-base font-black ${bal >= 0 ? "text-slate-700" : "text-rose-500"}`}>
                  S/. {bal.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── SEARCH & TABLE ────────────────────────────────────────────────── */}
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-100/50 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-indigo-500" />
              Historial de Movimientos de Ahorro
            </h3>
            
            {/* Search */}
            <div className="relative w-full md:w-80">
              <input
                type="text"
                placeholder="Buscar por descripción o monto..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white focus:border-transparent text-sm font-medium transition-all"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-4.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-20 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-10 h-10 animate-spin text-pink-500" />
                <span className="text-sm font-bold text-slate-400">Cargando movimientos...</span>
              </div>
            ) : paginatedItems.length === 0 ? (
              <div className="p-20 flex flex-col items-center justify-center gap-4 text-center">
                <div className="p-5 bg-pink-50 rounded-full text-pink-500 shadow-inner">
                  <PiggyBank className="w-10 h-10" />
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-700">No hay movimientos registrados</h4>
                  <p className="text-xs text-slate-400 font-medium max-w-sm mt-1">
                    Realiza tu primera transferencia al Chanchito para empezar a construir tu fondo de ahorro.
                  </p>
                </div>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-wider">
                    <th className="p-4 pl-6">Fecha</th>
                    <th className="p-4">Descripción / Categoría</th>
                    <th className="p-4">Origen → Destino</th>
                    <th className="p-4">Sentido</th>
                    <th className="p-4 text-right">Monto (S/.)</th>
                    <th className="p-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paginatedItems.map((item) => {
                    const isWithdraw = (item.originAccount || "").toLowerCase().includes("chanchito");
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/40 transition-colors text-xs font-bold text-slate-600">
                        <td className="p-4 pl-6 font-semibold text-slate-400">
                          {formatPeruDate(item.date)}
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-700 text-sm">{item.name}</span>
                            <span className="text-[10px] text-slate-400 font-medium">{item.category?.name || "Transferencia"} {item.subCategory ? `› ${item.subCategory.name}` : ""}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 bg-slate-100 rounded-lg text-slate-600 text-[10px] font-black">{item.originAccount || "Banco"}</span>
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                            <span className="px-2 py-1 bg-slate-100 rounded-lg text-slate-600 text-[10px] font-black">{item.destinationAccount || "Chanchito"}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black ${
                            isWithdraw
                              ? "bg-rose-50 text-rose-600"
                              : "bg-emerald-50 text-emerald-600"
                          }`}>
                            {isWithdraw ? (
                              <>
                                <TrendingDown className="w-3 h-3" />
                                Retiro
                              </>
                            ) : (
                              <>
                                <TrendingUp className="w-3 h-3" />
                                Depósito
                              </>
                            )}
                          </span>
                        </td>
                        <td className="p-4 text-right text-sm font-black text-slate-700">
                          S/. {Number(item.amount).toFixed(2)}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenEdit(item)}
                              className="p-2 hover:bg-pink-50 hover:text-pink-600 text-slate-400 rounded-xl transition-all"
                              title="Editar transferencia"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenDelete(item.id)}
                              className="p-2 hover:bg-rose-50 hover:text-rose-600 text-slate-400 rounded-xl transition-all"
                              title="Eliminar transferencia"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {filteredItems.length > itemsPerPage && (
            <div className="p-4 border-t border-slate-50 flex items-center justify-center">
              <Pagination
                currentPage={page}
                totalItems={filteredItems.length}
                pageSize={itemsPerPage}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── DEPOSIT/WITHDRAW/EDIT MODAL ────────────────────────────────────── */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9990]"
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl w-full max-w-lg p-7 relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-pink-50 rounded-full filter blur-xl opacity-70 pointer-events-none"></div>
              <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-50 rounded-full filter blur-xl opacity-70 pointer-events-none"></div>

              {/* Header */}
              <div className="flex items-center justify-between mb-6 relative z-10">
                <div className="flex items-center gap-3.5">
                  <div className={`p-3.5 rounded-2xl shadow-lg ${
                    modalMode === "DEPOSIT"
                      ? "bg-gradient-to-br from-green-500 to-emerald-600 shadow-green-100"
                      : modalMode === "WITHDRAW"
                      ? "bg-gradient-to-br from-pink-500 to-rose-600 shadow-pink-100"
                      : "bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-indigo-100"
                  }`}>
                    <PiggyBank className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                      {editingId ? "Editar Transferencia" : modalMode === "DEPOSIT" ? "Depositar Ahorro" : "Retirar Ahorro"}
                    </h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      {editingId ? "Modificación de Movimiento" : "Transferencia Interna de Fondos"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-all"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSaveTransaction} className="space-y-4 relative z-10">
                {/* Account Selection */}
                <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/50 space-y-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                      Cuenta Origen
                    </label>
                    {modalMode === "DEPOSIT" ? (
                      <div className="grid grid-cols-4 gap-2">
                        {["Banco", "Efectivo", "Yape", "Plin"].map((acc) => {
                          const active = originAccount === acc;
                          return (
                            <button
                              key={acc}
                              type="button"
                              onClick={() => setOriginAccount(acc)}
                              className={`py-2 px-3 text-xs font-black rounded-xl border transition-all ${
                                active
                                  ? "bg-green-600 border-green-600 text-white shadow-sm"
                                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                              }`}
                            >
                              {acc}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <input
                        type="text"
                        disabled
                        value="Chanchito"
                        className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-500 cursor-not-allowed"
                      />
                    )}
                  </div>

                  {/* Flow Indicator */}
                  <div className="flex items-center justify-center py-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-100">
                      <span>{modalMode === "DEPOSIT" ? originAccount : "Chanchito"}</span>
                      <ArrowRight className={`w-3.5 h-3.5 ${modalMode === "DEPOSIT" ? "text-green-500" : "text-rose-500"}`} />
                      <span>{modalMode === "DEPOSIT" ? destinationAccount : destinationAccount}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
                      Cuenta Destino
                    </label>
                    {modalMode === "DEPOSIT" ? (
                      <input
                        type="text"
                        required
                        value={destinationAccount}
                        onChange={(e) => setDestinationAccount(e.target.value)}
                        placeholder="Ej: Chanchito"
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm font-bold text-slate-700 transition-all"
                      />
                    ) : (
                      <div className="grid grid-cols-4 gap-2">
                        {["Banco", "Efectivo", "Yape", "Plin"].map((acc) => {
                          const active = destinationAccount === acc;
                          return (
                            <button
                              key={acc}
                              type="button"
                              onClick={() => setDestinationAccount(acc)}
                              className={`py-2 px-3 text-xs font-black rounded-xl border transition-all ${
                                active
                                  ? "bg-pink-600 border-pink-600 text-white shadow-sm"
                                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                              }`}
                            >
                              {acc}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Categories */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">
                      Categoría
                    </label>
                    <div className="relative">
                      <select
                        required
                        className="w-full pl-4 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all text-xs font-bold text-slate-700 appearance-none shadow-sm"
                        value={selectedCategoryId}
                        onChange={(e) => setSelectedCategoryId(e.target.value)}
                      >
                        <option value="">Seleccionar...</option>
                        {transferCategories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-pink-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">
                      Subcategoría
                    </label>
                    <div className="relative">
                      <select
                        required
                        className="w-full pl-4 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all text-xs font-bold text-slate-700 appearance-none shadow-sm"
                        value={selectedSubCategoryId}
                        onChange={(e) => setSelectedSubCategoryId(e.target.value)}
                      >
                        <option value="">Seleccionar...</option>
                        {subTransferCategories.map((sc) => (
                          <option key={sc.id} value={sc.id}>
                            {sc.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-pink-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Amount and Date */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">
                      Monto (S/.)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                        S/.
                      </span>
                      <input
                        type="number"
                        required
                        value={modalAmount}
                        onChange={(e) => setModalAmount(e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                        min="0.01"
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none text-sm font-bold text-slate-700 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">
                      Fecha de Registro
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        required
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none text-sm font-bold text-slate-700 transition-all"
                      />
                      <Calendar className="w-4 h-4 text-pink-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">
                    Observación / Comentario
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Ej: Ahorro para vacaciones"
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none text-sm font-bold text-slate-700 transition-all"
                    />
                    <FileText className="w-4 h-4 text-pink-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Action button */}
                <button
                  type="submit"
                  disabled={saving || !modalAmount || !selectedSubCategoryId}
                  className={`w-full mt-2 text-white font-black py-3.5 rounded-2xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                    modalMode === "DEPOSIT"
                      ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:shadow-green-100"
                      : "bg-gradient-to-r from-pink-500 to-rose-600 hover:shadow-pink-100"
                  }`}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <PiggyBank className="w-5 h-5" />
                      {editingId ? "Actualizar Transferencia" : modalMode === "DEPOSIT" ? "Registrar Depósito" : "Registrar Retiro"}
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Liquidity confirmation warning */}
      <ConfirmModal
        isOpen={showLiquidityWarning}
        onClose={() => setShowLiquidityWarning(false)}
        onConfirm={async () => {
          setShowLiquidityWarning(false);
          if (pendingAction) {
            await pendingAction();
          }
        }}
        title="Saldo Insuficiente"
        message="No tienes saldo para esto, si das en continuar, tu saldo será negativo y estarás registrando, ¿deseas continuar?"
        confirmText="Sí, continuar"
        cancelText="Cancelar"
        variant="warning"
        buttonIcon={<AlertCircle className="w-5 h-5" />}
      />

      {/* Delete confirmation warning */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Eliminar Movimiento de Ahorro"
        message="¿Estás seguro de que deseas eliminar este movimiento de ahorro? Los saldos de las cuentas se actualizarán automáticamente."
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
        buttonIcon={<Trash2 className="w-5 h-5" />}
      />
    </Appshell>
  );
}
