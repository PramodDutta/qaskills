import { z } from 'zod';

export const reviewCreateSchema = z.object({
  skillId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(10).max(2000),
});

export type ReviewCreateInput = z.infer<typeof reviewCreateSchema>;
