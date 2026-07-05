import { useState, useEffect } from "react";
import { ChevronDown, Loader2, X, PiggyBank, AlertCircle, Calendar, FileText, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createTransactionRequest } from "../services/transaction.api";
import { toast } from "react-hot-toast";
import { listCategoriesRequest, seedDefaultCategoriesRequest } from "../services/category.api";
import ConfirmModal from "../components/ui/ConfirmModal";

export function FloatingSaveButton({
  onSaveSuccess,
}: {
  onSaveSuccess?: () => void;
}) {
  // Estados
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveAmount, setSaveAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  
  // Nuevos campos para Transferencia
  const [originAccount, setOriginAccount] = useState("Banco");
  const [destinationAccount, setDestinationAccount] = useState("Chanchito");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedSubCategoryId, setSelectedSubCategoryId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");

  const [showLiquidityWarning, setShowLiquidityWarning] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(null);

  // Cargar categorías de tipo TRANSFER
  const loadCategories = async () => {
    try {
      let data = await listCategoriesRequest();
      let transferCats = data.filter((c: any) => c.type === "TRANSFER");

      // Si no existen categorías de transferencia, sembrarlas automáticamente en segundo plano
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

      // Seleccionar automáticamente la primera categoría de transferencia o la que tenga "ahorro"
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

  // Filtrar categorías padres e hijas de tipo TRANSFER
  const parentTransferCategories = categories.filter(
    (c) => c.type === "TRANSFER" && (!c.parentId || c.parentId === null)
  );

  const subTransferCategories = categories.filter(
    (c) => c.parentId === selectedCategoryId
  );

  // Seleccionar automáticamente la primera subcategoría al cambiar de categoría padre
  useEffect(() => {
    if (subTransferCategories.length > 0) {
      setSelectedSubCategoryId(subTransferCategories[0].id);
    } else {
      setSelectedSubCategoryId("");
    }
  }, [selectedCategoryId, categories]);

  // Guardar ahorro (Transferencia)
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
        // Mapear la cuenta de origen al paymentMethod requerido por el backend
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
        // Disparar evento para que otras partes del dashboard actualicen los datos
        window.dispatchEvent(new CustomEvent("transactionCreated"));
      } catch (error: any) {
        console.error(
          "Error detallado:",
          error.response?.data || error.message || error,
        );
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
      {/* 🐷 BOTÓN FLOTANTE */}
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

      {/* MODAL */}
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
              {/* Decoración de fondo */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-green-50 rounded-full filter blur-xl opacity-70 pointer-events-none"></div>
              <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-50 rounded-full filter blur-xl opacity-70 pointer-events-none"></div>

              {/* Header */}
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

              {/* Formulario */}
              <form onSubmit={handleSaveSavings} className="space-y-4 relative z-10">
                {/* 1. Selección de Cuentas */}
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
                      placeholder="Ej: Chanchito, Fondo Emergencia"
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm font-bold text-gray-700 transition-all"
                    />
                  </div>
                </div>

                {/* 2. Categorías y Subcategorías */}
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

                {/* 3. Monto y Fecha */}
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

                {/* 4. Observación */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">
                    Observación / Comentario
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Ej: Ahorro para vacaciones de fin de año"
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-sm font-bold text-gray-700 transition-all"
                    />
                    <FileText className="w-4 h-4 text-green-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Botón Guardar */}
                <button
                  type="submit"
                  disabled={saving || !saveAmount || !selectedSubCategoryId}
                  className="w-full mt-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black py-3.5 rounded-2xl hover:shadow-lg hover:shadow-green-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Guardando Ahorro...
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
