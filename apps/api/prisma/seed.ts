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
        // Demo account doubles as a platform admin so you can see the Agency
        // console. In production, platform admins are your own staff accounts.
        create: {
          email,
          name: "Demo Owner",
          passwordHash,
          role: "owner",
          isPlatformAdmin: true,
          emailVerified: true,
        },
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
          {
            serviceKey: "customer_service",
            enabled: true,
            config: {
              businessName: "Sunrise Plumbing Co.",
              greeting:
                "Hi! I'm Sunrise Plumbing's assistant. Ask me about our services, pricing, or service area.",
              instructions:
                "Be friendly and concise. For scheduling, encourage them to call or leave their number.",
              enabled: true,
            },
          },
        ],
      },
      subscription: {
        // Demo org is on Pro (simulated) so every service is unlocked.
        create: {
          planKey: "pro",
          status: "active",
          simulated: true,
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
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
          {
            title: "Internal SOP — Emergency Calls & Parts Markup",
            internal: true,
            content:
              "After-hours emergencies: dispatch the on-call tech within 60 minutes; the $95 emergency fee is waived if the customer books a follow-up install. Parts markup is 35% over cost. Never quote a firm price over the phone for jobs over $2,000 — schedule an on-site estimate.",
          },
        ],
      },
      reviews: {
        create: [
          {
            author: "Maria G.",
            rating: 5,
            text: "Fast, friendly, and fixed our leak the same day. Highly recommend!",
            source: "google",
          },
          {
            author: "Tom R.",
            rating: 2,
            text: "Technician was late and I had to call twice to confirm. Work was fine but communication needs improvement.",
            source: "google",
          },
        ],
      },
    },
  });

  // A second client org so the Agency console isn't empty.
  await prisma.organization.create({
    data: {
      name: "Bright Smile Dental",
      users: {
        create: {
          email: "owner@brightsmile.example",
          name: "Bright Smile Owner",
          passwordHash: await bcrypt.hash("demo1234", 12),
          role: "owner",
        },
      },
    },
  });

  console.log(`Seeded organization "${org.name}" with demo login demo@mew.ai / demo1234`);
  console.log("Also seeded a second client org so the Agency console has content.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
