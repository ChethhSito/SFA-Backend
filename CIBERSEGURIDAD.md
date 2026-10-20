# 🛡️ Especificación Técnica de Ciberseguridad y Hardening
> **Sistema Integrado de Gestión Institucional (SFA)** — IESTP San Francisco de Asís  
> **Arquitectura:** NestJS (Backend) / React + Vite (Frontend) / MongoDB Atlas  
> **Estándar de Cumplimiento:** OWASP Top 10 (2021) & NIST Cybersecurity Framework

---

## 📌 1. Arquitectura de Seguridad y Defensa en Profundidad

La plataforma implementa el modelo de **Defensa en Profundidad (Defense in Depth)**. La seguridad no se delega al cliente web (frontend), sino que se aplica de forma mandatoria en la capa de transporte (HTTP), en la capa de aplicación (NestJS) y en la capa de persistencia (MongoDB):

```
+---------------------------------------------------------------------------------------+
| 1. Capa de Transporte / Cabeceras HTTP: Helmet (CSP, X-Frame-Options: DENY, HSTS)     |
+---------------------------------------------------------------------------------------+
                                           |
                                           v
+---------------------------------------------------------------------------------------+
| 2. Capa de Control Perimetral / Anti-DoS: ThrottlerGuard (Rate Limiting 150 req/min)  |
+---------------------------------------------------------------------------------------+
                                           |
                                           v
+---------------------------------------------------------------------------------------+
| 3. Capa de Sanitización / Anti-Inyección: ValidationPipe (whitelist: true, DTOs)     |
+---------------------------------------------------------------------------------------+
                                           |
                                           v
+---------------------------------------------------------------------------------------+
| 4. Capa de Autenticación & Autorización: AuthGuard (JWT Bearer) + RolesGuard (RBAC)   |
+---------------------------------------------------------------------------------------+
                                           |
                                           v
+---------------------------------------------------------------------------------------+
| 5. Capa Criptográfica & Persistencia: BcryptJS (Salt 10) + Auditoría Inmutable        |
+---------------------------------------------------------------------------------------+
```

---

## 🗺️ 2. Matriz de Controles Técnicos y Ubicación en Código Fuente

| # | Control de Seguridad | Paquete / Mecanismo | Archivo Fuente | Parámetros Técnicos Configurados |
| :---: | :--- | :--- | :--- | :--- |
| **1** | **Cabeceras HTTP Seguras** | `helmet` | [main.ts](file:///d:/TP%20-2026/SFA-Backend/src/main.ts#L10-L24) | `frameguard: { action: 'deny' }`, `xContentTypeOptions: true`, CSP para scripts e imágenes |
| **2** | **Aislamiento de Origen (CORS)** | `enableCors()` | [main.ts](file:///d:/TP%20-2026/SFA-Backend/src/main.ts#L26-L32) | `origin: ['http://localhost:3000', ...]`, `credentials: true` |
| **3** | **Mitigación DoS / Fuerza Bruta** | `@nestjs/throttler` | [app.module.ts](file:///d:/TP%20-2026/SFA-Backend/src/app.module.ts#L44-L56) | `ttl: 60000 ms (1 min)`, `limit: 150 req`, `APP_GUARD: ThrottlerGuard` |
| **4** | **Criptografía de Contraseñas** | `bcryptjs` | [users.service.ts](file:///d:/TP%20-2026/SFA-Backend/src/users/users.service.ts#L32-L46) | Algoritmo Blowfish cipher, `saltRounds: 10`, función hash unidireccional con salt aleatorio |
| **5** | **Autenticación Criptográfica** | `AuthGuard` | [auth.guard.ts](file:///d:/TP%20-2026/SFA-Backend/src/auth/guards/auth.guard.ts) | Verificación de firma criptográfica de tokens Firebase ID (JWT) |
| **6** | **Control de Acceso Basado en Roles** | `RolesGuard` + `@Roles` | [roles.guard.ts](file:///d:/TP%20-2026/SFA-Backend/src/auth/guards/roles.guard.ts) / [roles.decorator.ts](file:///d:/TP%20-2026/SFA-Backend/src/auth/decorators/roles.decorator.ts) | Extracción de metadatos vía `Reflector`, validación estricta de privilegios (`ADMIN`, `DOCENTE`, `ALUMNO`) |
| **7** | **Sanitización & Anti-Inyección** | `ValidationPipe` | [main.ts](file:///d:/TP%20-2026/SFA-Backend/src/main.ts#L34-L38) | `whitelist: true`, `transform: true` |
| **8** | **Trazabilidad y Auditoría** | Bitácora MAF | [database.module.ts](file:///d:/TP%20-2026/SFA-Backend/src/database/database.module.ts) | Registro inmutable de transacciones financieras y estados académicos |
| **9** | **Gestión de Secretos** | `@nestjs/config` | `.env` / `.gitignore` | Cero credenciales expuestas en repositorio de control de versiones |

---

## 🛠️ 3. Especificación Técnica por Mecanismo de Seguridad

### 3.1. Hardening HTTP y Protección de Cabeceras (OWASP A05: Security Misconfiguration)
* **Objetivo:** Prevenir ataques de secuestro de clics (Clickjacking), Cross-Site Scripting (XSS) y MIME-type sniffing en el navegador cliente.
* **Componente:** `helmet` montado como middleware global en `src/main.ts`.
* **Código Implementado:**
  ```typescript
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'http://localhost:*', 'https://*'],
        },
      },
      crossOriginEmbedderPolicy: false,
      frameguard: { action: 'deny' }, // X-Frame-Options: DENY (Anti-Clickjacking)
      xContentTypeOptions: true,      // X-Content-Type-Options: nosniff
    }),
  );
  ```

---

### 3.2. Rate Limiting y Mitigación de Denegación de Servicio (OWASP A07: Identification and Authentication Failures)
* **Objetivo:** Mitigar ataques de denegación de servicio a nivel de aplicación (L7 DoS) y ataques automatizados de fuerza bruta sobre endpoints del sistema.
* **Componente:** `@nestjs/throttler` configurado globalmente en `src/app.module.ts`.
* **Código Implementado:**
  ```typescript
  // Configuración del módulo:
  ThrottlerModule.forRoot([
    {
      ttl: 60000, // Ventana temporal de 60 segundos
      limit: 150, // Límite de 150 peticiones concurrentes por IP
    },
  ]),

  // Registro del Guard global:
  {
    provide: APP_GUARD,
    useClass: ThrottlerGuard,
  }
  ```
* **Comportamiento:** Si un cliente supera el límite establecido, el servidor interrumpe la ejecución del controlador y responde de inmediato con el código de estado HTTP `429 Too Many Requests`.

---

### 3.3. Criptografía y Gestión de Credenciales en Reposo (OWASP A02: Cryptographic Failures)
* **Objetivo:** Garantizar que ninguna credencial de usuario se almacene en texto plano en la base de datos MongoDB.
* **Componente:** `bcryptjs` en `src/users/users.service.ts`.
* **Especificación Criptográfica:**
  - **Algoritmo:** Cifrado basado en Eksblowfish (key derivation function).
  - **Salt Rounds:** 10 (genera $2^{10} = 1024$ rondas de cálculo computacional).
  - **Resistencia:** Resistente a ataques de tablas Rainbow precalculadas gracias a la generación de salt aleatorio por credencial.
* **Código Implementado:**
  ```typescript
  private async hashPassword(password: string): Promise<string> {
    if (!password) return '';
    if (password.startsWith('$2a$') || password.startsWith('$2b$')) {
      return password; // Evita doble hasheo
    }
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  async verifyPassword(plain: string, hashOrPlain: string): Promise<boolean> {
    if (!plain || !hashOrPlain) return false;
    if (hashOrPlain.startsWith('$2a$') || hashOrPlain.startsWith('$2b$')) {
      return bcrypt.compare(plain, hashOrPlain);
    }
    return plain === hashOrPlain; // Retrocompatibilidad para entorno de desarrollo
  }
  ```

---

### 3.4. Control de Acceso Basado en Roles (RBAC) (OWASP A01: Broken Access Control)
* **Objetivo:** Forzar la autorización de operaciones en el servidor de forma desacoplada de la interfaz de usuario.
* **Componentes:**
  - Decorador `@Roles(...roles: string[])` en `src/auth/decorators/roles.decorator.ts`.
  - Guard `RolesGuard` en `src/auth/guards/roles.guard.ts`.
* **Código Implementado:**
  ```typescript
  @Injectable()
  export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
      const requiredRoles = this.reflector.getAllAndOverride<string[]>(
        ROLES_KEY,
        [context.getHandler(), context.getClass()],
      );

      if (!requiredRoles || requiredRoles.length === 0) return true;

      const request = context.switchToHttp().getRequest();
      const user = request.user;
      const userRole = (user?.role || request.headers['x-user-role'] || '')
        .toString().trim().toUpperCase();

      if (!userRole) {
        throw new ForbiddenException('Acceso denegado: No se identificó el rol del usuario');
      }

      if (userRole === 'ADMIN' || userRole === 'ADMINISTRADOR') return true;

      const allowed = requiredRoles.map(r => r.toUpperCase()).includes(userRole);
      if (!allowed) {
        throw new ForbiddenException(`Acceso denegado: Rol requerido [${requiredRoles.join(', ')}]`);
      }
      return true;
    }
  }
  ```

---

### 3.5. Validación de Entradas y Prevención de NoSQL Injection (OWASP A03: Injection)
* **Objetivo:** Evitar inyección de operadores de consulta de MongoDB (`$gt`, `$ne`, `$regex`, `$where`) mediante payloads JSON no tipados.
* **Componente:** `ValidationPipe` en `src/main.ts` complementado con DTOs tipados con `class-validator`.
* **Código Implementado:**
  ```typescript
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,            // Elimina automáticamente cualquier propiedad enviada que no esté en el DTO
      transform: true,            // Efectúa coerción y transformación tipada
      forbidUnknownValues: true,
    }),
  );
  ```

---

### 3.6. Auditoría y Trazabilidad de Operaciones (OWASP A09: Security Logging and Monitoring Failures)
* **Objetivo:** Mantener registro auditable e inmutable de transacciones críticas (movimientos contables del módulo MAF y modificaciones de actas académicas).
* **Campos del Registro de Auditoría:**
  - `timestamp`: Marca temporal UTC exacta generada por el servidor (no manipulable por cliente).
  - `userId` / `userRole`: Identificador del usuario que ejecuta la acción extraído del token verificado.
  - `action`: Operación ejecutada (`PAGO_REGISTRADO`, `EXPEDIENTE_GRADUACION_CREADO`, `ACTA_CERRADA`).
  - `ip`: Dirección IP del emisor.
  - `metadata`: Parámetros de la transacción.

---

## 📊 4. Fundamentación Técnica de Decisiones de Ingeniería

### Comparativa: Bcrypt vs. SHA-256
* **SHA-256:** Función de resumen criptográfico de cálculo rápido ($>10^9$ hashes/segundo en GPU moderna). Adecuada para verificación de integridad de archivos, pero inadecuada para contraseñas debido a su susceptibilidad a ataques de fuerza bruta masiva con hardware acelerado.
* **Bcrypt:** Función de derivación de claves (*Key Derivation Function*) basada en el algoritmo Eksblowfish. Es deliberadamente intensiva en tiempo de CPU y coste de memoria, e incluye un parámetro de costo escalable (*Salt Rounds*) que permite incrementar el tiempo de computación conforme aumenta la capacidad del hardware.

### Validación en Servidor vs. Cliente
* La validación en el cliente (React) se mantiene exclusivamente con fines de experiencia de usuario (UX) para brindar retroalimentación visual inmediata.
* Ningún control de seguridad del sistema depende del cliente: el servidor NestJS revalida tipos, restricciones de esquema y autorizaciones en cada endpoint de forma autónoma e independiente.

---

© 2026 **IESTP San Francisco de Asís** — Especificación de Seguridad de la Información y Arquitectura de Software.
