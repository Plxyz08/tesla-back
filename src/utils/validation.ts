import type { Request, Response, NextFunction } from "express"
import { validationResult, type ValidationChain } from "express-validator"

// Middleware para validar los resultados de express-validator
export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Ejecutar todas las validaciones
    await Promise.all(validations.map((validation) => validation.run(req)))

    // Verificar si hay errores
    const errors = validationResult(req)
    if (errors.isEmpty()) {
      return next()
    }

    // Si hay errores, devolver respuesta con errores
    return res.status(400).json({
      success: false,
      message: "Error de validación",
      errors: errors.array(),
    })
  }
}

// Función para validar formato de email
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Función para validar contraseña fuerte
export const isStrongPassword = (password: string): boolean => {
  // Al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
  return passwordRegex.test(password)
}

// Función para validar formato de fecha (YYYY-MM-DD)
export const isValidDate = (date: string): boolean => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(date)) return false

  const d = new Date(date)
  return d instanceof Date && !isNaN(d.getTime())
}

// Función para validar formato de hora (HH:MM)
export const isValidTime = (time: string): boolean => {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/
  return timeRegex.test(time)
}

// Función para validar RUC peruano
export const isValidRUC = (ruc: string): boolean => {
  // RUC peruano: 11 dígitos
  const rucRegex = /^[0-9]{11}$/
  return rucRegex.test(ruc)
}

// Función para validar número de teléfono peruano
export const isValidPhone = (phone: string): boolean => {
  // Teléfono peruano: 9 dígitos, comienza con 9
  const phoneRegex = /^9\d{8}$/
  return phoneRegex.test(phone)
}

