import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

// ─────────────────────────── Utilidades ───────────────────────────
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Últimos N días hábiles (lunes a viernes) anteriores a hoy, del más antiguo al más reciente. */
function ultimosDiasHabiles(n: number): string[] {
  const dias: string[] = [];
  const d = new Date();
  while (dias.length < n) {
    d.setDate(d.getDate() - 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) dias.unshift(iso(d));
  }
  return dias;
}

const pad = (n: number, l: number) => String(n).padStart(l, "0");

async function limpiar() {
  await prisma.notificacion.deleteMany();
  await prisma.documento.deleteMany();
  await prisma.pago.deleteMany();
  await prisma.asistencia.deleteMany();
  await prisma.horario.deleteMany();
  await prisma.matricula.deleteMany();
  await prisma.estudiante.deleteMany();
  await prisma.docente.deleteMany();
  await prisma.curso.deleteMany();
  await prisma.seccion.deleteMany();
  await prisma.usuario.deleteMany();
}

async function main() {
  console.log("🌱 Cargando datos semilla — Colegio Saco Oliveros, Sede Huancayo…");
  await limpiar();
  const password = await bcrypt.hash("123456", 10);

  // ─────────────────────────── Usuarios ───────────────────────────
  const admin = await prisma.usuario.create({ data: { nombre: "Carlos", apellidos: "Mendoza Quispe", email: "admin@sacooliveros.edu.pe", password, rol: "ADMINISTRADOR" } });
  const secretaria = await prisma.usuario.create({ data: { nombre: "Elena", apellidos: "Huamán Rojas", email: "secretaria@sacooliveros.edu.pe", password, rol: "ADMINISTRATIVO" } });
  const usrDocente = await prisma.usuario.create({ data: { nombre: "Jorge Luis", apellidos: "Vílchez Aliaga", email: "docente@sacooliveros.edu.pe", password, rol: "DOCENTE" } });
  const apoderado = await prisma.usuario.create({ data: { nombre: "María Elena", apellidos: "Salazar Vargas", email: "apoderado@sacooliveros.edu.pe", password, rol: "APODERADO_ESTUDIANTE" } });

  // ─────────────────────────── Docentes (6) ───────────────────────────
  const docDatos = [
    { dni: "20431876", nombres: "Jorge Luis", apellidos: "Vílchez Aliaga", especialidad: "Álgebra", telefono: "964120311", email: "docente@sacooliveros.edu.pe", usuarioId: usrDocente.id },
    { dni: "20517342", nombres: "Rosa Elvira", apellidos: "Palomino Cárdenas", especialidad: "Geometría", telefono: "954883420", email: "rosa.palomino@sacooliveros.edu.pe", usuarioId: null },
    { dni: "41256789", nombres: "Víctor Hugo", apellidos: "Mantari Hinostroza", especialidad: "Razonamiento Matemático", telefono: "987345610", email: "victor.mantari@sacooliveros.edu.pe", usuarioId: null },
    { dni: "19876543", nombres: "Lucía Marleni", apellidos: "Yupanqui Salazar", especialidad: "Comunicación", telefono: "962771208", email: "lucia.yupanqui@sacooliveros.edu.pe", usuarioId: null },
    { dni: "40123987", nombres: "Héctor Raúl", apellidos: "Quispe Ramos", especialidad: "Física", telefono: "947210856", email: "hector.quispe@sacooliveros.edu.pe", usuarioId: null },
    { dni: "42987651", nombres: "Patricia Isabel", apellidos: "Huamán Lazo", especialidad: "Química", telefono: "991348275", email: "patricia.huaman@sacooliveros.edu.pe", usuarioId: null },
  ];
  const doc: Record<string, string> = {};
  for (const d of docDatos) doc[d.especialidad] = (await prisma.docente.create({ data: d })).id;

  // ─────────────────────────── Cursos (8) ───────────────────────────
  const cursoDatos = [
    { codigo: "ALG-101", nombre: "Álgebra", area: "Matemática", horasSemanales: 5 },
    { codigo: "GEO-102", nombre: "Geometría", area: "Matemática", horasSemanales: 4 },
    { codigo: "ARI-103", nombre: "Aritmética", area: "Matemática", horasSemanales: 4 },
    { codigo: "RAZ-104", nombre: "Razonamiento Matemático", area: "Matemática", horasSemanales: 3 },
    { codigo: "COM-105", nombre: "Comunicación Integral", area: "Comunicación", horasSemanales: 5 },
    { codigo: "FIS-106", nombre: "Física Elemental", area: "Ciencias", horasSemanales: 3 },
    { codigo: "QUI-107", nombre: "Química", area: "Ciencias", horasSemanales: 3 },
    { codigo: "LIT-108", nombre: "Literatura", area: "Comunicación", horasSemanales: 2 },
  ];
  const cur: Record<string, string> = {};
  for (const c of cursoDatos) cur[c.nombre] = (await prisma.curso.create({ data: c })).id;

  // ─────────────────────────── Secciones (4) ───────────────────────────
  const secDatos = [
    { clave: "6to", nivel: "PRIMARIA", grado: "6to Primaria", nombre: "A", capacidadMaxima: 25, aula: "Aula 101" },
    { clave: "1ro", nivel: "SECUNDARIA", grado: "1ro Secundaria", nombre: "A", capacidadMaxima: 30, aula: "Aula 201" },
    { clave: "3ro", nivel: "SECUNDARIA", grado: "3ro Secundaria", nombre: "Círculo", capacidadMaxima: 20, aula: "Aula 301" },
    { clave: "5to", nivel: "SECUNDARIA", grado: "5to Secundaria", nombre: "Pre-U", capacidadMaxima: 25, aula: "Aula 401" },
  ];
  const sec: Record<string, { id: string; nivel: string; nombre: string; aula: string }> = {};
  for (const s of secDatos) {
    const { clave, aula, ...datos } = s;
    const creada = await prisma.seccion.create({ data: { ...datos, turno: "MAÑANA", anioAcademico: 2026 } });
    sec[clave] = { id: creada.id, nivel: s.nivel, nombre: s.nombre, aula };
  }

  // ─────────────────────────── Horarios (20 bloques, sin cruces) ───────────────────────────
  const S = { S1: ["08:00", "09:30"], S2: ["09:45", "11:15"], S3: ["11:30", "13:00"] } as const;
  type Bloque = [string, string, keyof typeof S, string, string];
  const bloques: Bloque[] = [
    // 6to Primaria A
    ["6to", "LUNES", "S1", "Aritmética", "Álgebra"], ["6to", "MARTES", "S1", "Comunicación Integral", "Comunicación"],
    ["6to", "MIERCOLES", "S1", "Razonamiento Matemático", "Razonamiento Matemático"], ["6to", "JUEVES", "S1", "Geometría", "Geometría"],
    ["6to", "VIERNES", "S1", "Literatura", "Comunicación"],
    // 1ro Secundaria A
    ["1ro", "LUNES", "S2", "Álgebra", "Álgebra"], ["1ro", "MARTES", "S2", "Geometría", "Geometría"],
    ["1ro", "MIERCOLES", "S2", "Comunicación Integral", "Comunicación"], ["1ro", "JUEVES", "S2", "Aritmética", "Álgebra"],
    ["1ro", "VIERNES", "S2", "Química", "Química"],
    // 3ro Secundaria Círculo
    ["3ro", "LUNES", "S3", "Física Elemental", "Física"], ["3ro", "MARTES", "S3", "Álgebra", "Álgebra"],
    ["3ro", "MIERCOLES", "S3", "Química", "Química"], ["3ro", "JUEVES", "S3", "Razonamiento Matemático", "Razonamiento Matemático"],
    ["3ro", "VIERNES", "S3", "Geometría", "Geometría"],
    // 5to Secundaria Pre-U
    ["5to", "LUNES", "S1", "Física Elemental", "Física"], ["5to", "MARTES", "S1", "Álgebra", "Álgebra"],
    ["5to", "MIERCOLES", "S2", "Física Elemental", "Física"], ["5to", "JUEVES", "S1", "Química", "Química"],
    ["5to", "VIERNES", "S1", "Razonamiento Matemático", "Razonamiento Matemático"],
  ];
  // Verificación de integridad: ningún docente ni sección con bloques solapados
  bloques.forEach((a, i) => bloques.forEach((b, j) => {
    if (i < j && a[1] === b[1] && S[a[2]][0] < S[b[2]][1] && S[a[2]][1] > S[b[2]][0] && (a[4] === b[4] || a[0] === b[0])) {
      throw new Error(`Cruce de horario en el seed: ${a.join(" / ")} vs ${b.join(" / ")}`);
    }
  }));
  for (const [s, dia, slot, curso, esp] of bloques) {
    await prisma.horario.create({
      data: { seccionId: sec[s].id, cursoId: cur[curso], docenteId: doc[esp], diaSemana: dia, horaInicio: S[slot][0], horaFin: S[slot][1], aula: sec[s].aula },
    });
  }

  // ─────────────────────────── Estudiantes (20) ───────────────────────────
  type E = { n: string; a: string; sec: string | null; nac: string; apo: string; tel: string; usr?: string };
  const est: E[] = [
    { n: "Camila Fernanda", a: "Salazar Rojas", sec: "6to", nac: "2014-03-12", apo: "María Elena Salazar Vargas", tel: "964555101", usr: apoderado.id },
    { n: "Mateo Andrés", a: "Quispe Huamán", sec: "6to", nac: "2014-07-25", apo: "Rosa Huamán de Quispe", tel: "954200312" },
    { n: "Valeria Sofía", a: "Palomino Cárdenas", sec: "6to", nac: "2014-01-09", apo: "Julio Palomino Ccanto", tel: "987654120" },
    { n: "Joaquín Rodrigo", a: "Mantari Yupanqui", sec: "6to", nac: "2014-11-30", apo: "Elsa Yupanqui Poma", tel: "962118840" },
    { n: "Luciana Alejandra", a: "Hinostroza Vílchez", sec: "1ro", nac: "2013-05-18", apo: "Teresa Vílchez Cóndor", tel: "947330215" },
    { n: "Sebastián Gabriel", a: "Rojas Quispe", sec: "1ro", nac: "2013-09-02", apo: "Walter Rojas Tapia", tel: "991204476" },
    { n: "Ana Lucía", a: "Yupanqui Mantari", sec: "1ro", nac: "2013-02-14", apo: "Marleni Mantari Ríos", tel: "964880231" },
    { n: "Bruno Esteban", a: "Cárdenas Palomino", sec: "1ro", nac: "2013-12-21", apo: "César Cárdenas Lazo", tel: "954671903" },
    { n: "Daniela Milagros", a: "Huamán Salazar", sec: "1ro", nac: "2013-06-07", apo: "Gladys Salazar Ortiz", tel: "987120654" },
    { n: "Diego Alonso", a: "Salazar Rojas", sec: "3ro", nac: "2011-08-16", apo: "María Elena Salazar Vargas", tel: "964555101", usr: apoderado.id },
    { n: "Fiorella Nicole", a: "Vílchez Hinostroza", sec: "3ro", nac: "2011-04-03", apo: "Doris Hinostroza Veliz", tel: "962447019" },
    { n: "Rodrigo Manuel", a: "Quispe Cárdenas", sec: "3ro", nac: "2011-10-27", apo: "Manuel Quispe Arana", tel: "947559320" },
    { n: "Alessandra Pamela", a: "Mantari Rojas", sec: "3ro", nac: "2011-01-19", apo: "Pamela Rojas Gutiérrez", tel: "991076348" },
    { n: "Marco Antonio", a: "Palomino Huamán", sec: "5to", nac: "2009-06-11", apo: "Antonio Palomino Meza", tel: "954302187" },
    { n: "Kiara Estefanía", a: "Yupanqui Salazar", sec: "5to", nac: "2009-09-23", apo: "Estefanía Salazar Bendezú", tel: "987431562" },
    { n: "Renzo Fabián", a: "Hinostroza Quispe", sec: "5to", nac: "2009-03-05", apo: "Fabián Hinostroza Lozano", tel: "964213750" },
    { n: "Milagros Jazmín", a: "Cárdenas Vílchez", sec: "5to", nac: "2009-12-14", apo: "Jazmín Vílchez Camayo", tel: "962885410" },
    // Postulantes
    { n: "Anthony Gabriel", a: "Huamán Mantari", sec: null, nac: "2013-04-22", apo: "Gabriel Huamán Soto", tel: "947100238" },
    { n: "Xiomara Beatriz", a: "Rojas Palomino", sec: null, nac: "2014-08-08", apo: "Beatriz Palomino Yauri", tel: "954776031" },
    { n: "Jhon Piero", a: "Quispe Yupanqui", sec: null, nac: "2011-02-27", apo: "Piero Quispe Ccora", tel: "991340572" },
  ];

  const estIds: string[] = [];
  const matIds: Record<number, string> = {};
  let nMat = 0;
  for (let i = 0; i < est.length; i++) {
    const e = est[i];
    const creado = await prisma.estudiante.create({
      data: {
        dni: String(71230400 + i * 37), codigoEstudiante: `SO-HYO-2026-${pad(i + 1, 3)}`,
        nombres: e.n, apellidos: e.a, fechaNacimiento: e.nac, nombreApoderado: e.apo, telefonoApoderado: e.tel,
        usuarioApoderadoId: e.usr ?? null, estado: e.sec ? "MATRICULADO" : "POSTULANTE",
      },
    });
    estIds.push(creado.id);
    if (e.sec) {
      nMat++;
      const m = await prisma.matricula.create({
        data: { codigoMatricula: `MAT-2026-${pad(nMat, 4)}`, estudianteId: creado.id, seccionId: sec[e.sec].id, fechaMatricula: new Date(2026, 1, 9 + (i % 18), 10, 30), estado: "ACTIVA", observaciones: null },
      });
      matIds[i] = m.id;
    }
  }

  // ─────────────────────────── Asistencias (5 días hábiles) ───────────────────────────
  const dias = ultimosDiasHabiles(5);
  const IDX_DIEGO = 9; // exactamente 2 faltas injustificadas → la 3.ª dispara la alerta automática
  for (let i = 0; i < est.length; i++) {
    const e = est[i];
    if (!e.sec) continue;
    for (let d = 0; d < dias.length; d++) {
      let estado = "PRESENTE";
      let observacion: string | null = null;
      if (i === IDX_DIEGO) {
        if (d === 1 || d === 3) { estado = "FALTA_INJUSTIFICADA"; observacion = "Sin aviso del apoderado"; }
      } else if (i === 7 && d === 2) { estado = "FALTA_INJUSTIFICADA"; observacion = "No asistió"; }
      else if (i === 13 && d === 0) { estado = "FALTA_INJUSTIFICADA"; observacion = "No asistió"; }
      else if ((i + d) % 11 === 0) { estado = "TARDANZA"; observacion = "Ingresó después de las 08:15"; }
      else if ((i * 3 + d) % 17 === 0) { estado = "FALTA_JUSTIFICADA"; observacion = "Cita médica — Hospital Regional Daniel Alcides Carrión"; }
      await prisma.asistencia.create({ data: { estudianteId: estIds[i], seccionId: sec[e.sec].id, fecha: dias[d], estado, observacion, registradoPorId: usrDocente.id } });
    }
  }

  // ─────────────────────────── Pagos (S/) ───────────────────────────
  const pension = (nivel: string, nombre: string, grado: string) => (nivel === "PRIMARIA" ? 350 : /pre-?u/i.test(nombre) ? 500 : /c[ií]rculo/i.test(nombre) ? 450 : /1ro/.test(grado) ? 400 : 420);
  const metodos = ["YAPE_PLIN", "TARJETA", "TRANSFERENCIA"];
  let nRec = 0;
  let nOp = 0;
  const matriculados = est.map((e, i) => ({ e, i })).filter((x) => x.e.sec);
  const fases = [
    { concepto: "Matrícula 2026", venc: "2026-03-01", pagoMes: 1, tipo: "MATRICULA" },
    { concepto: "Pensión Marzo 2026", venc: "2026-03-31", pagoMes: 2, tipo: "PAGADO" },
    { concepto: "Pensión Octubre 2026", venc: "2026-10-31", pagoMes: 9, tipo: "OCTUBRE" },
    { concepto: "Pensión Noviembre 2026", venc: "2026-11-30", pagoMes: 10, tipo: "NOVIEMBRE" },
  ];
  let nVencidos = 0;
  for (const f of fases) {
    for (const { e, i } of matriculados) {
      const s = secDatos.find((x) => x.clave === e.sec)!;
      const monto = f.tipo === "MATRICULA" ? 250 : pension(s.nivel, s.nombre, s.grado);
      const esApoderado = !!e.usr;
      let pagado = true;
      if (f.tipo === "OCTUBRE") pagado = esApoderado ? false : i % 3 === 0;
      if (f.tipo === "NOVIEMBRE") pagado = esApoderado ? false : i % 4 === 0;
      nRec++;
      const base = { codigoRecibo: `REC-2026-${pad(nRec, 5)}`, estudianteId: estIds[i], concepto: f.concepto, monto, fechaVencimiento: f.venc };
      if (pagado) {
        nOp++;
        await prisma.pago.create({
          data: { ...base, estado: "PAGADO", codigoOperacion: `OP-2026-${pad(nOp, 5)}`, metodoPago: metodos[(i + nOp) % 3], fechaPago: new Date(2026, f.pagoMes, 3 + (i % 20), 9 + (i % 8), 15) },
        });
      } else {
        const estado = f.tipo === "OCTUBRE" ? "VENCIDO" : "PENDIENTE";
        if (estado === "VENCIDO") nVencidos++;
        await prisma.pago.create({ data: { ...base, estado } });
      }
    }
  }

  // ─────────────────────────── Documentos (4) ───────────────────────────
  const idCamila = estIds[0];
  const idDiego = estIds[IDX_DIEGO];
  await prisma.documento.create({ data: { titulo: "Sílabo de Álgebra — 1ro Secundaria 2026", tipo: "SILABO", descripcion: "Competencias, unidades de aprendizaje y criterios de evaluación del curso de Álgebra.", rutaArchivo: "/api/archivos/silabo-algebra-1ro-secundaria.txt", seccionId: sec["1ro"].id, subidoPorId: usrDocente.id } });
  await prisma.documento.create({ data: { titulo: "Comunicado N.° 012-2026: Reunión de padres de familia", tipo: "COMUNICADO", descripcion: "Convocatoria a la reunión general de entrega de resultados del periodo.", rutaArchivo: "/api/archivos/comunicado-reunion-padres.txt", subidoPorId: admin.id } });
  await prisma.documento.create({ data: { titulo: "Constancia de Matrícula — Salazar Rojas, Camila Fernanda", tipo: "CONSTANCIA_MATRICULA", descripcion: "Constancia de matrícula 2026 emitida automáticamente por el sistema.", rutaArchivo: "gen:MATRICULA", estudianteId: idCamila, seccionId: sec["6to"].id, subidoPorId: secretaria.id } });
  await prisma.documento.create({ data: { titulo: "Estado de Cuenta — Salazar Rojas, Diego Alonso", tipo: "BOLETA_PAGO", descripcion: "Estado de cuenta de pensiones del año académico 2026.", rutaArchivo: "gen:ESTADO_CUENTA", estudianteId: idDiego, seccionId: sec["3ro"].id, subidoPorId: secretaria.id } });

  // ─────────────────────────── Notificaciones (4) ───────────────────────────
  await prisma.notificacion.create({ data: { usuarioId: admin.id, titulo: "Bienvenido al sistema", mensaje: "El año académico 2026 de la Sede Huancayo está activo. Revise el dashboard ejecutivo para ver vacantes, asistencia y recaudación.", tipo: "INFO" } });
  await prisma.notificacion.create({ data: { usuarioId: secretaria.id, titulo: "Cobranza: recibos vencidos", mensaje: `Existen ${nVencidos} recibos vencidos de Pensión Octubre 2026 pendientes de cobro. Revise el módulo de Pagos.`, tipo: "ALERTA" } });
  await prisma.notificacion.create({ data: { usuarioId: usrDocente.id, titulo: "Horario semanal asignado", mensaje: "Se asignaron sus bloques horarios de Álgebra y Aritmética. Verifique su horario semanal y registre la asistencia diaria.", tipo: "INFO" } });
  await prisma.notificacion.create({ data: { usuarioId: apoderado.id, titulo: "Pensión vencida", mensaje: "Tiene recibos vencidos de «Pensión Octubre 2026». Puede pagarlos en línea desde el módulo de Pagos con Yape/Plin, tarjeta o transferencia.", tipo: "ALERTA" } });

  // ─────────────────────────── Resumen ───────────────────────────
  const conteo = {
    usuarios: await prisma.usuario.count(), docentes: await prisma.docente.count(), cursos: await prisma.curso.count(),
    secciones: await prisma.seccion.count(), estudiantes: await prisma.estudiante.count(), matriculas: await prisma.matricula.count(),
    horarios: await prisma.horario.count(), asistencias: await prisma.asistencia.count(), pagos: await prisma.pago.count(),
    documentos: await prisma.documento.count(), notificaciones: await prisma.notificacion.count(),
  };
  console.log("✅ Datos semilla cargados:", conteo);
  console.log("   Contraseña de todos los usuarios de demostración: 123456");
}

main()
  .catch((e) => {
    console.error("❌ Error al cargar los datos semilla:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
