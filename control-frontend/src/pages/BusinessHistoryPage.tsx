import { useState, useEffect } from "react";
import Appshell from "../components/layout/Appshell";
import {
  ShoppingBag,
  Search,
  TrendingDown,
  TrendingUp,
  ArrowUpDown,
  Package,
  Clock,
  User,
  Info,
  Lock,
  Unlock,
  PlusCircle,
  Trash2,
  FileDown,
} from "lucide-react";
import { getInventoryMovementsRequest } from "../services/product.api";
import type { InventoryMovement } from "../services/product.api";
import { getAuditLogsRequest } from "../services/transaction.api";
import { format } from "date-fns";
import { toast } from "react-hot-toast";
import Modal from "../components/ui/Modal";
import { getReceiptAbsoluteUrl } from "../components/ui/ImageUploader";
import DateRangePicker from "../components/ui/DateRangePicker";
import { exportToExcel } from "../utils/exportExcel";

export default function BusinessHistoryPage() {
  const [activeTab, setActiveTab] = useState<"audit" | "movements">("audit");

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(true);
  const [searchAudit, setSearchAudit] = useState("");
  const [auditDateFrom, setAuditDateFrom] = useState("");
  const [auditDateTo, setAuditDateTo] = useState("");

  // Movements (Kardex)
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(true);
  const [searchMovements, setSearchMovements] = useState("");
  const [filterType, setFilterType] = useState<"" | "IN" | "OUT">("");
  const [isExporting, setIsExporting] = useState(false);
  const [movDateFrom, setMovDateFrom] = useState("");
  const [movDateTo, setMovDateTo] = useState("");

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

  const loadMovements = async () => {
    setLoadingMovements(true);
    try {
      const data = await getInventoryMovementsRequest(
        filterType ? { type: filterType } : undefined,
      );
      setMovements(data);
    } catch {
      toast.error("Error al cargar movimientos");
    } finally {
      setLoadingMovements(false);
    }
  };

  useEffect(() => {
    if (activeTab === "audit") {
      loadAuditLogs();
    } else {
      loadMovements();
    }
  }, [activeTab, filterType]);

  const exportKardexPdf = async () => {
    if (filteredMovements.length === 0) {
      toast.error("No hay movimientos para exportar");
      return;
    }
    setIsExporting(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      // Totals
      const totalIn = filteredMovements
        .filter((m) => m.type === "IN")
        .reduce((s, m) => s + m.quantity, 0);
      const totalOut = filteredMovements
        .filter((m) => m.type === "OUT")
        .reduce((s, m) => s + m.quantity, 0);
      const byProduct: Record<
        string,
        { name: string; unit: string; in: number; out: number }
      > = {};
      filteredMovements.forEach((m) => {
        const key = m.productId;
        if (!byProduct[key])
          byProduct[key] = {
            name: m.product?.name || "—",
            unit: m.product?.unit || "",
            in: 0,
            out: 0,
          };
        if (m.type === "IN") byProduct[key].in += m.quantity;
        else byProduct[key].out += m.quantity;
      });

      // Header
      doc.setFillColor(99, 102, 241);
      doc.rect(0, 0, 297, 20, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("THINK – Global Ccoplex", 14, 8);
      doc.setFontSize(10);
      doc.text("Kardex de Inventario", 14, 14);
      doc.setFontSize(8);
      doc.text(
        `Generado: ${format(new Date(), "dd/MM/yyyy HH:mm")}  |  Total registros: ${filteredMovements.length}`,
        180,
        14,
      );

      // Summary boxes
      doc.setTextColor(30, 30, 30);
      doc.setFillColor(236, 253, 245);
      doc.roundedRect(14, 24, 60, 16, 2, 2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(4, 120, 87);
      doc.text("TOTAL ENTRADAS", 17, 29);
      doc.setFontSize(14);
      doc.text(`+${totalIn.toFixed(2)} uds`, 17, 37);

      doc.setFillColor(255, 241, 242);
      doc.roundedRect(80, 24, 60, 16, 2, 2, "F");
      doc.setTextColor(190, 18, 60);
      doc.setFontSize(8);
      doc.text("TOTAL SALIDAS", 83, 29);
      doc.setFontSize(14);
      doc.text(`-${totalOut.toFixed(2)} uds`, 83, 37);

      doc.setFillColor(239, 246, 255);
      doc.roundedRect(146, 24, 60, 16, 2, 2, "F");
      doc.setTextColor(29, 78, 216);
      doc.setFontSize(8);
      doc.text("BALANCE NETO", 149, 29);
      doc.setFontSize(14);
      const net = totalIn - totalOut;
      doc.text(`${net >= 0 ? "+" : ""}${net.toFixed(2)} uds`, 149, 37);

      // Kardex table
      const startY = 46;
      const colW = [32, 50, 24, 40, 30, 28, 28, 28];
      const headers = [
        "Fecha",
        "Producto",
        "Tipo",
        "Presentación",
        "Cantidad",
        "Base",
        "Motivo",
        "Usuario",
      ];
      doc.setFillColor(99, 102, 241);
      doc.rect(14, startY, 269, 7, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      let cx = 14;
      headers.forEach((h, i) => {
        doc.text(h, cx + 1, startY + 5);
        cx += colW[i];
      });

      doc.setFont("helvetica", "normal");
      let y = startY + 7;
      filteredMovements.forEach((m, idx) => {
        if (y > 185) {
          doc.addPage();
          y = 14;
        }
        const bg = idx % 2 === 0;
        if (bg) {
          doc.setFillColor(248, 250, 252);
          doc.rect(14, y, 269, 6.5, "F");
        }
        doc.setTextColor(30, 30, 30);
        doc.setFontSize(6.5);
        const row = [
          format(new Date(m.createdAt), "dd/MM/yy HH:mm"),
          m.product?.name || "—",
          m.type === "IN" ? "ENTRADA" : "SALIDA",
          m.presentationQty
            ? `${m.presentationQty}x ${m.presentationName}`
            : "—",
          `${m.type === "IN" ? "+" : "-"}${m.quantity}`,
          m.product?.unit || "",
          m.reason === "SALE"
            ? "Venta"
            : m.reason === "PURCHASE"
              ? "Compra"
              : "Ajuste",
          "",
        ];
        cx = 14;
        if (m.type === "IN") doc.setTextColor(4, 120, 87);
        else doc.setTextColor(190, 18, 60);
        row.forEach((val, i) => {
          if (i !== 0 && i !== 4) doc.setTextColor(30, 30, 30);
          doc.text(String(val).substring(0, 22), cx + 1, y + 4.5);
          cx += colW[i];
        });
        y += 6.5;
      });

      // Per-product analysis
      doc.addPage();
      doc.setFillColor(99, 102, 241);
      doc.rect(0, 0, 297, 14, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Análisis por Producto", 14, 10);
      y = 20;
      Object.values(byProduct).forEach((p, idx) => {
        if (y > 185) {
          doc.addPage();
          y = 14;
        }
        const bg2 = idx % 2 === 0;
        if (bg2) {
          doc.setFillColor(248, 250, 252);
          doc.rect(14, y - 3, 260, 10, "F");
        }
        doc.setTextColor(30, 30, 30);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text(p.name, 16, y + 3);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(4, 120, 87);
        doc.text(`Entradas: +${p.in.toFixed(2)} ${p.unit}`, 90, y + 3);
        doc.setTextColor(190, 18, 60);
        doc.text(`Salidas: -${p.out.toFixed(2)} ${p.unit}`, 150, y + 3);
        doc.setTextColor(29, 78, 216);
        const bal = p.in - p.out;
        doc.text(
          `Balance: ${bal >= 0 ? "+" : ""}${bal.toFixed(2)} ${p.unit}`,
          210,
          y + 3,
        );
        y += 11;
      });

      // Footer
      const pages = doc.getNumberOfPages();
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Global Ccoplex © ${new Date().getFullYear()} – THINK Plataforma Financiera`,
          14,
          205,
        );
        doc.text(`Pág. ${i}/${pages}`, 278, 205);
      }

      doc.save(`Kardex_${format(new Date(), "yyyyMMdd_HHmm")}.pdf`);
      toast.success("PDF exportado correctamente");
    } catch (err) {
      console.error(err);
      toast.error("Error al generar el PDF");
    } finally {
      setIsExporting(false);
    }
  };

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

  const filteredMovements = movements.filter((m) => {
    const matchSearch =
      (m.product?.name || "")
        .toLowerCase()
        .includes(searchMovements.toLowerCase()) ||
      (m.presentationName || "")
        .toLowerCase()
        .includes(searchMovements.toLowerCase());
    if (!matchSearch) return false;
    const day = (m.createdAt || "").slice(0, 10);
    if (movDateFrom && day < movDateFrom) return false;
    if (movDateTo && day > movDateTo) return false;
    return true;
  });

  const handleMovementsExcel = async () => {
    await exportToExcel(
      filteredMovements.map((m) => ({
        fecha: format(new Date(m.createdAt), "dd/MM/yyyy HH:mm"),
        producto: m.product?.name || "—",
        tipo: m.type === "IN" ? "Entrada" : "Salida",
        presentacion: m.presentationQty
          ? `${m.presentationQty}x ${m.presentationName}`
          : "—",
        cantidad: `${m.type === "IN" ? "+" : "-"}${m.quantity}`,
        unidad: m.product?.unit || "",
        motivo:
          m.reason === "SALE"
            ? "Venta"
            : m.reason === "PURCHASE"
              ? "Compra"
              : "Ajuste",
      })),
      [
        { key: "fecha", label: "Fecha" },
        { key: "producto", label: "Producto" },
        { key: "tipo", label: "Tipo" },
        { key: "presentacion", label: "Presentación" },
        { key: "cantidad", label: "Cantidad" },
        { key: "unidad", label: "Unidad" },
        { key: "motivo", label: "Motivo" },
      ],
      `Kardex_${new Date().toISOString().slice(0, 10)}`,
    );
    toast.success("Excel exportado");
  };

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
              Bitácora de auditoría histórica e inmutable de movimientos y
              actividades operativas.
            </p>
          </div>
        </div>

        {/* TABS */}
        <div className="flex bg-white rounded-2xl border border-gray-100 p-1.5 shadow-sm gap-1">
          <button
            onClick={() => setActiveTab("audit")}
            className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === "audit" ? "bg-violet-600 text-white shadow-md" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"}`}
          >
            <Clock className="w-4 h-4" /> Bitácora de Auditoría
          </button>
          <button
            onClick={() => setActiveTab("movements")}
            className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === "movements" ? "bg-indigo-600 text-white shadow-md" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"}`}
          >
            <ArrowUpDown className="w-4 h-4" /> Kardex / Movimientos
          </button>
        </div>

        {/* AUDIT LOG TAB */}
        {activeTab === "audit" && (
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
        )}

        {/* INVENTORY MOVEMENTS TAB */}
        {activeTab === "movements" && (
          <div className="space-y-4">
            <div className="flex gap-3 flex-wrap">
              <div className="flex-1 flex items-center bg-white border border-gray-100 rounded-xl px-4 shadow-sm">
                <Search className="w-4 h-4 text-gray-400 mr-2" />
                <input
                  type="text"
                  placeholder="Buscar por producto..."
                  className="flex-1 py-3 outline-none text-sm"
                  value={searchMovements}
                  onChange={(e) => setSearchMovements(e.target.value)}
                />
              </div>
              <div className="flex gap-1 bg-white border border-gray-100 rounded-xl p-1 shadow-sm">
                {(["", "IN", "OUT"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${filterType === t ? "bg-indigo-600 text-white" : "text-gray-500 hover:bg-gray-50"}`}
                  >
                    {t === "" ? "Todos" : t === "IN" ? "Entradas" : "Salidas"}
                  </button>
                ))}
              </div>
              <DateRangePicker
                dateFrom={movDateFrom}
                dateTo={movDateTo}
                onDateFromChange={setMovDateFrom}
                onDateToChange={setMovDateTo}
                onClear={() => {
                  setMovDateFrom("");
                  setMovDateTo("");
                }}
              />
              <button
                onClick={handleMovementsExcel}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-xl shadow-sm hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-all"
              >
                <FileDown className="w-4 h-4" /> Excel
              </button>
              <button
                onClick={exportKardexPdf}
                disabled={isExporting}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold rounded-xl shadow hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-60"
              >
                <FileDown className="w-4 h-4" />
                {isExporting ? "Generando..." : "Exportar PDF"}
              </button>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              {loadingMovements ? (
                <div className="p-8 text-center text-gray-400 font-bold">
                  Cargando movimientos...
                </div>
              ) : filteredMovements.length === 0 ? (
                <div className="p-12 text-center">
                  <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 font-medium">
                    No hay movimientos de inventario.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-bold">
                      <tr>
                        <th className="px-5 py-4 text-left">Fecha</th>
                        <th className="px-5 py-4 text-left">Producto</th>
                        <th className="px-5 py-4 text-center">Tipo</th>
                        <th className="px-5 py-4 text-left">Presentación</th>
                        <th className="px-5 py-4 text-right">
                          Cantidad (Base)
                        </th>
                        <th className="px-5 py-4 text-center">Motivo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredMovements.map((m) => (
                        <tr
                          key={m.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-5 py-4 text-gray-500 whitespace-nowrap text-xs">
                            {format(new Date(m.createdAt), "dd/MM/yyyy HH:mm")}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              {m.product?.imageUrl ? (
                                <img
                                  src={
                                    getReceiptAbsoluteUrl(m.product.imageUrl) ||
                                    m.product.imageUrl
                                  }
                                  alt={m.product.name}
                                  className="w-8 h-8 rounded-lg object-cover border border-gray-100"
                                  onError={(e) =>
                                    ((
                                      e.target as HTMLImageElement
                                    ).style.display = "none")
                                  }
                                />
                              ) : (
                                <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
                                  <Package className="w-4 h-4 text-indigo-300" />
                                </div>
                              )}
                              <span className="font-semibold text-gray-900">
                                {m.product?.name || "—"}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-center">
                            {m.type === "IN" ? (
                              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg text-xs font-bold">
                                <TrendingUp className="w-3 h-3" /> Entrada
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-600 px-2.5 py-1 rounded-lg text-xs font-bold">
                                <TrendingDown className="w-3 h-3" /> Salida
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            {m.presentationQty && m.presentationName ? (
                              <span className="text-xs text-gray-600 font-semibold">
                                {m.presentationQty} × {m.presentationName}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-right font-black">
                            <span
                              className={
                                m.type === "IN"
                                  ? "text-emerald-600"
                                  : "text-rose-600"
                              }
                            >
                              {m.type === "IN" ? "+" : "−"}
                              {m.quantity} {m.product?.unit}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-lg font-bold">
                              {m.reason === "SALE"
                                ? "Venta"
                                : m.reason === "PURCHASE"
                                  ? "Compra"
                                  : m.reason || "—"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
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
