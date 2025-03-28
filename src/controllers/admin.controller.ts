import type { Request, Response } from "express"
import { supabase } from "../config/supabase"
import { UserRole, UserStatus } from "../config/constants"
import { createNotification } from "../services/notification.service"
import { generateRandomPassword } from "../utils/helpers"
import { generatePdf, generateManagementReport } from "../services/pdf.service"
import { uploadFile } from "../services/storage.service"
import { sendWelcomeEmail } from "../services/email.service"

// Gestión de Técnicos
export const createTechnician = async (req: Request, res: Response) => {
  try {
    const { name, email, phone, specialization } = req.body

    // Validar datos requeridos
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Nombre y email son requeridos",
      })
    }

    // Generar contraseña aleatoria
    const password = generateRandomPassword()

    // Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: UserRole.TECHNICIAN,
        },
      },
    })

    if (authError) {
      return res.status(400).json({
        success: false,
        message: "Error al crear el usuario",
        error: authError.message,
      })
    }

    // Crear registro en la tabla users
    const { data: userData, error: userError } = await supabase
      .from("users")
      .insert({
        id: authData.user?.id,
        email,
        name,
        role: UserRole.TECHNICIAN,
        status: UserStatus.ACTIVE,
        phone,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (userError) {
      // Rollback: eliminar usuario de Auth si falla la inserción en la tabla users
      await supabase.auth.admin.deleteUser(authData.user?.id || "")

      return res.status(500).json({
        success: false,
        message: "Error al crear el registro del técnico",
        error: userError.message,
      })
    }

    // Crear registro en la tabla technicians
    const { error: techError } = await supabase.from("technicians").insert({
      user_id: userData.id,
      specialization: specialization || [],
      reports_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    if (techError) {
      // Rollback: eliminar usuario de Auth y de la tabla users si falla
      await supabase.from("users").delete().eq("id", userData.id)
      await supabase.auth.admin.deleteUser(userData.id)

      return res.status(500).json({
        success: false,
        message: "Error al crear el registro del técnico",
        error: techError.message,
      })
    }

    // Crear notificación para el nuevo técnico
    await createNotification({
      user_id: userData.id,
      title: "Bienvenido a TeslaLift",
      message: `Hola ${name}, tu cuenta ha sido creada exitosamente. Tu contraseña temporal es: ${password}`,
      type: "info",
    })

    // Enviar email de bienvenida
    await sendWelcomeEmail(email, name, password)

    return res.status(201).json({
      success: true,
      message: "Técnico creado exitosamente",
      data: {
        ...userData,
        password, // Incluir la contraseña generada en la respuesta
        specialization,
      },
    })
  } catch (error) {
    console.error("Error al crear técnico:", error)
    return res.status(500).json({
      success: false,
      message: "Error en el servidor al crear el técnico",
    })
  }
}

export const getTechnicians = async (req: Request, res: Response) => {
  try {
    // Obtener parámetros de consulta para filtrado
    const { status, specialization } = req.query

    // Construir la consulta base
    let query = supabase
      .from("users")
      .select(`
        *,
        technicians (*)
      `)
      .eq("role", UserRole.TECHNICIAN)

    // Aplicar filtros si se proporcionan
    if (status) {
      query = query.eq("status", status)
    }

    // Ejecutar la consulta
    const { data, error } = await query

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Error al obtener técnicos",
        error: error.message,
      })
    }

    // Filtrar por especialización si se proporciona
    let filteredData = data
    if (specialization && typeof specialization === "string") {
      filteredData = data.filter(
        (tech) =>
          tech.technicians &&
          tech.technicians.length > 0 &&
          tech.technicians[0].specialization &&
          tech.technicians[0].specialization.includes(specialization),
      )
    }

    // Transformar los datos para el formato esperado
    const formattedData = filteredData.map((user) => {
      const { password: _, ...userWithoutPassword } = user
      const techData = user.technicians && user.technicians.length > 0 ? user.technicians[0] : {}

      return {
        ...userWithoutPassword,
        ...techData,
      }
    })

    return res.status(200).json({
      success: true,
      data: formattedData,
    })
  } catch (error) {
    console.error("Error al obtener técnicos:", error)
    return res.status(500).json({
      success: false,
      message: "Error en el servidor al obtener técnicos",
    })
  }
}

export const getTechnicianById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const { data, error } = await supabase
      .from("users")
      .select(`
        *,
        technicians (*)
      `)
      .eq("id", id)
      .eq("role", UserRole.TECHNICIAN)
      .single()

    if (error) {
      return res.status(404).json({
        success: false,
        message: "Técnico no encontrado",
        error: error.message,
      })
    }

    // Transformar los datos para el formato esperado
    const { password: _, ...userWithoutPassword } = data
    const techData = data.technicians && data.technicians.length > 0 ? data.technicians[0] : {}

    const formattedData = {
      ...userWithoutPassword,
      ...techData,
    }

    return res.status(200).json({
      success: true,
      data: formattedData,
    })
  } catch (error) {
    console.error("Error al obtener técnico:", error)
    return res.status(500).json({
      success: false,
      message: "Error en el servidor al obtener técnico",
    })
  }
}

export const updateTechnician = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { name, phone, status, specialization } = req.body

    // Actualizar usuario en la tabla users
    const { data: userData, error: userError } = await supabase
      .from("users")
      .update({
        name: name,
        phone: phone,
        status: status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("role", UserRole.TECHNICIAN)
      .select()
      .single()

    if (userError) {
      return res.status(404).json({
        success: false,
        message: "Técnico no encontrado",
        error: userError.message,
      })
    }

    // Actualizar especialización en la tabla technicians si se proporciona
    if (specialization) {
      const { error: techError } = await supabase
        .from("technicians")
        .update({
          specialization: specialization,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", id)

      if (techError) {
        return res.status(500).json({
          success: false,
          message: "Error al actualizar la especialización del técnico",
          error: techError.message,
        })
      }
    }

    // Obtener datos actualizados
    const { data: updatedData, error: getError } = await supabase
      .from("users")
      .select(`
        *,
        technicians (*)
      `)
      .eq("id", id)
      .single()

    if (getError) {
      return res.status(500).json({
        success: false,
        message: "Error al obtener datos actualizados del técnico",
        error: getError.message,
      })
    }

    // Transformar los datos para el formato esperado
    const { password: _, ...userWithoutPassword } = updatedData
    const techData = updatedData.technicians && updatedData.technicians.length > 0 ? updatedData.technicians[0] : {}

    const formattedData = {
      ...userWithoutPassword,
      ...techData,
    }

    return res.status(200).json({
      success: true,
      message: "Técnico actualizado exitosamente",
      data: formattedData,
    })
  } catch (error) {
    console.error("Error al actualizar técnico:", error)
    return res.status(500).json({
      success: false,
      message: "Error en el servidor al actualizar técnico",
    })
  }
}

export const deleteTechnician = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    // Verificar si el técnico existe
    const { data: existingUser, error: checkError } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .eq("role", UserRole.TECHNICIAN)
      .single()

    if (checkError || !existingUser) {
      return res.status(404).json({
        success: false,
        message: "Técnico no encontrado",
      })
    }

    // Eliminar registro de la tabla technicians
    const { error: techError } = await supabase.from("technicians").delete().eq("user_id", id)

    if (techError) {
      return res.status(500).json({
        success: false,
        message: "Error al eliminar datos del técnico",
        error: techError.message,
      })
    }

    // Eliminar usuario de la tabla users
    const { error: userError } = await supabase.from("users").delete().eq("id", id)

    if (userError) {
      return res.status(500).json({
        success: false,
        message: "Error al eliminar usuario",
        error: userError.message,
      })
    }

    // Eliminar usuario de Auth
    const { error: authError } = await supabase.auth.admin.deleteUser(id)

    if (authError) {
      console.error("Error al eliminar usuario de Auth:", authError)
      // No devolvemos error al cliente ya que los datos ya fueron eliminados de las tablas
    }

    return res.status(200).json({
      success: true,
      message: "Técnico eliminado exitosamente",
    })
  } catch (error) {
    console.error("Error al eliminar técnico:", error)
    return res.status(500).json({
      success: false,
      message: "Error en el servidor al eliminar técnico",
    })
  }
}

// Gestión de Clientes
export const createClient = async (req: Request, res: Response) => {
  try {
    const { name, ruc, email, phone, address, contract_type, contact_person } = req.body

    // Validar datos requeridos
    if (!name || !ruc || !email) {
      return res.status(400).json({
        success: false,
        message: "Nombre, RUC y email son requeridos",
      })
    }

    // Generar contraseña aleatoria
    const password = generateRandomPassword()

    // Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: UserRole.CLIENT,
        },
      },
    })

    if (authError) {
      return res.status(400).json({
        success: false,
        message: "Error al crear el usuario",
        error: authError.message,
      })
    }

    // Crear registro en la tabla users
    const { data: userData, error: userError } = await supabase
      .from("users")
      .insert({
        id: authData.user?.id,
        email,
        name,
        role: UserRole.CLIENT,
        status: UserStatus.ACTIVE,
        phone,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (userError) {
      // Rollback: eliminar usuario de Auth si falla la inserción en la tabla users
      await supabase.auth.admin.deleteUser(authData.user?.id || "")

      return res.status(500).json({
        success: false,
        message: "Error al crear el registro del cliente",
        error: userError.message,
      })
    }

    // Crear registro en la tabla clients
    const { data: clientData, error: clientError } = await supabase
      .from("clients")
      .insert({
        user_id: userData.id,
        name,
        ruc,
        email,
        phone,
        address,
        status: UserStatus.ACTIVE,
        contract_type: contract_type || "monthly",
        invoice_status: "pending",
        buildings_count: 0,
        elevators_count: 0,
        contact_person,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (clientError) {
      // Rollback: eliminar usuario de Auth y de la tabla users si falla
      await supabase.from("users").delete().eq("id", userData.id)
      await supabase.auth.admin.deleteUser(userData.id)

      return res.status(500).json({
        success: false,
        message: "Error al crear el registro del cliente",
        error: clientError.message,
      })
    }

    // Crear notificación para el nuevo cliente
    await createNotification({
      user_id: userData.id,
      title: "Bienvenido a TeslaLift",
      message: `Hola ${name}, su cuenta ha sido creada exitosamente. Su contraseña temporal es: ${password}`,
      type: "info",
    })

    // Enviar email de bienvenida
    await sendWelcomeEmail(email, name, password)

    return res.status(201).json({
      success: true,
      message: "Cliente creado exitosamente",
      data: {
        ...userData,
        ...clientData,
        password, // Incluir la contraseña generada en la respuesta
      },
    })
  } catch (error) {
    console.error("Error al crear cliente:", error)
    return res.status(500).json({
      success: false,
      message: "Error en el servidor al crear el cliente",
    })
  }
}

// Implementación de métodos faltantes para clientes
export const getClients = async (req: Request, res: Response) => {
  try {
    // Obtener parámetros de consulta para filtrado
    const { status, contract_type } = req.query

    // Construir la consulta base
    let query = supabase
      .from("users")
      .select(`
        *,
        clients (*)
      `)
      .eq("role", UserRole.CLIENT)

    // Aplicar filtros si se proporcionan
    if (status) {
      query = query.eq("status", status)
    }

    // Ejecutar la consulta
    const { data, error } = await query

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Error al obtener clientes",
        error: error.message,
      })
    }

    // Filtrar por tipo de contrato si se proporciona
    let filteredData = data
    if (contract_type && typeof contract_type === "string") {
      filteredData = data.filter(
        (client) => client.clients && client.clients.length > 0 && client.clients[0].contract_type === contract_type,
      )
    }

    // Transformar los datos para el formato esperado
    const formattedData = filteredData.map((user) => {
      const { password: _, ...userWithoutPassword } = user
      const clientData = user.clients && user.clients.length > 0 ? user.clients[0] : {}

      return {
        ...userWithoutPassword,
        ...clientData,
      }
    })

    return res.status(200).json({
      success: true,
      data: formattedData,
    })
  } catch (error) {
    console.error("Error al obtener clientes:", error)
    return res.status(500).json({
      success: false,
      message: "Error en el servidor al obtener clientes",
    })
  }
}

export const getClientById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const { data, error } = await supabase
      .from("users")
      .select(`
        *,
        clients (*)
      `)
      .eq("id", id)
      .eq("role", UserRole.CLIENT)
      .single()

    if (error) {
      return res.status(404).json({
        success: false,
        message: "Cliente no encontrado",
        error: error.message,
      })
    }

    // Transformar los datos para el formato esperado
    const { password: _, ...userWithoutPassword } = data
    const clientData = data.clients && data.clients.length > 0 ? data.clients[0] : {}

    const formattedData = {
      ...userWithoutPassword,
      ...clientData,
    }

    return res.status(200).json({
      success: true,
      data: formattedData,
    })
  } catch (error) {
    console.error("Error al obtener cliente:", error)
    return res.status(500).json({
      success: false,
      message: "Error en el servidor al obtener cliente",
    })
  }
}

export const updateClient = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { name, phone, status, address, contract_type, contact_person } = req.body

    // Actualizar usuario en la tabla users
    const { data: userData, error: userError } = await supabase
      .from("users")
      .update({
        name: name,
        phone: phone,
        status: status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("role", UserRole.CLIENT)
      .select()
      .single()

    if (userError) {
      return res.status(404).json({
        success: false,
        message: "Cliente no encontrado",
        error: userError.message,
      })
    }

    // Actualizar datos en la tabla clients
    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (name) updateData.name = name
    if (address) updateData.address = address
    if (contract_type) updateData.contract_type = contract_type
    if (contact_person) updateData.contact_person = contact_person

    const { error: clientError } = await supabase.from("clients").update(updateData).eq("user_id", id)

    if (clientError) {
      return res.status(500).json({
        success: false,
        message: "Error al actualizar datos del cliente",
        error: clientError.message,
      })
    }

    // Obtener datos actualizados
    const { data: updatedData, error: getError } = await supabase
      .from("users")
      .select(`
        *,
        clients (*)
      `)
      .eq("id", id)
      .single()

    if (getError) {
      return res.status(500).json({
        success: false,
        message: "Error al obtener datos actualizados del cliente",
        error: getError.message,
      })
    }

    // Transformar los datos para el formato esperado
    const { password: _, ...userWithoutPassword } = updatedData
    const clientData = updatedData.clients && updatedData.clients.length > 0 ? updatedData.clients[0] : {}

    const formattedData = {
      ...userWithoutPassword,
      ...clientData,
    }

    return res.status(200).json({
      success: true,
      message: "Cliente actualizado exitosamente",
      data: formattedData,
    })
  } catch (error) {
    console.error("Error al actualizar cliente:", error)
    return res.status(500).json({
      success: false,
      message: "Error en el servidor al actualizar cliente",
    })
  }
}

export const deleteClient = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    // Verificar si el cliente existe
    const { data: existingUser, error: checkError } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .eq("role", UserRole.CLIENT)
      .single()

    if (checkError || !existingUser) {
      return res.status(404).json({
        success: false,
        message: "Cliente no encontrado",
      })
    }

    // Eliminar registro de la tabla clients
    const { error: clientError } = await supabase.from("clients").delete().eq("user_id", id)

    if (clientError) {
      return res.status(500).json({
        success: false,
        message: "Error al eliminar datos del cliente",
        error: clientError.message,
      })
    }

    // Eliminar usuario de la tabla users
    const { error: userError } = await supabase.from("users").delete().eq("id", id)

    if (userError) {
      return res.status(500).json({
        success: false,
        message: "Error al eliminar usuario",
        error: userError.message,
      })
    }

    // Eliminar usuario de Auth
    const { error: authError } = await supabase.auth.admin.deleteUser(id)

    if (authError) {
      console.error("Error al eliminar usuario de Auth:", authError)
      // No devolvemos error al cliente ya que los datos ya fueron eliminados de las tablas
    }

    return res.status(200).json({
      success: true,
      message: "Cliente eliminado exitosamente",
    })
  } catch (error) {
    console.error("Error al eliminar cliente:", error)
    return res.status(500).json({
      success: false,
      message: "Error en el servidor al eliminar cliente",
    })
  }
}

// Gestión de Reportes e Informes
export const getReports = async (req: Request, res: Response) => {
  try {
    // Obtener parámetros de consulta para filtrado
    const { status, technician_id, start_date, end_date } = req.query

    // Construir la consulta base
    let query = supabase.from("reports").select(`
        *,
        users (name)
      `)

    // Aplicar filtros si se proporcionan
    if (status) {
      query = query.eq("status", status)
    }

    if (technician_id) {
      query = query.eq("technician_id", technician_id)
    }

    if (start_date && end_date) {
      query = query.gte("date", start_date as string).lte("date", end_date as string)
    } else if (start_date) {
      query = query.gte("date", start_date as string)
    } else if (end_date) {
      query = query.lte("date", end_date as string)
    }

    // Ejecutar la consulta
    const { data, error } = await query

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Error al obtener reportes",
        error: error.message,
      })
    }

    // Transformar los datos para incluir el nombre del técnico
    const formattedData = data.map((report) => {
      const technicianName = report.users ? report.users.name : "Desconocido"

      return {
        ...report,
        technician_name: technicianName,
        users: undefined, // Eliminar el objeto users anidado
      }
    })

    return res.status(200).json({
      success: true,
      data: formattedData,
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
    const { id } = req.params

    const { data, error } = await supabase
      .from("reports")
      .select(`
        *,
        users (name)
      `)
      .eq("id", id)
      .single()

    if (error) {
      return res.status(404).json({
        success: false,
        message: "Reporte no encontrado",
        error: error.message,
      })
    }

    // Transformar los datos para incluir el nombre del técnico
    const technicianName = data.users ? data.users.name : "Desconocido"

    const formattedData = {
      ...data,
      technician_name: technicianName,
      users: undefined, // Eliminar el objeto users anidado
    }

    return res.status(200).json({
      success: true,
      data: formattedData,
    })
  } catch (error) {
    console.error("Error al obtener reporte:", error)
    return res.status(500).json({
      success: false,
      message: "Error en el servidor al obtener reporte",
    })
  }
}

export const updateReport = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { status, observations } = req.body

    // Verificar si el reporte existe
    const { data: existingReport, error: checkError } = await supabase.from("reports").select("*").eq("id", id).single()

    if (checkError || !existingReport) {
      return res.status(404).json({
        success: false,
        message: "Reporte no encontrado",
      })
    }

    // Actualizar reporte
    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (status) updateData.status = status
    if (observations) updateData.observations = observations

    const { data, error } = await supabase.from("reports").update(updateData).eq("id", id).select().single()

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Error al actualizar reporte",
        error: error.message,
      })
    }

    // Si el estado cambió a APPROVED o SUBMITTED, generar PDF
    if (status === "approved" || status === "submitted") {
      try {
        // Obtener datos del técnico
        const { data: technicianData } = await supabase
          .from("users")
          .select("name")
          .eq("id", data.technician_id)
          .single()

        // Generar PDF
        const pdfBuffer = await generatePdf({
          ...data,
          technician_name: technicianData?.name || "Técnico",
        })

        // Subir PDF a storage
        const fileName = `reports/${data.id}.pdf`
        const { url } = await uploadFile(pdfBuffer, fileName, "application/pdf")

        // Actualizar reporte con URL del PDF
        await supabase
          .from("reports")
          .update({
            pdf_url: url,
            updated_at: new Date().toISOString(),
          })
          .eq("id", data.id)

        // Actualizar objeto de respuesta
        data.pdf_url = url
      } catch (pdfError) {
        console.error("Error al generar PDF:", pdfError)
        // No fallamos la petición si el PDF falla, solo lo registramos
      }
    }

    // Crear notificación para el técnico si el estado cambió a APPROVED
    if (status === "approved" && existingReport.status !== "approved") {
      await createNotification({
        user_id: data.technician_id,
        title: "Reporte aprobado",
        message: `Tu reporte para ${data.building_name} ha sido aprobado.`,
        type: "success",
        related_entity_type: "reports",
        related_entity_id: data.id,
      })
    }

    return res.status(200).json({
      success: true,
      message: "Reporte actualizado exitosamente",
      data,
    })
  } catch (error) {
    console.error("Error al actualizar reporte:", error)
    return res.status(500).json({
      success: false,
      message: "Error en el servidor al actualizar reporte",
    })
  }
}

export const deleteReport = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    // Verificar si el reporte existe
    const { data: existingReport, error: checkError } = await supabase.from("reports").select("*").eq("id", id).single()

    if (checkError || !existingReport) {
      return res.status(404).json({
        success: false,
        message: "Reporte no encontrado",
      })
    }

    // Eliminar reporte
    const { error } = await supabase.from("reports").delete().eq("id", id)

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Error al eliminar reporte",
        error: error.message,
      })
    }

    return res.status(200).json({
      success: true,
      message: "Reporte eliminado exitosamente",
    })
  } catch (error) {
    console.error("Error al eliminar reporte:", error)
    return res.status(500).json({
      success: false,
      message: "Error en el servidor al eliminar reporte",
    })
  }
}

export const generateReportPdf = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    // Obtener reporte
    const { data: report, error: reportError } = await supabase.from("reports").select("*").eq("id", id).single()

    if (reportError || !report) {
      return res.status(404).json({
        success: false,
        message: "Reporte no encontrado",
      })
    }

    // Obtener datos del técnico
    const { data: technicianData } = await supabase.from("users").select("name").eq("id", report.technician_id).single()

    // Generar PDF
    const pdfBuffer = await generatePdf({
      ...report,
      technician_name: technicianData?.name || "Técnico",
    })

    // Subir PDF a storage
    const fileName = `reports/${report.id}.pdf`
    const { url } = await uploadFile(pdfBuffer, fileName, "application/pdf")

    // Actualizar reporte con URL del PDF
    await supabase
      .from("reports")
      .update({
        pdf_url: url,
        updated_at: new Date().toISOString(),
      })
      .eq("id", report.id)

    return res.status(200).json({
      success: true,
      message: "PDF generado exitosamente",
      data: {
        pdf_url: url,
      },
    })
  } catch (error) {
    console.error("Error al generar PDF:", error)
    return res.status(500).json({
      success: false,
      message: "Error en el servidor al generar PDF",
    })
  }
}

// Informes de gestión
export const createManagementReport = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Usuario no autenticado",
      })
    }

    const { start_date, end_date, include_reports, include_technicians, include_clients } = req.body

    // Validar datos requeridos
    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: "Fechas de inicio y fin son requeridas",
      })
    }

    // Obtener datos para el informe
    const reportData: any = {
      startDate: start_date,
      endDate: end_date,
      generatedBy: req.user.name,
      includeReports: include_reports || false,
      includeTechnicians: include_technicians || false,
      includeClients: include_clients || false,
    }

    // Obtener estadísticas de reportes
    const { data: reports, error: reportsError } = await supabase
      .from("reports")
      .select("*")
      .gte("date", start_date)
      .lte("date", end_date)

    if (reportsError) {
      return res.status(500).json({
        success: false,
        message: "Error al obtener reportes",
        error: reportsError.message,
      })
    }

    reportData.totalReports = reports.length
    reportData.reports = reports

    // Obtener estadísticas de técnicos
    const { data: technicians, error: techniciansError } = await supabase
      .from("users")
      .select(`
        *,
        technicians (*)
      `)
      .eq("role", UserRole.TECHNICIAN)
      .eq("status", UserStatus.ACTIVE)

    if (techniciansError) {
      return res.status(500).json({
        success: false,
        message: "Error al obtener técnicos",
        error: techniciansError.message,
      })
    }

    reportData.activeTechnicians = technicians.length
    reportData.technicians = technicians.map((tech) => {
      const { password: _, ...userWithoutPassword } = tech
      const techData = tech.technicians && tech.technicians.length > 0 ? tech.technicians[0] : {}

      return {
        ...userWithoutPassword,
        ...techData,
      }
    })

    // Obtener estadísticas de clientes
    const { data: clients, error: clientsError } = await supabase
      .from("users")
      .select(`
        *,
        clients (*)
      `)
      .eq("role", UserRole.CLIENT)
      .eq("status", UserStatus.ACTIVE)

    if (clientsError) {
      return res.status(500).json({
        success: false,
        message: "Error al obtener clientes",
        error: clientsError.message,
      })
    }

    reportData.activeClients = clients.length
    reportData.clients = clients.map((client) => {
      const { password: _, ...userWithoutPassword } = client
      const clientData = client.clients && client.clients.length > 0 ? client.clients[0] : {}

      return {
        ...userWithoutPassword,
        ...clientData,
      }
    })

    // Generar PDF
    const pdfBuffer = await generateManagementReport(reportData)

    // Subir PDF a storage
    const fileName = `management_reports/report_${new Date().toISOString().split("T")[0]}.pdf`
    const { url } = await uploadFile(pdfBuffer, fileName, "application/pdf")

    // Crear registro en la tabla de informes de gestión
    const { data: managementReport, error: managementReportError } = await supabase
      .from("management_reports")
      .insert({
        start_date,
        end_date,
        total_reports: reportData.totalReports,
        active_technicians: reportData.activeTechnicians,
        active_clients: reportData.activeClients,
        generated_by: req.user.id,
        pdf_url: url,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (managementReportError) {
      return res.status(500).json({
        success: false,
        message: "Error al crear informe de gestión",
        error: managementReportError.message,
      })
    }

    return res.status(201).json({
      success: true,
      message: "Informe de gestión creado exitosamente",
      data: {
        ...managementReport,
        pdf_url: url,
      },
    })
  } catch (error) {
    console.error("Error al crear informe de gestión:", error)
    return res.status(500).json({
      success: false,
      message: "Error en el servidor al crear informe de gestión",
    })
  }
}

export const getManagementReports = async (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query

    // Construir la consulta base
    let query = supabase.from("management_reports").select(`
        *,
        users:generated_by (name)
      `)

    // Aplicar filtros si se proporcionan
    if (start_date && end_date) {
      query = query.gte("created_at", start_date as string).lte("created_at", end_date as string)
    } else if (start_date) {
      query = query.gte("created_at", start_date as string)
    } else if (end_date) {
      query = query.lte("created_at", end_date as string)
    }

    // Ordenar por fecha de creación descendente
    query = query.order("created_at", { ascending: false })

    // Ejecutar la consulta
    const { data, error } = await query

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Error al obtener informes de gestión",
        error: error.message,
      })
    }

    // Transformar los datos para incluir el nombre del generador
    const formattedData = data.map((report) => {
      const generatorName = report.users ? report.users.name : "Desconocido"

      return {
        ...report,
        generator_name: generatorName,
        users: undefined, // Eliminar el objeto users anidado
      }
    })

    return res.status(200).json({
      success: true,
      data: formattedData,
    })
  } catch (error) {
    console.error("Error al obtener informes de gestión:", error)
    return res.status(500).json({
      success: false,
      message: "Error en el servidor al obtener informes de gestión",
    })
  }
}

export const getManagementReportById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const { data, error } = await supabase
      .from("management_reports")
      .select(`
        *,
        users:generated_by (name)
      `)
      .eq("id", id)
      .single()

    if (error) {
      return res.status(404).json({
        success: false,
        message: "Informe de gestión no encontrado",
        error: error.message,
      })
    }

    // Transformar los datos para incluir el nombre del generador
    const generatorName = data.users ? data.users.name : "Desconocido"

    const formattedData = {
      ...data,
      generator_name: generatorName,
      users: undefined, // Eliminar el objeto users anidado
    }

    return res.status(200).json({
      success: true,
      data: formattedData,
    })
  } catch (error) {
    console.error("Error al obtener informe de gestión:", error)
    return res.status(500).json({
      success: false,
      message: "Error en el servidor al obtener informe de gestión",
    })
  }
}

export const deleteManagementReport = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    // Verificar si el informe existe
    const { data: existingReport, error: checkError } = await supabase
      .from("management_reports")
      .select("*")
      .eq("id", id)
      .single()

    if (checkError || !existingReport) {
      return res.status(404).json({
        success: false,
        message: "Informe de gestión no encontrado",
      })
    }

    // Eliminar informe
    const { error } = await supabase.from("management_reports").delete().eq("id", id)

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Error al eliminar informe de gestión",
        error: error.message,
      })
    }

    return res.status(200).json({
      success: true,
      message: "Informe de gestión eliminado exitosamente",
    })
  } catch (error) {
    console.error("Error al eliminar informe de gestión:", error)
    return res.status(500).json({
      success: false,
      message: "Error en el servidor al eliminar informe de gestión",
    })
  }
}

