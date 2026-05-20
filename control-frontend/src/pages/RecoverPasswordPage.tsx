import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Mail,
  Lock,
  ArrowLeft,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  forgotPasswordRequest,
  resetPasswordRequest,
} from "../services/auth.api";

type RecoverStep = "EMAIL" | "SUCCESS" | "RESET" | "DONE";

export default function RecoverPasswordPage() {
  const [step, setStep] = useState<RecoverStep>("EMAIL");
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [email, setEmail] = useState("");
  const [newPassword, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  useEffect(() => {
    if (token && step === "EMAIL") {
      setStep("RESET");
    }
  }, [token]);

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simular petición al backend
    try {
      await forgotPasswordRequest(email);
      toast.success("Enlace de recuperación enviado");
      setStep("SUCCESS");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error al enviar el correo";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Esto simularía que el usuario hizo click en el enlace de su correo
  /*const simulateEmailLinkClick = () => {
        setStep("RESET");
    };*/

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    setIsLoading(true);
    try {
      await resetPasswordRequest(token, newPassword);
      toast.success("Contraseña restablecida exitosamente");
      setStep("DONE");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error al restablecer la contraseña";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
    // Simular petición al backend
    /*setTimeout(() => {
            setIsLoading(false);
            setStep("DONE");
        }, 1500);*/
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] font-sans relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-blue-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-40 animate-blob"></div>
        <div className="absolute top-[20%] right-[-10%] w-[250px] md:w-[400px] h-[250px] md:h-[400px] bg-purple-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-40 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-10%] left-[20%] w-[350px] md:w-[600px] h-[350px] md:h-[600px] bg-emerald-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-40 animate-blob animation-delay-4000"></div>
      </div>

      <div className="w-full max-w-md p-5 sm:p-8 relative z-10 animate-fade-in-up">
        {/* BRAND */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 mb-4">
            <TrendingUp className="text-white w-7 h-7" />
          </div>
        </div>

        {/* CARD */}
        <div className="bg-white/70 backdrop-blur-2xl p-6 sm:p-8 rounded-3xl shadow-[0_8px_40px_rgb(0,0,0,0.08)] border border-white/50 relative overflow-hidden">
          {/* PROGRESS BAR (optional visual touch) */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gray-100">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500 ease-out"
              style={{
                width:
                  step === "EMAIL"
                    ? "25%"
                    : step === "SUCCESS"
                      ? "50%"
                      : step === "RESET"
                        ? "75%"
                        : "100%",
              }}
            ></div>
          </div>

          {/* STEPS */}
          {step === "EMAIL" && (
            <div className="animate-fade-in-up">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Recuperar Contraseña
              </h2>
              <p className="text-gray-500 text-sm mb-6">
                Ingresa el correo electrónico asociado a tu cuenta y te
                enviaremos instrucciones para restablecer tu contraseña.
              </p>
              <form onSubmit={handleSendEmail} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Correo Electrónico
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                    </div>
                    <input
                      type="email"
                      required
                      className="w-full pl-11 pr-4 py-3.5 bg-white/50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder-gray-400"
                      placeholder="tu@correo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isLoading || !email}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3.5 px-4 rounded-2xl font-semibold shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>Enviar instrucciones</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {step === "SUCCESS" && (
            <div className="animate-fade-in-up text-center py-4">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-500">
                <Mail className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                ¡Revisa tu correo!
              </h2>
              <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                Hemos enviado un enlace de recuperación a <br />
                <span className="font-semibold text-gray-800">
                  {email}
                </span>. <br />
                Por favor, revisa tu bandeja de entrada o la carpeta de spam.
              </p>
            </div>
          )}

          {step === "RESET" && (
            <div className="animate-fade-in-up">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Crear nueva contraseña
              </h2>
              <p className="text-gray-500 text-sm mb-6">
                Tu nueva contraseña debe ser diferente a las utilizadas
                anteriormente.
              </p>
              <form onSubmit={handleResetPassword} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nueva Contraseña
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                    </div>
                    <input
                      type="password"
                      required
                      className="w-full pl-11 pr-4 py-3.5 bg-white/50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder-gray-400"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Confirmar Contraseña
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <ShieldCheck className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                    </div>
                    <input
                      type="password"
                      required
                      className="w-full pl-11 pr-4 py-3.5 bg-white/50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder-gray-400"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isLoading || !newPassword || !confirmPassword}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3.5 px-4 rounded-2xl font-semibold shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none mt-2"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>Restablecer Contraseña</span>
                      <CheckCircle2 className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {step === "DONE" && (
            <div className="animate-fade-in-up text-center py-4">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-500">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                ¡Contraseña Actualizada!
              </h2>
              <p className="text-gray-500 text-sm mb-8">
                Tu contraseña ha sido restablecida exitosamente. Ahora puedes
                iniciar sesión con tu nueva contraseña.
              </p>
              <Link
                to="/login"
                className="w-full inline-flex bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3.5 px-4 rounded-2xl font-semibold shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-0.5 transition-all duration-300 items-center justify-center gap-2"
              >
                <span>Ir a Iniciar Sesión</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          )}
        </div>

        {/* BACK LINK */}
        {(step === "EMAIL" || step === "SUCCESS" || step === "RESET") && (
          <div className="mt-8 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al inicio de sesión
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
