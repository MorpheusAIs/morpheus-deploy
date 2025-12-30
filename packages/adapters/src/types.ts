/**
 * World interface - abstraction for workflow state persistence
 * Compatible with Vercel AI SDK's World concept
 */
export interface World {
  /**
   * Initialize the world (run migrations, etc.)
   */
  initialize(): Promise<void>;

  /**
   * Start a new workflow run
   */
  startRun(workflowId: string, input: unknown): Promise<string>;

  /**
   * Complete a workflow run
   */
  completeRun(runId: string, output: unknown): Promise<void>;

  /**
   * Fail a workflow run
   */
  failRun(runId: string, error: Error): Promise<void>;

  /**
   * Execute a task within a workflow step
   */
  executeTask<T>(runId: string, stepId: string, task: Task<T>): Promise<TaskResult<T>>;

  /**
   * Schedule a task for later execution
   */
  scheduleTask(runId: string, stepId: string, task: Task<unknown>, delay: number): Promise<void>;

  /**
   * Get the status of a workflow run
   */
  getRunStatus(runId: string): Promise<{
    status: string;
    completedSteps: number;
    totalSteps: number;
  }>;

  /**
   * Resume a paused or crashed workflow
   */
  resumeRun(runId: string): Promise<{
    lastCompletedStep: string | null;
    pendingSteps: string[];
  }>;

  /**
   * Close connections
   */
  close(): Promise<void>;
}

export interface WorldConfig {
  type: 'postgres' | 'memory';
  connectionString?: string;
}

/**
 * A task is an async function that can be executed
 */
export type Task<T> = () => Promise<T>;

/**
 * Result of task execution
 */
export interface TaskResult<T> {
  success: boolean;
  value?: T;
  error?: Error;
  cached: boolean;
}

/**
 * Workflow execution context
 */
export interface WorkflowContext {
  runId: string;
  workflowId: string;
  world: World;
}

/**
 * Workflow step definition
 */
export interface StepDefinition<TInput, TOutput> {
  id: string;
  name: string;
  execute: (input: TInput, context: WorkflowContext) => Promise<TOutput>;
  retry?: {
    maxAttempts: number;
    delayMs: number;
    backoffMultiplier?: number;
  };
}

/**
 * Workflow definition
 */
export interface WorkflowDefinition<TInput, TOutput> {
  id: string;
  name: string;
  steps: StepDefinition<unknown, unknown>[];
  execute: (input: TInput, context: WorkflowContext) => Promise<TOutput>;
}
