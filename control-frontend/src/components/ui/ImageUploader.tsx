import React, { useState, useRef } from "react";
import {
  Upload,
  X,
  Loader2,
  Camera,
  ImageIcon,
  Download,
  Eye,
  FileText,
  CheckCircle2,
} from "lucide-react";
import axios from "../../services/axios";
import { toast } from "react-hot-toast";

interface ImageUploaderProps {
  onUploadSuccess: (url: string) => void;
  onClear: () => void;
  currentImageUrl?: string | null;
  label?: string;
}

// Utility: get the full absolute URL of a stored receipt
export function getReceiptAbsoluteUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("blob:")) return url;
  // relative like /uploads/filename.jpg → prepend backend origin
  const base = (import.meta.env.VITE_API_URL as string)?.replace("/api", "") || "";
  return `${base}${url}`;
}

export default function ImageUploader({
  onUploadSuccess,
  onClear,
  currentImageUrl,
  label = "Comprobante / Voucher",
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const absoluteUrl = getReceiptAbsoluteUrl(currentImageUrl);
  const isPdf = currentImageUrl?.toLowerCase().endsWith(".pdf");

  const uploadFile = async (file: File) => {
    if (file.size > 8 * 1024 * 1024) {
      toast.error("El archivo es demasiado grande (máximo 8MB)");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploading(true);
      const res = await axios.post("/upload/receipt", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const serverUrl: string = res.data.url;
      onUploadSuccess(serverUrl); // store relative URL, display with absolute
      toast.success("✅ Comprobante adjuntado");
    } catch (error) {
      toast.error("Error al subir el comprobante");
      console.error(error);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  const handleDownload = () => {
    if (!absoluteUrl) return;
    const link = document.createElement("a");
    link.href = absoluteUrl;
    link.download = `comprobante-${Date.now()}${isPdf ? ".pdf" : ".jpg"}`;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full">
      <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">
        📎 {label} <span className="text-gray-300 font-medium normal-case">(Opcional)</span>
      </label>

      {!currentImageUrl ? (
        <div className="flex flex-col gap-2">
          {/* Drop zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-28 border-2 border-dashed border-indigo-200 rounded-2xl flex flex-col items-center justify-center text-gray-400 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all cursor-pointer group"
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
                <span className="text-sm font-bold text-indigo-600">Subiendo...</span>
              </div>
            ) : (
              <>
                <Upload className="w-7 h-7 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-bold">Arrastra o haz clic para adjuntar</span>
                <span className="text-[10px] mt-0.5 opacity-60">PNG · JPG · PDF (máx. 8MB)</span>
              </>
            )}
          </div>

          {/* Camera button */}
          <button
            type="button"
            disabled={uploading}
            onClick={() => cameraInputRef.current?.click()}
            className="w-full py-2.5 border border-dashed border-violet-200 rounded-xl text-violet-600 hover:bg-violet-50 hover:border-violet-400 transition-all font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40"
          >
            <Camera className="w-4 h-4" />
            Tomar Foto con Cámara
          </button>

          {/* Hidden inputs */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,.pdf"
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
        /* ── Preview Card ── */
        <div className="relative w-full rounded-2xl border border-emerald-200 bg-emerald-50/30 overflow-hidden shadow-sm">
          {/* Status bar */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-emerald-100 bg-emerald-50">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-bold text-emerald-700 flex-1">Comprobante adjuntado</span>
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
                onClick={onClear}
                className="p-1.5 rounded-lg bg-rose-100 text-rose-600 hover:bg-rose-200 transition-colors"
                title="Quitar comprobante"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Thumbnail */}
          {isPdf ? (
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">Documento PDF</p>
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
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/10 transition-all">
                <Eye className="w-6 h-6 text-white opacity-0 hover:opacity-100 drop-shadow" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Lightbox / Full Preview Modal ── */}
      {preview && absoluteUrl && (
        <div
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setPreview(false)}
        >
          <div
            className="relative max-w-3xl w-full max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-indigo-500" />
                <span className="text-sm font-bold text-gray-700">Comprobante</span>
              </div>
              <div className="flex gap-2">
                <a
                  href={absoluteUrl}
                  download={`comprobante-${Date.now()}.jpg`}
                  className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Download className="w-3 h-3" /> Descargar
                </a>
                <button
                  onClick={() => setPreview(false)}
                  className="p-1.5 bg-gray-200 rounded-lg text-gray-600 hover:bg-gray-300 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            {/* Image */}
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
