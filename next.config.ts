import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["mcdashboard.xenlerconsulting.com"],
  env: {
    DASHBOARD_SESSION_SECRET: process.env.DASHBOARD_SESSION_SECRET,
    DASHBOARD_PASSWORD: process.env.DASHBOARD_PASSWORD,
    AGENTMAIL_API_KEY: process.env.AGENTMAIL_API_KEY,
    AGENTMAIL_FROM_INBOX: process.env.AGENTMAIL_FROM_INBOX,
  },
};

export default nextConfig;
