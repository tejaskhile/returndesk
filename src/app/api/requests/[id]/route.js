import prisma from "@/lib/prisma";
import { transitionRequestSchema } from "@/lib/validation";
import {
  transitionReturnRequest,
  WorkflowConflictError,
  RequestNotFoundError,
} from "@/services/workflow-service";
import { updateRequestSchema } from "@/lib/validation";
import {
  editReturnRequest,
  EditConflictError,
  EditNotFoundError,
} from "@/services/edit-request-service";

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

export async function PATCH(request, context) {
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

  let body;

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

  const result = transitionRequestSchema.safeParse(body);

  if (!result.success) {
    return Response.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "The requested transition data is invalid.",
          details: result.error.flatten().fieldErrors,
        },
      },
      { status: 400 },
    );
  }

  try {
    const updated = await transitionReturnRequest(id, result.data);

    return Response.json({ data: updated });
  } catch (error) {
    if (error instanceof RequestNotFoundError) {
      return Response.json(
        {
          error: {
            code: "REQUEST_NOT_FOUND",
            message: error.message,
          },
        },
        { status: 404 },
      );
    }

    if (error instanceof WorkflowConflictError) {
      return Response.json(
        {
          error: {
            code: "INVALID_STATUS_TRANSITION",
            message: error.message,
          },
        },
        { status: 409 },
      );
    }

    console.error("Failed to transition return request:", error);

    return Response.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to update the return request.",
        },
      },
      { status: 500 },
    );
  }
}

export async function PUT(request, context) {
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

  let body;

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

  const result = updateRequestSchema.safeParse(body);

  if (!result.success) {
    return Response.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "The editable request details are invalid.",
          details: result.error.flatten().fieldErrors,
        },
      },
      { status: 400 },
    );
  }

  try {
    const updated = await editReturnRequest(id, result.data);
    return Response.json({ data: updated });
  } catch (error) {
    if (error instanceof EditNotFoundError) {
      return Response.json(
        {
          error: {
            code: "REQUEST_NOT_FOUND",
            message: error.message,
          },
        },
        { status: 404 },
      );
    }

    if (error instanceof EditConflictError) {
      return Response.json(
        {
          error: {
            code: "EDIT_NOT_ALLOWED",
            message: error.message,
          },
        },
        { status: 409 },
      );
    }

    console.error("Failed to edit return request:", error);

    return Response.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to update the return request.",
        },
      },
      { status: 500 },
    );
  }
}
