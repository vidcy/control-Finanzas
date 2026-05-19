import { useEffect, useState } from "react";
import { Clock as ClockIcon, MapPin } from "lucide-react";

function getPeruTime() {
    const now = new Date();

    const formatted = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Lima",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    }).format(now);

    return new Date(formatted.replace(", ", "T"));
}

export default function Clock() {
    const [time, setTime] = useState(getPeruTime());

    useEffect(() => {
        const interval = setInterval(() => setTime(getPeruTime()), 1000);
        return () => clearInterval(interval);
    }, []);

    const hours = time.getHours();
    const minutes = time.getMinutes();
    const seconds = time.getSeconds();

    return (
        <div className="flex items-center scale-90 sm:scale-100">

            <div className="relative flex items-center gap-3 px-4 py-2 rounded-2xl
                bg-white/70 backdrop-blur-2xl border border-white/50
                shadow-[0_8px_25px_-8px_rgba(99,102,241,0.25)]
                hover:shadow-[0_12px_40px_-10px_rgba(99,102,241,0.35)]
                transition-all duration-300 group overflow-hidden">

                {/* glow suave */}
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-cyan-400/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition" />

                {/* ICONO UBICACION */}
                <MapPin className="w-4 h-4 text-indigo-500" />

                {/* HORA */}
                <div className="flex flex-col leading-tight">

                    <span className="text-[10px] tracking-[0.25em] text-gray-400 uppercase flex items-center gap-1">
                        Perú •

                        <span className="text-indigo-500 font-semibold tracking-widest">
                            {hours >= 12 ? "PM" : "AM"}
                        </span>
                    </span>

                    <span className="font-mono text-sm font-bold text-gray-900 tracking-widest">
                        {String(hours % 12 || 12).padStart(2, "0")}:
                        {String(minutes).padStart(2, "0")}:
                        {String(seconds).padStart(2, "0")}
                    </span>
                </div>

                {/* DIVISOR LIMPIO */}
                <div className="w-px h-6 bg-gray-200/60" />

                {/* STATUS DOT */}
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />

                {/* ICONO FINAL */}
                <ClockIcon className="w-4 h-4 text-indigo-600" />

            </div>
        </div>
    );
}