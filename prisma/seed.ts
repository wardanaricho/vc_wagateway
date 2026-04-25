import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  const hashedPassword = await bcrypt.hash("admin", 10);

  const user = await prisma.user.upsert({
    where: {
      email: "admin@system.local",
    },
    update: {
      // optional kalau mau update password tiap seed
      password: hashedPassword,
    },
    create: {
      name: "Admin",
      username: "admin",
      email: "admin@system.local",
      password: hashedPassword,
      role: "admin",
    },
  });

  console.log("Admin user ready:", user);

  const allUsers = await prisma.user.findMany({
    include: {
      sessions: true,
      apiKeys: true,
      autoReplies: true,
      webhooks: true,
      messages: true,
    },
  });

  console.log("All users:", JSON.stringify(allUsers, null, 2));
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Seed error:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
