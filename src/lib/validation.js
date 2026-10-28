import { z } from "zod";

export const createRequestSchema = z
  .object({
    customerName: z
      .string()
      .trim()
      .min(1, "Customer name is required")
      .max(120),
    customerEmail: z
      .string()
      .trim()
      .email("Enter a valid email address")
      .max(254),
    customerPhone: z.string().trim().max(13).optional().or(z.literal("")),

    orderNumber: z.string().trim().min(1, "Order number is required").max(100),
    itemSku: z.string().trim().min(1, "Item SKU is required").max(100),
    itemName: z.string().trim().min(1, "Item name is required").max(200),

    quantity: z.number().int().positive("Quantity must be a positive integer"),

    reason: z.enum([
      "DAMAGED",
      "WRONG_ITEM",
      "SIZE_ISSUE",
      "NOT_AS_DESCRIBED",
      "CHANGED_MIND",
    ]),
  })
  .strict();

export const createNoteSchema = z
  .object({
    content: z
      .string()
      .trim()
      .min(1, "Note content is required.")
      .max(2000, "Note cannot exceed 2000 characters."),
  })
  .strict();

export const transitionRequestSchema = z
  .object({
    status: z.enum(["IN_REVIEW", "APPROVED", "REJECTED", "COMPLETED"]),
    resolution: z.enum(["REFUND", "REPLACEMENT", "STORE_CREDIT"]).optional(),
    refundAmount: z.number().finite().positive().optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.status === "APPROVED") {
      if (!data.resolution) {
        ctx.addIssue({
          code: "custom",
          path: ["resolution"],
          message: "A resolution is required for approval.",
        });
      }

      if (data.resolution === "REFUND" && data.refundAmount === undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["refundAmount"],
          message: "A positive refund amount is required.",
        });
      }

      if (
        data.resolution &&
        data.resolution !== "REFUND" &&
        data.refundAmount !== undefined
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["refundAmount"],
          message: "Refund amount must be omitted for non-refund resolutions.",
        });
      }
    } else if (
      data.resolution !== undefined ||
      data.refundAmount !== undefined
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["resolution"],
        message:
          "Resolution and refund amount can only be supplied when approving.",
      });
    }
  });

export const updateRequestSchema = z
  .object({
    customerName: z.string().trim().min(1).max(120),
    customerEmail: z.string().trim().email().max(254),
    customerPhone: z.string().trim().max(30).optional().or(z.literal("")),
    orderNumber: z.string().trim().min(1).max(100),
    itemSku: z.string().trim().min(1).max(100),
    itemName: z.string().trim().min(1).max(200),
    quantity: z.number().int().positive(),
    reason: z.enum([
      "DAMAGED",
      "WRONG_ITEM",
      "SIZE_ISSUE",
      "NOT_AS_DESCRIBED",
      "CHANGED_MIND",
    ]),
  })
  .strict();
