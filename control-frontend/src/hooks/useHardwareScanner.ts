import { useEffect, useRef } from "react";
import { hardwareScanner, type BarcodeScanHandler } from "../utils/hardwareScanner";

/**
 * Hook para escuchar códigos de barra / QR escaneados por pistolas o lectores físicos.
 * @param onScan Callback invocado cuando se detecta un código válido
 * @param enabled Permite encender o apagar la escucha
 * @param options Opciones adicionales como sensibilidad en ms
 */
export function useHardwareScanner(
  onScan: BarcodeScanHandler,
  enabled: boolean = true,
  options?: { sensitivity?: number; idleTimeout?: number }
) {
  const handlerRef = useRef(onScan);

  useEffect(() => {
    handlerRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (options?.sensitivity) {
      hardwareScanner.setSensitivity(options.sensitivity);
    }
    if (options?.idleTimeout) {
      hardwareScanner.setIdleAutoFlush(options.idleTimeout);
    }
  }, [options?.sensitivity, options?.idleTimeout]);

  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = hardwareScanner.subscribe((code) => {
      if (handlerRef.current) {
        handlerRef.current(code);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [enabled]);
}
