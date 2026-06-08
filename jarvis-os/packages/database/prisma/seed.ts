import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const passwordHash = await bcrypt.hash("jarvis1234", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@jarvis.local" },
    update: {},
    create: {
      email: "admin@jarvis.local",
      name: "Tony Stark",
      passwordHash,
      role: "ADMIN",
      emailVerified: true,
      preferences: {
        create: {
          theme: "dark",
          voiceEnabled: true,
          wakeWord: "jarvis",
          language: "en",
          timezone: "America/New_York",
          defaultModel: "claude-sonnet-4-6",
          responseStyle: "conversational",
        },
      },
    },
  });

  await prisma.goal.createMany({
    data: [
      {
        userId: admin.id,
        title: "Build Iron Man Suit Mark L",
        description: "Design and manufacture the next generation suit",
        category: "Technology",
        priority: "HIGH",
        status: "ACTIVE",
        progress: 35,
      },
      {
        userId: admin.id,
        title: "Master Arc Reactor v3",
        description: "Improve power output by 300%",
        category: "Science",
        priority: "HIGH",
        status: "ACTIVE",
        progress: 60,
      },
    ],
  });

  await prisma.project.create({
    data: {
      userId: admin.id,
      name: "JARVIS OS Development",
      description: "Building the most advanced AI assistant in the world",
      status: "ACTIVE",
      category: "Technology",
      tags: ["AI", "automation", "voice"],
    },
  });

  console.log("Database seeded successfully!");
  console.log("Admin user created: admin@jarvis.local / jarvis1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
