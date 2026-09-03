import { prisma } from "@/lib/prisma";
import type { JobSource } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";

export async function logRawPayload(
  source: JobSource,
  externalId: string,
  rawPayload: unknown
): Promise<void> {
  await prisma.jobIngestionLog.create({
    data: {
      source,
      externalId,
      rawPayload: rawPayload as Prisma.InputJsonValue,
    },
  });
}

export async function cleanupOldLogs(): Promise<void> {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  await prisma.jobIngestionLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
}
