import prisma from "@/lib/prisma";

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const page = Number(params.get("page") || 1);
  const limit = Number(params.get("limit") || 10);
  const q = (params.get("q") || "").trim();

  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > 100
  ) {
    return Response.json(
      {
        error: {
          code: "INVALID_PAGINATION",
          message: "Invalid page or limit.",
        },
      },
      { status: 400 },
    );
  }

  const where = {
    archivedAt: { not: null },
    ...(q
      ? {
          OR: [
            { customerName: { contains: q, mode: "insensitive" } },
            { orderNumber: { contains: q, mode: "insensitive" } },
            { reference: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  try {
    const [data, total] = await Promise.all([
      prisma.returnRequest.findMany({
        where,
        orderBy: { archivedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.returnRequest.count({ where }),
    ]);

    return Response.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Failed to list archived requests:", error);

    return Response.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to retrieve removed requests.",
        },
      },
      { status: 500 },
    );
  }
}
