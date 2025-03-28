// Tipos para usuarios
export interface User {
  id: string
  email: string
  name: string
  role: string
  status: string
  phone?: string
  profile_image?: string
  created_at: string
  updated_at: string
}

// Tipos para técnicos
export interface Technician {
  user_id: string
  specialization: string[]
  reports_count: number
  last_active?: string
  created_at: string
  updated_at: string
}

// Tipos para clientes
export interface Client {
  user_id: string
  name: string
  ruc: string
  email: string
  phone?: string
  address?: string
  status: string
  contract_type: string
  invoice_status: string
  buildings_count: number
  elevators_count: number
  contact_person?: string
  last_invoice_date?: string
  created_at: string
  updated_at: string
}

// Tipos para edificios
export interface Building {
  id: string
  client_id: string
  name: string
  address: string
  floors: number
  created_at: string
  updated_at: string
}

// Tipos para ascensores
export interface Elevator {
  id: string
  building_id: string
  brand: string
  model?: string
  serial_number?: string
  installation_date?: string
  last_maintenance_date?: string
  status: "operational" | "maintenance" | "out_of_service"
  created_at: string
  updated_at: string
}

// Tipos para eventos de reloj
export interface ClockEvent {
  id: string
  technician_id: string
  type: string
  timestamp: string
  location?: string
  notes?: string
  created_at: string
}

// Tipos para sesiones de trabajo
export interface WorkSession {
  id: string
  technician_id: string
  clock_in_event_id: string
  clock_out_event_id?: string
  break_events: string[]
  duration?: number
  break_duration?: number
  status: string
  date: string
  created_at: string
  updated_at: string
}

// Tipos para plantillas de reporte
export interface ReportTemplate {
  id: string
  type: "type1" | "type2" | "type3"
  name: string
  sheet_number: 1 | 2 | 3
  created_at: string
  updated_at: string
}

// Tipos para secciones de plantillas de reporte
export interface ReportSection {
  id: string
  template_id: string
  title: string
  order: number
  created_at: string
  updated_at: string
}

// Tipos para elementos de secciones de reporte
export interface ReportItem {
  id: string
  section_id: string
  description: string
  type: "checkbox" | "text" | "number"
  required: boolean
  order: number
  created_at: string
  updated_at: string
}

// Tipos para reportes
export interface Report {
  id: string
  technician_id: string
  template_id: string
  template_type: string
  sheet_number: number
  building_name: string
  elevator_brand: string
  elevator_count: number
  floor_count: number
  clock_in_time?: string
  clock_out_time?: string
  date: string
  sections: any[]
  observations?: string
  technician_signature?: string
  client_signature?: string
  status: string
  pdf_url?: string
  created_at: string
  updated_at: string
  technician_name?: string // Añadido para solucionar el error
}

// Tipos para solicitudes de servicio
export interface ServiceRequest {
  id: string
  client_id: string
  building_id: string
  type: string
  service_type: string
  urgency_level: string
  description: string
  preferred_date: string
  preferred_time?: string
  contact_method: string
  images?: string[]
  status: string
  created_at: string
  updated_at: string
}

// Tipos para llamadas de emergencia
export interface EmergencyCall {
  id: string
  client_id: string
  building_id: string
  elevator_id?: string
  description?: string
  location?: string
  status: string
  created_at: string
}

// Tipos para reuniones
export interface Meeting {
  id: string
  client_id: string
  title: string
  description?: string
  date: string
  time: string
  duration: number
  location?: string
  status: string
  created_at: string
  updated_at: string
}

// Tipos para facturas
export interface Invoice {
  id: string
  client_id: string
  issue_date: string
  due_date: string
  amount: number
  status: string
  created_at: string
  updated_at: string
}

// Tipos para notificaciones
export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: string
  read: boolean
  related_entity_type?: string
  related_entity_id?: string
  created_at: string
}

// Tipos para documentos
export interface Document {
  id: string
  type: "report" | "invoice" | "account_statement" | "management_report"
  name: string
  url: string
  related_entity_type: string
  related_entity_id: string
  created_by: string
  created_at: string
  updated_at: string
}

// Tipos para respuestas de la API
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Tipos para solicitudes de autenticación
export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  name: string
  role: "admin" | "technician" | "client"
  phone?: string
}

export interface ChangePasswordRequest {
  current_password: string
  new_password: string
}

export interface ManagementReport {
  id: string
  start_date: string
  end_date: string
  total_reports: number
  active_technicians: number
  active_clients: number
  generated_by: string
  created_at: string
  updated_at: string
}

