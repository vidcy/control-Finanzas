import { useEffect, useState } from "react";

export function usePeruTime() {
    const [time, setTime] = useState<Date>(() => getPeruTime());

    useEffect(() => {
        const interval = setInterval(() => {
            setTime(getPeruTime());
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    return time;
}

// 🔥 SIEMPRE hora Perú (America/Lima)
function getPeruTime(): Date {
    const now = new Date();

    // convierte a string en zona Perú y vuelve a Date
    const peruString = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Lima",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    }).format(now);

    // formato: YYYY-MM-DD HH:mm:ss
    const [datePart, timePart] = peruString.split(", ");

    return new Date(`${datePart}T${timePart}`);
}