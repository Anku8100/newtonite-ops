
import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../db.js";

async function main() {
  const name = process.env.DEMO_USER_NAME;
  const email = process.env.DEMO_USER_EMAIL?.trim().toLowerCase();
  const password = process.env.DEMO_USER_PASSWORD;

  if (!name || !email || !password || password.length < 12) {
    throw new Error(
      "Set DEMO_USER_NAME, DEMO_USER_EMAIL, and a DEMO_USER_PASSWORD of at least 12 characters in .env"
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser?.passwordHash) {
    console.log(
      "Demo user already has a password hash; no changes made."
    );
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  if (existingUser) {
    await prisma.user.update({
      where: { id: existingUser.id },
      data: { passwordHash },
    });

    console.log("Password hash added to the existing demo user.");
    return;
  }

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: "ADMIN",
    },
  });

  console.log("Demo admin user created successfully.");
}

main()
  .catch((error) => {
    console.error("Demo-user seed failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
