import { customAlphabet } from "nanoid";

const alphabet = "23456789abcdefghjkmnpqrstuvwxyz"; // no 0/1/l/i/o to avoid confusion
const nano = customAlphabet(alphabet, 6);

export function slugifyName(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "")
      .slice(0, 10) || "user"
  );
}

export function generatePersonCode(name: string): string {
  return `${slugifyName(name)}${nano()}`;
}

export function generateToken(): string {
  const longNano = customAlphabet(alphabet, 32);
  return longNano();
}
