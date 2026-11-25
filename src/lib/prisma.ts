import { PrismaClient } from "@prisma/client";

// Singleton de PrismaClient (evita múltiples conexiones en desarrollo con recarga en caliente)
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
