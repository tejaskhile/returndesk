import { createRequestSchema } from "@/lib/validation";
import {
  createReturnRequest,
  RequestConflictError,
} from "@/services/request-service";
import prisma from "@/lib/prisma";

export async function POST(request) {
  let body;

  // Parse incoming JSON.
  try {
    body = await request.json();
  } catch {
    return Response.json(
      {
        error: {
          code: "INVALID_JSON",
          message: "Request body must contain valid JSON.",
        },
      },
      { status: 400 },
    );
  }

  // Validate the request body.
  const result = createRequestSchema.safeParse(body);

  if (!result.success) {
    return Response.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "The request contains invalid fields.",
          details: result.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
      },
      { status: 400 },
    );
  }

  // Execute the business operation.
  try {
    const created = await createReturnRequest(result.data);

    return Response.json({ data: created }, { status: 201 });
  } catch (error) {
    if (error instanceof RequestConflictError) {
      return Response.json(
        {
          error: {
            code: "REQUEST_CONFLICT",
            message: error.message,
          },
        },
        { status: 409 },
      );
    }

    console.error("Failed to create return request:", error);

    return Response.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to create the return request.",
        },
      },
      { status: 500 },
    );
  }
}

const allowedStatuses = [
  "OPEN",
  "IN_REVIEW",
  "APPROVED",
  "REJECTED",
  "COMPLETED",
];

const allowedReasons = [
  "DAMAGED",
  "WRONG_ITEM",
  "SIZE_ISSUE",
  "NOT_AS_DESCRIBED",
  "CHANGED_MIND",
];

const allowedSortFields = [
  "createdAt",
  "updatedAt",
  "customerName",
  "orderNumber",
  "reference",
  "status",
  "reason",
];

export async function GET(request) {
  const params = new URL(request.url).searchParams;

  const q = (params.get("q") || "").trim();
  const status = params.get("status");
  const reason = params.get("reason");
  const sortBy = params.get("sortBy") || "createdAt";
  const sortOrder = params.get("sortOrder") || "desc";

  const page = Number(params.get("page") || 1);
  const limit = Number(params.get("limit") || 10);

  // Validate pagination values.
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
          message: "Page must be positive and limit must be between 1 and 100.",
        },
      },
      { status: 400 },
    );
  }

  // Validate filter and sorting options.
  if (status && !allowedStatuses.includes(status)) {
    return Response.json(
      {
        error: {
          code: "INVALID_STATUS",
          message: "The supplied status is not supported.",
        },
      },
      { status: 400 },
    );
  }

  if (reason && !allowedReasons.includes(reason)) {
    return Response.json(
      {
        error: {
          code: "INVALID_REASON",
          message: "The supplied return reason is not supported.",
        },
      },
      { status: 400 },
    );
  }

  if (
    !allowedSortFields.includes(sortBy) ||
    !["asc", "desc"].includes(sortOrder)
  ) {
    return Response.json(
      {
        error: {
          code: "INVALID_SORT",
          message: "The requested sorting options are not supported.",
        },
      },
      { status: 400 },
    );
  }

  // Build a PostgreSQL query through Prisma.
  const where = {
    archivedAt: null,
    ...(status ? { status } : {}),
    ...(reason ? { reason } : {}),
    ...(q
      ? {
          OR: [
            {
              customerName: {
                contains: q,
                mode: "insensitive",
              },
            },
            {
              orderNumber: {
                contains: q,
                mode: "insensitive",
              },
            },
            {
              reference: {
                contains: q,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
  };

  const skip = (page - 1) * limit;

  try {
    const [requests, total] = await Promise.all([
      prisma.returnRequest.findMany({
        where,
        orderBy: [{ [sortBy]: sortOrder }, { id: "asc" }],
        skip,
        take: limit,
      }),

      prisma.returnRequest.count({ where }),
    ]);

    return Response.json({
      data: requests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Failed to list return requests:", error);

    return Response.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to retrieve return requests.",
        },
      },
      { status: 500 },
    );
  }
}
