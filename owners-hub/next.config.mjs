import path from "node:path";
import { fileURLToPath } from "node:url";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // This app is self-contained; don't let Next pick up a parent folder as the workspace root.
  outputFileTracingRoot: path.dirname(fileURLToPath(import.meta.url)),
  serverExternalPackages: ["@prisma/client", "bcryptjs", "nodemailer"],
};
export default nextConfig;
