/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Produces a self-contained server build that the Electron app can also run.
  output: "standalone",
  transpilePackages: ["@mew/shared"],
};

module.exports = nextConfig;
