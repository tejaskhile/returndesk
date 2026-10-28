import prisma from "@/lib/prisma";

export async function POST(_request, context) {
  const { id } = await context.params;

  if (!id || !id.trim()) {
    return Response.json(
      {
        error: {
          code: "INVALID_REQUEST_ID",
          message: "A request ID is required.",
        },
      },
      { status: 400 },
    );
  }

  try {
    const result = await prisma.returnRequest.updateMany({
      where: {
        id,
        archivedAt: null,
        status: { in: ["OPEN", "REJECTED"] },
      },
      data: {
        archivedAt: new Date(),
      },
    });

    if (result.count === 1) {
      return Response.json({
        data: {
          id,
          archived: true,
        },
      });
    }

    const existing = await prisma.returnRequest.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        archivedAt: true,
      },
    });

    if (!existing || existing.archivedAt !== null) {
      return Response.json(
        {
          error: {
            code: "REQUEST_NOT_FOUND",
            message: "Return request not found.",
          },
        },
        { status: 404 },
      );
    }

    return Response.json(
      {
        error: {
          code: "ARCHIVE_NOT_ALLOWED",
          message: "Only Open or Rejected requests can be archived.",
        },
      },
      { status: 409 },
    );
  } catch (error) {
    console.error("Failed to archive return request:", error);

    return Response.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to archive the return request.",
        },
      },
      { status: 500 },
    );
  }
}
