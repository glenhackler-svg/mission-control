import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Fix: Next.js was inferring /Users/glenha as the workspace root due to a
  // package-lock.json there. Pin it explicitly to this project directory.
  outputFileTracingRoot: path.join(__dirname),
  reactStrictMode: true,
  allowedDevOrigins: ["mcdashboard.xenlerconsulting.com"],
  // Turbopack disabled — using webpack (Turbopack has client reference manifest bugs in Next.js 16)
  env: {
    DASHBOARD_SESSION_SECRET: process.env.DASHBOARD_SESSION_SECRET,
    DASHBOARD_PASSWORD: process.env.DASHBOARD_PASSWORD,
    AGENTMAIL_API_KEY: process.env.AGENTMAIL_API_KEY,
    AGENTMAIL_FROM_INBOX: process.env.AGENTMAIL_FROM_INBOX,
  },
};

export default nextConfig;
