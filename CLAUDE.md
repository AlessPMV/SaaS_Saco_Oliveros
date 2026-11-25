# CLAUDE.md — Guía de Arquitectura e Implementación (MVP)

## Sistema SaaS Web de Gestión Académica y Administrativa — Colegio Saco Oliveros (Sede Huancayo)

Este archivo define la especificación técnica, arquitectura, reglas de negocio y flujo de ejecución que **Claude Code** debe seguir para implementar de principio a fin el prototipo funcional (MVP demostrable) del sistema escolar.

---

## 1. Comandos Principales del Proyecto

Configura `package.json` y el entorno para que todo el ciclo de vida del proyecto funcione con estos comandos estándar:

```bash
npm install              # Instalar dependencias
npx prisma generate      # Generar cliente de Prisma
npx prisma db push       # Crear/actualizar base de datos SQLite (prisma/dev.db)
npx prisma db seed       # Cargar datos semilla realistas de Huancayo
npm run dev              # Iniciar servidor de desarrollo en http://localhost:3000
npm run build            # Verificar compilación de producción y tipos TypeScript
```

---

## 2. Principios de Ingeniería y Convenciones para Claude

* **Implementación Real de Punta a Punta:** Prohibido dejar funciones vacías, comentarios `// TODO` o pantallas estáticas simuladas. Cada formulario, tabla, filtro y acción debe conectarse a los Route Handlers (`/api/*`) y persistir en SQLite mediante Prisma.
* **Cero Fricción en Local:** El proyecto debe iniciar limpiamente en local con SQLite (`file:./dev.db`) sin requerir servicios externos, contenedores Docker ni variables de entorno complejas (incluye un `.env` listo para usar con `DATABASE_URL="file:./dev.db"` y `JWT_SECRET="saco-oliveros-huancayo-2026-secret"`).
* **Idioma Único:** Toda la interfaz de usuario, mensajes de error/validación de API, reportes, constancias imprimibles y datos semilla deben estar redactados íntegramente en **español**.
* **Calidad de Código TypeScript:** Mantén tipado estricto, manejo adecuado de errores HTTP (`400`, `401`, `403`, `404`, `409`, `500`) con mensajes descriptivos en JSON (`{ error: "..." }`), y asegúrate de que `npm run build` finalice sin errores.

### Exclusiones Explícitas (Fuera de Alcance)
* No desarrollar aplicaciones móviles nativas (solo web responsiva).
* No conectar con APIs externas reales (sin SIAGIE, sin SUNAT, sin pasarelas bancarias reales).
* No configurar despliegue cloud ni certificados SSL.

---

## 3. Stack Tecnológico Ligero (Obligatorio)

* **Framework Full-Stack:** Next.js 14+ (App Router) con TypeScript.
* **Estilos e Iconografía:** Tailwind CSS + `lucide-react`.
* **Base de Datos y ORM:** SQLite (`file:./dev.db`) + Prisma ORM.
* **Autenticación y Sesión:** Sesión ligera basada en cookies HTTP-only (`jose` o JWT firmado) verificada en middleware/helpers de servidor.
* **Visualización e Impresión:** Gráficos limpios en SVG/CSS (o `recharts`) y vistas de comprobantes con soporte nativo de impresión (`@media print` + `window.print()`).

---

## 4. Identidad Visual Institucional

* **Institución:** Colegio Saco Oliveros — Sede Huancayo
* **Año Académico Activo:** `2026`
* **Paleta Institucional:**
  * **Azul Marino (Primario):** `#0F2C59` (`bg-blue-950` / `text-blue-950`)
  * **Rojo Carmesí (Acento):** `#C8102E` (`bg-red-700` / `text-red-700`)
  * **Ámbar / Dorado (Alertas y Destacados):** `#D97706` (`bg-amber-600`)
  * **Superficies:** Fondo general `#F8FAFC` (`bg-slate-50`), tarjetas blancas (`bg-white`) con bordes `border-slate-200`.

---

## 5. Roles de Usuario y Control de Acceso (RBAC)

Implementa **4 roles diferenciados**, protegiendo tanto la navegación lateral como los endpoints de API:

1. **`ADMINISTRADOR`**
   * Acceso completo a todos los módulos: Dashboard Ejecutivo, Gestión Académica (Estudiantes, Docentes, Cursos, Secciones), Admisión y Matrículas, Horarios, Asistencia, Pagos, Documentos, Usuarios y Reportes.
2. **`ADMINISTRATIVO`**
   * Gestión de Admisión y Vacantes, Matrículas, Registro de Estudiantes, Cobranza y Pagos, Gestión Documental, Consulta de Horarios y Reportes Administrativos.
3. **`DOCENTE`**
   * Consulta de su horario semanal asignado, listado de estudiantes por sección, registro diario de asistencia, subida de documentos/sílabos académicos y notificaciones.
4. **`APODERADO_ESTUDIANTE`**
   * Portal familiar/estudiantil: visualización de ficha del alumno(s), horario de clases, resumen de asistencias e inasistencias, estado de cuenta de pensiones, pago en línea mediante pasarela simulada, descarga/impresión de constancias y notificaciones.

> **Requisito Crítico para Demostración (`/login`):** Además del formulario estándar de correo y contraseña, incluye un panel **"Acceso Rápido de Demostración (1 Clic)"** con 4 botones para autenticar instantáneamente como *Administrador*, *Personal Administrativo*, *Docente* o *Apoderado/Estudiante*.

---

## 6. Reglas de Negocio Críticas (Validación Obligatoria en Backend)

1. **Control Estricto de Vacantes (Sin Sobrecupo):**
   * Cada `Seccion` define `capacidadMaxima`.
   * Al registrar una matrícula (`POST /api/matriculas`), contar las matrículas con estado `ACTIVA` en esa sección. Si `matriculadosActivos >= capacidadMaxima`, rechazar con HTTP `409` y el mensaje: *"No existen vacantes disponibles en la sección seleccionada"*.
2. **Detección Automática de Cruces de Horario:**
   * Al crear o editar un bloque en `/api/horarios` (`diaSemana`, `horaInicio`, `horaFin`, `docenteId`, `seccionId`), validar solapamientos en el mismo `diaSemana` usando la condición:
     $$horaInicio_A < horaFin_B \land horaFin_A > horaInicio_B$$
   * Verificar tanto que el **docente** no tenga cruce como que la **sección** no tenga otro curso en ese intervalo. Si hay cruce, devolver HTTP `409` detallando qué curso/sección o docente genera el conflicto.
3. **Automatización de Alertas por Inasistencias:**
   * Al guardar asistencias (`POST /api/asistencia`), calcular el total de registros con estado `FALTA_INJUSTIFICADA` de cada estudiante en el año activo.
   * Si un estudiante alcanza $\ge 3$ faltas injustificadas, generar automáticamente una `Notificacion` con tipo `ALERTA` dirigida a los usuarios `ADMINISTRATIVO` y al `APODERADO_ESTUDIANTE` vinculado (evitando duplicar alertas idénticas en el mismo día).
4. **Flujo de Pago y Actualización de Estado:**
   * Al procesar un pago en la pasarela simulada (`POST /api/pagos/[id]/pagar`), cambiar el estado del recibo de `PENDIENTE` o `VENCIDO` a `PAGADO`, asignar `fechaPago` actual, guardar el `metodoPago`, generar un código de operación único (ej. `OP-2026-00045`) y emitir una notificación interna de confirmación al apoderado.

---

## 7. Modelo de Datos (`prisma/schema.prisma`)

Define el esquema en SQLite con las siguientes entidades y relaciones:

* **`Usuario`**: `id` (cuid), `nombre`, `apellidos`, `email` (unique), `password`, `rol` (`ADMINISTRADOR` | `ADMINISTRATIVO` | `DOCENTE` | `APODERADO_ESTUDIANTE`), `activo` (Boolean, default `true`), `createdAt`.
* **`Docente`**: `id`, `usuarioId` (String?, unique), `dni` (unique), `nombres`, `apellidos`, `especialidad`, `telefono`, `email`, `estado` (`ACTIVO` | `INACTIVO`).
* **`Estudiante`**: `id`, `usuarioApoderadoId` (String?), `dni` (unique), `codigoEstudiante` (unique, ej. `SO-HYO-2026-001`), `nombres`, `apellidos`, `fechaNacimiento`, `nombreApoderado`, `telefonoApoderado`, `estado` (`POSTULANTE` | `MATRICULADO` | `RETIRADO`).
* **`Curso`**: `id`, `codigo` (unique), `nombre`, `area`, `horasSemanales` (Int).
* **`Seccion`**: `id`, `nivel` (`PRIMARIA` | `SECUNDARIA`), `grado`, `nombre`, `turno` (`MAÑANA`), `capacidadMaxima` (Int), `anioAcademico` (Int, default `2026`).
* **`Matricula`**: `id`, `codigoMatricula` (unique), `estudianteId`, `seccionId`, `fechaMatricula` (DateTime, default `now()`), `estado` (`ACTIVA` | `ANULADA`), `observaciones` (String?).
* **`Horario`**: `id`, `seccionId`, `cursoId`, `docenteId`, `diaSemana` (`LUNES` | `MARTES` | `MIERCOLES` | `JUEVES` | `VIERNES`), `horaInicio` (String `"08:00"`), `horaFin` (String `"09:30"`), `aula` (String).
* **`Asistencia`**: `id`, `estudianteId`, `seccionId`, `fecha` (String en formato `"YYYY-MM-DD"` para evitar desfases de zona horaria), `estado` (`PRESENTE` | `TARDANZA` | `FALTA_INJUSTIFICADA` | `FALTA_JUSTIFICADA`), `observacion` (String?), `registradoPorId` (String). Índice único: `@@unique([estudianteId, seccionId, fecha])`.
* **`Pago`**: `id`, `codigoRecibo` (unique), `codigoOperacion` (String?), `estudianteId`, `concepto`, `monto` (Float), `fechaVencimiento` (String), `fechaPago` (DateTime?), `metodoPago` (String?), `estado` (`PENDIENTE` | `PAGADO` | `VENCIDO`).
* **`Documento`**: `id`, `titulo`, `tipo` (`CONSTANCIA_MATRICULA` | `BOLETA_PAGO` | `SILABO` | `CERTIFICADO` | `COMUNICADO`), `descripcion`, `rutaArchivo` (String?), `estudianteId` (String?), `seccionId` (String?), `subidoPorId` (String), `createdAt`.
* **`Notificacion`**: `id`, `usuarioId`, `titulo`, `mensaje`, `tipo` (`INFO` | `ALERTA` | `EXITO`), `leida` (Boolean, default `false`), `createdAt`.

---

## 8. Especificación de Módulos de Interfaz

### 8.1. Dashboard Ejecutivo (`/dashboard`)
* **4 Tarjetas KPI:**
  1. Estudiantes Matriculados (`ACTIVA`).
  2. Vacantes Disponibles totales.
  3. Porcentaje de Asistencia del periodo (`%`).
  4. Total Recaudado (`S/`) vs. Saldo Pendiente (`S/`).
* **Gráficos y Listas Rápidas:**
  * Barras comparativas de ocupación de vacantes por sección (matriculados vs. capacidad máxima).
  * Últimos pagos confirmados y alertas recientes de inasistencias.

### 8.2. Gestión Académica Base (`/academico`)
* Interfaz con pestañas para CRUD completo (buscador, filtros, modal de creación/edición):
  * **Estudiantes:** Validación de DNI de 8 dígitos y generación automática de `codigoEstudiante`.
  * **Docentes:** Gestión de plana docente y especialidades.
  * **Cursos:** Catálogo de materias del sistema helicoidal.
  * **Secciones:** Gestión de grados, secciones, capacidad máxima e indicador visual de vacantes libres.

### 8.3. Admisión, Vacantes y Matrícula (`/matriculas`)
* **Monitor de Vacantes en Tiempo Real:** Tarjetas por grado/sección con contador dinámico de cupos disponibles.
* **Wizard / Formulario de Matrícula:**
  * Permite registrar un nuevo postulante o seleccionar uno con estado `POSTULANTE`.
  * Bloquea en UI (y valida en backend) las secciones sin vacantes.
  * Al confirmar: crea la `Matricula`, actualiza el estudiante a `MATRICULADO`, genera automáticamente los cargos de pago (`Matrícula 2026` y `Pensión Marzo 2026`) y envía una notificación interna.
* **Constancia de Matrícula Imprimible:** Modal con diseño oficial del *Colegio Saco Oliveros – Sede Huancayo*, código de matrícula, datos del estudiante/apoderado y botón para imprimir o guardar como PDF.

### 8.4. Horarios Docentes (`/horarios`)
* Cuadrícula semanal (`Lunes` a `Viernes`) filtrable por **Sección** o por **Docente**.
* Modal de asignación de bloque horario con feedback inmediato si se detecta cruce de docente o de sección.
* Botón para eliminar bloques horarios.

### 8.5. Control de Asistencia (`/asistencia`)
* Selector de **Sección** y **Fecha** (valor inicial: fecha actual `"YYYY-MM-DD"`).
* Tabla de estudiantes matriculados en la sección con selector rápido de estado (`Presente`, `Tardanza`, `Falta Injustificada`, `Falta Justificada`) y botón **"Marcar todos Presentes"**.
* Al guardar, ejecuta la regla automática de alerta si algún estudiante llega a $\ge 3$ faltas injustificadas.
* Sub-pestaña de **Reporte de Inasistencias** con conteo acumulado por estudiante.

### 8.6. Pagos, Pensiones y Pasarela Simulada (`/pagos`)
* Tabla de recibos filtrable por estudiante, concepto y estado (`PENDIENTE`, `PAGADO`, `VENCIDO`).
* **Modal de Pasarela de Pago Simulada:**
  * Disponible para `ADMINISTRATIVO` (cobro en caja) y `APODERADO_ESTUDIANTE` (pago en línea).
  * Opciones de pago: **Yape / Plin** (muestra código QR institucional simulado), **Tarjeta de Crédito / Débito** (formulario simulado con validación básica) o **Transferencia Bancaria**.
  * Al confirmar, simula validación bancaria (800 ms), actualiza el estado a `PAGADO` y muestra el comprobante electrónico imprimible.

### 8.7. Gestión Documental (`/documentos`)
* Repositorio con filtros por tipo de documento y sección.
* Formulario para registrar y subir documentos reales a `public/uploads` (mediante `FormData` en `/api/documentos`) o emitir documentos institucionales generados automáticamente (Constancia de Estudios / Estado de Cuenta).

### 8.8. Notificaciones Internas (Navbar)
* Campana en la barra superior con badge numérico de notificaciones no leídas.
* Menú desplegable para revisar alertas y marcarlas como leídas.

---

## 9. Datos Semilla Precargados (`prisma/seed.ts`)

Configura `prisma.seed` en `package.json` (`"prisma": { "seed": "tsx prisma/seed.ts" }`) e inserta datos coherentes con **Huancayo, Junín, Perú**:

* **4 Usuarios de Demostración (contraseña: `123456`):**
  1. `admin@sacooliveros.edu.pe` — `ADMINISTRADOR` (Lic. Carlos Mendoza Quispe — Director de Sede)
  2. `secretaria@sacooliveros.edu.pe` — `ADMINISTRATIVO` (Srta. Elena Huamán Rojas — Secretaría Académica)
  3. `docente@sacooliveros.edu.pe` — `DOCENTE` (Prof. Jorge Luis Vílchez — Matemática)
  4. `apoderado@sacooliveros.edu.pe` — `APODERADO_ESTUDIANTE` (Sra. María Elena Salazar — Apoderada)
* **Docentes (6):** Especialidades en Álgebra, Geometría, Razonamiento Matemático, Comunicación, Física y Química (vinculando al Prof. Jorge Luis Vílchez con su usuario).
* **Cursos (8):** Álgebra, Geometría, Aritmética, Razonamiento Matemático, Comunicación Integral, Física Elemental, Química y Literatura.
* **Secciones (4):**
  * `6to Primaria - Sección A` (Capacidad: `25`)
  * `1ro Secundaria - Sección A` (Capacidad: `30`)
  * `3ro Secundaria - Sección Círculo` (Capacidad: `20`)
  * `5to Secundaria - Sección Pre-U` (Capacidad: `25`)
* **Estudiantes (20):** Nombres y apellidos peruanos realistas (Quispe, Huamán, Rojas, Vílchez, Salazar, Yupanqui, Palomino, Cárdenas, Mantari, Hinostroza). `17` con estado `MATRICULADO` distribuidos en las 4 secciones y `3` con estado `POSTULANTE` listos para demostrar la matrícula en vivo. Al menos `2` estudiantes matriculados deben estar vinculados a `apoderado@sacooliveros.edu.pe`.
* **Horarios:** Al menos `14` bloques horarios distribuidos de Lunes a Viernes sin cruces.
* **Asistencias:** Registros de los últimos 5 días hábiles para las secciones activas, dejando intencionalmente a **1 estudiante con exactamente 2 faltas injustificadas** para que al marcarle una 3ra falta durante la demostración se dispare la alerta automática.
* **Pagos:** Mix de recibos `PAGADO`, `PENDIENTE` y `VENCIDO` en Soles (`S/`).
* **Documentos y Notificaciones:** `4` documentos de muestra y `4` notificaciones iniciales.

---

## 10. Estructura de Directorios

```text
saco-oliveros-huancayo/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── public/
│   └── uploads/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/          # login, logout, session
│   │   │   ├── dashboard/     # KPIs y métricas
│   │   │   ├── estudiantes/
│   │   │   ├── docentes/
│   │   │   ├── cursos/
│   │   │   ├── secciones/
│   │   │   ├── matriculas/
│   │   │   ├── horarios/
│   │   │   ├── asistencia/
│   │   │   ├── pagos/
│   │   │   ├── documentos/
│   │   │   └── notificaciones/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── (portal)/
│   │   │   ├── layout.tsx     # Sidebar institucional + Navbar + Campana notificaciones
│   │   │   ├── dashboard/
│   │   │   ├── academico/
│   │   │   ├── matriculas/
│   │   │   ├── horarios/
│   │   │   ├── asistencia/
│   │   │   ├── pagos/
│   │   │   ├── documentos/
│   │   │   └── reportes/
│   │   └── page.tsx
│   ├── components/            # Componentes reutilizables, modales, pasarela simulada, constancias
│   └── lib/
│       ├── prisma.ts          # Singleton de PrismaClient
│       └── auth.ts            # Gestión de sesión JWT/Cookies y verificación de roles
├── .env
├── package.json
└── CLAUDE.md
```

---

## 11. Plan de Ejecución y Verificación para Claude

Ejecuta la construcción siguiendo estrictamente este orden y verifica cada etapa antes de finalizar:

1. **Inicialización:** Configura Next.js (App Router, TypeScript, Tailwind CSS), instala `prisma`, `@prisma/client`, `lucide-react`, `jose` y `tsx`. Crea el archivo `.env`.
2. **Base de Datos y Seed:** Escribe `prisma/schema.prisma`, ejecuta `npx prisma db push`, implementa `prisma/seed.ts` y ejecútalo con `npx prisma db seed` comprobando que no haya errores de integridad.
3. **Autenticación y Layout Institucional:** Implementa `src/lib/auth.ts`, los endpoints de `/api/auth/*`, la pantalla `/login` con acceso rápido por rol y el layout protegido `(portal)` con los colores institucionales de Saco Oliveros.
4. **Endpoints REST y Lógica de Negocio:** Implementa todas las rutas bajo `src/app/api/*` aplicando las 4 reglas críticas de validación (vacantes, cruces de horario, alerta por $\ge 3$ faltas y pasarela de pago).
5. **Módulos de Interfaz:** Construye todas las páginas de `(portal)/*` conectadas a sus APIs reales, incluyendo comprobantes imprimibles y la pasarela de pago simulada.
6. **Compilación y Prueba de Humo:** Ejecuta `npm run build` y corrige cualquier advertencia o error de TypeScript/Next.js hasta lograr una compilación limpia.