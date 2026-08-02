/**
 * Seed a demo organization so you can log in and try the dashboard immediately.
 *   Email:    demo@mew.ai
 *   Password: demo1234
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "demo@mew.ai";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Demo user already exists — skipping seed.");
    return;
  }

  const passwordHash = await bcrypt.hash("demo1234", 12);
  const org = await prisma.organization.create({
    data: {
      name: "Sunrise Plumbing Co.",
      users: {
        create: { email, name: "Demo Owner", passwordHash, role: "owner" },
      },
      serviceConfigs: {
        create: [
          {
            serviceKey: "receptionist",
            enabled: true,
            config: {
              greeting:
                "Thanks for calling Sunrise Plumbing! This is the AI assistant — how can I help you today?",
              businessName: "Sunrise Plumbing Co.",
              businessHours: "Monday to Saturday, 7am to 6pm",
              transferNumber: null,
              instructions:
                "We do residential plumbing: repairs, installs, and emergencies. Emergency calls should be flagged and offered the earliest slot.",
              enabled: true,
            },
          },
          {
            serviceKey: "lead_follow_up",
            enabled: true,
            config: {
              businessName: "Sunrise Plumbing Co.",
              instructions:
                "Residential plumbing. Emergencies get the earliest slot. Always try to book a specific day and time.",
              qualificationCriteria:
                "Qualified = residential plumbing need within 25 miles of downtown Springfield and ready to schedule a visit.",
              preferredChannel: "sms",
              enabled: true,
            },
          },
        ],
      },
      knowledgeDocs: {
        create: [
          {
            title: "Services & Pricing",
            content:
              "We offer drain cleaning ($120), water heater installation (from $1,200), leak repair (from $150), and 24/7 emergency service (emergency fee $95). Free estimates for installations.",
          },
          {
            title: "Service Area",
            content:
              "We serve the greater Springfield area within a 25-mile radius of downtown. Outside that radius incurs a travel fee.",
          },
        ],
      },
    },
  });

  console.log(`Seeded organization "${org.name}" with demo login demo@mew.ai / demo1234`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
