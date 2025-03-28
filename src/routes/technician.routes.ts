import { Router } from 'express';
import * as TechnicianController from '../controllers/technician.controller';
import { authenticate, authorize, isActive } from '../middleware/auth';
import { UserRole } from '../config/constants';

const router = Router();

// Middleware para todas las rutas de técnico
router.use(authenticate);
router.use(authorize([UserRole.TECHNICIAN, UserRole.ADMIN]));
router.use(isActive);

// Rutas para gestión de tiempo
router.post('/clock', TechnicianController.clockEvent);
router.get('/work-sessions', TechnicianController.getWorkSessions);
router.get('/stats', TechnicianController.getTechnicianStats);

// Rutas para gestión de reportes
router.get('/report-templates', TechnicianController.getReportTemplates);
router.get('/report-templates/month/:month', TechnicianController.getTemplateForMonth);
router.post('/reports', TechnicianController.createReport);
router.get('/reports', TechnicianController.getReports);
router.get('/reports/:id', TechnicianController.getReportById);

export default router;

