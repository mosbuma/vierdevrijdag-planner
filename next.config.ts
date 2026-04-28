import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.NODE_ENV === "production" && { output: "standalone" }),
  // bcryptjs uses Node's `crypto`; bundling it for Turbopack fails without this.
  serverExternalPackages: ["bcryptjs"],
};

export default nextConfig;
