# 🛡️ Guía Oficial de Ciberseguridad y Defensa en Profundidad
> **IESTP San Francisco de Asís** — Sistema Integrado de Gestión Institucional (SFA)  
> **Área:** Ciberseguridad y Seguridad de la Información  
> **Estándar:** OWASP Top 10 (2021) & NIST Cybersecurity Framework

---

## 📌 1. Resumen Ejecutivo (¿Qué le digo al profesor al inicio?)

> *"Profesor, mi rol en el proyecto abarca la **Ciberseguridad y el Hardening Integral** de la plataforma. Diseñamos la seguridad bajo el principio de **Defensa en Profundidad (Defense in Depth)** y el estándar internacional **OWASP Top 10**. No nos limitamos a validar cosas en el navegador del cliente; implementamos controles estrictos en el servidor (**NestJS**) y en la base de datos (**MongoDB Atlas**) para garantizar la confidencialidad de los datos de alumnos, la integridad de las notas y la trazabilidad inmutable de las operaciones de caja y tesorería."*

---

## 🗺️ 2. Mapa de Navegación: Dónde Explicar Cada Cosa al Profesor

Cuando el profesor te pida: *"Muéstrame en el código dónde está implementada la seguridad"*, guíalo usando esta ruta exacta de archivos:

| # | Pilar de Ciberseguridad | ¿Qué archivo abres en VS Code? | ¿Qué le señalas en el código? |
| :---: | :--- | :--- | :--- |
| **1** | **Hardening HTTP y Cabeceras** | `SFA-Backend/src/main.ts` | La configuración de **Helmet** (CSP, X-Frame-Options) y **CORS restrictivo**. |
| **2** | **Protección Anti-Fuerza Bruta (DoS)** | `SFA-Backend/src/app.module.ts` y controladores | La configuración del módulo **Throttler** (límite de 5 intentos por IP). |
| **3** | **Criptografía de Contraseñas** | `SFA-Backend/src/users/users.service.ts` | El hasheo unidireccional con **Bcrypt** con salting (eliminación de texto plano). |
| **4** | **Control de Acceso (RBAC)** | `SFA-Backend/src/auth/guards/` | El `AuthGuard` (JWT) y el `RolesGuard` protegiendo los endpoints críticos. |
| **5** | **Prevención de Inyección NoSQL** | `SFA-Backend/src/main.ts` y DTOs | El `ValidationPipe({ whitelist: true })` y validaciones con `class-validator`. |
| **6** | **Trazabilidad y Auditoría** | `SFA-Backend/src/database/` y `maf/` | Colección inmutable de **Auditoría Forense** que guarda IP, usuario, fecha y acción. |
| **7** | **Gestión Segura de Secretos** | `.env` vs `.env.example` y `.gitignore` | Demostrar que las credenciales de Firebase y MongoDB nunca se suben a Git. |

---

## 🛠️ 3. Los 6 Pilares de Ciberseguridad: Temas, Paquetes y Código

### 🔐 Pilar 1: Criptografía y Almacenamiento de Credenciales (OWASP A02)
* **Tema teórico:** Protección de datos en reposo, funciones hash unidireccionales (*One-Way Hash*), resistencia a ataques de diccionario y *Rainbow Tables*.
* **Paquete utilizado:** `bcrypt` y `@types/bcrypt`.
* **Archivo:** `SFA-Backend/src/users/users.service.ts`.
* **Qué explicas:**
  > *"Profesor, un error común es almacenar contraseñas en texto plano o con hashes obsoletos como MD5 o SHA1. Nosotros utilizamos **Bcrypt** con un factor de coste (*Salt Rounds*) de 10. Cada contraseña genera un salt aleatorio único, de modo que incluso si dos usuarios tienen la misma clave, sus hashes almacenados en la base de datos son completamente distintos."*
* **Código de referencia:**
  ```typescript
  import * as bcrypt from 'bcrypt';

  // Al crear o actualizar un usuario:
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(rawPassword, salt);

  // Al verificar en el Login:
  const isMatch = await bcrypt.compare(inputPassword, user.passwordHash);
  ```

---

### 🛡️ Pilar 2: Hardening HTTP y Protección de Cabeceras (OWASP A05)
* **Tema teórico:** Mitigación de Clickjacking, Cross-Site Scripting (XSS), MIME-sniffing y configuración segura de cabeceras en la capa de transporte HTTP.
* **Paquete utilizado:** `helmet`.
* **Archivo:** `SFA-Backend/src/main.ts`.
* **Qué explicas:**
  > *"Profesor, en `main.ts` montamos el middleware **Helmet**, el cual inyecta cabeceras HTTP recomendadas por OWASP:
  > - `X-Frame-Options: DENY`: Evita que atacantes embeban el sistema institucional dentro de un iframe malicioso (Clickjacking).
  > - `X-Content-Type-Options: nosniff`: Impide que el navegador interprete archivos ejecutables haciéndose pasar por imágenes.
  > - `Content-Security-Policy (CSP)`: Restringe de qué orígenes exactos se pueden cargar scripts y recursos didácticos."*
* **Código de referencia:**
  ```typescript
  import helmet from 'helmet';

  async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    
    // Inyección de cabeceras seguras
    app.use(helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
        },
      },
    }));

    // CORS estricto limitado al dominio del frontend
    app.enableCors({
      origin: ['http://localhost:3000', 'https://iestpsanfrancisco.edu.pe'],
      credentials: true,
    });
  }
  ```

---

### 🛑 Pilar 3: Prevención de Fuerza Bruta y Ataques DoS (OWASP A07)
* **Tema teórico:** Control de flujo (*Throttling*), mitigación de ataques automatizados de denegación de servicio a nivel de aplicación (L7 DoS) y fuerza bruta en formularios de inicio de sesión.
* **Paquete utilizado:** `@nestjs/throttler`.
* **Archivos:** `SFA-Backend/src/app.module.ts` y controladores de autenticación.
* **Qué explicas:**
  > *"Profesor, sin un limitador de tasa, un bot puede lanzar millones de peticiones contra el login probando contraseñas por segundo. Con **`@nestjs/throttler`**, limitamos a nivel de IP: si una dirección realiza más de 5 intentos fallidos en 5 minutos, el servidor responde con un error HTTP **`429 Too Many Requests`** y bloquea la IP temporalmente."*
* **Código de referencia:**
  ```typescript
  // En app.module.ts:
  ThrottlerModule.forRoot([{
    ttl: 60000, // 60 segundos
    limit: 100,  // Máximo 100 peticiones por minuto por IP para rutas generales
  }])

  // En el endpoint de Login sensible:
  @Throttle({ default: { limit: 5, ttl: 300000 } }) // 5 intentos cada 5 minutos
  @Post('auth/login')
  async login(...) { ... }
  ```

---

### 👥 Pilar 4: Control de Acceso Basado en Roles en Servidor (RBAC) (OWASP A01)
* **Tema teórico:** Evasión de controles de acceso en cliente, mitigación de Broken Object Level Authorization (BOLA) y Broken Function Level Authorization (BFLA). Principio de menor privilegio.
* **Paquetes utilizados:** `firebase-admin`, `@nestjs/core` (`Reflector`).
* **Archivos:** `SFA-Backend/src/auth/guards/auth.guard.ts` y `roles.guard.ts`.
* **Qué explicas:**
  > *"Profesor, una mala práctica común es fiarse de que el frontend oculte los botones según el rol del usuario, ya que un atacante puede abrir la consola de desarrollador, editar el LocalStorage y activar botones administrativos.
  > Nosotros aplicamos la regla de oro: **El Frontend solo gestiona la experiencia visual (UX), pero es el Backend quien autoriza o deniega formalmente cada operación**. Si un usuario con rol de `alumno` intenta invocar `POST /courses/:code/close-grades` o `POST /payments`, el servidor inspecciona el token criptográfico y le responde con un HTTP **`403 Forbidden`**."*

---

### 🧼 Pilar 5: Validación Estricta de Entradas y Prevención NoSQL Injection (OWASP A03)
* **Tema teórico:** Validación de tipo estricta, listas blancas (*Whitelisting*), neutralización de payloads maliciosos de inyección de operadores MongoDB (`$gt`, `$ne`, `$where`).
* **Paquetes utilizados:** `class-validator`, `class-transformer`.
* **Archivo:** `SFA-Backend/src/main.ts` y archivos DTO (`src/**/dto/*.dto.ts`).
* **Qué explicas:**
  > *"Profesor, en MongoDB, si un atacante envía en el JSON `{ "username": "admin", "password": { "$gt": "" } }`, una consulta vulnerable devolvería al usuario porque cualquier texto es mayor que vacío.
  > Para neutralizar esto, activamos en `main.ts` el **`ValidationPipe` con `whitelist: true` y `forbidNonWhitelisted: true`**. Cualquier campo que no esté estrictamente tipado como string en nuestros DTOs de `class-validator` es descartado de inmediato antes de tocar la base de datos."*
* **Código de referencia:**
  ```typescript
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,            // Descarta propiedades no declaradas en el DTO
      forbidNonWhitelisted: true,  // Lanza error si envían parámetros maliciosos
      transform: true,            // Convierte tipos automáticamente
    }),
  );
  ```

---

### 📋 Pilar 6: Auditoría Forense y Trazabilidad Inmutable (OWASP A09)
* **Tema teórico:** No repudio (*Non-Repudiation*), integridad de la evidencia digital y monitoreo continuo de eventos anómalos.
* **Archivos:** Módulo de Auditoría en Backend y `SFA-Frontend/src/components/maf/tabs/AuditoriaTab.tsx`.
* **Qué explicas:**
  > *"Profesor, para operaciones críticas donde se maneja dinero (módulo MAF de tesorería) o notas oficiales (cierre de actas por docentes), no podemos permitir que los registros se borren o se editen.
  > Implementamos una bitácora inmutable en la base de datos donde cada registro almacena: ID de transacción, Timestamp UTC, usuario responsable, acción ejecutada, IP de origen y estado de la operación."*

---

## 🎭 4. Guion de Sustentación Frente al Profesor (Paso a Paso)

Sigue este orden de 4 minutos cuando expongas:

1. **Minuto 1: Planteamiento del Problema:**
   > *"En un sistema de educación superior que gestiona títulos oficiales, notas y pagos del Estado, la seguridad no puede ser un agregado superficial. Adoptamos el estándar **OWASP Top 10** para proteger el sistema institucional contra los vectores de ataque más comunes."*

2. **Minuto 2: Mostrar el Hardening del Servidor:**
   > *(Abres `SFA-Backend/src/main.ts`)*  
   > *"Aquí pueden ver la configuración de cabeceras HTTP seguras mediante **Helmet** para mitigar Clickjacking y XSS, junto con la tubería de sanitización **ValidationPipe** que rechaza inyecciones en los JSON entrantes."*

3. **Minuto 3: Mostrar la Protección de Credenciales y Rutas:**
   > *(Abres `SFA-Backend/src/users/users.service.ts`)*  
   > *"Aquí mostramos la capa criptográfica: ninguna contraseña se almacena en texto plano. Se procesan con **Bcrypt** con salt rounds para proteger la identidad de docentes y estudiantes ante eventuales brechas de datos."*
   > *(Abres `SFA-Backend/src/auth/guards/auth.guard.ts`)*  
   > *"Y aquí demostramos que el control de acceso (RBAC) se aplica en el backend mediante Guards, de modo que el cliente no puede escalar privilegios manipulando su almacenamiento local."*

4. **Minuto 4: Conclusión y Monitoreo:**
   > *"Adicionalmente, se cuenta con limitación de tasa contra ataques de fuerza bruta (**Rate Limiting**) y una bitácora de auditoría inmutable para garantizar el no repudio de pagos y actas académicas."*

---

## ❓ 5. Preguntas Difíciles del Profesor y Cómo Responderlas

### P1: *"¿Por qué usan Bcrypt y no SHA-256 para las contraseñas?"*
* **Tu respuesta:**
  > *"Porque SHA-256 es una función hash de propósito general diseñada para ser muy rápida (para checksums de archivos). Con las tarjetas gráficas (GPUs) actuales, un atacante puede calcular miles de millones de hashes SHA-256 por segundo mediante ataques de fuerza bruta. **Bcrypt**, en cambio, es un algoritmo diseñado específicamente para contraseñas: es deliberadamente lento, consume memoria y permite aumentar el factor de trabajo (salt rounds) con el tiempo para resistir el avance del hardware."*

### P2: *"¿Cómo evitan que un alumno vea las notas de otro alumno en la API?"*
* **Tu respuesta:**
  > *"Mediante la validación de propiedad en el backend (*Broken Object Level Authorization* o BOLA). En el controlador de estudiantes, el servidor no se fía ciegamente del DNI que llega por parámetro; extrae el identificador del token criptográfico JWT validado y verifica que el DNI del usuario autenticado coincida con el registro solicitado antes de devolver la información."*

### P3: *"¿Qué pasa si alguien intenta hacer fuerza bruta en el Login?"*
* **Tu respuesta:**
  > *"Entra en acción el módulo **`@nestjs/throttler`**. El servidor monitoriza los intentos por dirección IP. Si se superan 5 intentos en un lapso de 5 minutos, el servidor rechaza automáticamente las conexiones con código HTTP **`429 Too Many Requests`**, bloqueando el script atacante sin afectar el rendimiento del servidor."*

---

© 2026 **IESTP San Francisco de Asís** — Gestión de Seguridad Informática y Desarrollo Institucional.
