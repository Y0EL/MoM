import { z } from 'zod';

export const TimeRangeSchema = z.object({
  start: z.string(), // Format: "MM:SS" or minutes as string
  end: z.string(),   // Format: "MM:SS" or minutes as string
});

export const ContextCardSchema = z.object({
  id: z.string().optional(),
  meeting_id: z.string().optional(),
  segment_index: z.number().int().min(0),
  topic: z.string().optional(),
  key_points: z.array(z.string()).default([]),
  decisions: z.array(z.string()).default([]),
  action_items: z.array(z.string()).default([]),
  speakers: z.array(z.string()).default([]),
  time_range: TimeRangeSchema,
  generated_at: z.string(), // ISO timestamp
});

export type ContextCard = z.infer<typeof ContextCardSchema>;
export type TimeRange = z.infer<typeof TimeRangeSchema>;

// For frontend usage without optional fields
export const CreateContextCardSchema = ContextCardSchema.omit({ 
  id: true, 
  meeting_id: true 
});

export type CreateContextCard = z.infer<typeof CreateContextCardSchema>;
