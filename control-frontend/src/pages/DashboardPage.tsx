import { useAuth } from "../auth/AuthContext";

export default function DashboardPage() {
    const { logout } = useAuth();

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
            <div className="text-center space-y-6">
                <h1 className="text-4xl font-bold">Dashboard</h1>
                <p>Login funcionando correctamente 🎉</p>

                <button
                    onClick={logout}
                    className="bg-red-500 px-6 py-3 rounded-xl hover:bg-red-600"
                >
                    Cerrar sesión
                </button>
            </div>
        </div>
    );
}