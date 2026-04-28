import bcrypt from "bcryptjs";

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
