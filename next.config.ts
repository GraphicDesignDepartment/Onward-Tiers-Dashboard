import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_ACTIONS === "true" && process.env.E2E !== "true";
const repositoryBasePath = "/Onward-Tiers-Dashboard";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  output: isGitHubPages ? "export" : undefined,
  basePath: isGitHubPages ? repositoryBasePath : "",
  assetPrefix: isGitHubPages ? repositoryBasePath : "",
  trailingSlash: isGitHubPages,
  images: {
    unoptimized: isGitHubPages,
  },
  env: {
    NEXT_PUBLIC_BASE_PATH: isGitHubPages ? repositoryBasePath : "",
  },
};

export default nextConfig;
