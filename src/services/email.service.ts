import nodemailer from "nodemailer"
import dotenv from "dotenv"
import logger from "../utils/logger"

dotenv.config()

// Configuración del transporte de correo
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: Number.parseInt(process.env.EMAIL_PORT || "587"),
  secure: process.env.EMAIL_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
})

// Interfaz para opciones de correo
interface EmailOptions {
  to: string
  subject: string
  text?: string
  html?: string
  attachments?: Array<{
    filename: string
    content: Buffer | string
    contentType?: string
  }>
}

/**
 * Envía un correo electrónico
 * @param options Opciones del correo
 * @returns Promise<boolean> Indica si el correo se envió correctamente
 */
export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  try {
    // Verificar si se ha configurado el servicio de correo
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      logger.warn("Servicio de correo no configurado. No se enviará el correo.")
      return false
    }

    // Configurar opciones del correo
    const mailOptions = {
      from: `"TeslaLift" <${process.env.EMAIL_USER}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments,
    }

    // Enviar correo
    const info = await transporter.sendMail(mailOptions)
    logger.info(`Correo enviado: ${info.messageId}`)
    return true
  } catch (error) {
    logger.error(`Error al enviar correo: ${error}`)
    return false
  }
}

/**
 * Envía un correo de bienvenida
 * @param to Dirección de correo del destinatario
 * @param name Nombre del destinatario
 * @param password Contraseña temporal
 * @returns Promise<boolean> Indica si el correo se envió correctamente
 */
export const sendWelcomeEmail = async (to: string, name: string, password: string): Promise<boolean> => {
  const subject = "Bienvenido a TeslaLift"
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #333;">Bienvenido a TeslaLift</h1>
      </div>
      <div style="margin-bottom: 20px;">
        <p>Hola ${name},</p>
        <p>¡Bienvenido a TeslaLift! Tu cuenta ha sido creada exitosamente.</p>
        <p>Tus credenciales de acceso son:</p>
        <ul>
          <li><strong>Email:</strong> ${to}</li>
          <li><strong>Contraseña temporal:</strong> ${password}</li>
        </ul>
        <p>Por seguridad, te recomendamos cambiar tu contraseña después de iniciar sesión por primera vez.</p>
      </div>
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #777; font-size: 12px;">
        <p>Este es un correo automático, por favor no responder.</p>
        <p>&copy; ${new Date().getFullYear()} TeslaLift. Todos los derechos reservados.</p>
      </div>
    </div>
  `

  return await sendEmail({ to, subject, html })
}

/**
 * Envía un correo de restablecimiento de contraseña
 * @param to Dirección de correo del destinatario
 * @param name Nombre del destinatario
 * @param resetLink Enlace para restablecer la contraseña
 * @returns Promise<boolean> Indica si el correo se envió correctamente
 */
export const sendPasswordResetEmail = async (to: string, name: string, resetLink: string): Promise<boolean> => {
  const subject = "Restablecimiento de contraseña - TeslaLift"
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #333;">Restablecimiento de contraseña</h1>
      </div>
      <div style="margin-bottom: 20px;">
        <p>Hola ${name},</p>
        <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en TeslaLift.</p>
        <p>Haz clic en el siguiente enlace para restablecer tu contraseña:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Restablecer contraseña</a>
        </p>
        <p>Si no solicitaste este restablecimiento, puedes ignorar este correo.</p>
        <p>El enlace expirará en 24 horas.</p>
      </div>
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #777; font-size: 12px;">
        <p>Este es un correo automático, por favor no responder.</p>
        <p>&copy; ${new Date().getFullYear()} TeslaLift. Todos los derechos reservados.</p>
      </div>
    </div>
  `

  return await sendEmail({ to, subject, html })
}

/**
 * Envía un correo de notificación
 * @param to Dirección de correo del destinatario
 * @param name Nombre del destinatario
 * @param title Título de la notificación
 * @param message Mensaje de la notificación
 * @returns Promise<boolean> Indica si el correo se envió correctamente
 */
export const sendNotificationEmail = async (
  to: string,
  name: string,
  title: string,
  message: string,
): Promise<boolean> => {
  const subject = `Notificación: ${title} - TeslaLift`
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #333;">Notificación</h1>
      </div>
      <div style="margin-bottom: 20px;">
        <p>Hola ${name},</p>
        <p>Tienes una nueva notificación en TeslaLift:</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #4CAF50; margin: 20px 0;">
          <h2 style="margin-top: 0; color: #333;">${title}</h2>
          <p style="margin-bottom: 0;">${message}</p>
        </div>
        <p>Inicia sesión en tu cuenta para ver más detalles.</p>
      </div>
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #777; font-size: 12px;">
        <p>Este es un correo automático, por favor no responder.</p>
        <p>&copy; ${new Date().getFullYear()} TeslaLift. Todos los derechos reservados.</p>
      </div>
    </div>
  `

  return await sendEmail({ to, subject, html })
}

