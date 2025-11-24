import dotenv from "dotenv";
import { createClient } from "@sanity/client";

dotenv.config();

export const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID || "",
  dataset: process.env.SANITY_DATASET || "production",
  useCdn: true,
  apiVersion: '2025-05-30',
  stega: {
    enabled: true,
    studioUrl: process.env.SANITY_STUDIO_URL || ""
  }
})