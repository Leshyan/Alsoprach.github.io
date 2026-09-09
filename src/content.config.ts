import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { THEME_IDS } from './data/themes';

const posts = defineCollection({
  loader: glob({ base: './src/content/posts', pattern: '*.md' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    theme: z.enum(THEME_IDS),
    published: z.coerce.date(),
    universe: z.object({
      offset: z.tuple([z.number(), z.number(), z.number()]),
    }),
  }),
});

export const collections = { posts };
