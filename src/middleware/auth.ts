import type { Request, Response, NextFunction } from "express"
import { supabase } from "../config/supabase"
import { type UserRole, UserStatus } from "../config/constants"
import * as jwt from "jsonwebtoken"
import dotenv from "dotenv"

dotenv.config()

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_here"

// Definir tipo para el usuario en la request
declare global {
  namespace Express {
    interface Request {
      user?: any
      token?: string
    }
  }
}

// Middleware para autenticar token JWT
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Obtener token del header
    const token = req.header("Authorization")?.replace("Bearer ", "")

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No se proporcionó token de autenticación",
      })
    }

    // Verificar token
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
      req.user = { id: decoded.userId }
      req.token = token
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Token inválido",
      })
    }

    // Obtener información del usuario desde Supabase
    const { data: user, error } = await supabase.from("users").select("*").eq("id", req.user.id).single()

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: "Usuario no encontrado",
      })
    }

    // Adjuntar información del usuario a la request
    req.user = user
    next()
  } catch (error) {
    console.error("Error en autenticación:", error)
    return res.status(500).json({
      success: false,
      message: "Error en el servidor durante la autenticación",
    })
  }
}

// Middleware para autorizar roles
export const authorize = (roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Usuario no autenticado",
      })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "No tiene permisos para acceder a este recurso",
      })
    }

    next()
  }
}

// Middleware para verificar si el usuario está activo
export const isActive = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Usuario no autenticado",
    })
  }

  if (req.user.status !== UserStatus.ACTIVE) {
    return res.status(403).json({
      success: false,
      message: "Su cuenta no está activa. Contacte al administrador.",
    })
  }

  next()
}

