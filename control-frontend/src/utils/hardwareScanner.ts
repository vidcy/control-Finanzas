/**
 * MOTOR DE ESCÁNER DE CÓDIGO DE BARRAS & QR POR HARDWARE (USB / BLUETOOTH HID)
 * Compatible con pistolas industriales Symbol (Motorola / Zebra), Datalogic, Honeywell,
 * lectores 1D y 2D, tanto si tienen configurado sufijo Enter como si no tienen sufijo.
 */

// Sonido de confirmación auditiva tipo caja de supermercado / retail pro
export const playScannerSound = (type: "success" | "error" = "success") => {
  try {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtxClass) return;
    const ctx = new AudioCtxClass();

    if (type === "success") {
      // Chime agudo y nítido (880Hz -> 1320Hz)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(987.77, ctx.currentTime); // B5
      osc.frequency.exponentialRampToValueAtTime(1318.51, ctx.currentTime + 0.08); // E6

      gain.gain.setValueAtTime(0.14, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } else {
      // Doble tono grave de advertencia
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(320, ctx.currentTime);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    }
  } catch (err) {
    console.debug("AudioContext no disponible o bloqueado:", err);
  }
};

export type BarcodeScanHandler = (code: string) => void;

/**
 * Escucha global ultra-rápida e inteligente para pistolas Symbol / Zebra / USB HID.
 * - Detecta ráfagas de caracteres a velocidad de pistola Symbol (< 75ms por caracter).
 * - Soporta pistolas con sufijo Enter, sufijo Tab, O SIN NINGÚN SUFIJO (mediante auto-flush por silencio de 70ms).
 * - Intercepta el código sin importar si el usuario tiene un input enfocado o no.
 */
export class HardwareScannerEngine {
  private static instance: HardwareScannerEngine | null = null;
  private listeners: Set<BarcodeScanHandler> = new Set();
  private buffer: string = "";
  private timestamps: number[] = [];
  private isListening: boolean = false;
  private flushTimer: any = null;
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

  public start() {
    if (this.isListening) return;
    // Escuchar en captura para interceptar antes de que otros listeners de formulario puedan alterarlo
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

  private handleKeyDown(e: KeyboardEvent) {
    // Teclas modificadoras solas no procesan
    if (["Shift", "Control", "Alt", "Meta", "CapsLock"].includes(e.key)) {
      return;
    }

    const now = Date.now();
    const lastTime = this.timestamps[this.timestamps.length - 1] || 0;
    const diff = now - lastTime;

    // Si ha pasado más de 180ms desde la tecla anterior, cancelar timer previo y reiniciar ráfaga
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    if (diff > 180 && this.buffer.length > 0) {
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

      // CASO C: AUTO-FLUSH PARA PISTOLAS SYMBOL SIN SUFIJO ENTER
      // Si ya hay al menos 3 caracteres y la velocidad media es alta (< 75ms por caracter):
      if (this.buffer.length >= 3) {
        const totalDuration = now - this.timestamps[0];
        const avgSpeed = totalDuration / this.buffer.length;

        // Si la velocidad promedio entre teclas es menor o igual a 75ms, es definitivamente un escáner Symbol
        if (avgSpeed <= 75) {
          // Programar un disparo en 70ms. Si no llega ningún caracter adicional, la lectura ha finalizado
          this.flushTimer = setTimeout(() => {
            this.triggerScan();
          }, 70);
        }
      }
    }
  }

  private triggerScan() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    const code = this.buffer.trim();
    this.buffer = "";
    this.timestamps = [];

    if (!code || code.length < 2) return;

    // Si un input tenía el foco mientras disparó la pistola, limpiar el texto inyectado
    const activeEl = document.activeElement;
    if (
      activeEl instanceof HTMLInputElement ||
      activeEl instanceof HTMLTextAreaElement
    ) {
      if (activeEl.value === code || activeEl.value.endsWith(code)) {
        activeEl.value = activeEl.value.slice(0, -code.length).trim();
        activeEl.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }

    this.lastScannedCode = code;
    this.lastScanTimestamp = Date.now();
    this.dispatchScan(code);
  }

  private dispatchScan(code: string) {
    if (!code) return;
    playScannerSound("success");

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
