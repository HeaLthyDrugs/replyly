import { defineCollection, z } from 'astro:content';

const changelog = defineCollection({
  type: 'content',
  schema: z.object({
    version: z.string(),
    date: z.string(),
    title: z.string(),
    badge: z.string().optional(),
    summary: z.string(),
  }),
});

export const collections = {
  changelog,
};
