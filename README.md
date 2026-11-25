# Sistema SaaS de Gestión Académica y Administrativa — Colegio Saco Oliveros (Sede Huancayo)

MVP funcional: Next.js 14 (App Router) + TypeScript + Tailwind CSS + Prisma + SQLite. Sin servicios externos.

## Puesta en marcha

```bash
npm install
npx prisma generate      # genera el cliente de Prisma
npx prisma db push       # crea prisma/dev.db (SQLite)
npx prisma db seed       # carga los datos semilla de Huancayo
npm run dev              # http://localhost:3000
npm run build            # compilación de producción + verificación de tipos
```

El archivo `.env` ya viene listo (`DATABASE_URL="file:./dev.db"` y `JWT_SECRET`).
Requiere Node.js 18.18 o superior y acceso a internet en el primer `npm install` / `prisma generate` (descarga del motor de Prisma).

## Cuentas de demostración (contraseña `123456`)

| Rol | Correo |
|---|---|
| Administrador | admin@sacooliveros.edu.pe |
| Administrativo | secretaria@sacooliveros.edu.pe |
| Docente | docente@sacooliveros.edu.pe |
| Apoderado / Estudiante | apoderado@sacooliveros.edu.pe |

La pantalla `/login` incluye el panel **Acceso Rápido de Demostración (1 Clic)**.

## Guion de demostración sugerido

1. **Vacantes:** *Admisión y Matrículas* → monitor de vacantes → wizard con un postulante → constancia imprimible. Los cargos «Matrícula 2026» y «Pensión Marzo 2026» se generan solos.
2. **Cruce de horarios:** *Horarios* (Administrador) → asignar a Jorge Luis Vílchez un bloque el lunes de 09:00 a 10:00 → error 409 con el detalle del conflicto.
3. **Alerta por faltas:** *Asistencia* (Docente) → 3ro Secundaria Círculo → hoy → marcar a **Diego Alonso Salazar Rojas** con «Falta Injustificada» → guardar. Tiene 2 faltas sembradas; la 3.ª genera alerta para Secretaría y para la apoderada.
4. **Pago en línea:** entrar como Apoderado → *Pagos* → «Pagar en línea» (tarjeta de prueba `4111 1111 1111 1111`) → comprobante imprimible y notificación.

## Reglas de negocio (validadas en backend)

- `POST /api/matriculas`: si matriculados activos ≥ capacidad → **409** «No existen vacantes disponibles en la sección seleccionada».
- `POST/PUT /api/horarios`: cruce de **docente** o de **sección** con `inicioA < finB ∧ finA > inicioB` → **409** con detalle.
- `POST /api/asistencia`: ≥ 3 faltas injustificadas en el año → notificación `ALERTA` a ADMINISTRATIVO y al apoderado (sin duplicar el mismo día).
- `POST /api/pagos/[id]/pagar`: `PENDIENTE|VENCIDO` → `PAGADO`, `fechaPago`, método, código `OP-AAAA-NNNNN` y notificación.

## Notas de diseño

- Sesión JWT (`jose`) en cookie HTTP-only; `middleware.ts` protege páginas y API; cada endpoint valida el rol (RBAC).
- Los archivos subidos se guardan en `public/uploads` y se sirven (autenticados) vía `/api/archivos/[nombre]`, de modo que funcionan también con `npm run start`.
- Los recibos `PENDIENTE` cuya fecha de vencimiento ya pasó se marcan automáticamente como `VENCIDO`.
- Añadidos fuera del listado mínimo de la especificación: módulo `/usuarios` (CRUD de cuentas) y `/api/reportes`.
