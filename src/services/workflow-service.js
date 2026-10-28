import prisma from "@/lib/prisma";

export class WorkflowConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = "WorkflowConflictError";
  }
}

export class RequestNotFoundError extends Error {
  constructor(message = "Return request not found.") {
    super(message);
    this.name = "RequestNotFoundError";
  }
}

const allowedTransitions = {
  OPEN: ["IN_REVIEW"],
  IN_REVIEW: ["APPROVED", "REJECTED"],
  APPROVED: ["COMPLETED"],
  REJECTED: [],
  COMPLETED: [],
};

export async function transitionReturnRequest(id, input) {
  const current = await prisma.returnRequest.findFirst({
    where: {
      id,
      archivedAt: null,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!current) {
    throw new RequestNotFoundError();
  }

  const allowed = allowedTransitions[current.status] || [];

  if (!allowed.includes(input.status)) {
    throw new WorkflowConflictError(
      `Cannot transition a request from ${current.status} to ${input.status}.`,
    );
  }

  const data = {
    status: input.status,
  };

  if (input.status === "APPROVED") {
    data.resolution = input.resolution;
    data.refundAmount =
      input.resolution === "REFUND" ? input.refundAmount : null;
  }

  // Update only if the status is still what we originally read.
  // This prevents two concurrent requests from both advancing
  // the same request based on a stale status.
  const result = await prisma.returnRequest.updateMany({
    where: {
      id: current.id,
      status: current.status,
      archivedAt: null,
    },
    data,
  });

  if (result.count !== 1) {
    throw new WorkflowConflictError(
      "The request changed while you were processing it. Refresh and retry.",
    );
  }

  return prisma.returnRequest.findUnique({
    where: { id: current.id },
    include: {
      notes: {
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      },
    },
  });
}
