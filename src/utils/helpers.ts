/**
 * Genera una contraseña aleatoria
 * @param length Longitud de la contraseña (por defecto 10)
 * @returns Contraseña aleatoria
 */
export const generateRandomPassword = (length = 10): string => {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+"
  let password = ""

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length)
    password += charset[randomIndex]
  }

  return password
}

/**
 * Obtiene el número de hoja para el mes actual
 * @param month Mes (0-11)
 * @returns Número de hoja (1-3)
 */
export const getReportSheetForMonth = (month: number): number => {
  // Hoja 1 para meses 0, 3, 6, 9 (Ene, Abr, Jul, Oct)
  // Hoja 2 para meses 1, 4, 7, 10 (Feb, May, Ago, Nov)
  // Hoja 3 para meses 2, 5, 8, 11 (Mar, Jun, Sep, Dic)
  return (month % 3) + 1
}

/**
 * Formatea una fecha en formato DD/MM/YYYY
 * @param date Fecha a formatear
 * @returns Fecha formateada
 */
export const formatDate = (date: Date | string): string => {
  if (!date) return ""

  const d = new Date(date)
  if (isNaN(d.getTime())) return ""

  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

/**
 * Formatea una hora en formato HH:MM
 * @param time Hora a formatear
 * @returns Hora formateada
 */
export const formatTime = (time: Date | string): string => {
  if (!time) return ""

  const d = new Date(time)
  if (isNaN(d.getTime())) return ""

  return d.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

/**
 * Calcula la duración en minutos entre dos fechas
 * @param start Fecha de inicio
 * @param end Fecha de fin
 * @returns Duración en minutos
 */
export const calculateDuration = (start: Date | string, end: Date | string): number => {
  if (!start || !end) return 0

  const startDate = new Date(start)
  const endDate = new Date(end)

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return 0

  return Math.round((endDate.getTime() - startDate.getTime()) / 60000)
}

/**
 * Genera un ID único
 * @returns ID único
 */
export const generateUniqueId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2)
}

/**
 * Pagina un array de resultados
 * @param array Array a paginar
 * @param page Número de página
 * @param limit Límite de elementos por página
 * @returns Array paginado
 */
export const paginateArray = <T>(array: T[], page: number = 1, limit: number = 10): T[] => {
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  return array.slice(startIndex, endIndex);
};

/**
 * Filtra un array por un campo y valor
 * @param array Array a filtrar
 * @param field Campo por el que filtrar
 * @param value Valor a buscar
 * @returns Array filtrado
 */
export const filterArrayByField = <T>(array: T[], field: keyof T, value: any): T[] => {
  return array.filter(item => item[field] === value);
};

/**
 * Ordena un array por un campo
 * @param array Array a ordenar
 * @param field Campo por el que ordenar
 * @param order Orden (asc o desc)
 * @returns Array ordenado
 */
export const sortArrayByField = <T>(array: T[], field: keyof T, order: 'asc' | 'desc' = 'asc'): T[] => {
  return [...array].sort((a, b) => {
    if (a[field] < b[field]) return order === 'asc' ? -1 : 1;
    if (a[field] > b[field]) return order === 'asc' ? 1 : -1;
    return 0;
  });
};

/**
 * Convierte un objeto a parámetros de consulta URL
 * @param params Objeto con parámetros
 * @returns String de parámetros de consulta
 */
export const objectToQueryParams = (params: Record<string, any>): string => {
  return Object.keys(params)
    .filter(key => params[key] !== undefined && params[key] !== null)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
};

/**
 * Elimina propiedades nulas o indefinidas de un objeto
 * @param obj Objeto a limpiar
 * @returns Objeto sin propiedades nulas o indefinidas
 */
export const removeNullProperties = <T>(obj: T): Partial<T> => {
  return Object.fromEntries(
    Object.entries(obj as Record<string, any>)
      .filter(([_, value]) => value !== null && value !== undefined)
  ) as Partial<T>;
};

