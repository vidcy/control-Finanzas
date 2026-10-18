import { useEffect, useRef } from "react";
import { hardwareScanner, type BarcodeScanHandler } from "../utils/hardwareScanner";

/**
 * Hook para escuchar códigos de barra / QR escaneados por pistolas o lectores físicos.
 * @param onScan Callback invocado cuando se detecta un código válido
 * @param enabled Permite encender o apagar la escucha
 */
export function useHardwareScanner(
  onScan: BarcodeScanHandler,
  enabled: boolean = true
) {
  const handlerRef = useRef(onScan);

  useEffect(() => {
    handlerRef.current = onScan;
  }, [onScan]);

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
