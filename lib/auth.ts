import { cookies } from "next/headers";
import crypto from "crypto";
import type { Role } from "./types";

const COOKIE_NAME = "snegu_session";
const MAX_AGE_DAYS = 60;

function secret(): string {
  return process.env.SESSION_SECRET ?? "dev-secret-change-me-in-production";
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("hex");
}

function encode(role: Role): string {
  const payload = `${role}.${Date.now()}`;
  const sig = sign(payload);
  return `${payload}.${sig}`;
}

function decode(token: string): Role | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [role, issuedAt, sig] = parts;
  if (role !== "snegu" && role !== "ribtu") return null;
  if (sign(`${role}.${issuedAt}`) !== sig) return null;
  const age = Date.now() - Number(issuedAt);
  if (Number.isNaN(age) || age < 0) return null;
  if (age > MAX_AGE_DAYS * 24 * 60 * 60 * 1000) return null;
  return role;
}

export async function getSessionRole(): Promise<Role | null> {
  const jar = cookies();
  const raw = jar.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  return decode(raw);
}

export async function setSessionRole(role: Role) {
  const jar = cookies();
  jar.set({
    name: COOKIE_NAME,
    value: encode(role),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_DAYS * 24 * 60 * 60
  });
}

export async function clearSession() {
  cookies().set({ name: COOKIE_NAME, value: "", maxAge: 0, path: "/" });
}

export function pinToRole(pin: string): Role | null {
  const s = process.env.SNEGU_PIN;
  const r = process.env.RIBTU_PIN;
  if (s && pin === s) return "snegu";
  if (r && pin === r) return "ribtu";
  return null;
}
