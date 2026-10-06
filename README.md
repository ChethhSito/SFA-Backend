# ⚡ IESTP San Francisco de Asís — REST API Service (`SFA-Backend`)

[![NestJS](https://img.shields.io/badge/NestJS-11.x-E0234E.svg?logo=nestjs)](https://nestjs.com/)
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
- 🧾 **/bank-reconciliation**: Vista previa y confirmación de reportes bancarios cargados en MAF.
- 📚 **/courses**: Catálogo de cursos, créditos y planificación académica (MPA).
- 👨‍🏫 **/teachers**: Registro de la planta docente.
- 📅 **/admission-periods**: Apertura y cierre de periodos académicos (2026-I, 2026-II).
- 🎓 **/graduations**: Seguimiento de egresados y trámites de titulación (MGE).
- 🔐 **/users**: Administración de usuarios del sistema y roles (SuperAdmin).
- ✉️ **/mail**: Servicio de correos transaccionales vía Brevo API.
- 🗓️ **/mpa**: Datos de planificación académica compartidos por las pestañas del MPA.

La documentación interactiva de la API está en **http://127.0.0.1:3001/api/docs** y la especificación OpenAPI en `/api/docs-json`.

### Conciliación bancaria de MAF

`POST /bank-reconciliation/preview` compara filas normalizadas del Excel con las obligaciones y vouchers MAF enviados por el frontend; devuelve un resultado por fila y una huella del reporte. `POST /bank-reconciliation/confirm` vuelve a calcular las coincidencias y exige la huella y los ID mostrados en la vista previa antes de guardar. La misma huella permite reconocer una importación repetida.

Una fila solo coincide si hay un único voucher **En Proceso** con la misma operación, DNI, fecha, concepto y monto (obligación y voucher). Se admiten las equivalencias `01844→MAT01`, `01845→ADM01`, `01846→CER01` y `01849→CON01`; las demás tasas quedan sin mapeo. Las operaciones duplicadas, diferencias y pagos ya importados quedan para revisión. El servidor guarda las filas extraídas, sus resultados y metadatos en `bankimports`; los pagos confirmados se registran en `payments`. **No se conserva el archivo `.xlsx` original.**

Este flujo es una automatización de conciliación con carga y confirmación humanas, no un robot que opere un portal bancario. Las obligaciones MAF todavía se mantienen en `localStorage` del navegador y se envían como instantánea a la API. Por ello, esta implementación es una demo local; para varios usuarios o uso institucional hay que persistir las obligaciones en el servidor, aplicar autenticación y autorización y conservar el archivo original para auditoría. Más detalles y pasos de prueba en [CONCILIACION_BANCARIA.md](CONCILIACION_BANCARIA.md).

### Flujo MPA

El frontend MPA usa once colecciones MongoDB con campos e índices propios: `academic_periods`, `careers`, `academic_courses`, `curriculum_versions`, `curriculum_items`, `academic_teachers`, `classrooms`, `academic_shifts`, `academic_schedules`, `academic_groups` y `academic_programming`. Las colecciones antiguas `courses` y `teachers` permanecen separadas porque sus esquemas son distintos.

La API mantiene las claves que usa el frontend (`periods`, `careers`, `courses`, `curriculum_versions`, `curriculum`, `teachers`, `classrooms`, `shifts`, `schedules`, `groups`, `tasks`). Cada modificación se guarda directamente en su colección mediante `PUT /mpa/:kind`; `GET /mpa` permite revisar el estado completo y `GET /mpa/:kind` una categoría. La antigua colección `mpa_collections` se migró y eliminó; su exportación de respaldo está en `../outputs/mpa_collections_backup_2026-09-22.json`.

Orden de prueba en la interfaz: **Períodos → Carreras → Cursos → Mallas → Docentes → Aulas → Turnos y horarios → Grupos → Programación → Reportes**. Una sesión de programación vincula un grupo, curso, docente, aula, día y rango horario. El backend rechaza grupos inexistentes y solapamientos de grupo, docente o aula dentro del mismo período.

Para comprobar persistencia, crea un dato en una pestaña, recarga la página y vuelve a abrirla. Si aparece el aviso de falta de conexión en el dashboard, inicia MongoDB y el backend antes de repetir la prueba. En desarrollo, el frontend usa `http://localhost:3001` salvo que se configure `VITE_API_URL`.

Tras actualizar el módulo MPA, reinicia el proceso NestJS que atiende el puerto 3001 y refresca las colecciones en TablePlus.

---

## 🚀 Requisitos e Instalación Local

### Requisitos Previos
- **Node.js**: v20 o superior (requisito de NestJS 11)
- **pnpm**: v9 o superior (lockfile v9)
- **MongoDB**: Instancia local o MongoDB Atlas URI

### Configuración de Entorno (`.env`)
```env
PORT=3001
HOST=127.0.0.1
MONGODB_URI=mongodb://127.0.0.1:27017/sfa_database
BREVO_API_KEY=tu_api_key_brevo
```

En Windows, comprueba que el servicio `MongoDB` esté iniciado. Copia `.env.example` a `.env` antes de arrancar la API. La base `sfa_database` se crea al iniciar el backend y registrar sus colecciones. `HOST=127.0.0.1` limita el acceso a este equipo; cámbialo solo si necesitas servir la API en otra interfaz de red.

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
