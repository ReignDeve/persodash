/**
 * Creates a user or resets its password.
 *
 *   npm run user:create -- <username>
 *
 * The password is read from the PERSODASH_PASSWORD env var or prompted for,
 * so it never ends up in your shell history.
 */
import "dotenv/config";

import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../app/generated/prisma/client";
import { hashPassword } from "../lib/auth/password";

const MIN_LENGTH = 12;

async function readPassword() {
  if (process.env.PERSODASH_PASSWORD) return process.env.PERSODASH_PASSWORD;
  const rl = createInterface({ input: stdin, output: stdout, terminal: true });
  // Hide typed characters.
  const write = (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput;
  (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (s) => {
    if (s.includes("Password")) write.call(rl, s);
  };
  const password = await rl.question("Password: ");
  rl.close();
  stdout.write("\n");
  return password;
}

async function main() {
  const username = process.argv[2]?.trim();
  if (!username) {
    console.error("Usage: npm run user:create -- <username>");
    process.exit(1);
  }

  const password = await readPassword();
  if (password.length < MIN_LENGTH) {
    console.error(`Password must have at least ${MIN_LENGTH} characters.`);
    process.exit(1);
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.upsert({
      where: { username },
      create: { username, passwordHash },
      update: { passwordHash },
    });
    // A password reset ends all existing sessions.
    await prisma.session.deleteMany({ where: { userId: user.id } });
    console.log(`User "${username}" is ready.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
