import { Router } from "express"
import * as AdminController from "../controllers/admin.controller"
import { authenticate, authorize, isActive } from "../middleware/auth"
import { UserRole } from "../config/constants"
import {
  createTechnicianValidation,
  updateTechnicianValidation,
  createClientValidation,
  updateClientValidation,
  updateReportValidation,
  createManagementReportValidation,
  idParamValidation,
  validate,
} from "../middleware/validation.middleware"

const router = Router()

// Middleware para todas las rutas de administrador
router.use(authenticate)
router.use(authorize([UserRole.ADMIN]))
router.use(isActive)

// Rutas para gestión de técnicos
router.post("/technicians", createTechnicianValidation, validate, AdminController.createTechnician)
router.get("/technicians", AdminController.getTechnicians)
router.get("/technicians/:id", idParamValidation, validate, AdminController.getTechnicianById)
router.put("/technicians/:id", updateTechnicianValidation, validate, AdminController.updateTechnician)
router.delete("/technicians/:id", idParamValidation, validate, AdminController.deleteTechnician)

// Rutas para gestión de clientes
router.post("/clients", createClientValidation, validate, AdminController.createClient)
router.get("/clients", AdminController.getClients)
router.get("/clients/:id", idParamValidation, validate, AdminController.getClientById)
router.put("/clients/:id", updateClientValidation, validate, AdminController.updateClient)
router.delete("/clients/:id", idParamValidation, validate, AdminController.deleteClient)

// Rutas para gestión de reportes e informes
router.get("/reports", AdminController.getReports)
router.get("/reports/:id", idParamValidation, validate, AdminController.getReportById)
router.put("/reports/:id", updateReportValidation, validate, AdminController.updateReport)
router.delete("/reports/:id", idParamValidation, validate, AdminController.deleteReport)
router.post("/reports/generate-pdf/:id", idParamValidation, validate, AdminController.generateReportPdf)

// Rutas para generación de informes
router.post("/management-reports", createManagementReportValidation, validate, AdminController.createManagementReport)
router.get("/management-reports", AdminController.getManagementReports)
router.get("/management-reports/:id", idParamValidation, validate, AdminController.getManagementReportById)
router.delete("/management-reports/:id", idParamValidation, validate, AdminController.deleteManagementReport)

export default router

