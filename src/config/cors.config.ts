import type cors from "cors"
import dotenv from "dotenv"

dotenv.config()

// Configuración de CORS
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Lista de orígenes permitidos
    const allowedOrigins = [
      "http://localhost:3000",
      "http://localhost:5173",
      "https://teslaLift.vercel.app",
      // Añadir más orígenes según sea necesario
    ]

    // Permitir solicitudes sin origen (como aplicaciones móviles o Postman)
    if (!origin) {
      return callback(null, true)
    }

    // Verificar si el origen está en la lista de permitidos
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === "development") {
      callback(null, true)
    } else {
      callback(new Error("No permitido por CORS"))
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  exposedHeaders: ["Content-Range", "X-Content-Range"],
  maxAge: 86400, // 24 horas en segundos
}

export default corsOptions

