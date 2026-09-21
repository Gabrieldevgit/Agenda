import { z } from "zod";

/**
 * Shared client+server validation. The server re-validates every mutation —
 * client validation is only for fast feedback, never treated as proof.
 */
const eventInputBase = z.object({
  calendarId: z.string().min(1, "Choose a calendar"),
  title: z.string().trim().min(1, "Add a title").max(200),
  description: z.string().max(5000).optional().default(""),
  location: z.string().max(300).optional().default(""),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  timezone: z.string().min(1),
  allDay: z.boolean().default(false),
});

export const eventInputSchema = eventInputBase
  .refine((v) => v.allDay || new Date(v.endAt) > new Date(v.startAt), {
    message: "End time must be after the start time",
    path: ["endAt"],
  });

export const eventInputPartialSchema = eventInputBase.partial().refine((v) => !v.startAt || !v.endAt || v.allDay || new Date(v.endAt) > new Date(v.startAt), {
  message: "End time must be after the start time",
  path: ["endAt"],
});

export type EventInput = z.infer<typeof eventInputSchema>;

export const moveOrResizeSchema = z.object({
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
}).refine((v) => new Date(v.endAt) > new Date(v.startAt), {
  message: "End time must be after the start time",
  path: ["endAt"],
});
