import { createRequestSchema } from "@/lib/validation";
import {
  createReturnRequest,
  RequestConflictError,
} from "@/services/request-service";

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
