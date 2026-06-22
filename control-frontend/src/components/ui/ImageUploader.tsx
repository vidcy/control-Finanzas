import React, { useState, useRef } from "react";
import {
  Upload,
  X,
  Camera,
  ImageIcon,
  Download,
  Eye,
  FileText,
  CheckCircle2,
} from "lucide-react";
import axios from "../../services/axios";
import { toast } from "react-hot-toast";

// ─────────────────────────────────────────────────────────
// Utility: resolve a stored URL to a fully qualified absolute URL
// Handles: http:// → pass through | /uploads/... → prepend backend base
// ─────────────────────────────────────────────────────────
export function getReceiptAbsoluteUrl(
  url: string | null | undefined,
): string | null {
  if (!url) return null;

  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("blob:")
  ) {
    return url;
  }

  const base =
    (import.meta.env.VITE_API_URL as string)?.replace("/api", "") ||
    "http://localhost:3000";
  return `${base}${url}`;
}

// ─────────────────────────────────────────────────────────
// Helpers: Deferred upload execution functions
// ─────────────────────────────────────────────────────────
export const uploadReceiptFile = async (file: File): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    const res = await axios.post("/upload/receipt", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.url;
  } catch (error: any) {
    throw new Error(error?.response?.data?.message || "Error al subir el comprobante");
  }
};

export const uploadProductImageFile = async (file: File): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    const res = await axios.post("/upload/product-image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.url;
  } catch (error: any) {
    throw new Error(error?.response?.data?.message || "Error al subir la imagen del producto");
  }
};

// ─────────────────────────────────────────────────────────
// ProductImageUploader — ONLY for product photos (no PDF)
// ─────────────────────────────────────────────────────────
interface ProductImageUploaderProps {
  currentImageUrl?: string | File | null;
  onUploadSuccess: (fileOrUrl: string | File) => void;
  onClear: () => void;
}

export function ProductImageUploader({
  currentImageUrl,
  onUploadSuccess,
  onClear,
}: ProductImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const isFile = currentImageUrl instanceof File;
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  React.useEffect(() => {
    if (isFile) {
      const url = URL.createObjectURL(currentImageUrl as File);
      setObjectUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setObjectUrl(null);
    }
  }, [currentImageUrl, isFile]);

  const absoluteUrl = isFile
    ? objectUrl
    : getReceiptAbsoluteUrl(currentImageUrl as string | null | undefined);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("La imagen es demasiado grande (máximo 5MB)");
        return;
      }
      onUploadSuccess(file);
    }
  };

  const handleClear = () => {
    onClear();
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  if (currentImageUrl && absoluteUrl) {
    return (
      <div className="relative">
        <img
          src={absoluteUrl}
          alt="Imagen del producto"
          className="w-full h-40 object-cover rounded-xl border border-indigo-200"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23f3f4f6' width='100' height='100'/%3E%3Ctext fill='%23aaa' x='50%25' y='55%25' text-anchor='middle' font-size='12'%3ESin imagen%3C/text%3E%3C/svg%3E";
          }}
        />
        <button
          type="button"
          onClick={handleClear}
          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors shadow-md"
          title="Quitar imagen"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        onClick={() => fileInputRef.current?.click()}
        className="w-full h-32 border-2 border-dashed border-indigo-200 rounded-xl flex flex-col items-center justify-center text-gray-400 transition-all cursor-pointer hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/50"
      >
        <ImageIcon className="w-7 h-7 mb-1" />
        <span className="text-sm font-bold">Sube una foto del producto</span>
        <span className="text-[10px] mt-0.5 opacity-60">
          JPG · PNG · WEBP (máx. 5MB)
        </span>
      </div>

      <button
        type="button"
        onClick={() => cameraInputRef.current?.click()}
        className="w-full py-2 border border-dashed border-violet-200 rounded-xl text-violet-600 hover:bg-violet-50 hover:border-violet-400 transition-all font-bold text-sm flex items-center justify-center gap-2"
      >
        <Camera className="w-4 h-4" />
        Tomar foto con cámara
      </button>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
      />
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handleFileSelect}
        className="hidden"
        accept="image/*"
        capture="environment"
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// ReceiptUploader — for payment receipts/comprobantes (image or PDF)
// ─────────────────────────────────────────────────────────
interface ReceiptUploaderProps {
  currentImageUrl?: string | File | null;
  onUploadSuccess: (fileOrUrl: string | File) => void;
  onClear: () => void;
  label?: string;
}

export default function ReceiptUploader({
  currentImageUrl,
  onUploadSuccess,
  onClear,
  label = "Comprobante / Voucher",
}: ReceiptUploaderProps) {
  const [preview, setPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const isFile = currentImageUrl instanceof File;
  const isPdf = isFile
    ? (currentImageUrl as File).type === "application/pdf" ||
      (currentImageUrl as File).name.toLowerCase().endsWith(".pdf")
    : (currentImageUrl as string)?.toLowerCase().endsWith(".pdf");

  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  React.useEffect(() => {
    if (isFile) {
      const url = URL.createObjectURL(currentImageUrl as File);
      setObjectUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setObjectUrl(null);
    }
  }, [currentImageUrl, isFile]);

  const absoluteUrl = isFile
    ? objectUrl
    : getReceiptAbsoluteUrl(currentImageUrl as string | null | undefined);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        toast.error("El archivo es demasiado grande (máximo 8MB)");
        return;
      }
      onUploadSuccess(file);
    }
  };

  const handleDownload = () => {
    if (!absoluteUrl) return;
    const link = document.createElement("a");
    link.href = absoluteUrl;
    link.download = isFile
      ? (currentImageUrl as File).name
      : `comprobante-${Date.now()}${isPdf ? ".pdf" : ".jpg"}`;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClear = () => {
    onClear();
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  return (
    <div className="w-full">
      <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">
        📎 {label}{" "}
        <span className="text-gray-300 font-medium normal-case">
          (Opcional)
        </span>
      </label>

      {!currentImageUrl ? (
        <div className="flex flex-col gap-2">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-28 border-2 border-dashed border-indigo-200 rounded-2xl flex flex-col items-center justify-center text-gray-400 transition-all cursor-pointer hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/50"
          >
            <Upload className="w-7 h-7 mb-1" />
            <span className="text-sm font-bold">
              Arrastra o haz clic para adjuntar
            </span>
            <span className="text-[10px] mt-0.5 opacity-60">
              PNG · JPG · PDF (máx. 8MB)
            </span>
          </div>

          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="w-full py-2.5 border border-dashed border-violet-200 rounded-xl text-violet-600 hover:bg-violet-50 hover:border-violet-400 transition-all font-bold text-sm flex items-center justify-center gap-2"
          >
            <Camera className="w-4 h-4" />
            Tomar Foto con Cámara
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp,application/pdf,.pdf"
          />
          <input
            type="file"
            ref={cameraInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*"
            capture="environment"
          />
        </div>
      ) : (
        <div className="relative w-full rounded-2xl border border-emerald-200 bg-emerald-50/30 overflow-hidden shadow-sm">
          <div className="flex items-center gap-2 px-4 py-2 border-b border-emerald-100 bg-emerald-50">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-bold text-emerald-700 flex-1">
              {isFile ? "Archivo seleccionado (Local)" : "Comprobante guardado"}
            </span>
            <div className="flex gap-1">
              {!isPdf && (
                <button
                  type="button"
                  onClick={() => setPreview(true)}
                  className="p-1.5 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                  title="Ver imagen"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={handleDownload}
                className="p-1.5 rounded-lg bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition-colors"
                title="Descargar"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="p-1.5 rounded-lg bg-rose-100 text-rose-600 hover:bg-rose-200 transition-colors"
                title="Quitar comprobante"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {isPdf ? (
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800 truncate max-w-[200px]">
                  {isFile ? (currentImageUrl as File).name : "Documento PDF"}
                </p>
                <a
                  href={absoluteUrl || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-indigo-600 hover:underline font-medium"
                >
                  Abrir en nueva pestaña
                </a>
              </div>
            </div>
          ) : (
            <div
              className="relative h-32 cursor-pointer"
              onClick={() => setPreview(true)}
            >
              <img
                src={absoluteUrl || ""}
                alt="Comprobante"
                className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Lightbox */}
      {preview && absoluteUrl && (
        <div
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setPreview(false)}
        >
          <div
            className="relative max-w-3xl w-full max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-indigo-500" />
                <span className="text-sm font-bold text-gray-700">
                  Comprobante
                </span>
              </div>
              <button
                onClick={() => setPreview(false)}
                className="p-1.5 bg-gray-200 rounded-lg text-gray-600 hover:bg-gray-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-auto max-h-[80vh] flex items-center justify-center bg-gray-100 p-4">
              <img
                src={absoluteUrl}
                alt="Comprobante completo"
                className="max-w-full max-h-full rounded-lg object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Re-export for backward compat (old code using `import ImageUploader`)
/** @deprecated Use ReceiptUploader for receipts, ProductImageUploader for product photos */
export { ReceiptUploader as ImageUploader };
