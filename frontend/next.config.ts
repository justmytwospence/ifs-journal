import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Include markdown prompt files in serverless function bundles
  outputFileTracingIncludes: {
    '/api/parts/batch-reanalysis': ['./lib/prompts/**/*'],
    '/api/journal/entries/[id]/incremental-analysis': ['./lib/prompts/**/*'],
    '/api/prompts/generate': ['./lib/prompts/**/*'],
    '/api/prompts/writing-tips': ['./lib/prompts/**/*'],
    '/api/conversations': ['./lib/prompts/**/*'],
  },
};

export default nextConfig;
