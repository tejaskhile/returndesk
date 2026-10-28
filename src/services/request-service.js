import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

export class RequestConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = "RequestConflictError";
  }
}

export async function createReturnRequest(data) {
  // Check whether a live request already exists.
  // Archived requests still count as live unless rejected/completed.
  const existing = await prisma.returnRequest.findFirst({
    where: {
      orderNumber: data.orderNumber,
      itemSku: data.itemSku,
      status: {
        notIn: ["REJECTED", "COMPLETED"],
      },
    },
    select: {
      id: true,
    },
  });

  if (existing) {
    throw new RequestConflictError(
      "A live request already exists for this order and item.",
    );
  }

  // Generate the reference on the server.
  const reference = `RET-${randomBytes(4).toString("hex").toUpperCase()}`;

  try {
    return await prisma.returnRequest.create({
      data: {
        ...data,
        customerEmail: data.customerEmail.toLowerCase(),
        customerPhone: data.customerPhone || null,
        reference,
        status: "OPEN",
      },
      include: {
        notes: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new RequestConflictError(
        "A unique constraint was violated. Check for an existing live request and retry if necessary.",
      );
    }

    throw error;
  }
}
