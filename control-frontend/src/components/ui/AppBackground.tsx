export default function AppBackground({ children }: any) {
    return (
        <div className="min-h-screen relative overflow-hidden bg-gray-50">

            {/* 🔵 BLOBS DECORATIVOS */}
            <div className="absolute top-[-100px] left-[-100px] w-[300px] h-[300px] bg-blue-400/30 rounded-full blur-3xl"></div>

            <div className="absolute bottom-[-120px] right-[-120px] w-[350px] h-[350px] bg-indigo-400/30 rounded-full blur-3xl"></div>

            <div className="absolute top-[40%] left-[60%] w-[250px] h-[250px] bg-purple-300/20 rounded-full blur-3xl"></div>

            {/* 🌫️ GRADIENT OVERLAY SUAVE */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-gray-50 to-blue-50/40"></div>

            {/* 📦 CONTENIDO */}
            <div className="relative z-10">{children}</div>
        </div>
    );
}