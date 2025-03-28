// Roles de usuario
export enum UserRole {
  ADMIN = 'admin',
  TECHNICIAN = 'technician',
  CLIENT = 'client'
}

// Estados de usuario
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  ON_LEAVE = 'on_leave'
}

// Tipos de eventos de reloj
export enum ClockEventType {
  CLOCK_IN = 'clock_in',
  CLOCK_OUT = 'clock_out',
  BREAK_START = 'break_start',
  BREAK_END = 'break_end'
}

// Estados de sesión de trabajo
export enum WorkSessionStatus {
  ACTIVE = 'active',
  ON_BREAK = 'on_break',
  COMPLETED = 'completed'
}

// Estados de reporte
export enum ReportStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  APPROVED = 'approved'
}

// Tipos de plantilla de reporte
export enum ReportTemplateType {
  TYPE1 = 'type1',
  TYPE2 = 'type2',
  TYPE3 = 'type3'
}

// Tipos de elementos de reporte
export enum ReportItemType {
  CHECKBOX = 'checkbox',
  TEXT = 'text',
  NUMBER = 'number'
}

// Estados de solicitud de servicio
export enum ServiceRequestStatus {
  PENDING = 'pending',
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

// Tipos de solicitud de servicio
export enum ServiceRequestType {
  MAINTENANCE = 'maintenance',
  INSTALLATION = 'installation',
  CONSULTATION = 'consultation'
}

// Niveles de urgencia
export enum UrgencyLevel {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high'
}

// Tipos de contrato
export enum ContractType {
  MONTHLY = 'monthly',
  ANNUAL = 'annual',
  PROJECT = 'project'
}

// Estados de factura
export enum InvoiceStatus {
  PAID = 'paid',
  PENDING = 'pending',
  OVERDUE = 'overdue'
}

// Tipos de notificación
export enum NotificationType {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  SUCCESS = 'success',
  TASK = 'task'
}

// Tipos de documento
export enum DocumentType {
  REPORT = 'report',
  INVOICE = 'invoice',
  ACCOUNT_STATEMENT = 'account_statement',
  MANAGEMENT_REPORT = 'management_report'
}

