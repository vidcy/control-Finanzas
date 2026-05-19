import { toZonedTime, fromZonedTime, format } from "date-fns-tz";

// ======================================================
// 🌎 CONFIGURACIÓN GLOBAL DE FECHAS - SISTEMA PERÚ
// ======================================================

// Zona horaria oficial del sistema
export const PERU_TZ = "America/Lima";

/*
IMPORTANTE:
El backend guarda TODAS las fechas en UTC (ISO string).
Ejemplo DB: 2025-05-19T21:33:00.000Z

El frontend SIEMPRE:
1️⃣ Convierte UTC -> Hora Perú para mostrar en el navegador
2️⃣ Convierte Hora Perú -> UTC para guardar en el backend
*/

// ======================================================
// 🟡 CONVERTIR UTC → HORA PERÚ
// ======================================================

/**
 * Convierte una fecha UTC (ISO String o Date) a un objeto Date ajustado a la hora de Perú.
 */
export function utcToPeruDate(utcISO: string | Date): Date {
  if (!utcISO) return new Date();
  const date = new Date(utcISO);
  return isNaN(date.getTime()) ? new Date() : toZonedTime(date, PERU_TZ);
}

// ======================================================
// 🔵 FORMATEAR FECHA Y HORA EN FORMATO PERÚ
// ======================================================

/**
 * Formatea una fecha UTC (ISO String o Date) al formato de fecha peruano (dd-MM-yyyy).
 * Ejemplo: "19-05-2025"
 */
export function formatPeruDate(utcISO: string | Date): string {
  if (!utcISO) return "-";
  const date = new Date(utcISO);
  if (isNaN(date.getTime())) return "-";
  const zoned = toZonedTime(date, PERU_TZ);
  return format(zoned, "dd-MM-yyyy");
}

/**
 * Formatea una fecha UTC (ISO String o Date) al formato de fecha y hora peruano (dd-MM-yyyy hh:mm:ss a).
 * Ejemplo: "19-05-2025 04:33:00 PM"
 */
export function formatPeruDateTime(utcISO: string | Date): string {
  if (!utcISO) return "-";
  const date = new Date(utcISO);
  if (isNaN(date.getTime())) return "-";
  const zoned = toZonedTime(date, PERU_TZ);
  return format(zoned, "dd-MM-yyyy hh:mm:ss a");
}

/**
 * Formatea una fecha UTC (ISO String o Date) a solo hora en formato peruano (hh:mm:ss a).
 * Ejemplo: "04:33:00 PM"
 */
export function formatPeruTime(utcISO: string | Date): string {
  if (!utcISO) return "-";
  const date = new Date(utcISO);
  if (isNaN(date.getTime())) return "-";
  const zoned = toZonedTime(date, PERU_TZ);
  return format(zoned, "hh:mm:ss a");
}

/**
 * Convierte una fecha UTC a formato YYYY-MM-DD para usar directamente en inputs tipo "date" del navegador,
 * pero ajustada correctamente a la zona horaria de Perú.
 * Ejemplo: "2025-05-19"
 */
export function utcToPeruInputDate(utcISO: string | Date): string {
  if (!utcISO) return "";
  const date = new Date(utcISO);
  if (isNaN(date.getTime())) return "";
  const zoned = toZonedTime(date, PERU_TZ);
  return format(zoned, "yyyy-MM-dd");
}

// ======================================================
// 🟢 OBTENER "HOY EN PERÚ" PARA FORMULARIOS
// ======================================================

/**
 * Obtiene el día de hoy en Perú en formato YYYY-MM-DD para inicializar inputs tipo "date".
 * Ejemplo: "2025-05-19"
 */
export function getPeruTodayInputStr(): string {
  const zoned = toZonedTime(new Date(), PERU_TZ);
  return format(zoned, "yyyy-MM-dd");
}

// ======================================================
// 🔴 CONVERTIR HORA PERÚ → UTC (para guardar)
// ======================================================

/**
 * Convierte un valor de input de fecha de Perú (yyyy-MM-dd) a un ISOString UTC para enviar al backend.
 * - Si es una edición (se proporciona existingUtcISO), conserva la hora y segundos originales pero cambia la fecha.
 * - Si es una creación, le añade la hora actual de Perú para que el registro tenga la hora de creación real en vez de medianoche.
 */
export function peruInputDateToUtcISO(peruDateStr: string, existingUtcISO?: string): string {
  if (!peruDateStr) return new Date().toISOString();

  const [year, month, day] = peruDateStr.split("-").map(Number);
  
  let hours = 0;
  let minutes = 0;
  let seconds = 0;
  let milliseconds = 0;

  if (existingUtcISO) {
    const originalDate = new Date(existingUtcISO);
    if (!isNaN(originalDate.getTime())) {
      const originalZoned = toZonedTime(originalDate, PERU_TZ);
      hours = originalZoned.getHours();
      minutes = originalZoned.getMinutes();
      seconds = originalZoned.getSeconds();
      milliseconds = originalZoned.getMilliseconds();
    }
  } else {
    const nowZoned = toZonedTime(new Date(), PERU_TZ);
    hours = nowZoned.getHours();
    minutes = nowZoned.getMinutes();
    seconds = nowZoned.getSeconds();
    milliseconds = nowZoned.getMilliseconds();
  }

  // Formato: YYYY-MM-DD HH:mm:ss.SSS
  const localDateTimeStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")} ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(milliseconds).padStart(3, "0")}`;
  
  const utcDate = fromZonedTime(localDateTimeStr, PERU_TZ);
  return utcDate.toISOString();
}

// ======================================================
// 🟣 COMPARACIONES EN UTC
// ======================================================

export function isPast(utcISO: string): boolean {
  return new Date(utcISO).getTime() < Date.now();
}

export function isFuture(utcISO: string): boolean {
  return new Date(utcISO).getTime() > Date.now();
}

export function diffMinutesFromNow(utcISO: string): number {
  const diffMs = new Date(utcISO).getTime() - Date.now();
  return Math.floor(diffMs / 60000);
}

// ======================================================
// 🟢 OBTENER ESTADO DE VENCIMIENTO (para deudas pendientes)
// ======================================================

export interface DueDateStatus {
  status: "EXPIRED" | "TODAY" | "TOMORROW" | "FUTURE";
  daysDifference: number;
  message: string;
}

export function getDueDateStatus(dueDateUtcISO: string | Date | undefined): DueDateStatus {
  if (!dueDateUtcISO) {
    return { status: "FUTURE", daysDifference: 9999, message: "Sin fecha" };
  }
  
  const dateObj = new Date(dueDateUtcISO);
  if (isNaN(dateObj.getTime())) {
    return { status: "FUTURE", daysDifference: 9999, message: "Fecha inválida" };
  }

  const zonedToday = toZonedTime(new Date(), PERU_TZ);
  const zonedDue = toZonedTime(dateObj, PERU_TZ);

  // Normalizar a medianoche para comparar días completos sin horas
  const todayMidnight = new Date(zonedToday.getFullYear(), zonedToday.getMonth(), zonedToday.getDate());
  const dueMidnight = new Date(zonedDue.getFullYear(), zonedDue.getMonth(), zonedDue.getDate());

  const diffTime = dueMidnight.getTime() - todayMidnight.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const absDays = Math.abs(diffDays);
    return {
      status: "EXPIRED",
      daysDifference: diffDays,
      message: absDays === 1 ? "Venció ayer" : `Venció hace ${absDays} días`,
    };
  } else if (diffDays === 0) {
    return {
      status: "TODAY",
      daysDifference: 0,
      message: "Vence hoy",
    };
  } else if (diffDays === 1) {
    return {
      status: "TOMORROW",
      daysDifference: 1,
      message: "Vence mañana",
    };
  } else {
    return {
      status: "FUTURE",
      daysDifference: diffDays,
      message: `Vence en ${diffDays} días`,
    };
  }
}
