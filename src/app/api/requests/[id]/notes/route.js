import prisma from "@/lib/prisma";
import { createNoteSchema } from "@/lib/validation";

export async function POST(request, context) {
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

  const result = createNoteSchema.safeParse(body);

  if (!result.success) {
    return Response.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Please provide valid note content.",
          details: result.error.flatten().fieldErrors,
        },
      },
      { status: 400 },
    );
  }

  try {
    const existingRequest = await prisma.returnRequest.findFirst({
      where: {
        id,
        archivedAt: null,
      },
      select: { id: true },
    });

    if (!existingRequest) {
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

    const note = await prisma.note.create({
      data: {
        content: result.data.content,
        requestId: existingRequest.id,
      },
    });

    return Response.json({ data: note }, { status: 201 });
  } catch (error) {
    console.error("Failed to add note:", error);

    return Response.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to add the note.",
        },
      },
      { status: 500 },
    );
  }
}
