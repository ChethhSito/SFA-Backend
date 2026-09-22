# ⚡ IESTP San Francisco de Asís — REST API Service (`SFA-Backend`)

[![NestJS](https://img.shields.io/badge/NestJS-10.x-E0234E.svg?logo=nestjs)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg?logo=typescript)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248.svg?logo=mongodb)](https://www.mongodb.com/)
[![Brevo API](https://img.shields.io/badge/Email-Brevo%20API-00B2A9.svg)](https://www.brevo.com/)

Servicio Backend centralizado del **IESTP San Francisco de Asís**, desarrollado con **NestJS**, MongoDB Mongoose y arquitectura limpia por módulos.

📐 **[Ver Estándar Oficial de Desarrollo Backend (ESTANDAR_BACKEND.md)](ESTANDAR_BACKEND.md)**

---

## 🛠️ Módulos y Endpoints REST

- 📋 **/applicants**: Gestión de postulantes, expedientes de admisión y pre-inscripción.
- 👨‍🎓 **/enrollments**: Matrículas, asignación de turnos y estados académicos.
- 👨‍🎓 **/students**: Expediente de alumnos, datos de contacto y récord de ciclos (I-VI).
- 💳 **/payments**: Tesorería (MAF), recibos de caja y control de pagos.
- 📚 **/courses**: Catálogo de cursos, créditos y planificación académica (MPA).
- 👨‍🏫 **/teachers**: Registro de la planta docente.
- 📅 **/admission-periods**: Apertura y cierre de periodos académicos (2026-I, 2026-II).
- 🎓 **/graduations**: Seguimiento de egresados y trámites de titulación (MGE).
- 🔐 **/users**: Administración de usuarios del sistema y roles (SuperAdmin).
- ✉️ **/mail**: Servicio de correos transaccionales vía Brevo API.
- 🗓️ **/mpa**: Datos de planificación académica compartidos por las pestañas del MPA.

### Flujo MPA

El frontend MPA usa once colecciones MongoDB con campos e índices propios: `academic_periods`, `careers`, `academic_courses`, `curriculum_versions`, `curriculum_items`, `academic_teachers`, `classrooms`, `academic_shifts`, `academic_schedules`, `academic_groups` y `academic_programming`. Las colecciones antiguas `courses` y `teachers` permanecen separadas porque sus esquemas son distintos.

La API mantiene las claves que usa el frontend (`periods`, `careers`, `courses`, `curriculum_versions`, `curriculum`, `teachers`, `classrooms`, `shifts`, `schedules`, `groups`, `tasks`). Cada modificación se guarda directamente en su colección mediante `PUT /mpa/:kind`; `GET /mpa` permite revisar el estado completo y `GET /mpa/:kind` una categoría. La antigua colección `mpa_collections` se migró y eliminó; su exportación de respaldo está en `../outputs/mpa_collections_backup_2026-09-22.json`.

Orden de prueba en la interfaz: **Períodos → Carreras → Cursos → Mallas → Docentes → Aulas → Turnos y horarios → Grupos → Programación → Reportes**. Una sesión de programación vincula un grupo, curso, docente, aula, día y rango horario. El backend rechaza grupos inexistentes y solapamientos de grupo, docente o aula dentro del mismo período.

Para comprobar persistencia, crea un dato en una pestaña, recarga la página y vuelve a abrirla. Si aparece el aviso de falta de conexión en el dashboard, inicia MongoDB y el backend antes de repetir la prueba. En desarrollo, el frontend usa `http://localhost:3001` salvo que se configure `VITE_API_URL`.

Tras actualizar el módulo MPA, reinicia el proceso NestJS que atiende el puerto 3001 y refresca las colecciones en TablePlus.

---

## 🚀 Requisitos e Instalación Local

### Requisitos Previos
- **Node.js**: v18.x o superior
- **MongoDB**: Instancia local o MongoDB Atlas URI

### Configuración de Entorno (`.env`)
```env
PORT=3001
MONGODB_URI=mongodb://localhost:27017/sfa_database
BREVO_API_KEY=tu_api_key_brevo
```

### Ejecutar Localmente
```bash
# 1. Instalar dependencias
pnpm install

# 2. Iniciar en modo desarrollo
pnpm run start:dev

# 3. Compilar para producción
pnpm run build
```

---

© 2026 **IESTP San Francisco de Asís** — Servicio API Backend.
