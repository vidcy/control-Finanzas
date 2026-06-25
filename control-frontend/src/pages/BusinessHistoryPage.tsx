import { useState, useEffect } from "react";
import Appshell from "../components/layout/Appshell";
import {
  ShoppingBag,
  Search,
  Clock,
  User,
  Info,
  Lock,
  Unlock,
  PlusCircle,
  Trash2,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { getAuditLogsRequest } from "../services/transaction.api";
import { format } from "date-fns";
import { toast } from "react-hot-toast";
import Modal from "../components/ui/Modal";
import DateRangePicker from "../components/ui/DateRangePicker";

export default function BusinessHistoryPage() {
  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(true);
  const [searchAudit, setSearchAudit] = useState("");
  const [auditDateFrom, setAuditDateFrom] = useState("");
  const [auditDateTo, setAuditDateTo] = useState("");

  // Detail Modal
  const [viewLogDetail, setViewLogDetail] = useState<any>(null);

  const loadAuditLogs = async () => {
    setLoadingAudit(true);
    try {
      const data = await getAuditLogsRequest();
      setAuditLogs(data);
    } catch {
      toast.error("Error al cargar la bitácora de auditoría");
    } finally {
      setLoadingAudit(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, []);

  // Map database logs to human readable timeline entries
  const getAuditLogDetails = (log: any) => {
    const table = log.tableName;
    const action = log.action;
    const newV = log.newValues
      ? typeof log.newValues === "string"
        ? JSON.parse(log.newValues)
        : log.newValues
      : null;
    const oldV = log.oldValues
      ? typeof log.oldValues === "string"
        ? JSON.parse(log.oldValues)
        : log.oldValues
      : null;

    let title = `${action} en ${table}`;
    let description = `Registro ID: ${log.recordId}`;
    let type = "generic";
    let color = "bg-gray-100 text-gray-700 border-gray-200";
    let IconComponent = Info;

    if (table === "CashShift") {
      type = "shift";
      color = "bg-amber-50 text-amber-700 border-amber-200";
      if (action === "INSERT") {
        title = "Apertura de Caja 🔓";
        description = `Caja abierta con saldo inicial de S/ ${Number(newV?.initialBalance || 0).toFixed(2)}`;
        IconComponent = Unlock;
      } else if (action === "UPDATE") {
        if (newV?.status === "CLOSED") {
          title = "Cierre de Caja 🔒";
          description = `Caja cerrada. Ventas: S/ ${Number(newV?.totalSales || 0).toFixed(2)}. Saldo final: S/ ${Number(newV?.finalBalance || 0).toFixed(2)}`;
          IconComponent = Lock;
        } else {
          title = "Caja Modificada ✏️";
          description = `Se actualizaron los datos de la caja.`;
          IconComponent = Info;
        }
      }
    } else if (table === "Transaction") {
      type = "transaction";
      const txType = newV?.type || oldV?.type;
      const amount = newV?.amount || oldV?.amount || 0;
      const name = newV?.name || oldV?.name || "Transacción";

      if (action === "INSERT") {
        color =
          txType === "INCOME"
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : "bg-rose-50 text-rose-700 border-rose-200";
        title =
          txType === "INCOME" ? "Cobro Registrado 💰" : "Egreso Registrado 💸";
        description = `Registro de S/ ${Number(amount).toFixed(2)} vía ${newV?.paymentMethod || "Efectivo"} por "${name}"`;
        IconComponent = txType === "INCOME" ? TrendingUp : TrendingDown;
      } else if (action === "UPDATE") {
        color = "bg-blue-50 text-blue-700 border-blue-200";
        title = "Operación Contable Editada ✏️";
        description = `Transacción "${name}" editada de S/ ${Number(oldV?.amount || 0).toFixed(2)} a S/ ${Number(newV?.amount || 0).toFixed(2)}`;
        IconComponent = Info;
      } else if (action === "DELETE") {
        color = "bg-rose-100 text-rose-800 border-rose-300";
        title =
          txType === "INCOME" ? "Cobro Eliminado ❌" : "Egreso Eliminado ❌";
        description = `Se eliminó la transacción "${name}" por un monto de S/ ${Number(amount).toFixed(2)}`;
        IconComponent = Trash2;
      }
    } else if (table === "Product") {
      type = "product";
      color = "bg-purple-50 text-purple-700 border-purple-200";
      const prodName = newV?.name || oldV?.name || "Producto";

      if (action === "INSERT") {
        title = "Producto Creado 📦";
        description = `Se creó el producto "${prodName}" con precio S/ ${Number(newV?.salePrice || 0).toFixed(2)}`;
        IconComponent = PlusCircle;
      } else if (action === "UPDATE") {
        title = "Producto Modificado 📦";
        description = `Se actualizó el producto "${prodName}" (Stock: ${newV?.stock})`;
        IconComponent = Info;
      } else if (action === "DELETE") {
        color = "bg-red-50 text-red-700 border-red-200";
        title = "Producto Eliminado 📦 ❌";
        description = `Se eliminó el producto "${prodName}"`;
        IconComponent = Trash2;
      }
    } else if (table === "Category") {
      type = "category";
      color = "bg-indigo-50 text-indigo-700 border-indigo-200";
      const catName = newV?.name || oldV?.name || "Categoría";

      if (action === "INSERT") {
        title = "Categoría Creada 🏷️";
        description = `Se creó la categoría "${catName}"`;
        IconComponent = PlusCircle;
      } else if (action === "UPDATE") {
        title = "Categoría Modificada 🏷️";
        description = `Se modificó la categoría "${catName}"`;
        IconComponent = Info;
      } else if (action === "DELETE") {
        color = "bg-red-50 text-red-700 border-red-200";
        title = "Categoría Eliminada 🏷️ ❌";
        description = `Se eliminó la categoría "${catName}"`;
        IconComponent = Trash2;
      }
    }

    return { title, description, color, IconComponent, type };
  };

  const filteredAudit = auditLogs.filter((log) => {
    const details = getAuditLogDetails(log);
    const search = searchAudit.toLowerCase();
    const matchSearch =
      details.title.toLowerCase().includes(search) ||
      details.description.toLowerCase().includes(search) ||
      (log.userEmail || "").toLowerCase().includes(search) ||
      log.tableName.toLowerCase().includes(search);
    if (!matchSearch) return false;
    const day = (log.createdAt || "").slice(0, 10);
    if (auditDateFrom && day < auditDateFrom) return false;
    if (auditDateTo && day > auditDateTo) return false;
    return true;
  });

  return (
    <Appshell>
      <div className="space-y-6">
        {/* HEADER */}
        <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100 rounded-[2rem] p-8 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 bg-violet-200 opacity-20 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
          <div className="relative z-10">
            <div className="inline-flex items-center justify-center p-3 bg-white rounded-2xl mb-4 border border-violet-100 shadow-sm">
              <ShoppingBag className="w-8 h-8 text-violet-600" />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">
              Historial del Sistema
            </h1>
            <p className="text-gray-500 font-medium mt-2">
              Bitácora de auditoría histórica e inmutable de movimientos y actividades operativas.
            </p>
          </div>
        </div>

        {/* AUDIT LOG TAB */}
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 flex items-center bg-white border border-gray-100 rounded-xl px-4 shadow-sm">
              <Search className="w-4 h-4 text-gray-400 mr-2" />
              <input
                type="text"
                placeholder="Buscar en la bitácora por título, descripción, usuario o tabla..."
                className="flex-1 py-3 outline-none text-sm"
                value={searchAudit}
                onChange={(e) => setSearchAudit(e.target.value)}
              />
            </div>
            <DateRangePicker
              dateFrom={auditDateFrom}
              dateTo={auditDateTo}
              onDateFromChange={setAuditDateFrom}
              onDateToChange={setAuditDateTo}
              onClear={() => {
                setAuditDateFrom("");
                setAuditDateTo("");
              }}
            />
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            {loadingAudit ? (
              <div className="p-8 text-center text-gray-400 font-bold">
                Cargando bitácora del sistema...
              </div>
            ) : filteredAudit.length === 0 ? (
              <div className="p-12 text-center">
                <Clock className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 font-medium">
                  No hay eventos registrados en la bitácora.
                </p>
              </div>
            ) : (
              <div className="relative border-l-2 border-indigo-100 ml-4 md:ml-6 space-y-6">
                {filteredAudit.map((log) => {
                  const details = getAuditLogDetails(log);
                  return (
                    <div key={log.id} className="relative pl-6 md:pl-8 group">
                      {/* Dot indicator */}
                      <div
                        className={`absolute -left-[13px] top-1.5 p-1 rounded-full border-2 border-white shadow-md ${details.color}`}
                      >
                        <details.IconComponent className="w-3.5 h-3.5" />
                      </div>

                      {/* Log Item Card */}
                      <div className="bg-white hover:bg-gray-50/50 border border-gray-100 hover:border-gray-200 rounded-2xl p-4 transition-all shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black tracking-tight text-gray-800">
                              {details.title}
                            </span>
                            <span className="text-[10px] bg-gray-100 text-gray-500 font-bold px-1.5 py-0.5 rounded-md uppercase">
                              {log.tableName}
                            </span>
                          </div>
                          <p className="text-gray-600 text-xs mt-1 font-semibold">
                            {details.description}
                          </p>
                          <div className="flex items-center gap-3 text-[10px] text-gray-400 mt-2 font-medium">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />{" "}
                              {log.userEmail || "Sistema Automático"}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />{" "}
                              {format(
                                new Date(log.createdAt),
                                "dd/MM/yyyy HH:mm:ss",
                              )}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => setViewLogDetail(log)}
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100/70 px-3 py-1.5 rounded-xl transition-all self-end md:self-auto"
                        >
                          Ver Datos
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* DETAIL MODAL: VIEW RAW LOG STATE */}
      <Modal
        isOpen={!!viewLogDetail}
        onClose={() => setViewLogDetail(null)}
        title="🔍 Detalle de Cambios de Auditoría"
        maxWidth="max-w-2xl"
      >
        {viewLogDetail && (
          <div className="space-y-4 text-sm text-gray-800">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div className="text-xs text-gray-400 font-bold mb-1">
                  Tabla Afectada
                </div>
                <div className="font-bold text-indigo-700 font-mono text-xs">
                  {viewLogDetail.tableName}
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div className="text-xs text-gray-400 font-bold mb-1">
                  Operación
                </div>
                <div
                  className={`font-black text-xs px-2 py-0.5 rounded-md inline-block uppercase ${
                    viewLogDetail.action === "INSERT"
                      ? "bg-emerald-50 text-emerald-700"
                      : viewLogDetail.action === "UPDATE"
                        ? "bg-blue-50 text-blue-700"
                        : "bg-rose-50 text-rose-700"
                  }`}
                >
                  {viewLogDetail.action}
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div className="text-xs text-gray-400 font-bold mb-1">
                  Usuario
                </div>
                <div className="font-semibold text-gray-700">
                  {viewLogDetail.userEmail || "Sistema"}
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div className="text-xs text-gray-400 font-bold mb-1">
                  Fecha / Hora
                </div>
                <div className="font-semibold text-gray-700">
                  {format(
                    new Date(viewLogDetail.createdAt),
                    "dd/MM/yyyy HH:mm:ss",
                  )}
                </div>
              </div>
            </div>

            {viewLogDetail.oldValues && (
              <div className="space-y-1">
                <div className="text-xs text-gray-500 font-bold">
                  Estado Anterior (Antes):
                </div>
                <pre className="bg-rose-50/50 text-rose-800 border border-rose-100 rounded-xl p-3 text-xs font-mono max-h-48 overflow-y-auto whitespace-pre-wrap">
                  {JSON.stringify(
                    typeof viewLogDetail.oldValues === "string"
                      ? JSON.parse(viewLogDetail.oldValues)
                      : viewLogDetail.oldValues,
                    null,
                    2,
                  )}
                </pre>
              </div>
            )}

            {viewLogDetail.newValues && (
              <div className="space-y-1">
                <div className="text-xs text-gray-500 font-bold">
                  Estado Nuevo (Después):
                </div>
                <pre className="bg-emerald-50/50 text-emerald-800 border border-emerald-100 rounded-xl p-3 text-xs font-mono max-h-48 overflow-y-auto whitespace-pre-wrap">
                  {JSON.stringify(
                    typeof viewLogDetail.newValues === "string"
                      ? JSON.parse(viewLogDetail.newValues)
                      : viewLogDetail.newValues,
                    null,
                    2,
                  )}
                </pre>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewLogDetail(null)}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </Appshell>
  );
}
