import { z } from "zod";

export const MIN_POSTER_RECT_W = 0.03;
export const MIN_POSTER_RECT_H = 0.02;

/** Normalized rectangle on the poster template (0–1). */
export const posterNormRectSchema = z
  .object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    w: z.number().min(0).max(1),
    h: z.number().min(0).max(1),
  })
  .refine((r) => r.x + r.w <= 1.001 && r.y + r.h <= 1.001, { message: "rectangle outside bounds" })
  .refine((r) => r.w >= MIN_POSTER_RECT_W && r.h >= MIN_POSTER_RECT_H, { message: "rectangle too small" });

export type PosterNormRect = z.infer<typeof posterNormRectSchema>;

export const posterRegionsSchema = z.object({
  title: posterNormRectSchema,
  program: posterNormRectSchema,
});

export type PosterRegions = z.infer<typeof posterRegionsSchema>;

/** Matches seeded poster “Standaard” (id 1) in `database/init.sql`. */
export const DEFAULT_POSTER_TITLE_REGION: PosterNormRect = {
  x: 0,
  y: 0.01883320542756681,
  w: 0.9978939450389646,
  h: 0.08292724497143042,
};

/** Matches seeded poster “Standaard” (id 1) in `database/init.sql`. */
export const DEFAULT_POSTER_PROGRAM_REGION: PosterNormRect = {
  x: 0.04921210992207099,
  y: 0.8332549275331053,
  w: 0.9036818351168935,
  h: 0.1526201190041256,
};

export function parseStoredPosterRegions(
  rawTitle: unknown,
  rawProgram: unknown
): PosterRegions {
  const title = posterNormRectSchema.safeParse(rawTitle);
  const program = posterNormRectSchema.safeParse(rawProgram);
  return {
    title: title.success ? clampRect(title.data) : DEFAULT_POSTER_TITLE_REGION,
    program: program.success ? clampRect(program.data) : DEFAULT_POSTER_PROGRAM_REGION,
  };
}

function clampRect(r: PosterNormRect): PosterNormRect {
  const w = Math.max(MIN_POSTER_RECT_W, Math.min(r.w, 1 - r.x));
  const h = Math.max(MIN_POSTER_RECT_H, Math.min(r.h, 1 - r.y));
  const x = Math.min(r.x, 1 - w);
  const y = Math.min(r.y, 1 - h);
  return { x, y, w, h };
}

export function mergePosterRegions(partial?: Partial<PosterRegions> | null): PosterRegions {
  const base = {
    title: DEFAULT_POSTER_TITLE_REGION,
    program: DEFAULT_POSTER_PROGRAM_REGION,
  };
  if (!partial) return base;
  return {
    title: partial.title ? clampRect(partial.title) : base.title,
    program: partial.program ? clampRect(partial.program) : base.program,
  };
}
