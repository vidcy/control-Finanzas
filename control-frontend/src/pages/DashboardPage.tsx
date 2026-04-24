import { useAuth } from "../context/AuthContext";

export default function DashboardPage() {

    const { logout } = useAuth(); // función logout

    return (
        <div className="p-10">
            <h1 className="text-3xl mb-5">Bienvenido 🎉</h1>

            <button
                onClick={logout}
                className="bg-red-500 text-white px-4 py-2 rounded"
            >
                Cerrar sesión
            </button>
        </div>
    );
}