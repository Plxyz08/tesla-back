import type { Request, Response, NextFunction } from "express"
import { body, param, query, validationResult } from "express-validator"

// Middleware para validar resultados
export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Error de validación",
      errors: errors.array(),
    })
  }
  next()
}

// Validaciones para autenticación
export const loginValidation = [
  body("email").isEmail().withMessage("Email inválido"),
  body("password").isLength({ min: 6 }).withMessage("La contraseña debe tener al menos 6 caracteres"),
]

export const registerValidation = [
  body("email").isEmail().withMessage("Email inválido"),
  body("password").isLength({ min: 6 }).withMessage("La contraseña debe tener al menos 6 caracteres"),
  body("name").notEmpty().withMessage("El nombre es requerido"),
  body("role").isIn(["admin", "technician", "client"]).withMessage("Rol inválido"),
]

export const changePasswordValidation = [
  body("currentPassword").notEmpty().withMessage("La contraseña actual es requerida"),
  body("newPassword").isLength({ min: 6 }).withMessage("La nueva contraseña debe tener al menos 6 caracteres"),
]

// Validaciones para técnicos
export const createTechnicianValidation = [
  body("name").notEmpty().withMessage("El nombre es requerido"),
  body("email").isEmail().withMessage("Email inválido"),
  body("phone").optional().isMobilePhone("es-PE").withMessage("Número de teléfono inválido"),
  body("specialization").optional().isArray().withMessage("La especialización debe ser un array"),
]

export const updateTechnicianValidation = [
  param("id").isUUID().withMessage("ID inválido"),
  body("name").optional().notEmpty().withMessage("El nombre no puede estar vacío"),
  body("phone").optional().isMobilePhone("es-PE").withMessage("Número de teléfono inválido"),
  body("status").optional().isIn(["active", "inactive", "pending", "on_leave"]).withMessage("Estado inválido"),
  body("specialization").optional().isArray().withMessage("La especialización debe ser un array"),
]

// Validaciones para clientes
export const createClientValidation = [
  body("name").notEmpty().withMessage("El nombre es requerido"),
  body("ruc").notEmpty().withMessage("El RUC es requerido"),
  body("email").isEmail().withMessage("Email inválido"),
  body("phone").optional().isMobilePhone("es-PE").withMessage("Número de teléfono inválido"),
  body("address").optional().notEmpty().withMessage("La dirección no puede estar vacía"),
  body("contract_type").optional().isIn(["monthly", "annual", "project"]).withMessage("Tipo de contrato inválido"),
  body("contact_person").optional().notEmpty().withMessage("La persona de contacto no puede estar vacía"),
]

export const updateClientValidation = [
  param("id").isUUID().withMessage("ID inválido"),
  body("name").optional().notEmpty().withMessage("El nombre no puede estar vacío"),
  body("phone").optional().isMobilePhone("es-PE").withMessage("Número de teléfono inválido"),
  body("status").optional().isIn(["active", "inactive", "pending"]).withMessage("Estado inválido"),
  body("address").optional().notEmpty().withMessage("La dirección no puede estar vacía"),
  body("contract_type").optional().isIn(["monthly", "annual", "project"]).withMessage("Tipo de contrato inválido"),
  body("contact_person").optional().notEmpty().withMessage("La persona de contacto no puede estar vacía"),
]

// Validaciones para reportes
export const createReportValidation = [
  body("templateId").notEmpty().withMessage("El ID de la plantilla es requerido"),
  body("templateType").notEmpty().withMessage("El tipo de plantilla es requerido"),
  body("sheetNumber").isInt({ min: 1, max: 3 }).withMessage("El número de hoja debe ser entre 1 y 3"),
  body("buildingName").notEmpty().withMessage("El nombre del edificio es requerido"),
  body("elevatorBrand").notEmpty().withMessage("La marca del ascensor es requerida"),
  body("elevatorCount").isInt({ min: 1 }).withMessage("La cantidad de ascensores debe ser al menos 1"),
  body("floorCount").isInt({ min: 1 }).withMessage("La cantidad de pisos debe ser al menos 1"),
  body("date").isDate().withMessage("Fecha inválida"),
  body("sections").isArray().withMessage("Las secciones deben ser un array"),
  body("status").optional().isIn(["draft", "submitted", "approved"]).withMessage("Estado inválido"),
]

export const updateReportValidation = [
  param("id").isUUID().withMessage("ID inválido"),
  body("status").optional().isIn(["draft", "submitted", "approved"]).withMessage("Estado inválido"),
  body("observations").optional().notEmpty().withMessage("Las observaciones no pueden estar vacías"),
]

// Validaciones para solicitudes de servicio
export const createServiceRequestValidation = [
  body("buildingId").notEmpty().withMessage("El ID del edificio es requerido"),
  body("type").isIn(["maintenance", "installation", "consultation"]).withMessage("Tipo inválido"),
  body("serviceType").notEmpty().withMessage("El tipo de servicio es requerido"),
  body("urgencyLevel").optional().isIn(["low", "normal", "high"]).withMessage("Nivel de urgencia inválido"),
  body("description").notEmpty().withMessage("La descripción es requerida"),
  body("preferredDate").isDate().withMessage("Fecha preferida inválida"),
  body("preferredTime")
    .optional()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage("Hora preferida inválida (formato: HH:MM)"),
  body("contactMethod").isIn(["phone", "email", "whatsapp"]).withMessage("Método de contacto inválido"),
]

// Validaciones para llamadas de emergencia
export const createEmergencyCallValidation = [
  body("buildingId").notEmpty().withMessage("El ID del edificio es requerido"),
  body("elevatorId").optional().isUUID().withMessage("ID de ascensor inválido"),
  body("description").optional().notEmpty().withMessage("La descripción no puede estar vacía"),
]

// Validaciones para reuniones
export const scheduleMeetingValidation = [
  body("title").notEmpty().withMessage("El título es requerido"),
  body("date").isDate().withMessage("Fecha inválida"),
  body("time")
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage("Hora inválida (formato: HH:MM)"),
  body("duration").optional().isInt({ min: 15 }).withMessage("La duración debe ser al menos 15 minutos"),
]

// Validaciones para informes de gestión
export const createManagementReportValidation = [
  body("start_date").isDate().withMessage("Fecha de inicio inválida"),
  body("end_date").isDate().withMessage("Fecha de fin inválida"),
  body("include_reports").optional().isBoolean().withMessage("include_reports debe ser un booleano"),
  body("include_technicians").optional().isBoolean().withMessage("include_technicians debe ser un booleano"),
  body("include_clients").optional().isBoolean().withMessage("include_clients debe ser un booleano"),
]

// Validaciones para notificaciones
export const markNotificationAsReadValidation = [param("id").isUUID().withMessage("ID inválido")]

// Validaciones para filtros comunes
export const dateRangeValidation = [
  query("start_date").optional().isDate().withMessage("Fecha de inicio inválida"),
  query("end_date").optional().isDate().withMessage("Fecha de fin inválida"),
]

export const paginationValidation = [
  query("page").optional().isInt({ min: 1 }).withMessage("Página inválida"),
  query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Límite inválido"),
]

export const idParamValidation = [param("id").isUUID().withMessage("ID inválido")]

