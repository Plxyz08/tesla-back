import type { Request, Response } from "express"
import { supabase } from "../config/supabase"

export const getNotifications = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Usuario no autenticado",
      })
    }

    const userId = req.user.id
    const { limit, offset, read } = req.query

    // Construir la consulta base
    let query = supabase.from("notifications").select("*").eq("user_id", userId)

    // Aplicar filtros si se proporcionan
    if (read !== undefined) {
      query = query.eq("read", read === "true")
    }

    // Aplicar paginación
    if (limit) {
      query = query.limit(Number.parseInt(limit as string))
    }

    // Ordenar por fecha de creación descendente
    query = query.order("created_at", { ascending: false })

    // Ejecutar la consulta
    let { data, error } = await query

    // Si se proporciona offset, aplicarlo manualmente después de obtener los resultados
    if (offset && data) {
      const offsetValue = Number.parseInt(offset as string)
      data = data.slice(offsetValue)
    }

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Error al obtener notificaciones",
        error: error.message,
      })
    }

    return res.status(200).json({
      success: true,
      data,
    })
  } catch (error) {
    console.error("Error al obtener notificaciones:", error)
    return res.status(500).json({
      success: false,
      message: "Error en el servidor al obtener notificaciones",
    })
  }
}

export const markAsRead = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Usuario no autenticado",
      })
    }

    const userId = req.user.id
    const { id } = req.params

    // Verificar que la notificación pertenece al usuario
    const { data: notification, error: checkError } = await supabase
      .from("notifications")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single()

    if (checkError || !notification) {
      return res.status(404).json({
        success: false,
        message: "Notificación no encontrada",
      })
    }

    // Marcar como leída
    const { data, error } = await supabase.from("notifications").update({ read: true }).eq("id", id).select().single()

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Error al marcar notificación como leída",
        error: error.message,
      })
    }

    return res.status(200).json({
      success: true,
      message: "Notificación marcada como leída",
      data,
    })
  } catch (error) {
    console.error("Error al marcar notificación como leída:", error)
    return res.status(500).json({
      success: false,
      message: "Error en el servidor al marcar notificación como leída",
    })
  }
}

export const markAllAsRead = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Usuario no autenticado",
      })
    }

    const userId = req.user.id

    // Marcar todas las notificaciones como leídas
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false)

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Error al marcar notificaciones como leídas",
        error: error.message,
      })
    }

    return res.status(200).json({
      success: true,
      message: "Todas las notificaciones marcadas como leídas",
    })
  } catch (error) {
    console.error("Error al marcar todas las notificaciones como leídas:", error)
    return res.status(500).json({
      success: false,
      message: "Error en el servidor al marcar notificaciones como leídas",
    })
  }
}

export const deleteNotification = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Usuario no autenticado",
      })
    }

    const userId = req.user.id
    const { id } = req.params

    // Verificar que la notificación pertenece al usuario
    const { data: notification, error: checkError } = await supabase
      .from("notifications")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single()

    if (checkError || !notification) {
      return res.status(404).json({
        success: false,
        message: "Notificación no encontrada",
      })
    }

    // Eliminar notificación
    const { error } = await supabase.from("notifications").delete().eq("id", id)

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Error al eliminar notificación",
        error: error.message,
      })
    }

    return res.status(200).json({
      success: true,
      message: "Notificación eliminada exitosamente",
    })
  } catch (error) {
    console.error("Error al eliminar notificación:", error)
    return res.status(500).json({
      success: false,
      message: "Error en el servidor al eliminar notificación",
    })
  }
}

