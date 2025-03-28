import type { Request, Response } from "express"
import { supabase } from "../config/supabase"
import { ServiceRequestStatus, UrgencyLevel } from "../config/constants"
import { createNotification } from "../services/notification.service"
import { generateAccountStatement } from "../services/pdf.service"
import { uploadFile } from "../services/storage.service"

// Solicitudes de servicio
export const createServiceRequest = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Usuario no autenticado",
      })
    }

    const clientId = req.user.id
    const {
      buildingId,
      type,
      serviceType,
      urgencyLevel,
      description,
      preferredDate,
      preferredTime,
      contactMethod,
      images,
    } = req.body

    // Validar datos requeridos
    if (!buildingId || !type || !serviceType || !description || !preferredDate || !contactMethod) {
      return res.status(400).json({
        success: false,
        message: "Faltan datos requeridos para crear la solicitud",
      })
    }

    // Verificar que el edificio pertenece al cliente
    const { data: building, error: buildingError } = await supabase
      .from("buildings")
      .select("*")
      .eq("id", buildingId)
      .eq("client_id", clientId)
      .single()

    if (buildingError || !building) {
      return res.status(404).json({
        success: false,
        message: "Edificio no encontrado o no pertenece al cliente",
      })
    }

    // Crear solicitud de servicio
    const { data: requestData, error: requestError } = await supabase
      .from("service_requests")
      .insert({
        client_id: clientId,
        building_id: buildingId,
        type,
        service_type: serviceType,
        urgency_level: urgencyLevel || UrgencyLevel.NORMAL,
        description,
        preferred_date: preferredDate,
        preferred_time: preferredTime,
        contact_method: contactMethod,
        images,
        status: ServiceRequestStatus.PENDING,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (requestError) {
      return res.status(500).json({
        success: false,
        message: "Error al crear solicitud de servicio",
        error: requestError.message,
      })
    }

    // Crear notificación para administradores
    const { data: admins } = await supabase.from("users").select("id").eq("role", "admin")

    if (admins) {
      for (const admin of admins) {
        await createNotification({
          user_id: admin.id,
          title: "Nueva solicitud de servicio",
          message: `El cliente ${req.user.name} ha solicitado un servicio de ${serviceType} para ${building.name}`,
          type: "task",
          related_entity_type: "service_requests",
          related_entity_id: requestData.id,
        })
      }
    }

    return res.status(201).json({
      success: true,
      message: "Solicitud de servicio creada exitosamente",
      data: requestData,
    })
  } catch (error) {
    console.error("Error al crear solicitud de servicio:", error)
    return res.status(500).json({
      success: false,
      message: "Error en el servidor al crear solicitud de servicio",
    })
  }
}

export const getServiceRequests = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Usuario no autenticado",
      })
    }

    const clientId = req.user.id
    const { status, type, start_date, end_date } = req.query

    // Construir la consulta base
    let query = supabase
      .from("service_requests")
      .select(`
        *,
        buildings (name, address)
      `)
      .eq("client_id", clientId)

    // Aplicar filtros si se proporcionan
    if (status) {
      query = query.eq("status", status)
    }

    if (type) {
      query = query.eq("type", type)
    }

    if (start_date && end_date) {
      query = query.gte("preferred_date", start_date as string).lte("preferred_date", end_date as string)
    } else if (start_date) {
      query = query.gte("preferred_date", start_date as string)
    } else if (end_date) {
      query = query.lte("preferred_date", end_date as string)
    }

    // Ordenar por fecha de creación descendente
    query = query.order("created_at", { ascending: false })

    // Ejecutar la consulta
    const { data, error } = await query

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Error al obtener solicitudes de servicio",
        error: error.message,
      })
    }

    // Formatear datos para incluir el nombre del edificio
    const formattedData = data.map((request) => {
      const buildingName = request.buildings ? request.buildings.name : "Desconocido"
      const buildingAddress = request.buildings ? request.buildings.address : ""

      return {
        ...request,
        building_name: buildingName,
        building_address: buildingAddress,
        buildings: undefined, // Eliminar el objeto buildings anidado
      }
    })

    return res.status(200).json({
      success: true,
      data: formattedData,
    })
  } catch (error) {
    console.error("Error al obtener solicitudes de servicio:", error)
    return res.status(500).json({
      success: false,
      message: "Error en el servidor al obtener solicitudes de servicio",
    })
  }
}

// Llamadas de emergencia
export const createEmergencyCall = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Usuario no autenticado",
      })
    }

    const clientId = req.user.id
    const { buildingId, elevatorId, description, location } = req.body

    // Validar datos requeridos
    if (!buildingId) {
      return res.status(400).json({
        success: false,
        message: "El ID del edificio es requerido",
      })
    }

    // Verificar que el edificio pertenece al cliente
    const { data: building, error: buildingError } = await supabase
      .from("buildings")
      .select("*")
      .eq("id", buildingId)
      .eq("client_id", clientId)
      .single()

    if (buildingError || !building) {
      return res.status(404).json({
        success: false,
        message: "Edificio no encontrado o no pertenece al cliente",
      })
    }

    // Crear llamada de emergencia
    const { data: callData, error: callError } = await supabase
      .from("emergency_calls")
      .insert({
        client_id: clientId,
        building_id: buildingId,
        elevator_id: elevatorId,
        description,
        location,
        status: "pending",
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (callError) {
      return res.status(500).json({
        success: false,
        message: "Error al registrar llamada de emergencia",
        error: callError.message,
      })
    }

    // Crear notificación para administradores y técnicos
    const { data: users } = await supabase
      .from("users")
      .select("id, role")
      .in("role", ["admin", "technician"])
      .eq("status", "active")

    if (users) {
      for (const user of users) {
        await createNotification({
          user_id: user.id,
          title: "¡EMERGENCIA!",
          message: `Llamada de emergencia del cliente ${req.user.name} para ${building.name}`,
          type: "error",
          related_entity_type: "emergency_calls",
          related_entity_id: callData.id,
        })
      }
    }

    return res.status(201).json({
      success: true,
      message: "Llamada de emergencia registrada exitosamente",
      data: callData,
    })
  } catch (error) {
    console.error("Error al registrar llamada de emergencia:", error)
    return res.status(500).json({
      success: false,
      message: "Error en el servidor al registrar llamada de emergencia",
    })
  }
}

// Programación de reuniones
export const scheduleMeeting = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Usuario no autenticado",
      })
    }

    const clientId = req.user.id
    const { title, description, date, time, duration, location } = req.body

    // Validar datos requeridos
    if (!title || !date || !time) {
      return res.status(400).json({
        success: false,
        message: "Título, fecha y hora son requeridos",
      })
    }

    // Crear reunión
    const { data: meetingData, error: meetingError } = await supabase
      .from("meetings")
      .insert({
        client_id: clientId,
        title,
        description,
        date,
        time,
        duration: duration || 60, // Duración predeterminada: 60 minutos
        location,
        status: "pending",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (meetingError) {
      return res.status(500).json({
        success: false,
        message: "Error al programar reunión",
        error: meetingError.message,
      })
    }

    // Crear notificación para administradores
    const { data: admins } = await supabase.from("users").select("id").eq("role", "admin")

    if (admins) {
      for (const admin of admins) {
        await createNotification({
          user_id: admin.id,
          title: "Nueva solicitud de reunión",
          message: `El cliente ${req.user.name} ha solicitado una reunión: ${title}`,
          type: "info",
          related_entity_type: "meetings",
          related_entity_id: meetingData.id,
        })
      }
    }

    return res.status(201).json({
      success: true,
      message: "Reunión programada exitosamente",
      data: meetingData,
    })
  } catch (error) {
    console.error("Error al programar reunión:", error)
    return res.status(500).json({
      success: false,
      message: "Error en el servidor al programar reunión",
    })
  }
}

// Implementación del método getMeetings que faltaba
export const getMeetings = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Usuario no autenticado",
      })
    }

    const clientId = req.user.id
    const { status, start_date, end_date } = req.query

    // Construir la consulta base
    let query = supabase.from("meetings").select("*").eq("client_id", clientId)

    // Aplicar filtros si se proporcionan
    if (status) {
      query = query.eq("status", status)
    }

    if (start_date && end_date) {
      query = query.gte("date", start_date as string).lte("date", end_date as string)
    } else if (start_date) {
      query = query.gte("date", start_date as string)
    } else if (end_date) {
      query = query.lte("date", end_date as string)
    }

    // Ordenar por fecha descendente
    query = query.order("date", { ascending: false })

    // Ejecutar la consulta
    const { data, error } = await query

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Error al obtener reuniones",
        error: error.message,
      })
    }

    return res.status(200).json({
      success: true,
      data,
    })
  } catch (error) {
    console.error("Error al obtener reuniones:", error)
    return res.status(500).json({
      success: false,
      message: "Error en el servidor al obtener reuniones",
    })
  }
}

// Historial de mantenimientos
export const getMaintenanceHistory = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Usuario no autenticado",
      })
    }

    const clientId = req.user.id
    const { building_id, start_date, end_date } = req.query

    // Obtener edificios del cliente
    const { data: buildings, error: buildingsError } = await supabase
      .from("buildings")
      .select("id, name")
      .eq("client_id", clientId)

    if (buildingsError) {
      return res.status(500).json({
        success: false,
        message: "Error al obtener edificios del cliente",
        error: buildingsError.message,
      })
    }

    const buildingIds = buildings ? buildings.map((b) => b.id) : []

    if (buildingIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
      })
    }

    // Construir la consulta base para reportes
    let query = supabase
      .from("reports")
      .select(`
        *,
        users:technician_id (name)
      `)
      .in("building_id", buildingIds)
      .eq("status", "approved")

    // Aplicar filtros si se proporcionan
    if (building_id) {
      query = query.eq("building_id", building_id)
    }

    if (start_date && end_date) {
      query = query.gte("date", start_date as string).lte("date", end_date as string)
    } else if (start_date) {
      query = query.gte("date", start_date as string)
    } else if (end_date) {
      query = query.lte("date", end_date as string)
    }

    // Ordenar por fecha descendente
    query = query.order("date", { ascending: false })

    // Ejecutar la consulta
    const { data: reports, error: reportsError } = await query

    if (reportsError) {
      return res.status(500).json({
        success: false,
        message: "Error al obtener historial de mantenimientos",
        error: reportsError.message,
      })
    }

    // Formatear datos para incluir el nombre del técnico
    const formattedReports = reports.map((report) => {
      const technicianName = report.users ? report.users.name : "Desconocido"
      const buildingName = buildings.find((b) => b.id === report.building_id)?.name || report.building_name

      return {
        ...report,
        technician_name: technicianName,
        building_name: buildingName,
        users: undefined, // Eliminar el objeto users anidado
      }
    })

    return res.status(200).json({
      success: true,
      data: formattedReports,
    })
  } catch (error) {
    console.error("Error al obtener historial de mantenimientos:", error)
    return res.status(500).json({
      success: false,
      message: "Error en el servidor al obtener historial de mantenimientos",
    })
  }
}

// Estado de cuenta
export const getAccountStatement = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Usuario no autenticado",
      })
    }

    const clientId = req.user.id

    // Obtener información del cliente
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("*")
      .eq("user_id", clientId)
      .single()

    if (clientError) {
      return res.status(404).json({
        success: false,
        message: "Cliente no encontrado",
        error: clientError.message,
      })
    }

    // Obtener facturas del cliente
    const { data: invoices, error: invoicesError } = await supabase
      .from("invoices")
      .select("*")
      .eq("client_id", clientId)
      .order("issue_date", { ascending: false })

    if (invoicesError) {
      return res.status(500).json({
        success: false,
        message: "Error al obtener facturas",
        error: invoicesError.message,
      })
    }

    // Obtener edificios del cliente
    const { data: buildings, error: buildingsError } = await supabase
      .from("buildings")
      .select("*")
      .eq("client_id", clientId)

    if (buildingsError) {
      return res.status(500).json({
        success: false,
        message: "Error al obtener edificios",
        error: buildingsError.message,
      })
    }

    // Obtener ascensores del cliente
    const buildingIds = buildings ? buildings.map((b) => b.id) : []

    let elevators = []
    if (buildingIds.length > 0) {
      const { data: elevatorsData, error: elevatorsError } = await supabase
        .from("elevators")
        .select("*")
        .in("building_id", buildingIds)

      if (!elevatorsError) {
        elevators = elevatorsData
      }
    }

    // Calcular estadísticas
    const totalInvoices = (invoices ?? []).length
    const pendingInvoices = (invoices ?? []).filter((inv) => inv.status === "pending").length
    const overdueInvoices = (invoices ?? []).filter((inv) => inv.status === "overdue").length
    const totalAmount = (invoices ?? []).reduce((sum, inv) => sum + inv.amount, 0)
    const pendingAmount = (invoices ?? [])
      .filter((inv) => inv.status === "pending" || inv.status === "overdue")
      .reduce((sum, inv) => sum + inv.amount, 0)

    // Preparar respuesta
    const accountStatement = {
      client: {
        id: client.id,
        name: client.name,
        ruc: client.ruc,
        email: client.email,
        phone: client.phone,
        address: client.address,
        status: client.status,
        contract_type: client.contract_type,
        invoice_status: client.invoice_status,
        contact_person: client.contact_person,
      },
      statistics: {
        total_invoices: totalInvoices,
        pending_invoices: pendingInvoices,
        overdue_invoices: overdueInvoices,
        total_amount: totalAmount,
        pending_amount: pendingAmount,
        buildings_count: buildings ? buildings.length : 0,
        elevators_count: elevators.length,
      },
      invoices,
      buildings: (buildings ?? []).map((building) => ({
        ...building,
        elevators: elevators.filter((e) => e.building_id === building.id),
      })),
    }

    return res.status(200).json({
      success: true,
      data: accountStatement,
    })
  } catch (error) {
    console.error("Error al obtener estado de cuenta:", error)
    return res.status(500).json({
      success: false,
      message: "Error en el servidor al obtener estado de cuenta",
    })
  }
}

// Implementación del método generateAccountStatementPdf que faltaba
export const generateAccountStatementPdf = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Usuario no autenticado",
      })
    }

    const clientId = req.user.id

    // Obtener datos del estado de cuenta
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("*")
      .eq("user_id", clientId)
      .single()

    if (clientError) {
      return res.status(404).json({
        success: false,
        message: "Cliente no encontrado",
        error: clientError.message,
      })
    }

    // Obtener facturas, edificios y ascensores
    const { data: invoices = [] } = await supabase
      .from("invoices")
      .select("*")
      .eq("client_id", clientId)
      .order("issue_date", { ascending: false })

    const { data: buildings = [] } = await supabase.from("buildings").select("*").eq("client_id", clientId)

    const buildingIds = buildings ? buildings.map((b) => b.id) : []
    let elevators = []

    if (buildingIds.length > 0) {
      const { data: elevatorsData } = await supabase.from("elevators").select("*").in("building_id", buildingIds)

      if (elevatorsData) {
        elevators = elevatorsData
      }
    }

    // Calcular estadísticas
    const totalInvoices = (invoices ?? []).length
    const pendingInvoices = (invoices ?? []).filter((inv) => inv.status === "pending").length
    const overdueInvoices = (invoices ?? []).filter((inv) => inv.status === "overdue").length
    const totalAmount = (invoices ?? []).reduce((sum, inv) => sum + inv.amount, 0)
    const pendingAmount = (invoices ?? [])
      .filter((inv) => inv.status === "pending" || inv.status === "overdue")
      .reduce((sum, inv) => sum + inv.amount, 0)

    // Preparar datos para el PDF
    const accountStatementData = {
      client: {
        name: client.name,
        ruc: client.ruc,
        email: client.email,
        phone: client.phone,
        address: client.address,
        contract_type: client.contract_type,
      },
      statistics: {
        total_invoices: totalInvoices,
        pending_invoices: pendingInvoices,
        overdue_invoices: overdueInvoices,
        total_amount: totalAmount,
        pending_amount: pendingAmount,
        buildings_count: buildings ? buildings.length : 0,
        elevators_count: elevators.length,
      },
      invoices,
      buildings: (buildings ?? []).map((building) => ({
        ...building,
        elevators: elevators.filter((e) => e.building_id === building.id),
      })),
    }

    // Generar PDF
    const pdfBuffer = await generateAccountStatement(accountStatementData)

    // Subir PDF a storage
    const fileName = `account_statements/${clientId}_${new Date().toISOString().split("T")[0]}.pdf`
    const { url } = await uploadFile(pdfBuffer, fileName, "application/pdf")

    // Crear registro en la tabla de documentos
    await supabase.from("documents").insert({
      type: "account_statement",
      name: `Estado de Cuenta - ${client.name} - ${new Date().toLocaleDateString()}`,
      url,
      related_entity_type: "clients",
      related_entity_id: client.id,
      created_by: req.user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    return res.status(200).json({
      success: true,
      message: "Estado de cuenta generado exitosamente",
      data: {
        pdf_url: url,
      },
    })
  } catch (error) {
    console.error("Error al generar PDF de estado de cuenta:", error)
    return res.status(500).json({
      success: false,
      message: "Error en el servidor al generar PDF de estado de cuenta",
    })
  }
}

