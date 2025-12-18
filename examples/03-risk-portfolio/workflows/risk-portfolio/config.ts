import { z } from "zod";

export const ConfigSchema = z.object({
  schedule: z.string().min(1, "Cron schedule is required"),
  oracleAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid oracle address"),
  chainSelectorName: z.string().min(1, "Chain selector name is required"),
  gasLimit: z.string().min(1, "Gas limit is required"),
});

export type Config = z.infer<typeof ConfigSchema>;
