/**
 * MOTOR DE ESCÁNER DE CÓDIGO DE BARRAS & QR POR HARDWARE (USB / BLUETOOTH HID)
 * Compatible con pistolas industriales Symbol (Motorola / Zebra), Datalogic, Honeywell,
 * lectores chinos USB, escáneres 1D/2D QR inalámbricos 2.4G y Bluetooth.
 */

import type { Product } from "../services/product.api";
import { cleanModelName } from "./seriesUtils";

// Sonido de confirmación auditiva tipo caja de supermercado / retail pro
export const playScannerSound = (type: "success" | "error" = "success") => {
  try {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtxClass) return;
    const ctx = new AudioCtxClass();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    if (type === "success") {
      // Chime agudo y nítido tipo supermercado (1760Hz -> A6)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1760, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.07);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else {
      // Doble tono grave de advertencia
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(280, ctx.currentTime);
      osc.frequency.setValueAtTime(190, ctx.currentTime + 0.09);

      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    }
  } catch (err) {
    console.debug("AudioContext no disponible o bloqueado:", err);
  }
};

/**
 * Sanitiza y limpia el código recibido de un lector de barras o QR:
 * - Elimina prefijos AIM symbology (ej: ]C1, ]Q1, ]e0, etc.)
 * - Elimina caracteres no imprimibles y espacios superfluos
 * - Parsea JSON si el QR contiene un payload de producto
 * - Extrae parámetros si el QR es una URL
 */
export function sanitizeBarcode(raw: string): string {
  if (!raw) return "";
  let clean = String(raw).trim();

  // 1. Remover caracteres de control ASCII invisibles (\x00-\x1F y \x7F)
  clean = clean.replace(/[\x00-\x1F\x7F]/g, "");

  // 2. Remover prefijos estándar AIM Symbology (ej: ]C1, ]Q1, ]e0, ]A0, etc.)
  if (/^\][a-zA-Z0-9]{2}/.test(clean)) {
    clean = clean.slice(3).trim();
  }

  // 3. Si es un QR con JSON (ej: {"barcode":"..."} o {"sku":"..."})
  if (clean.startsWith("{") && clean.endsWith("}")) {
    try {
      const parsed = JSON.parse(clean);
      if (parsed.barcode) return String(parsed.barcode).trim();
      if (parsed.sku) return String(parsed.sku).trim();
      if (parsed.code) return String(parsed.code).trim();
      if (parsed.id) return String(parsed.id).trim();
    } catch {
      // Ignorar error de parseo si no era JSON válido
    }
  }

  // 4. Si es una URL (ej: https://.../p/77512345 o ?code=77512345)
  if (clean.startsWith("http://") || clean.startsWith("https://")) {
    try {
      const url = new URL(clean);
      const codeParam =
        url.searchParams.get("code") ||
        url.searchParams.get("sku") ||
        url.searchParams.get("barcode") ||
        url.searchParams.get("id");
      if (codeParam) return codeParam.trim();
      const segments = url.pathname.split("/").filter(Boolean);
      if (segments.length > 0) return segments[segments.length - 1].trim();
    } catch {
      // No era URL estándar
    }
  }

  return clean;
}

/**
 * Limpia el texto que un escáner haya podido escribir accidentalmente en un input enfocado
 * asegurando la sincronización de estados reactivos en React.
 */
function cleanReactInput(el: HTMLElement, code: string) {
  if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return;
  const currentVal = el.value;
  if (!currentVal) return;

  if (currentVal === code || currentVal.endsWith(code)) {
    const newVal = currentVal.endsWith(code)
      ? currentVal.slice(0, -code.length).trim()
      : "";

    const nativeSetter =
      Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value"
      )?.set ||
      Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        "value"
      )?.set;

    if (nativeSetter) {
      nativeSetter.call(el, newVal);
    } else {
      el.value = newVal;
    }

    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

/**
 * Búsqueda inteligente universal de productos por código de barras o QR escaneado:
 * - Coincidencia exacta con barcode
 * - Coincidencia exacta con SKU
 * - Coincidencia con CustomCode (numérico directo o padded 4/6 dígitos)
 * - Coincidencia sin ceros a la izquierda
 * - Coincidencia con presentaciones
 * - Coincidencia con ID
 * - Coincidencia con series / variantes
 * - Fallback por prefijo de modelo
 */
export function findProductByBarcode(products: Product[], rawCode: string): Product | null {
  if (!rawCode || !products || products.length === 0) return null;
  const clean = sanitizeBarcode(rawCode).trim().toLowerCase();
  if (!clean) return null;

  // 1. Coincidencia exacta por barcode
  let match = products.find(
    (p) => p.barcode && String(p.barcode).trim().toLowerCase() === clean
  );
  if (match) return match;

  // 2. Coincidencia exacta por SKU
  match = products.find(
    (p) => p.sku && String(p.sku).trim().toLowerCase() === clean
  );
  if (match) return match;

  // 3. Coincidencia con Código Personalizado (customCode)
  match = products.find((p) => {
    if (p.customCode === undefined || p.customCode === null) return false;
    const str = String(p.customCode).trim().toLowerCase();
    return (
      str === clean ||
      str.padStart(4, "0") === clean ||
      str.padStart(6, "0") === clean
    );
  });
  if (match) return match;

  // 4. Coincidencia numérica sin ceros a la izquierda (ej: "077512" vs "77512")
  const unpadded = clean.replace(/^0+/, "");
  if (unpadded && unpadded !== clean) {
    match = products.find((p) => {
      const b = p.barcode ? String(p.barcode).trim().toLowerCase().replace(/^0+/, "") : "";
      const s = p.sku ? String(p.sku).trim().toLowerCase().replace(/^0+/, "") : "";
      const c = p.customCode !== undefined && p.customCode !== null ? String(p.customCode).trim() : "";
      return b === unpadded || s === unpadded || c === unpadded;
    });
    if (match) return match;
  }

  // 5. Coincidencia por ID de base de datos
  match = products.find((p) => p.id && p.id.toLowerCase() === clean);
  if (match) return match;

  // 6. Coincidencia en Presentaciones (por sku, code o barcode)
  match = products.find((p) =>
    p.presentations?.some((pres: any) => {
      const pSku = pres.sku ? String(pres.sku).trim().toLowerCase() : "";
      const pCode = pres.code ? String(pres.code).trim().toLowerCase() : "";
      const pBarcode = pres.barcode ? String(pres.barcode).trim().toLowerCase() : "";
      return pSku === clean || pCode === clean || pBarcode === clean;
    })
  );
  if (match) return match;

  // 7. Fallback: Prefijo de SKU o Nombre de Modelo
  const candidates = products.filter((p) => {
    const skuPrefix = p.sku && p.sku.trim().toLowerCase().startsWith(clean);
    const nameMatch = cleanModelName(p.name).toLowerCase() === clean;
    return skuPrefix || nameMatch;
  });
  if (candidates.length > 0) {
    return candidates.find((c) => (c.stock || 0) > 0) || candidates[0];
  }

  return null;
}

export type BarcodeScanHandler = (code: string) => void;

/**
 * Escucha global ultra-rápida e inteligente para pistolas Symbol / Zebra / USB HID.
 * - Detecta ráfagas de caracteres de lectores USB/Bluetooth (< 85ms por caracter).
 * - Soporta pistolas con sufijo Enter, sufijo Tab, O SIN NINGÚN SUFIJO (mediante auto-flush por silencio de 190ms).
 * - Intercepta y limpia de forma segura cualquier input enfocado.
 */
export class HardwareScannerEngine {
  private static instance: HardwareScannerEngine | null = null;
  private listeners: Set<BarcodeScanHandler> = new Set();
  private buffer: string = "";
  private timestamps: number[] = [];
  private isListening: boolean = false;
  private flushTimer: any = null;
  public sensitivityMs: number = 85;
  public idleAutoFlushMs: number = 190;
  public burstResetDiffMs: number = 350;
  public lastScannedCode: string = "";
  public lastScanTimestamp: number = 0;

  private constructor() {
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  public static getInstance(): HardwareScannerEngine {
    if (!HardwareScannerEngine.instance) {
      HardwareScannerEngine.instance = new HardwareScannerEngine();
    }
    return HardwareScannerEngine.instance;
  }

  public setSensitivity(ms: number) {
    if (ms > 10 && ms < 300) {
      this.sensitivityMs = ms;
    }
  }

  public setIdleAutoFlush(ms: number) {
    if (ms >= 100 && ms <= 500) {
      this.idleAutoFlushMs = ms;
    }
  }

  public start() {
    if (this.isListening) return;
    window.addEventListener("keydown", this.handleKeyDown, true);
    this.isListening = true;
  }

  public stop() {
    if (!this.isListening) return;
    window.removeEventListener("keydown", this.handleKeyDown, true);
    this.isListening = false;
  }

  public subscribe(handler: BarcodeScanHandler): () => void {
    this.listeners.add(handler);
    this.start();
    return () => {
      this.listeners.delete(handler);
    };
  }

  public simulateScan(code: string) {
    const clean = sanitizeBarcode(code);
    if (!clean) return;
    this.lastScannedCode = clean;
    this.lastScanTimestamp = Date.now();
    this.dispatchScan(clean);
  }

  private handleKeyDown(e: KeyboardEvent) {
    // Ignorar teclas modificadoras solas
    if (["Shift", "Control", "Alt", "Meta", "CapsLock"].includes(e.key)) {
      return;
    }

    const now = Date.now();
    const lastTime = this.timestamps[this.timestamps.length - 1] || 0;
    const diff = lastTime === 0 ? 0 : now - lastTime;

    // Si ha pasado más de 350ms desde la tecla anterior, es una interacción distinta -> reiniciar buffer
    if (diff > this.burstResetDiffMs && this.buffer.length > 0) {
      if (this.flushTimer) {
        clearTimeout(this.flushTimer);
        this.flushTimer = null;
      }
      this.buffer = "";
      this.timestamps = [];
    }

    // ── CASO A: Sufijo explícito recibido (ENTER o TAB) ──
    if (e.key === "Enter" || e.key === "Tab") {
      if (this.buffer.length >= 2) {
        e.preventDefault();
        e.stopPropagation();
        this.triggerScan();
        return;
      }
      this.buffer = "";
      this.timestamps = [];
      return;
    }

    // ── CASO B: Caracter imprimible recibido ──
    if (e.key.length === 1) {
      this.buffer += e.key;
      this.timestamps.push(now);

      if (this.flushTimer) {
        clearTimeout(this.flushTimer);
        this.flushTimer = null;
      }

      // CASO C: AUTO-FLUSH PARA LECTORES SIN SUFIJO ENTER
      // Si hay al menos 3 caracteres y la velocidad media es alta (< sensitivityMs)
      if (this.buffer.length >= 3) {
        const totalDuration = now - this.timestamps[0];
        const avgSpeed = totalDuration / this.buffer.length;

        if (avgSpeed <= this.sensitivityMs) {
          // Esperar un silencio prudente de 190ms antes de disparar
          this.flushTimer = setTimeout(() => {
            this.triggerScan();
          }, this.idleAutoFlushMs);
        }
      }
    }
  }

  private triggerScan() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    const rawCode = this.buffer;
    this.buffer = "";
    this.timestamps = [];

    const cleanCode = sanitizeBarcode(rawCode);
    if (!cleanCode || cleanCode.length < 2) return;

    // Limpiar input si estaba enfocado
    const activeEl = document.activeElement;
    if (activeEl instanceof HTMLElement) {
      cleanReactInput(activeEl, rawCode);
      cleanReactInput(activeEl, cleanCode);
    }

    this.lastScannedCode = cleanCode;
    this.lastScanTimestamp = Date.now();
    this.dispatchScan(cleanCode);
  }

  private dispatchScan(code: string) {
    if (!code) return;

    // Notificar a todos los escuchas registrados
    this.listeners.forEach((listener) => {
      try {
        listener(code);
      } catch (err) {
        console.error("Error en listener de escáner:", err);
      }
    });

    // Notificar evento global en window
    window.dispatchEvent(
      new CustomEvent("hardware-barcode-scan", {
        detail: { code },
      })
    );
  }
}

export const hardwareScanner = HardwareScannerEngine.getInstance();
