import type { Request, Response } from "express"
import { supabase } from "../config/supabase"
import { ClockEventType, WorkSessionStatus, ReportStatus } from "../config/constants"
import { createNotification } from "../services/notification.service"
import { generatePdf } from "../services/pdf.service"
import { uploadFile } from "../services/storage.service"

// Gestión de tiempo (clock in/out)
export const clockEvent = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Usuario no autenticado",
      })
    }

    const technicianId = req.user.id
    const { type, location, notes } = req.body

    // Validar tipo de evento
    if (!Object.values(ClockEventType).includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Tipo de evento no válido",
      })
    }

    // Crear evento de reloj
    const { data: eventData, error: eventError } = await supabase
      .from("clock_events")
      .insert({
        technician_id: technicianId,
        type,
        timestamp: new Date().toISOString(),
        location,
        notes,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (eventError) {
      return res.status(500).json({
        success: false,
        message: "Error al registrar evento",
        error: eventError.message,
      })
    }

    // Si es un evento de entrada, crear una nueva sesión de trabajo
    if (type === ClockEventType.CLOCK_IN) {
      const today = new Date().toISOString().split("T")[0] // YYYY-MM-DD

      const { data: sessionData, error: sessionError } = await supabase
        .from("work_sessions")
        .insert({
          technician_id: technicianId,
          clock_in_event_id: eventData.id,
          break_events: [],
          status: WorkSessionStatus.ACTIVE,
          date: today,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (sessionError) {
        return res.status(500).json({
          success: false,
          message: "Error al crear sesión de trabajo",
          error: sessionError.message,
        })
      }

      return res.status(201).json({
        success: true,
        message: "Entrada registrada exitosamente",
        data: {
          event: eventData,
          session: sessionData,
        },
      })
    }

    // Si es un evento de salida, actualizar la sesión de trabajo activa
    if (type === ClockEventType.CLOCK_OUT) {
      // Buscar sesión activa
      const { data: activeSession, error: sessionError } = await supabase
        .from("work_sessions")
        .select("*")
        .eq("technician_id", technicianId)
        .eq("status", WorkSessionStatus.ACTIVE)
        .single()

      if (sessionError || !activeSession) {
        return res.status(400).json({
          success: false,
          message: "No hay una sesión de trabajo activa",
        })
      }

      // Calcular duración
      const clockInEvent = await supabase
        .from("clock_events")
        .select("timestamp")
        .eq("id", activeSession.clock_in_event_id)
        .single()

      const clockInTime = new Date(clockInEvent.data?.timestamp || "")
      const clockOutTime = new Date()

      // Duración total en minutos
      const totalDuration = Math.round((clockOutTime.getTime() - clockInTime.getTime()) / 60000)

      // Calcular duración de descansos
      let breakDuration = 0
      if (activeSession.break_events && activeSession.break_events.length > 0) {
        // Obtener todos los eventos de descanso
        const { data: breakEvents } = await supabase
          .from("clock_events")
          .select("*")
          .in("id", activeSession.break_events)

        // Agrupar eventos de inicio y fin de descanso
        const breakPairs = []
        let startEvent = null

        if (breakEvents) {
          for (const event of breakEvents) {
            if (event.type === ClockEventType.BREAK_START) {
              startEvent = event
            } else if (event.type === ClockEventType.BREAK_END && startEvent) {
              breakPairs.push({ start: startEvent, end: event })
              startEvent = null
            }
          }

          // Calcular duración total de descansos
          for (const pair of breakPairs) {
            const start = new Date(pair.start.timestamp)
            const end = new Date(pair.end.timestamp)
            breakDuration += Math.round((end.getTime() - start.getTime()) / 60000)
          }
        }
      }

      // Actualizar sesión de trabajo
      const { data: updatedSession, error: updateError } = await supabase
        .from("work_sessions")
        .update({
          clock_out_event_id: eventData.id,
          duration: totalDuration - breakDuration,
          break_duration: breakDuration,
          status: WorkSessionStatus.COMPLETED,
          updated_at: new Date().toISOString(),
        })
        .eq("id", activeSession.id)
        .select()
        .single()

      if (updateError) {
        return res.status(500).json({
          success: false,
          message: "Error al actualizar sesión de trabajo",
          error: updateError.message,
        })
      }

      return res.status(200).json({
        success: true,
        message: "Salida registrada exitosamente",
        data: {
          event: eventData,
          session: updatedSession,
        },
      })
    }

    // Si es un evento de inicio o fin de descanso
    if (type === ClockEventType.BREAK_START || type === ClockEventType.BREAK_END) {
      // Buscar sesión activa
      const { data: activeSession, error: sessionError } = await supabase
        .from("work_sessions")
        .select("*")
        .eq("technician_id", technicianId)
        .eq("status", type === ClockEventType.BREAK_START ? WorkSessionStatus.ACTIVE : WorkSessionStatus.ON_BREAK)
        .single()

      if (sessionError || !activeSession) {
        return res.status(400).json({
          success: false,
          message:
            type === ClockEventType.BREAK_START ? "No hay una sesión de trabajo activa" : "No hay un descanso activo",
        })
      }

      // Actualizar estado de la sesión y añadir evento de descanso
      const breakEvents = activeSession.break_events || []
      breakEvents.push(eventData.id)

      const { data: updatedSession, error: updateError } = await supabase
        .from("work_sessions")
        .update({
          break_events: breakEvents,
          status: type === ClockEventType.BREAK_START ? WorkSessionStatus.ON_BREAK : WorkSessionStatus.ACTIVE,
          updated_at: new Date().toISOString(),
        })
        .eq("id", activeSession.id)
        .select()
        .single()

      if (updateError) {
        return res.status(500).json({
          success: false,
          message: "Error al actualizar sesión de trabajo",
          error: updateError.message,
        })
      }

      return res.status(200).json({
        success: true,
        message:
          type === ClockEventType.BREAK_START
            ? "Inicio de descanso registrado exitosamente"
            : "Fin de descanso registrado exitosamente",
        data: {
          event: eventData,
          session: updatedSession,
        },
      })
    }

    return res.status(200).json({
      success: true,
      message: "Evento registrado exitosamente",
      data: eventData,
    })
  } catch (error) {
    console.error("Error al registrar evento de reloj:", error)
    return res.status(500).json({
      success: false,
      message: "Error en el servidor al registrar evento",
    })
  }
}

export const getWorkSessions = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Usuario no autenticado",
      })
    }

    const technicianId = req.user.id
    const { start_date, end_date } = req.query

    // Construir la consulta base
    let query = supabase.from("work_sessions").select("*").eq("technician_id", technicianId)

    // Aplicar filtros de fecha si se proporcionan
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
        message: "Error al obtener sesiones de trabajo",
        error: error.message,
      })
    }

    // Obtener eventos de reloj relacionados
    const allEventIds = data
      .flatMap((session) => [session.clock_in_event_id, ...(session.break_events || []), session.clock_out_event_id])
      .filter(Boolean)

    const { data: eventsData, error: eventsError } = await supabase
      .from("clock_events")
      .select("*")
      .in("id", allEventIds)

    if (eventsError) {
      return res.status(500).json({
        success: false,
        message: "Error al obtener eventos de reloj",
        error: eventsError.message,
      })
    }

    // Mapear eventos a sesiones
    const sessionsWithEvents = data.map((session) => {
      const clockInEvent = eventsData.find((event) => event.id === session.clock_in_event_id)
      const clockOutEvent = session.clock_out_event_id
        ? eventsData.find((event) => event.id === session.clock_out_event_id)
        : null

      const breakEvents = (session.break_events || [])
        .map((eventId: string) => eventsData.find((event) => event.id === eventId))
        .filter(Boolean)

      return {
        ...session,
        clockInEvent,
        clockOutEvent,
        breakEvents,
      }
    })

    return res.status(200).json({
      success: true,
      data: sessionsWithEvents,
    })
  } catch (error) {
    console.error("Error al obtener sesiones de trabajo:", error)
    return res.status(500).json({
      success: false,
      message: "Error en el servidor al obtener sesiones de trabajo",
    })
  }
}

export const getTechnicianStats = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Usuario no autenticado",
      })
    }

    const technicianId = req.user.id

    // Obtener sesiones de trabajo del último mes
    const oneMonthAgo = new Date()
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
    const startDate = oneMonthAgo.toISOString().split("T")[0]

    const { data: sessions, error: sessionsError } = await supabase
      .from("work_sessions")
      .select("*")
      .eq("technician_id", technicianId)
      .gte("date", startDate)

    if (sessionsError) {
      return res.status(500).json({
        success: false,
        message: "Error al obtener sesiones de trabajo",
        error: sessionsError.message,
      })
    }

    // Obtener reportes
    const { data: reports, error: reportsError } = await supabase
      .from("reports")
      .select("*")
      .eq("technician_id", technicianId)

    if (reportsError) {
      return res.status(500).json({
        success: false,
        message: "Error al obtener reportes",
        error: reportsError.message,
      })
    }

    // Calcular estadísticas
    const totalWorkSessions = sessions.length
    const totalWorkDuration = sessions.reduce((sum, session) => sum + (session.duration || 0), 0)
    const totalBreakDuration = sessions.reduce((sum, session) => sum + (session.break_duration || 0), 0)
    const averageSessionDuration = totalWorkSessions > 0 ? totalWorkDuration / totalWorkSessions : 0

    const completedReports = reports.filter((report) => report.status === ReportStatus.APPROVED).length
    const pendingReports = reports.filter((report) => report.status !== ReportStatus.APPROVED).length

    // Calcular horas de trabajo por semana (últimas 4 semanas)
    const weeklyWorkHours = [0, 0, 0, 0] // [semana actual, semana -1, semana -2, semana -3]

    const now = new Date()
    const currentWeekStart = new Date(now)
    currentWeekStart.setDate(now.getDate() - now.getDay()) // Domingo de la semana actual

    sessions.forEach((session) => {
      const sessionDate = new Date(session.date)
      const weeksDiff = Math.floor((currentWeekStart.getTime() - sessionDate.getTime()) / (7 * 24 * 60 * 60 * 1000))

      if (weeksDiff >= 0 && weeksDiff < 4) {
        // Convertir minutos a horas
        weeklyWorkHours[weeksDiff] += (session.duration || 0) / 60
      }
    })

    const stats = {
      totalWorkSessions,
      totalWorkDuration,
      totalBreakDuration,
      averageSessionDuration,
      completedReports,
      pendingReports,
      weeklyWorkHours,
    }

    return res.status(200).json({
      success: true,
      data: stats,
    })
  } catch (error) {
    console.error("Error al obtener estadísticas del técnico:", error)
    return res.status(500).json({
      success: false,
      message: "Error en el servidor al obtener estadísticas",
    })
  }
}

// Gestión de reportes
export const getReportTemplates = async (req: Request, res: Response) => {
  try {
    // Obtener plantillas de reporte
    const { data: templates, error } = await supabase
      .from("report_templates")
      .select(`
        *,
        sections:report_sections(
          *,
          items:report_items(*)
        )
      `)
      .order("sheet_number", { ascending: true })

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Error al obtener plantillas de reporte",
        error: error.message,
      })
    }

    // Formatear datos para el formato esperado por el cliente
    const formattedTemplates = templates.map((template) => ({
      id: template.id,
      type: template.type,
      name: template.name,
      sheetNumber: template.sheet_number,
      sections: template.sections.map((section: any) => ({
        id: section.id,
        title: section.title,
        items: section.items.map((item: any) => ({
          id: item.id,
          description: item.description,
          type: item.type,
          required: item.required,
        })),
      })),
      created_at: template.created_at,
      updated_at: template.updated_at,
    }))

    return res.status(200).json({
      success: true,
      data: formattedTemplates,
    })
  } catch (error) {
    console.error("Error al obtener plantillas de reporte:", error)
    return res.status(500).json({
      success: false,
      message: "Error en el servidor al obtener plantillas de reporte",
    })
  }
}

export const getTemplateForMonth = async (req: Request, res: Response) => {
  try {
    const { month } = req.params
    const monthNum = Number.parseInt(month, 10)

    if (isNaN(monthNum) || monthNum < 0 || monthNum > 11) {
      return res.status(400).json({
        success: false,
        message: "Mes inválido. Debe ser un número entre 0 (enero) y 11 (diciembre)",
      })
    }

    // Calcular el número de hoja para el mes
    // Hoja 1 para meses 0, 3, 6, 9 (Ene, Abr, Jul, Oct)
    // Hoja 2 para meses 1, 4, 7, 10 (Feb, May, Ago, Nov)
    // Hoja 3 para meses 2, 5, 8, 11 (Mar, Jun, Sep, Dic)
    const sheetNumber = (monthNum % 3) + 1

    // Obtener la plantilla correspondiente
    const { data: template, error } = await supabase
      .from("report_templates")
      .select(`
        *,
        sections:report_sections(
          *,
          items:report_items(*)
        )
      `)
      .eq("sheet_number", sheetNumber)
      .single()

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Error al obtener plantilla para el mes",
        error: error.message,
      })
    }

    // Formatear datos para el formato esperado por el cliente
    const formattedTemplate = {
      id: template.id,
      type: template.type,
      name: template.name,
      sheetNumber: template.sheet_number,
      sections: template.sections.map((section: any) => ({
        id: section.id,
        title: section.title,
        items: section.items.map((item: any) => ({
          id: item.id,
          description: item.description,
          type: item.type,
          required: item.required,
        })),
      })),
      created_at: template.created_at,
      updated_at: template.updated_at,
    }

    return res.status(200).json({
      success: true,
      data: formattedTemplate,
    })
  } catch (error) {
    console.error("Error al obtener plantilla para el mes:", error)
    return res.status(500).json({
      success: false,
      message: "Error en el servidor al obtener plantilla para el mes",
    })
  }
}

export const createReport = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Usuario no autenticado",
      })
    }

    const technicianId = req.user.id
    const {
      templateId,
      templateType,
      sheetNumber,
      buildingName,
      elevatorBrand,
      elevatorCount,
      floorCount,
      clockInTime,
      clockOutTime,
      date,
      sections,
      observations,
      technicianSignature,
      clientSignature,
      status,
    } = req.body

    // Validar datos requeridos
    if (!templateId || !buildingName || !elevatorBrand || !date || !sections) {
      return res.status(400).json({
        success: false,
        message: "Faltan datos requeridos para crear el reporte",
      })
    }

    // Crear reporte en la base de datos
    const { data: reportData, error: reportError } = await supabase
      .from("reports")
      .insert({
        technician_id: technicianId,
        template_id: templateId,
        template_type: templateType,
        sheet_number: sheetNumber,
        building_name: buildingName,
        elevator_brand: elevatorBrand,
        elevator_count: elevatorCount,
        floor_count: floorCount,
        clock_in_time: clockInTime,
        clock_out_time: clockOutTime,
        date,
        sections,
        observations,
        technician_signature: technicianSignature,
        client_signature: clientSignature,
        status: status || ReportStatus.DRAFT,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (reportError) {
      return res.status(500).json({
        success: false,
        message: "Error al crear reporte",
        error: reportError.message,
      })
    }

    // Generar PDF si el estado es SUBMITTED o APPROVED
    if (status === ReportStatus.SUBMITTED || status === ReportStatus.APPROVED) {
      try {
        // Obtener datos del técnico
        const { data: technicianData } = await supabase.from("users").select("name").eq("id", technicianId).single()

        // Generar PDF
        const pdfBuffer = await generatePdf({
          ...reportData,
          technician_name: technicianData?.name || "Técnico",
        })

        // Subir PDF a storage
        const fileName = `reports/${reportData.id}.pdf`
        const { url } = await uploadFile(pdfBuffer, fileName, "application/pdf")

        // Actualizar reporte con URL del PDF
        await supabase
          .from("reports")
          .update({
            pdf_url: url,
            updated_at: new Date().toISOString(),
          })
          .eq("id", reportData.id)

        // Actualizar objeto de respuesta
        reportData.pdf_url = url

        // Crear notificación para administradores
        const { data: admins } = await supabase.from("users").select("id").eq("role", "admin")

        if (admins) {
          for (const admin of admins) {
            await createNotification({
              user_id: admin.id,
              title: "Nuevo reporte de mantenimiento",
              message: `El técnico ${technicianData?.name || "Desconocido"} ha enviado un nuevo reporte para ${buildingName}`,
              type: "info",
              related_entity_type: "reports",
              related_entity_id: reportData.id,
            })
          }
        }
      } catch (pdfError) {
        console.error("Error al generar PDF:", pdfError)
        // No fallamos la petición si el PDF falla, solo lo registramos
      }
    }

    // Incrementar contador de reportes del técnico
    await supabase.rpc("increment_technician_reports_count", { technician_id: technicianId })

    return res.status(201).json({
      success: true,
      message: "Reporte creado exitosamente",
      data: reportData,
    })
  } catch (error) {
    console.error("Error al crear reporte:", error)
    return res.status(500).json({
      success: false,
      message: "Error en el servidor al crear reporte",
    })
  }
}

export const getReports = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Usuario no autenticado",
      })
    }

    const technicianId = req.user.id
    const { status, start_date, end_date } = req.query

    // Construir la consulta base
    let query = supabase.from("reports").select("*").eq("technician_id", technicianId)

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
        message: "Error al obtener reportes",
        error: error.message,
      })
    }

    return res.status(200).json({
      success: true,
      data,
    })
  } catch (error) {
    console.error("Error al obtener reportes:", error)
    return res.status(500).json({
      success: false,
      message: "Error en el servidor al obtener reportes",
    })
  }
}

export const getReportById = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Usuario no autenticado",
      })
    }

    const { id } = req.params

    // Obtener reporte
    const { data, error } = await supabase.from("reports").select("*").eq("id", id).single()

    if (error) {
      return res.status(404).json({
        success: false,
        message: "Reporte no encontrado",
        error: error.message,
      })
    }

    // Verificar que el reporte pertenece al técnico o es un administrador
    if (data.technician_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "No tiene permisos para ver este reporte",
      })
    }

    return res.status(200).json({
      success: true,
      data,
    })
  } catch (error) {
    console.error("Error al obtener reporte:", error)
    return res.status(500).json({
      success: false,
      message: "Error en el servidor al obtener reporte",
    })
  }
}

