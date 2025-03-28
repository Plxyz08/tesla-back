import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"

dotenv.config()

// Usar las credenciales proporcionadas o las del archivo .env
const supabaseUrl = process.env.SUPABASE_URL || "https://tougdfiwabrdxdygnrlv.supabase.co"
const supabaseKey =
  process.env.SUPABASE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvdWdkZml3YWJyZHhkeWducmx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMwNDc4NzMsImV4cCI6MjA1ODYyMzg3M30.9MTOzdYdcdgvcy63cosLKzQZXfXHKzyMu7Q489_q6LE"

// Crear y exportar el cliente de Supabase
export const supabase = createClient(supabaseUrl, supabaseKey)

// Función para verificar la conexión a Supabase
export const testConnection = async () => {
  try {
    // Verificar la conexión sin depender de la existencia de tablas específicas
    const { error } = await supabase
      .from("_dummy_query")
      .select("*")
      .limit(1)
      .match(() => ({ error: null }))

    // Si hay un error específico sobre la tabla no existente, lo ignoramos
    // ya que solo queremos verificar que podemos conectarnos a Supabase
    if (error && !error.message.includes("does not exist")) {
      console.error("Error connecting to Supabase:", error.message)
      return false
    }

    console.log("Successfully connected to Supabase")
    return true
  } catch (error) {
    console.error("Error testing Supabase connection:", error)
    return false
  }
}

