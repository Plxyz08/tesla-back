import { supabase } from "../config/supabase"

interface CreateNotificationParams {
  user_id: string
  title: string
  message: string
  type: string // Cambiado de NotificationType a string para permitir más flexibilidad
  related_entity_type?: string
  related_entity_id?: string
}

export const createNotification = async (params: CreateNotificationParams) => {
  try {
    const { user_id, title, message, type, related_entity_type, related_entity_id } = params

    const { data, error } = await supabase
      .from("notifications")
      .insert({
        user_id,
        title,
        message,
        type,
        read: false,
        related_entity_type,
        related_entity_id,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error("Error al crear notificación:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("Error en el servicio de notificaciones:", error)
    return null
  }
}

export const getNotifications = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error al obtener notificaciones:", error)
      return []
    }

    return data
  } catch (error) {
    console.error("Error en el servicio de notificaciones:", error)
    return []
  }
}

export const markNotificationAsRead = async (notificationId: string) => {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notificationId)
      .select()
      .single()

    if (error) {
      console.error("Error al marcar notificación como leída:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("Error en el servicio de notificaciones:", error)
    return null
  }
}

export const markAllNotificationsAsRead = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false)

    if (error) {
      console.error("Error al marcar todas las notificaciones como leídas:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error en el servicio de notificaciones:", error)
    return false
  }
}

export const deleteNotification = async (notificationId: string) => {
  try {
    const { error } = await supabase.from("notifications").delete().eq("id", notificationId)

    if (error) {
      console.error("Error al eliminar notificación:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error en el servicio de notificaciones:", error)
    return false
  }
}

