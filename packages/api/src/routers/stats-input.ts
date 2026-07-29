import { z } from "zod";

export const statsIdSchema = z.string().uuid();

export const statsFiltersSchema = z
  .object({
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
    courtId: statsIdSchema.optional(),
    result: z.enum(["all", "decided", "draws"]).optional(),
  })
  .refine((filters) => !filters.from || !filters.to || filters.from <= filters.to, {
    message: "The end date must not precede the start date",
    path: ["to"],
  })
  .optional();
