import { useState, useEffect } from "react";
import Appshell from "../components/layout/Appshell";
import { Lock, Unlock, History, DollarSign } from "lucide-react";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Modal from "../components/ui/Modal";
import {
  openCashShiftRequest,
  closeCashShiftRequest,
  getActiveCashShiftRequest,
  getCashShiftHistoryRequest,
} from "../services/cash-shift.api";

export default function BusinessCashRegisterPage() {
  const [activeShift, setActiveShift] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [initialBalance, setInitialBalance] = useState<number | "">("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [active, hist] = await Promise.all([
        getActiveCashShiftRequest(),
        getCashShiftHistoryRequest()
      ]);
      setActiveShift(active || null);
      setHistory(hist);
    } catch (error) {
      toast.error("Error al cargar estado de la caja");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (initialBalance === "" || initialBalance < 0) {
      toast.error("Ingresa un monto válido inicial");
      return;
    }
    
    try {
      await openCashShiftRequest(Number(initialBalance));
      toast.success("Caja abierta exitosamente");
      setIsModalOpen(false);
      setInitialBalance("");
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Error al abrir la caja");
    }
  };

  const handleCloseShift = async () => {
    if (!window.confirm("¿Estás seguro de cerrar la caja actual?")) return;
    try {
      await closeCashShiftRequest();
      toast.success("Caja cerrada exitosamente");
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Error al cerrar la caja");
    }
  };

  if (loading) {
    return (
      <Appshell>
        <div className="flex justify-center items-center h-40">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      </Appshell>
    );
  }

  return (
    <Appshell>
      <div className="space-y-6">
        {/* HEADER LIGHT PREMIUM */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-[2rem] p-8 shadow-sm border border-blue-100 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 bg-blue-100/50 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="inline-flex items-center justify-center p-3 bg-white rounded-2xl mb-4 border border-blue-100 shadow-sm">
                <DollarSign className="w-8 h-8 text-blue-600" />
              </div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">Cierre de Caja</h1>
              <p className="text-gray-500 font-medium mt-2 max-w-lg">Controla el dinero en efectivo y las ventas diarias. Abre tu turno al empezar y ciérralo al finalizar tu jornada.</p>
            </div>

            <div>
              {activeShift ? (
                <button onClick={handleCloseShift} className="px-6 py-3.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl font-bold flex items-center gap-2 hover:bg-rose-100 transition-all shadow-sm">
                  <Lock className="w-5 h-5" /> Cerrar Caja Actual
                </button>
              ) : (
                <button onClick={() => setIsModalOpen(true)} className="px-6 py-3.5 bg-blue-600 text-white border border-blue-700 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-md shadow-blue-200">
                  <Unlock className="w-5 h-5" /> Abrir Nueva Caja
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ACTIVE SHIFT STATUS */}
        {activeShift && (
          <div className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-sm relative overflow-hidden">
            <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-50 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
            
            <div className="flex items-center gap-3 mb-6 relative z-10">
              <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
              <h2 className="text-lg font-bold text-gray-900">Caja Actual Abierta</h2>
              <span className="text-xs text-gray-400 ml-auto">
                Desde: {format(new Date(activeShift.openedAt), "dd MMM yyyy, HH:mm", { locale: es })}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Monto Inicial (Base)</p>
                <p className="text-2xl font-black text-gray-900">S/ {activeShift.initialBalance.toFixed(2)}</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Ventas del Turno</p>
                <p className="text-2xl font-black text-blue-700">+ S/ {activeShift.currentSales.toFixed(2)}</p>
              </div>
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Total Esperado en Caja</p>
                <p className="text-2xl font-black text-emerald-700">S/ {(activeShift.initialBalance + activeShift.currentSales).toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}

        {!activeShift && !loading && (
          <div className="bg-gray-50 border border-gray-200 border-dashed rounded-3xl p-8 text-center">
            <Lock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-700 mb-1">La caja está cerrada</h3>
            <p className="text-sm text-gray-500">Abre la caja para comenzar a registrar las ventas del POS a tu turno.</p>
          </div>
        )}

        {/* HISTORY */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex items-center gap-2">
            <History className="w-5 h-5 text-gray-400" />
            <h3 className="text-lg font-bold text-gray-900">Historial de Cierres</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-6 py-4">Apertura</th>
                  <th className="px-6 py-4">Cierre</th>
                  <th className="px-6 py-4 text-right">Monto Inicial</th>
                  <th className="px-6 py-4 text-right">Ventas</th>
                  <th className="px-6 py-4 text-right">Total Final</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-gray-400 font-medium">No hay cierres de caja anteriores registrados.</td>
                  </tr>
                ) : (
                  history.map((shift) => (
                    <tr key={shift.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 text-gray-600 font-medium">
                        {format(new Date(shift.openedAt), "dd MMM, HH:mm", { locale: es })}
                      </td>
                      <td className="px-6 py-4 text-gray-600 font-medium">
                        {shift.closedAt ? format(new Date(shift.closedAt), "dd MMM, HH:mm", { locale: es }) : "-"}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-600 font-semibold">
                        S/ {shift.initialBalance.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right text-blue-600 font-bold">
                        + S/ {shift.totalSales.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right text-emerald-600 font-black">
                        S/ {(shift.finalBalance || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Abrir Caja">
        <form onSubmit={handleOpenShift} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Monto Inicial en Efectivo (Base de Caja)</label>
            <input 
              type="number" 
              required 
              min="0" 
              step="0.01" 
              value={initialBalance} 
              onChange={e => setInitialBalance(e.target.value === "" ? "" : Number(e.target.value))} 
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
              placeholder="Ej. 100.00" 
            />
            <p className="text-xs text-gray-400 mt-2">Este es el dinero con el que empiezas el día para dar vueltos.</p>
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors">Cancelar</button>
            <button type="submit" className="px-5 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-500/30">
              Abrir Caja Ahora
            </button>
          </div>
        </form>
      </Modal>

    </Appshell>
  );
}
