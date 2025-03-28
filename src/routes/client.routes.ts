import { Router } from "express"
import * as ClientController from "../controllers/client.controller"
import { authenticate, authorize, isActive } from "../middleware/auth"
import { UserRole } from "../config/constants"

const router = Router()

// Middleware para todas las rutas de cliente
router.use(authenticate)
router.use(authorize([UserRole.CLIENT, UserRole.ADMIN]))
router.use(isActive)

// Rutas para solicitudes de servicio
router.post("/service-requests", ClientController.createServiceRequest)
router.get("/service-requests", ClientController.getServiceRequests)

// Rutas para llamadas de emergencia
router.post("/emergency-calls", ClientController.createEmergencyCall)

// Rutas para programación de reuniones
router.post("/meetings", ClientController.scheduleMeeting)
router.get("/meetings", ClientController.getMeetings)

// Rutas para historial de mantenimientos
router.get("/maintenance-history", ClientController.getMaintenanceHistory)

// Rutas para estado de cuenta
router.get("/account-statement", ClientController.getAccountStatement)
router.post("/account-statement/generate-pdf", ClientController.generateAccountStatementPdf)

export default router

