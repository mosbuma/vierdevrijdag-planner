import path from "node:path";

const URL_PREFIX = "generated/posters/";

/**
 * Directory for meetup / template preview JPEGs on disk.
 * URLs stay `/generated/posters/...` (served by `app/generated/posters/[file]/route.ts`).
 * Keeping files outside `public/` avoids Next.js scanning a bind-mounted `public/generated`
 * that may be root-only on NAS (EACCES crash at startup).
 */
export function getPosterStorageDir(): string {
  const fromEnv = process.env.POSTER_STORAGE_DIR?.trim();
  if (fromEnv) return path.resolve(fromEnv);
  return path.join(process.cwd(), "storage", "posters");
}

/**
 * @param publicRel e.g. `generated/posters/20260428.jpg` (as stored in `poster_rel_path`)
 */
export function posterFileAbsolutePath(publicRel: string): string {
  const n = publicRel.replace(/^\/+/, "");
  if (!n.startsWith(URL_PREFIX)) {
    throw new Error(`Invalid poster path: ${publicRel}`);
  }
  const file = n.slice(URL_PREFIX.length);
  if (!file || file.includes("..") || file !== path.basename(file)) {
    throw new Error(`Invalid poster filename: ${publicRel}`);
  }
  return path.join(getPosterStorageDir(), file);
}
