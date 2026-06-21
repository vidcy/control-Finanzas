import { Calendar, X } from "lucide-react";

interface DateRangePickerProps {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  onClear: () => void;
}

const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};
const startOfMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};

export default function DateRangePicker({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onClear,
}: DateRangePickerProps) {
  const setPreset = (from: string, to: string) => {
    onDateFromChange(from);
    onDateToChange(to);
  };

  const hasFilter = dateFrom || dateTo;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-sm">
        <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => onDateFromChange(e.target.value)}
          className="text-xs font-semibold text-gray-700 outline-none bg-transparent cursor-pointer"
          title="Fecha desde"
        />
        <span className="text-gray-300 text-xs">—</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
          className="text-xs font-semibold text-gray-700 outline-none bg-transparent cursor-pointer"
          title="Fecha hasta"
        />
      </div>

      {/* Quick presets */}
      <div className="flex gap-1 bg-white border border-gray-100 rounded-xl p-1 shadow-sm">
        {[
          { label: "Hoy", from: today(), to: today() },
          { label: "7 días", from: daysAgo(7), to: today() },
          { label: "30 días", from: daysAgo(30), to: today() },
          { label: "Este mes", from: startOfMonth(), to: today() },
        ].map((p) => (
          <button
            key={p.label}
            onClick={() => setPreset(p.from, p.to)}
            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
              dateFrom === p.from && dateTo === p.to
                ? "bg-indigo-600 text-white"
                : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {hasFilter && (
        <button
          onClick={onClear}
          className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold text-rose-500 hover:bg-rose-50 rounded-xl border border-rose-100 transition-all"
        >
          <X className="w-3 h-3" /> Limpiar
        </button>
      )}
    </div>
  );
}
