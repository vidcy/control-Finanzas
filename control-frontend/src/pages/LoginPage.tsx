import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {

    const { login } = useAuth(); // función login global
    const navigate = useNavigate(); // navegación entre páginas

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    // submit del formulario
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        console.log("Intentando login...");

        const success = await login(email, password);

        // 👇 SOLO NAVEGA SI LOGIN ES CORRECTO
        if (success) {
            console.log("Login correcto → dashboard");
            navigate("/dashboard");
        } else {
            console.log("Login incorrecto");
            setError("Credenciales incorrectas");
        }
    };

    return (
        <div className="h-screen flex items-center justify-center bg-gradient-to-r from-indigo-500 to-purple-600">
            <form
                onSubmit={handleSubmit}
                className="bg-white p-10 rounded-2xl w-96 shadow-2xl space-y-5"
            >
                <h1 className="text-3xl font-bold text-center">Bienvenido</h1>

                {error && <p className="text-red-500">{error}</p>}

                <input
                    type="email"
                    placeholder="Correo"
                    className="w-full p-3 border rounded-lg"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />

                <input
                    type="password"
                    placeholder="Contraseña"
                    className="w-full p-3 border rounded-lg"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                <button className="w-full bg-indigo-600 text-white p-3 rounded-lg hover:bg-indigo-700 transition">
                    Iniciar sesión
                </button>
            </form>
        </div>
    );
}