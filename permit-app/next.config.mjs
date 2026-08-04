/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // This app lives in a subfolder of a larger repo; scope file tracing to itself so the
  // parent lockfile doesn't confuse the build root.
  outputFileTracingRoot: import.meta.dirname,
  // pdf-lib and the Prisma client run only in server code; keep them external to the
  // client bundle and let Next trace their files for the standalone/server build.
  serverExternalPackages: ['@prisma/client', 'pdf-lib'],
  experimental: {
    // Server Actions handle file uploads (township PDFs, employee photos) so allow larger bodies.
    serverActions: {
      bodySizeLimit: '15mb',
    },
  },
};

export default nextConfig;
