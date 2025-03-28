import express from "express"
import cors from "cors"
import helmet from "helmet"
import morgan from "morgan"
import dotenv from "dotenv"
import { testConnection } from "./config/supabase"
import { errorHandler, notFound } from "./middleware/error.middleware"

// Importar rutas
import authRoutes from "./routes/auth.routes"
import adminRoutes from "./routes/admin.routes"
import technicianRoutes from "./routes/technician.routes"
import clientRoutes from "./routes/client.routes"
import notificationRoutes from "./routes/notification.routes"

// Configurar variables de entorno
dotenv.config()

// Crear aplicación Express
const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(cors())
app.use(helmet())
app.use(morgan("dev"))
app.use(express.json({ limit: "50mb" }))
app.use(express.urlencoded({ extended: true, limit: "50mb" }))

// Rutas
app.use("/api/auth", authRoutes)
app.use("/api/admin", adminRoutes)
app.use("/api/technician", technicianRoutes)
app.use("/api/client", clientRoutes)
app.use("/api/notifications", notificationRoutes)

// Ruta de prueba
app.get("/", (req, res) => {
  res.json({
    message: "API de TeslaLift funcionando correctamente",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  })
})

// Middleware para manejar rutas no encontradas
app.use(notFound)

// Middleware para manejar errores
app.use(errorHandler)

// Iniciar servidor
const startServer = async () => {
  try {
    // Probar conexión a Supabase
    const connected = await testConnection()

    if (!connected) {
      console.warn(
        "Advertencia: No se pudo conectar a Supabase o verificar las tablas. La aplicación continuará, pero algunas funciones pueden no estar disponibles.",
      )
    }

    app.listen(PORT, () => {
      console.log(`Servidor ejecutándose en el puerto ${PORT}`)
      console.log(`Entorno: ${process.env.NODE_ENV || "development"}`)
    })
  } catch (error) {
    console.error("Error al iniciar el servidor:", error)
    process.exit(1)
  }
}

startServer()

export default app

