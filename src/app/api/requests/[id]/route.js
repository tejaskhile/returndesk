import prisma from "@/lib/prisma";

export async function GET(_request, context) {
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
    const returnRequest = await prisma.returnRequest.findFirst({
      where: {
        id,
        archivedAt: null,
      },
      include: {
        notes: {
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        },
      },
    });

    if (!returnRequest) {
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

    return Response.json({ data: returnRequest });
  } catch (error) {
    console.error("Failed to retrieve return request:", error);

    return Response.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to retrieve the return request.",
        },
      },
      { status: 500 },
    );
  }
}
