import type { Request, Response } from "express"
import { supabase } from "../config/supabase"
import { UserRole, UserStatus } from "../config/constants"
import type { User } from "../models/types"
import jwt from "jsonwebtoken"
import type { SignOptions } from "jsonwebtoken"
import dotenv from "dotenv"

dotenv.config()

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_here"
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ? parseInt(process.env.JWT_EXPIRES_IN, 10) || process.env.JWT_EXPIRES_IN : "7d"

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email y contraseña son requeridos",
      })
    }

    // Autenticar con Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return res.status(401).json({
        success: false,
        message: "Credenciales inválidas",
      })
    }

    // Obtener información adicional del usuario
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", data.user.id)
      .single()

    if (userError || !userData) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      })
    }

    // Verificar si el usuario está activo
    if (userData.status !== UserStatus.ACTIVE) {
      return res.status(403).json({
        success: false,
        message: "Su cuenta no está activa. Contacte al administrador.",
      })
    }

    // Generar token JWT
    const options: SignOptions = { expiresIn: JWT_EXPIRES_IN as SignOptions['expiresIn'] }
    const token = jwt.sign({ userId: userData.id, role: userData.role }, JWT_SECRET, options)

    // Eliminar la contraseña del objeto de usuario
    const { password: _, ...userWithoutPassword } = userData

    return res.status(200).json({
      success: true,
      message: "Inicio de sesión exitoso",
      data: {
        user: userWithoutPassword,
        token,
      },
    })
  } catch (error) {
    console.error("Error en login:", error)
    return res.status(500).json({
      success: false,
      message: "Error en el servidor durante el inicio de sesión",
    })
  }
}

export const logout = async (req: Request, res: Response) => {
  try {
    // Cerrar sesión en Supabase
    const { error } = await supabase.auth.signOut()

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Error al cerrar sesión",
      })
    }

    return res.status(200).json({
      success: true,
      message: "Sesión cerrada exitosamente",
    })
  } catch (error) {
    console.error("Error en logout:", error)
    return res.status(500).json({
      success: false,
      message: "Error en el servidor durante el cierre de sesión",
    })
  }
}

export const getProfile = async (req: Request, res: Response) => {
  try {
    // El usuario ya está disponible en req.user gracias al middleware de autenticación
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Usuario no autenticado",
      })
    }

    // Eliminar la contraseña del objeto de usuario
    const { password: _, ...userWithoutPassword } = req.user

    return res.status(200).json({
      success: true,
      data: userWithoutPassword,
    })
  } catch (error) {
    console.error("Error al obtener perfil:", error)
    return res.status(500).json({
      success: false,
      message: "Error en el servidor al obtener el perfil",
    })
  }
}

export const updateProfile = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Usuario no autenticado",
      })
    }

    const userId = req.user.id
    const { name, phone, profile_image } = req.body

    // Actualizar solo los campos permitidos
    const updateData: Partial<User> = {}
    if (name) updateData.name = name
    if (phone) updateData.phone = phone
    if (profile_image) updateData.profile_image = profile_image

    // Añadir timestamp de actualización
    updateData.updated_at = new Date().toISOString()

    // Actualizar en Supabase
    const { data, error } = await supabase.from("users").update(updateData).eq("id", userId).select().single()

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Error al actualizar el perfil",
        error: error.message,
      })
    }

    // Eliminar la contraseña del objeto de usuario
    const { password: _, ...userWithoutPassword } = data

    return res.status(200).json({
      success: true,
      message: "Perfil actualizado exitosamente",
      data: userWithoutPassword,
    })
  } catch (error) {
    console.error("Error al actualizar perfil:", error)
    return res.status(500).json({
      success: false,
      message: "Error en el servidor al actualizar el perfil",
    })
  }
}

export const changePassword = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Usuario no autenticado",
      })
    }

    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "La contraseña actual y la nueva son requeridas",
      })
    }

    // Verificar la contraseña actual
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: req.user.email,
      password: currentPassword,
    })

    if (authError || !authData.user) {
      return res.status(401).json({
        success: false,
        message: "Contraseña actual incorrecta",
      })
    }

    // Cambiar la contraseña
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Error al cambiar la contraseña",
        error: error.message,
      })
    }

    return res.status(200).json({
      success: true,
      message: "Contraseña cambiada exitosamente",
    })
  } catch (error) {
    console.error("Error al cambiar contraseña:", error)
    return res.status(500).json({
      success: false,
      message: "Error en el servidor al cambiar la contraseña",
    })
  }
}

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name, role, phone } = req.body

    // Validar datos requeridos
    if (!email || !password || !name || !role) {
      return res.status(400).json({
        success: false,
        message: "Email, contraseña, nombre y rol son requeridos",
      })
    }

    // Validar rol
    if (!Object.values(UserRole).includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Rol inválido",
      })
    }

    // Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role,
        },
      },
    })

    if (authError) {
      return res.status(400).json({
        success: false,
        message: "Error al crear el usuario",
        error: authError.message,
      })
    }

    // Crear registro en la tabla users
    const { data: userData, error: userError } = await supabase
      .from("users")
      .insert({
        id: authData.user?.id,
        email,
        name,
        role,
        status: UserStatus.PENDING,
        phone,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (userError) {
      // Rollback: eliminar usuario de Auth si falla la inserción en la tabla users
      await supabase.auth.admin.deleteUser(authData.user?.id || "")

      return res.status(500).json({
        success: false,
        message: "Error al crear el registro del usuario",
        error: userError.message,
      })
    }

    // Generar token JWT
    const options: SignOptions = { expiresIn: JWT_EXPIRES_IN as SignOptions['expiresIn'] }
    const token = jwt.sign({ userId: userData.id, role: userData.role }, JWT_SECRET, options)

    // Eliminar la contraseña del objeto de usuario
    const { password: _, ...userWithoutPassword } = userData

    return res.status(201).json({
      success: true,
      message: "Usuario registrado exitosamente",
      data: {
        user: userWithoutPassword,
        token,
      },
    })
  } catch (error) {
    console.error("Error en registro:", error)
    return res.status(500).json({
      success: false,
      message: "Error en el servidor durante el registro",
    })
  }
}

