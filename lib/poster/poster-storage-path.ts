import path from "node:path";

const URL_PREFIX = "generated/posters/";

/**
 * **Single storage location for poster JPEGs on disk:** `POSTER_STORAGE_DIR` (default `./data/posters`,
 * or `/data/posters` in Docker). The browser path `/generated/posters/YYYYMMDD.jpg` is *not* a folder
 * under `public/` — it is handled by `app/generated/posters/[file]/route.ts`, which reads files from
 * this directory only.
 *
 * Do **not** keep copies under `public/generated/`: Next may serve those as static files and you will
 * see stale/wrong posters while the app writes to `data/posters`. Remove `public/generated` if it exists.
 *
 * Keeping storage outside `public/` avoids Next scanning a bind-mounted `public/generated` on NAS (EACCES).
 */
export function getPosterStorageDir(): string {
  const fromEnv = process.env.POSTER_STORAGE_DIR?.trim();
  if (fromEnv) return path.resolve(fromEnv);
  /** Same layout as Docker Compose: `./data/posters` under the project root. */
  return path.join(process.cwd(), "data", "posters");
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
