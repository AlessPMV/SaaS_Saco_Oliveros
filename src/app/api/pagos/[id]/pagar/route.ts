import { prisma } from "@/lib/prisma";
import { route, leerJson, notFound, forbidden, conflict, badRequest } from "@/lib/api";
import { GESTION } from "@/lib/permissions";
import { enumerado } from "@/lib/validators";
import { METODOS_PAGO, formatSoles } from "@/lib/utils";
import { notificar, siguienteCodigoOperacion } from "@/lib/servicios";

export const dynamic = "force-dynamic";

function luhn(num: string): boolean {
  let suma = 0;
  let alt = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let d = Number(num[i]);
    if (alt) { d *= 2; if (d > 9) d -= 9; }
    suma += d;
    alt = !alt;
  }
  return suma % 10 === 0;
}

/**
 * Pasarela de pago simulada. PENDIENTE/VENCIDO → PAGADO, con fecha de pago, método,
 * código de operación único (OP-AAAA-NNNNN) y notificación de confirmación al apoderado.
 */
export const POST = route<{ id: string }>([...GESTION, "APODERADO_ESTUDIANTE"], async (req, { params, user }) => {
  const body = await leerJson(req);
  const metodoPago = enumerado(body.metodoPago, "Método de pago", METODOS_PAGO);

  if (metodoPago === "TARJETA") {
    const t = (body.tarjeta ?? {}) as Record<string, unknown>;
    const numero = String(t.numero ?? "").replace(/\s/g, "");
    if (!/^\d{13,19}$/.test(numero) || !luhn(numero)) throw badRequest("El número de tarjeta no es válido.");
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(String(t.vencimiento ?? ""))) throw badRequest("La fecha de vencimiento de la tarjeta debe tener el formato MM/AA.");
    if (!/^\d{3,4}$/.test(String(t.cvv ?? ""))) throw badRequest("El CVV debe tener 3 o 4 dígitos.");
    if (String(t.titular ?? "").trim().length < 3) throw badRequest("Ingrese el nombre del titular de la tarjeta.");
  }

  const existente = await prisma.pago.findUnique({ where: { id: params.id }, include: { estudiante: true } });
  if (!existente) throw notFound("Recibo no encontrado.");
  if (user.rol === "APODERADO_ESTUDIANTE" && existente.estudiante.usuarioApoderadoId !== user.id) {
    throw forbidden("Este recibo no corresponde a su cuenta.");
  }

  const pago = await prisma.$transaction(async (tx) => {
    const actual = await tx.pago.findUnique({ where: { id: params.id } });
    if (!actual) throw notFound("Recibo no encontrado.");
    if (actual.estado === "PAGADO") throw conflict("Este recibo ya fue pagado.");
    const codigoOperacion = await siguienteCodigoOperacion(tx);
    const actualizado = await tx.pago.update({
      where: { id: params.id },
      data: { estado: "PAGADO", fechaPago: new Date(), metodoPago, codigoOperacion },
      include: { estudiante: true },
    });
    const destinatarios = [user.id];
    if (existente.estudiante.usuarioApoderadoId) destinatarios.push(existente.estudiante.usuarioApoderadoId);
    await notificar(
      tx,
      destinatarios,
      "Pago confirmado",
      `Se registró el pago de «${actual.concepto}» por ${formatSoles(actual.monto)} de ${existente.estudiante.nombres} ${existente.estudiante.apellidos}. Código de operación: ${codigoOperacion}.`,
      "EXITO"
    );
    return actualizado;
  });
  return pago;
});
