# TeslaLift Backend

## Descripción

Backend para la aplicación TeslaLift de gestión de servicios de mantenimiento de ascensores. Esta API proporciona todas las funcionalidades necesarias para la gestión de técnicos, clientes, reportes, solicitudes de servicio y más.

## Tecnologías

- Node.js
- Express
- TypeScript
- Supabase (PostgreSQL + Auth + Storage)
- JWT para autenticación
- PDFKit para generación de PDF
- Nodemailer para envío de correos electrónicos

## Requisitos

- Node.js 16.x o superior
- npm 8.x o superior
- Cuenta en Supabase

## Configuración

1. Clona el repositorio:
   ```bash
   git clone https://github.com/tu-usuario/teslalift-backend.git
   cd teslalift-backend
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Crea un archivo `.env` basado en el archivo `.env.example` y configura las variables de entorno necesarias:
   ```bash
   cp .env.example .env
   ```

4. Compila el proyecto:
   ```bash
   npm run build
   ```

5. Inicia el servidor en modo desarrollo:
   ```bash
   npm run dev
   ```

6. Para iniciar el servidor en producción:
   ```bash
   npm start
   ```

## Endpoints principales

### Autenticación
- `POST /api/auth/login`: Iniciar sesión.
- `POST /api/auth/register`: Registrar un nuevo usuario.

### Clientes
- `GET /api/client`: Obtener información del cliente.
- `POST /api/client/service-request`: Crear una solicitud de servicio.

### Notificaciones
- `GET /api/notifications`: Listar notificaciones.

### Técnicos
- `GET /api/technician`: Obtener información de técnicos.

### Administradores
- `GET /api/admin`: Obtener información de administradores.

## Estructura del proyecto

```
src/
├── app.ts                # Configuración principal de la aplicación
├── config/               # Configuración de Supabase, CORS, Helmet, etc.
├── controllers/          # Controladores para manejar la lógica de negocio
├── middleware/           # Middlewares personalizados
├── models/               # Tipos y modelos de datos
├── routes/               # Definición de rutas
├── services/             # Servicios para lógica adicional (PDF, notificaciones, etc.)
└── utils/                # Utilidades y funciones auxiliares
```

## Pruebas

Ejecuta las pruebas con el siguiente comando:
```bash
npm test
```

## Contribuciones

¡Las contribuciones son bienvenidas! Por favor, sigue los pasos a continuación:

1. Haz un fork del repositorio.
2. Crea una rama para tu funcionalidad o corrección de errores:
   ```bash
   git checkout -b feature/nueva-funcionalidad
   ```
3. Realiza tus cambios y haz un commit:
   ```bash
   git commit -m "Agrega nueva funcionalidad"
   ```
4. Haz push a tu rama:
   ```bash
   git push origin feature/nueva-funcionalidad
   ```
5. Abre un Pull Request.

## Licencia

Este proyecto está licenciado bajo la licencia ISC. Consulta el archivo `LICENSE` para más detalles.