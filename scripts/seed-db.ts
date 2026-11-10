import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import raw from "@/lib/data/pune-crimes.json";

async function main() {
  // Clean slate for evaluation
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.claim.deleteMany();
  await prisma.lostFound.deleteMany();
  await prisma.communityPost.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.evidence.deleteMany();
  await prisma.crimeReport.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();

  // 1 officer + 3 citizens (password: demo123 for all)
  const pass = hashPassword("demo123");
  const officer = await prisma.user.create({
    data: { email: "officer@demo.com", name: "Officer Patil", role: "OFFICER", passwordHash: pass },
  });
  const citizens = [];
  for (const [email, name] of [
    ["citizen@demo.com", "Aarav Sharma"],
    ["priya@demo.com", "Priya Nair"],
    ["rahul@demo.com", "Rahul Deshmukh"],
  ] as const) {
    citizens.push(
      await prisma.user.create({ data: { email, name, role: "CITIZEN", passwordHash: pass } })
    );
  }

  // 650 crimes
  await prisma.crimeReport.createMany({
    data: (raw as any[]).map((c) => ({
      id: undefined,
      type: c.type,
      area: c.area,
      latitude: c.latitude,
      longitude: c.longitude,
      datetime: new Date(c.datetime),
      description: c.description,
      status: c.status,
      anonymous: false,
    })),
  });

  await prisma.announcement.createMany({
    data: [
      { title: "Stay Safe: Night patrolling increased", message: "Extra patrols in Shivajinagar and Baner, 8pm–2am this week.", area: "Shivajinagar", severity: "info" },
      { title: "High risk: Chain snatching spike", message: "Avoid isolated lanes in Hadapsar after 9pm. Report suspicious activity.", area: "Hadapsar", severity: "high" },
    ],
  });

  await prisma.communityPost.createMany({
    data: [
      { text: "Suspicious person near Swargate bus stop late night.", area: "Swargate", likes: 12, authorId: citizens[1].id },
      { text: "Streetlight not working in Baner lane 5 — feels unsafe.", area: "Baner", likes: 8, authorId: citizens[2].id },
    ],
  });

  await prisma.lostFound.createMany({
    data: [
      { kind: "lost", item: "Black leather wallet", area: "Deccan", description: "Lost near FC road, contains ID card.", imageEmoji: "👛", ownerId: citizens[0].id },
      { kind: "found", item: "iPhone 12 blue case", area: "Viman Nagar", description: "Found near Phoenix mall entrance.", imageEmoji: "📱", ownerId: citizens[1].id },
      { kind: "lost", item: "College backpack", area: "Kothrud", description: "Blue bag with laptop + notes.", imageEmoji: "🎒", ownerId: citizens[2].id },
    ],
  });

  const counts = {
    users: await prisma.user.count(),
    crimes: await prisma.crimeReport.count(),
    announcements: await prisma.announcement.count(),
    lostFound: await prisma.lostFound.count(),
  };
  console.log("Seeded:", counts, "| officer:", officer.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
