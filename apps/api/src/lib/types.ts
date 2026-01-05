import { z } from 'zod';

export const TemplateSchema = z.enum(['ai-agent', 'mcp-server', 'website', 'custom']);
export type Template = z.infer<typeof TemplateSchema>;

export const ResourceConfigSchema = z.object({
  cpu: z.number().min(0.5).max(32).optional().default(2),
  memory: z
    .string()
    .regex(/^\d+[GM]i$/)
    .optional()
    .default('4Gi'),
  storage: z
    .string()
    .regex(/^\d+[GM]i$/)
    .optional()
    .default('10Gi'),
  gpu: z
    .object({
      model: z.string(),
      count: z.number().min(1).max(8).optional().default(1),
    })
    .optional(),
});
export type ResourceConfig = z.infer<typeof ResourceConfigSchema>;

export const FundingConfigSchema = z.object({
  initialDeposit: z.number().min(1).optional().default(10),
  autoTopUp: z.boolean().optional().default(true),
  maxBudget: z.number().min(1).optional(),
});
export type FundingConfig = z.infer<typeof FundingConfigSchema>;

export const DeployRequestSchema = z.object({
  repoUrl: z
    .string()
    .url()
    .or(z.string().regex(/^[\w-]+\/[\w.-]+$/)),
  branch: z.string().optional().default('main'),
  template: TemplateSchema.optional(),
  resources: ResourceConfigSchema.optional(),
  env: z.record(z.string()).optional(),
  funding: FundingConfigSchema.optional(),
});
export type DeployRequest = z.infer<typeof DeployRequestSchema>;

export const PreviewRequestSchema = z.object({
  repoUrl: z
    .string()
    .url()
    .or(z.string().regex(/^[\w-]+\/[\w.-]+$/)),
  template: TemplateSchema.optional(),
  resources: ResourceConfigSchema.optional(),
});
export type PreviewRequest = z.infer<typeof PreviewRequestSchema>;

export const CreateApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  permissions: z
    .array(z.enum(['deploy', 'status', 'logs', 'fund', 'close']))
    .optional()
    .default(['deploy', 'status', 'logs']),
  expiresAt: z.string().datetime().optional(),
});
export type CreateApiKeyRequest = z.infer<typeof CreateApiKeySchema>;

export const FundDeploymentSchema = z.object({
  amount: z.number().min(1),
  currency: z.enum(['USDC', 'AKT']).optional().default('USDC'),
});
export type FundDeploymentRequest = z.infer<typeof FundDeploymentSchema>;

export interface DeploymentResponse {
  id: string;
  dseq: string;
  status: DeploymentStatus;
  repoUrl?: string;
  branch?: string;
  template: Template;
  serviceUrl?: string;
  provider?: string;
  escrowBalance?: {
    amount: number;
    currency: string;
    usdValue: number;
  };
  estimatedTimeRemaining?: string;
  resources: ResourceConfig;
  createdAt: string;
  updatedAt: string;
}

export type DeploymentStatus =
  | 'pending'
  | 'building'
  | 'deploying'
  | 'active'
  | 'failed'
  | 'closed';

export interface ApiKeyResponse {
  id: string;
  name: string;
  prefix: string;
  permissions: string[];
  lastUsedAt: string | null;
  createdAt: string;
  expiresAt: string | null;
}

export interface ApiKeyWithSecret extends ApiKeyResponse {
  key: string;
}

export interface AuthContext {
  method: 'api-key' | 'wallet' | 'github';
  userId: string;
  walletAddress?: string;
  apiKeyId?: string;
  permissions: string[];
}
