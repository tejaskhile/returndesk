import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

export class EditConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = "EditConflictError";
  }
}

export class EditNotFoundError extends Error {
  constructor() {
    super("Return request not found.");
    this.name = "EditNotFoundError";
  }
}

export async function editReturnRequest(id, input) {
  const existing = await prisma.returnRequest.findFirst({
    where: {
      id,
      archivedAt: null,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!existing) {
    throw new EditNotFoundError();
  }

  if (!["OPEN", "IN_REVIEW"].includes(existing.status)) {
    throw new EditConflictError(
      "Request details cannot be edited after approval, rejection, or completion.",
    );
  }

  try {
    const result = await prisma.returnRequest.updateMany({
      where: {
        id,
        archivedAt: null,
        status: { in: ["OPEN", "IN_REVIEW"] },
      },
      data: {
        ...input,
        customerEmail: input.customerEmail.toLowerCase(),
        customerPhone: input.customerPhone || null,
      },
    });

    if (result.count !== 1) {
      throw new EditConflictError(
        "The request changed while you were editing it. Refresh and retry.",
      );
    }

    return await prisma.returnRequest.findUnique({
      where: { id },
      include: {
        notes: {
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        },
      },
    });
  } catch (error) {
    if (error instanceof EditConflictError) {
      throw error;
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new EditConflictError(
        "A live request already exists for this order and item.",
      );
    }

    throw error;
  }
}
