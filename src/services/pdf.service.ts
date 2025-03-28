import PDFDocument from "pdfkit"
import type { Report } from "../models/types"

export const generatePdf = async (report: Report): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      // Crear un buffer para almacenar el PDF
      const chunks: Buffer[] = []
      const doc = new PDFDocument({ margin: 50 })

      // Capturar los chunks del PDF
      doc.on("data", (chunk) => chunks.push(chunk))
      doc.on("end", () => resolve(Buffer.concat(chunks)))
      doc.on("error", reject)

      // Configurar fuentes y estilos
      doc.font("Helvetica")

      // Encabezado
      doc.fontSize(20).text("REPORTE DE MANTENIMIENTO", { align: "center" })
      doc.moveDown()

      // Información del reporte
      doc.fontSize(12).text(`Fecha: ${formatDate(report.date)}`, { align: "right" })
      doc.fontSize(12).text(`Reporte #: ${report.id.substring(0, 8)}`, { align: "right" })
      doc.moveDown()

      // Información del edificio
      doc.fontSize(16).text("Información del Edificio", { underline: true })
      doc.moveDown(0.5)
      doc.fontSize(12).text(`Nombre: ${report.building_name}`)
      doc.fontSize(12).text(`Marca del Ascensor: ${report.elevator_brand}`)
      doc.fontSize(12).text(`Cantidad de Ascensores: ${report.elevator_count}`)
      doc.fontSize(12).text(`Cantidad de Paradas: ${report.floor_count}`)
      doc.moveDown()

      // Información del técnico
      doc.fontSize(16).text("Información del Técnico", { underline: true })
      doc.moveDown(0.5)
      doc.fontSize(12).text(`Técnico: ${report.technician_name || "No especificado"}`)
      doc.fontSize(12).text(`Hora de Entrada: ${report.clock_in_time || "No registrada"}`)
      if (report.clock_out_time) {
        doc.fontSize(12).text(`Hora de Salida: ${report.clock_out_time}`)
      }
      doc.moveDown()

      // Secciones del reporte
      doc.fontSize(16).text("Trabajos Realizados", { underline: true })
      doc.moveDown(0.5)

      if (report.sections && report.sections.length > 0) {
        report.sections.forEach((section) => {
          doc.fontSize(14).text(section.title)
          doc.moveDown(0.5)

          section.items.forEach((item: any) => {
            const checkmark = item.value === true ? "✓" : "□"
            const value = typeof item.value === "boolean" ? "" : `: ${item.value}`

            doc.fontSize(12).text(`${checkmark} ${item.description}${value}`)
          })

          doc.moveDown()
        })
      } else {
        doc.fontSize(12).text("No hay secciones registradas")
        doc.moveDown()
      }

      // Observaciones
      doc.fontSize(16).text("Observaciones", { underline: true })
      doc.moveDown(0.5)
      doc.fontSize(12).text(report.observations || "Sin observaciones")
      doc.moveDown()

      // Firmas
      doc.fontSize(16).text("Firmas", { underline: true })
      doc.moveDown(0.5)

      // Crear una fila para las firmas
      const startY = doc.y

      // Firma del técnico
      if (report.technician_signature) {
        doc.fontSize(12).text("Firma del Técnico:", { width: 250 })
        doc.image(Buffer.from(report.technician_signature.split(",")[1], "base64"), {
          fit: [200, 100],
          align: "center",
        })
      } else {
        doc.fontSize(12).text("Firma del Técnico: No disponible", { width: 250 })
      }

      // Resetear posición Y y mover a la derecha para la firma del cliente
      doc.y = startY
      doc.x = 300

      // Firma del cliente
      if (report.client_signature) {
        doc.fontSize(12).text("Firma del Cliente:", { width: 250 })
        doc.image(Buffer.from(report.client_signature.split(",")[1], "base64"), {
          fit: [200, 100],
          align: "center",
        })
      } else {
        doc.fontSize(12).text("Firma del Cliente: No disponible", { width: 250 })
      }

      // Pie de página
      doc.y = doc.page.height - 50
      doc.fontSize(10).text("TeslaLift - Servicios de Mantenimiento de Ascensores", { align: "center" })
      doc.fontSize(10).text(`Generado el ${new Date().toLocaleString()}`, { align: "center" })

      // Finalizar el documento
      doc.end()
    } catch (error) {
      console.error("Error al generar PDF:", error)
      reject(error)
    }
  })
}

// Función para generar un informe de gestión
export const generateManagementReport = async (data: any): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      // Crear un buffer para almacenar el PDF
      const chunks: Buffer[] = []
      const doc = new PDFDocument({ margin: 50 })

      // Capturar los chunks del PDF
      doc.on("data", (chunk) => chunks.push(chunk))
      doc.on("end", () => resolve(Buffer.concat(chunks)))
      doc.on("error", reject)

      // Configurar fuentes y estilos
      doc.font("Helvetica")

      // Encabezado
      doc.fontSize(20).text("INFORME DE GESTIÓN", { align: "center" })
      doc.moveDown()

      // Información del informe
      doc.fontSize(12).text(`Período: ${formatDate(data.startDate)} - ${formatDate(data.endDate)}`, { align: "right" })
      doc.fontSize(12).text(`Generado por: ${data.generatedBy || "Administrador"}`, { align: "right" })
      doc.fontSize(12).text(`Fecha de generación: ${formatDate(new Date())}`, { align: "right" })
      doc.moveDown()

      // Resumen
      doc.fontSize(16).text("Resumen", { underline: true })
      doc.moveDown(0.5)
      doc.fontSize(12).text(`Total de reportes: ${data.totalReports || 0}`)
      doc.fontSize(12).text(`Técnicos activos: ${data.activeTechnicians || 0}`)
      doc.fontSize(12).text(`Clientes activos: ${data.activeClients || 0}`)
      doc.moveDown()

      // Secciones del informe
      if (data.includeReports && data.reports && data.reports.length > 0) {
        doc.fontSize(16).text("Reportes de Mantenimiento", { underline: true })
        doc.moveDown(0.5)

        // Crear tabla de reportes
        const reportTableTop = doc.y
        doc.fontSize(10)

        // Encabezados de tabla
        doc.text("Edificio", 50, reportTableTop)
        doc.text("Fecha", 200, reportTableTop)
        doc.text("Técnico", 280, reportTableTop)
        doc.text("Estado", 400, reportTableTop)

        // Línea después de encabezados
        doc
          .moveTo(50, reportTableTop + 15)
          .lineTo(550, reportTableTop + 15)
          .stroke()

        // Datos de la tabla
        let reportTableRow = reportTableTop + 25

        data.reports.forEach((report: any, index: number) => {
          // Verificar si necesitamos una nueva página
          if (reportTableRow > doc.page.height - 50) {
            doc.addPage()
            reportTableRow = 50
          }

          doc.text(report.buildingName || "", 50, reportTableRow)
          doc.text(formatDate(report.date) || "", 200, reportTableRow)
          doc.text(report.technicianName || "", 280, reportTableRow)
          doc.text(getStatusLabel(report.status) || "", 400, reportTableRow)

          reportTableRow += 20
        })

        doc.y = reportTableRow + 10
        doc.moveDown()
      }

      if (data.includeTechnicians && data.technicians && data.technicians.length > 0) {
        doc.fontSize(16).text("Técnicos", { underline: true })
        doc.moveDown(0.5)

        // Crear tabla de técnicos
        const techTableTop = doc.y
        doc.fontSize(10)

        // Encabezados de tabla
        doc.text("Nombre", 50, techTableTop)
        doc.text("Rol", 200, techTableTop)
        doc.text("Reportes", 280, techTableTop)
        doc.text("Eficiencia", 350, techTableTop)

        // Línea después de encabezados
        doc
          .moveTo(50, techTableTop + 15)
          .lineTo(550, techTableTop + 15)
          .stroke()

        // Datos de la tabla
        let techTableRow = techTableTop + 25

        data.technicians.forEach((tech: any, index: number) => {
          // Verificar si necesitamos una nueva página
          if (techTableRow > doc.page.height - 50) {
            doc.addPage()
            techTableRow = 50
          }

          doc.text(tech.name || "", 50, techTableRow)
          doc.text(tech.role || "", 200, techTableRow)
          doc.text(String(tech.reports || 0), 280, techTableRow)
          doc.text(`${tech.efficiency || 0}%`, 350, techTableRow)

          techTableRow += 20
        })

        doc.y = techTableRow + 10
        doc.moveDown()
      }

      if (data.includeClients && data.clients && data.clients.length > 0) {
        doc.fontSize(16).text("Clientes", { underline: true })
        doc.moveDown(0.5)

        // Crear tabla de clientes
        const clientTableTop = doc.y
        doc.fontSize(10)

        // Encabezados de tabla
        doc.text("Nombre", 50, clientTableTop)
        doc.text("Edificios", 200, clientTableTop)
        doc.text("Ascensores", 280, clientTableTop)
        doc.text("Estado", 350, clientTableTop)

        // Línea después de encabezados
        doc
          .moveTo(50, clientTableTop + 15)
          .lineTo(550, clientTableTop + 15)
          .stroke()

        // Datos de la tabla
        let clientTableRow = clientTableTop + 25

        data.clients.forEach((client: any, index: number) => {
          // Verificar si necesitamos una nueva página
          if (clientTableRow > doc.page.height - 50) {
            doc.addPage()
            clientTableRow = 50
          }

          doc.text(client.name || "", 50, clientTableRow)
          doc.text(String(client.buildings || 0), 200, clientTableRow)
          doc.text(String(client.elevators || 0), 280, clientTableRow)
          doc.text(client.status || "", 350, clientTableRow)

          clientTableRow += 20
        })

        doc.y = clientTableRow + 10
        doc.moveDown()
      }

      // Pie de página
      doc.y = doc.page.height - 50
      doc.fontSize(10).text("TeslaLift - Servicios de Mantenimiento de Ascensores", { align: "center" })
      doc.fontSize(10).text(`© ${new Date().getFullYear()} TeslaLift`, { align: "center" })

      // Finalizar el documento
      doc.end()
    } catch (error) {
      console.error("Error al generar informe de gestión:", error)
      reject(error)
    }
  })
}

// Función para generar un estado de cuenta
export const generateAccountStatement = async (data: any): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      // Crear un buffer para almacenar el PDF
      const chunks: Buffer[] = []
      const doc = new PDFDocument({ margin: 50 })

      // Capturar los chunks del PDF
      doc.on("data", (chunk) => chunks.push(chunk))
      doc.on("end", () => resolve(Buffer.concat(chunks)))
      doc.on("error", reject)

      // Configurar fuentes y estilos
      doc.font("Helvetica")

      // Encabezado
      doc.fontSize(20).text("ESTADO DE CUENTA", { align: "center" })
      doc.moveDown()

      // Información del cliente
      doc.fontSize(16).text("Información del Cliente", { underline: true })
      doc.moveDown(0.5)
      doc.fontSize(12).text(`Cliente: ${data.client.name}`)
      doc.fontSize(12).text(`RUC: ${data.client.ruc}`)
      doc.fontSize(12).text(`Dirección: ${data.client.address}`)
      doc.fontSize(12).text(`Email: ${data.client.email}`)
      doc.fontSize(12).text(`Teléfono: ${data.client.phone}`)
      doc.fontSize(12).text(`Tipo de Contrato: ${getContractTypeLabel(data.client.contract_type)}`)
      doc.moveDown()

      // Resumen de cuenta
      doc.fontSize(16).text("Resumen de Cuenta", { underline: true })
      doc.moveDown(0.5)
      doc.fontSize(12).text(`Total de Facturas: ${data.statistics.total_invoices}`)
      doc.fontSize(12).text(`Facturas Pendientes: ${data.statistics.pending_invoices}`)
      doc.fontSize(12).text(`Facturas Vencidas: ${data.statistics.overdue_invoices}`)
      doc.fontSize(12).text(`Monto Total: S/ ${data.statistics.total_amount.toFixed(2)}`)
      doc.fontSize(12).text(`Monto Pendiente: S/ ${data.statistics.pending_amount.toFixed(2)}`)
      doc.moveDown()

      // Facturas
      if (data.invoices && data.invoices.length > 0) {
        doc.fontSize(16).text("Facturas", { underline: true })
        doc.moveDown(0.5)

        // Crear tabla de facturas
        const invoiceTableTop = doc.y
        doc.fontSize(10)

        // Encabezados de tabla
        doc.text("Factura", 50, invoiceTableTop)
        doc.text("Fecha Emisión", 120, invoiceTableTop)
        doc.text("Fecha Vencimiento", 200, invoiceTableTop)
        doc.text("Monto", 300, invoiceTableTop)
        doc.text("Estado", 350, invoiceTableTop)

        // Línea después de encabezados
        doc
          .moveTo(50, invoiceTableTop + 15)
          .lineTo(550, invoiceTableTop + 15)
          .stroke()

        // Datos de la tabla
        let invoiceTableRow = invoiceTableTop + 25

        data.invoices.forEach((invoice: any, index: number) => {
          // Verificar si necesitamos una nueva página
          if (invoiceTableRow > doc.page.height - 50) {
            doc.addPage()
            invoiceTableRow = 50
          }

          doc.text(invoice.id.substring(0, 8) || "", 50, invoiceTableRow)
          doc.text(formatDate(invoice.issue_date) || "", 120, invoiceTableRow)
          doc.text(formatDate(invoice.due_date) || "", 200, invoiceTableRow)
          doc.text(`S/ ${invoice.amount.toFixed(2)}` || "", 300, invoiceTableRow)
          doc.text(getInvoiceStatusLabel(invoice.status) || "", 350, invoiceTableRow)

          invoiceTableRow += 20
        })

        doc.y = invoiceTableRow + 10
        doc.moveDown()
      }

      // Edificios y ascensores
      if (data.buildings && data.buildings.length > 0) {
        doc.fontSize(16).text("Edificios y Ascensores", { underline: true })
        doc.moveDown(0.5)

        data.buildings.forEach((building: any, index: number) => {
          doc.fontSize(12).text(`${index + 1}. ${building.name}`)
          doc.fontSize(10).text(`   Dirección: ${building.address}`)
          doc.fontSize(10).text(`   Pisos: ${building.floors}`)

          if (building.elevators && building.elevators.length > 0) {
            doc.fontSize(10).text(`   Ascensores (${building.elevators.length}):`)

            building.elevators.forEach((elevator: any, elevIndex: number) => {
              doc.fontSize(9).text(`      - ${elevator.brand} ${elevator.model || ""} (${elevator.status})`)
              if (elevator.last_maintenance_date) {
                doc.fontSize(9).text(`        Último mantenimiento: ${formatDate(elevator.last_maintenance_date)}`)
              }
            })
          }

          doc.moveDown()
        })
      }

      // Pie de página
      doc.y = doc.page.height - 50
      doc.fontSize(10).text("TeslaLift - Servicios de Mantenimiento de Ascensores", { align: "center" })
      doc.fontSize(10).text(`Generado el ${new Date().toLocaleString()}`, { align: "center" })

      // Finalizar el documento
      doc.end()
    } catch (error) {
      console.error("Error al generar estado de cuenta:", error)
      reject(error)
    }
  })
}

// Funciones auxiliares
const formatDate = (dateString: string | Date): string => {
  if (!dateString) return ""

  const date = new Date(dateString)
  if (isNaN(date.getTime())) return ""

  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

const getStatusLabel = (status: string): string => {
  switch (status) {
    case "draft":
      return "Borrador"
    case "submitted":
      return "Enviado"
    case "approved":
      return "Aprobado"
    default:
      return status
  }
}

const getContractTypeLabel = (type: string): string => {
  switch (type) {
    case "monthly":
      return "Mensual"
    case "annual":
      return "Anual"
    case "project":
      return "Proyecto"
    default:
      return type
  }
}

const getInvoiceStatusLabel = (status: string): string => {
  switch (status) {
    case "paid":
      return "Pagada"
    case "pending":
      return "Pendiente"
    case "overdue":
      return "Vencida"
    default:
      return status
  }
}

