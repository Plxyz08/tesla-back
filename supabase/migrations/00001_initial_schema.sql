-- Crear tablas para la base de datos de TeslaLift

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'technician', 'client')),
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'pending', 'on_leave')),
  phone TEXT,
  profile_image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de técnicos (extensión de usuarios)
CREATE TABLE IF NOT EXISTS technicians (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  specialization TEXT[] DEFAULT '{}',
  reports_count INTEGER DEFAULT 0,
  last_active TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de clientes
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  ruc TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'pending')),
  contract_type TEXT NOT NULL CHECK (contract_type IN ('monthly', 'annual', 'project')),
  invoice_status TEXT NOT NULL CHECK (invoice_status IN ('paid', 'pending', 'overdue')),
  buildings_count INTEGER DEFAULT 0,
  elevators_count INTEGER DEFAULT 0,
  contact_person TEXT,
  last_invoice_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de edificios
CREATE TABLE IF NOT EXISTS buildings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  floors INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de ascensores
CREATE TABLE IF NOT EXISTS elevators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  brand TEXT NOT NULL,
  model TEXT,
  serial_number TEXT,
  installation_date DATE,
  last_maintenance_date DATE,
  status TEXT NOT NULL CHECK (status IN ('operational', 'maintenance', 'out_of_service')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de eventos de reloj
CREATE TABLE IF NOT EXISTS clock_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  technician_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('clock_in', 'clock_out', 'break_start', 'break_end')),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  location JSONB,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de sesiones de trabajo
CREATE TABLE IF NOT EXISTS work_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  technician_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  clock_in_event_id UUID NOT NULL REFERENCES clock_events(id),
  clock_out_event_id UUID REFERENCES clock_events(id),
  break_events UUID[] DEFAULT '{}',
  duration INTEGER, -- Duración en minutos (excluyendo descansos)
  break_duration INTEGER, -- Duración de descansos en minutos
  status TEXT NOT NULL CHECK (status IN ('active', 'on_break', 'completed')),
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de plantillas de reporte
CREATE TABLE IF NOT EXISTS report_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('type1', 'type2', 'type3')),
  name TEXT NOT NULL,
  sheet_number INTEGER NOT NULL CHECK (sheet_number IN (1, 2, 3)),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de secciones de plantillas de reporte
CREATE TABLE IF NOT EXISTS report_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES report_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de elementos de secciones de reporte
CREATE TABLE IF NOT EXISTS report_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  section_id UUID NOT NULL REFERENCES report_sections(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('checkbox', 'text', 'number')),
  required BOOLEAN DEFAULT FALSE,
  order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de reportes
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  technician_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  building_id UUID REFERENCES buildings(id),
  template_id UUID NOT NULL REFERENCES report_templates(id),
  template_type TEXT NOT NULL CHECK (type IN ('type1', 'type2', 'type3')),
  sheet_number INTEGER NOT NULL CHECK (sheet_number IN (1, 2, 3)),
  building_name TEXT NOT NULL,
  elevator_brand TEXT NOT NULL,
  elevator_count INTEGER NOT NULL,
  floor_count INTEGER NOT NULL,
  clock_in_time TEXT NOT NULL,
  clock_out_time TEXT,
  date DATE NOT NULL,
  sections JSONB NOT NULL,
  observations TEXT,
  technician_signature TEXT,
  client_signature TEXT,
  status TEXT NOT NULL CHECK (status IN ('draft', 'submitted', 'approved')),
  pdf_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de solicitudes de servicio
CREATE TABLE IF NOT EXISTS service_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('maintenance', 'installation', 'consultation')),
  service_type TEXT NOT NULL,
  urgency_level TEXT NOT NULL CHECK (urgency_level IN ('low', 'normal', 'high')),
  description TEXT NOT NULL,
  preferred_date DATE NOT NULL,
  preferred_time TEXT NOT NULL,
  contact_method TEXT NOT NULL CHECK (contact_method IN ('phone', 'email', 'whatsapp')),
  images TEXT[],
  status TEXT NOT NULL CHECK (status IN ('pending', 'scheduled', 'in_progress', 'completed', 'cancelled')),
  assigned_technician_id UUID REFERENCES users(id),
  scheduled_date DATE,
  scheduled_time TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de llamadas de emergencia
CREATE TABLE IF NOT EXISTS emergency_calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  elevator_id UUID REFERENCES elevators(id),
  description TEXT,
  location JSONB,
  status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'resolved')),
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de reuniones
CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  time TEXT NOT NULL,
  duration INTEGER NOT NULL, -- en minutos
  location TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de facturas
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('paid', 'pending', 'overdue')),
  description TEXT,
  pdf_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de notificaciones
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success', 'task')),
  read BOOLEAN DEFAULT FALSE,
  related_entity_type TEXT,
  related_entity_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de documentos
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('report', 'invoice', 'account_statement', 'management_report')),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  related_entity_type TEXT NOT NULL,
  related_entity_id UUID NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Función para incrementar el contador de reportes de un técnico
CREATE OR REPLACE FUNCTION increment_technician_reports_count(technician_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE technicians
  SET reports_count = reports_count + 1,
      updated_at = NOW()
  WHERE user_id = technician_id;
END;
$$ LANGUAGE plpgsql;

-- Función para actualizar el contador de edificios de un cliente
CREATE OR REPLACE FUNCTION update_client_buildings_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE clients
    SET buildings_count = buildings_count + 1,
        updated_at = NOW()
    WHERE id = NEW.client_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE clients
    SET buildings_count = buildings_count - 1,
        updated_at = NOW()
    WHERE id = OLD.client_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar el contador de edificios
CREATE TRIGGER update_client_buildings_count_trigger
AFTER INSERT OR DELETE ON buildings
FOR EACH ROW
EXECUTE FUNCTION update_client_buildings_count();

-- Función para actualizar el contador de ascensores de un cliente
CREATE OR REPLACE FUNCTION update_client_elevators_count()
RETURNS TRIGGER AS $$
DECLARE
  client_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT b.client_id INTO client_id FROM buildings b WHERE b.id = NEW.building_id;
    
    UPDATE clients
    SET elevators_count = elevators_count + 1,
        updated_at = NOW()
    WHERE id = client_id;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT b.client_id INTO client_id FROM buildings b WHERE b.id = OLD.building_id;
    
    UPDATE clients
    SET elevators_count = elevators_count - 1,
        updated_at = NOW()
    WHERE id = client_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar el contador de ascensores
CREATE TRIGGER update_client_elevators_count_trigger
AFTER INSERT OR DELETE ON elevators
FOR EACH ROW
EXECUTE FUNCTION update_client_elevators_count();

