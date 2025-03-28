import winston from "winston"
import path from "path"

// Definir niveles de log
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
}

// Definir colores para cada nivel
const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "white",
}

// Añadir colores a winston
winston.addColors(colors)

// Definir formato para los logs
const format = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`),
)

// Definir transportes para los logs
const transports = [
  // Logs de consola
  new winston.transports.Console(),
  // Logs de error en archivo
  new winston.transports.File({
    filename: path.join("logs", "error.log"),
    level: "error",
  }),
  // Todos los logs en archivo
  new winston.transports.File({ filename: path.join("logs", "all.log") }),
]

// Crear logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === "development" ? "debug" : "info",
  levels,
  format,
  transports,
})

export default logger

