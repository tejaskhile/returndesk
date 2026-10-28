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
