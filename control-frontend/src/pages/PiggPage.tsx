import { useState, useEffect } from "react";
import { ChevronDown, Loader2, X, PiggyBank } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createTransactionRequest } from "../services/transaction.api";
import { toast } from "react-hot-toast";
import { listCategoriesRequest } from "../services/category.api";

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
  const [ahorroCategoryId, setAhorroCategoryId] = useState<string>("");
  const [selectedSubCategoryId, setSelectedSubCategoryId] = useState("");

  // 🔥 Cargar categorías (IGUAL QUE EN IncomePage)
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await listCategoriesRequest();
        setCategories(Array.isArray(data) ? data : []);

        // 🔹 Buscar la categoría "Ahorros" (EXPENSE y sin parentId)
        const ahorroCat = data.find(
          (c: any) =>
            (!c.parentId || c.parentId === null) &&
            c.type === "EXPENSE" &&
            (c.name.toLowerCase().includes("ahorro") ||
              c.name.toLowerCase().includes("saving")),
        );

        if (ahorroCat) {
          setAhorroCategoryId(ahorroCat.id);
        } else {
          // 🔹 Si no existe, crear una por defecto
          setAhorroCategoryId("ahorros");
          setCategories((prev) => [
            ...prev,
            { id: "ahorros", name: "Ahorros", type: "EXPENSE", parentId: null },
            {
              id: "emergencia",
              name: "Fondo de Emergencia",
              type: "EXPENSE",
              parentId: "ahorros",
            },
            {
              id: "vacaciones",
              name: "Vacaciones",
              type: "EXPENSE",
              parentId: "ahorros",
            },
            {
              id: "educacion",
              name: "Educación",
              type: "EXPENSE",
              parentId: "ahorros",
            },
          ]);
        }
      } catch (error) {
        console.error("Error cargando categorías:", error);
        // 🔹 Categorías por defecto
        setCategories([
          { id: "ahorros", name: "Ahorros", type: "EXPENSE", parentId: null },
          {
            id: "emergencia",
            name: "Fondo de Emergencia",
            type: "EXPENSE",
            parentId: "ahorros",
          },
          {
            id: "vacaciones",
            name: "Vacaciones",
            type: "EXPENSE",
            parentId: "ahorros",
          },
          {
            id: "educacion",
            name: "Educación",
            type: "EXPENSE",
            parentId: "ahorros",
          },
        ]);
        setAhorroCategoryId("ahorros");
      }
    };
    loadCategories();
  }, []);

  // 🔹 Sub-categorías de "Ahorros" (IGUAL QUE EN IncomePage)
  const ahorroSubCategories = categories.filter(
    (c) => c.parentId === ahorroCategoryId,
  );

  // Guardar ahorro
  const handleSaveSavings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveAmount || parseFloat(saveAmount) <= 0) {
      toast.error("Ingresa un monto válido");
      return;
    }
    if (!selectedSubCategoryId) {
      toast.error("Selecciona una sub-categoría");
      return;
    }

    setSaving(true);
    try {
      // ✅ CORRECCIONES:
      const payload = {
        date: new Date(), // or your selected date
        paidAt: new Date(),
        name: "Ahorro Rápido",
        description: `Ahorro rápido de ${saveAmount}`,
        amount: parseFloat(saveAmount),
        exchangeRate: 1, // or your actual exchange rate as number
        type: "EXPENSE",
        currency: "PEN",
        paymentMethod: "CASH", // or your default payment method
        status: "PAID",
        categoryId: ahorroCategoryId,
        subCategoryId: selectedSubCategoryId,
      };

      // ✅ Usar createTransactionRequest (ya lo tienes importado)
      await createTransactionRequest(payload as any);

      toast.success("¡Ahorro registrado! 🎉");
      setShowSaveModal(false);
      setSaveAmount("");
      setSelectedSubCategoryId("");
      onSaveSuccess?.();
      // ✅ AGREGAR PARA ACTUALIZAR AUTOMÁTICAMENTE:
      // ✅ AGREGA ESTA LÍNEA (dispara el evento global)
      window.dispatchEvent(new CustomEvent("transactionCreated"));
    } catch (error: any) {
      // ✅ AGREGADO: Para ver el error real en consola
      console.error(
        "Error detallado:",
        error.response?.data || error.message || error,
      );
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Error al registrar el ahorro",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* 🐷 BOTÓN FLOTANTE (FIJO EN INFERIOR DERECHA) */}
      <button
        onClick={() => setShowSaveModal(true)}
        className="fixed bottom-6 right-6 z-[9999] group"
        aria-label="Registrar ahorro rápido"
      >
        <div className="relative">
          <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-bold px-2 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
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

      {/* MODAL (z-index más alto que el botón) */}
      <AnimatePresence>
        {showSaveModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[10000]"
            onClick={() => setShowSaveModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl border border-gray-100 shadow-2xl w-full max-w-md p-6 relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl">
                    <PiggyBank className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-gray-800">
                      Registrar Ahorro
                    </h2>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                      Ahorro Rápido
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSaveModal(false)}
                  className="p-2 hover:bg-gray-50 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Formulario */}
              <div className="space-y-4">
                {/* Monto */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Monto (S/.)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                      S/.
                    </span>
                    <input
                      type="number"
                      value={saveAmount}
                      onChange={(e) => setSaveAmount(e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      min="0.01"
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </div>

                {/* 🔥 SUB-CATEGORÍA DE AHORROS (IGUAL QUE EN IncomePage) */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Tipo de Ahorro
                  </label>
                  <div className="relative">
                    <select
                      required
                      className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl outline-none focus:ring-4 focus:ring-green-500/10 focus:border-green-500 transition-all text-sm font-black text-gray-700 appearance-none shadow-sm"
                      value={selectedSubCategoryId}
                      onChange={(e) => setSelectedSubCategoryId(e.target.value)}
                    >
                      <option value="">Seleccionar...</option>
                      {ahorroSubCategories.map((sc) => (
                        <option key={sc.id} value={sc.id}>
                          {sc.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-green-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Botón Guardar */}
                <button
                  onClick={handleSaveSavings}
                  disabled={saving || !saveAmount || !selectedSubCategoryId}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black py-4 rounded-2xl hover:shadow-lg hover:shadow-green-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
