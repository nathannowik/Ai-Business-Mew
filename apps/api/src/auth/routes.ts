import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { env } from "../env.js";
import { hashPassword, verifyPassword } from "./password.js";
import { signToken } from "./jwt.js";
import { authenticate } from "../middleware/authenticate.js";
import { consumeToken, issueToken } from "./tokens.js";
import { emailLayout, sendSystemEmail } from "../email/service.js";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  organizationName: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

async function sendVerificationEmail(userId: string, email: string, name: string): Promise<void> {
  const token = await issueToken(userId, "email_verify");
  const url = `${env.appBaseUrl}/verify-email?token=${token}`;
  await sendSystemEmail(
    email,
    "Verify your email",
    emailLayout(
      `Welcome, ${name}!`,
      "Confirm your email address to secure your Mew AI account.",
      { label: "Verify email", url },
    ),
  );
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  // Sign up creates a new organization + its first owner user.
  app.post("/auth/signup", async (request, reply) => {
    const parsed = signupSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const { email, password, name, organizationName } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return reply.code(409).send({ error: "Email already registered" });
    }

    const passwordHash = await hashPassword(password);
    const org = await prisma.organization.create({
      data: {
        name: organizationName,
        users: { create: { email, name, passwordHash, role: "owner" } },
      },
      include: { users: true },
    });
    const user = org.users[0];
    await sendVerificationEmail(user.id, user.email, user.name);

    const token = signToken({
      userId: user.id,
      organizationId: org.id,
      role: user.role,
      isPlatformAdmin: user.isPlatformAdmin,
    });
    return reply.code(201).send({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: org.id,
        isPlatformAdmin: user.isPlatformAdmin,
        emailVerified: user.emailVerified,
      },
    });
  });

  app.post("/auth/login", async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return reply.code(401).send({ error: "Invalid credentials" });
    }
    if (env.requireEmailVerification && !user.emailVerified) {
      return reply.code(403).send({ error: "Please verify your email before signing in.", code: "email_unverified" });
    }

    const token = signToken({
      userId: user.id,
      organizationId: user.organizationId,
      role: user.role,
      isPlatformAdmin: user.isPlatformAdmin,
    });
    return reply.send({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
        isPlatformAdmin: user.isPlatformAdmin,
        emailVerified: user.emailVerified,
      },
    });
  });

  // --- Email verification ---
  app.post<{ Body: { token?: string } }>("/auth/verify", async (request, reply) => {
    const token = request.body?.token;
    if (!token) return reply.code(400).send({ error: "Missing token" });
    const userId = await consumeToken(token, "email_verify");
    if (!userId) return reply.code(400).send({ error: "Invalid or expired verification link" });
    await prisma.user.update({ where: { id: userId }, data: { emailVerified: true } });
    return { ok: true };
  });

  app.post("/auth/resend-verification", { preHandler: authenticate }, async (request) => {
    const user = await prisma.user.findUnique({ where: { id: request.auth!.userId } });
    if (user && !user.emailVerified) {
      await sendVerificationEmail(user.id, user.email, user.name);
    }
    return { ok: true };
  });

  // --- Password reset ---
  app.post<{ Body: { email?: string } }>("/auth/forgot-password", async (request) => {
    const email = request.body?.email;
    if (email) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (user) {
        const token = await issueToken(user.id, "password_reset");
        const url = `${env.appBaseUrl}/reset-password?token=${token}`;
        await sendSystemEmail(
          user.email,
          "Reset your password",
          emailLayout(
            "Reset your password",
            "We received a request to reset your Mew AI password. This link expires in 1 hour. If you didn't request it, you can ignore this email.",
            { label: "Reset password", url },
          ),
        );
      }
    }
    // Always succeed — don't reveal whether an email is registered.
    return { ok: true };
  });

  const resetSchema = z.object({ token: z.string(), password: z.string().min(8) });

  app.post("/auth/reset-password", async (request, reply) => {
    const parsed = resetSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const userId = await consumeToken(parsed.data.token, "password_reset");
    if (!userId) return reply.code(400).send({ error: "Invalid or expired reset link" });
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await hashPassword(parsed.data.password), emailVerified: true },
    });
    return { ok: true };
  });
}
