import postgres from 'postgres';
import { WorkflowStore } from './store.js';
import { MigrationRunner } from './migrations.js';
import type { World, Task, TaskResult } from '../types.js';

export interface PostgresWorldConfig {
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: boolean;
  maxConnections?: number;
}

/**
 * PostgreSQL-based World implementation for durable AI agent execution.
 * Replaces Vercel's proprietary KV/Queue services with self-hosted Postgres.
 *
 * This adapter enables:
 * - Durable execution that survives container restarts
 * - Serialized workflow state persistence
 * - Step-by-step execution tracking
 * - Automatic retry and recovery
 */
export class PostgresWorld implements World {
  private sql: postgres.Sql;
  private store: WorkflowStore;
  private migrations: MigrationRunner;
  private initialized = false;

  constructor(config: PostgresWorldConfig = {}) {
    const connectionString = config.connectionString ||
      process.env['WORKFLOW_POSTGRES_URL'] ||
      `postgres://${config.user || 'postgres'}:${config.password || 'password'}@${config.host || 'postgres'}:${config.port || 5432}/${config.database || 'workflow'}`;

    this.sql = postgres(connectionString, {
      max: config.maxConnections || 10,
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
      idle_timeout: 20,
      connect_timeout: 10,
    });

    this.store = new WorkflowStore(this.sql);
    this.migrations = new MigrationRunner(this.sql);
  }

  /**
   * Initialize the world - run migrations and prepare tables
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    await this.migrations.run();
    this.initialized = true;
  }

  /**
   * Start a new workflow run
   */
  async startRun(workflowId: string, input: unknown): Promise<string> {
    await this.ensureInitialized();

    const runId = this.generateRunId();

    await this.store.createRun({
      id: runId,
      workflowId,
      input,
      status: 'running',
      createdAt: new Date(),
    });

    return runId;
  }

  /**
   * Complete a workflow run
   */
  async completeRun(runId: string, output: unknown): Promise<void> {
    await this.store.updateRun(runId, {
      status: 'completed',
      output,
      completedAt: new Date(),
    });
  }

  /**
   * Fail a workflow run
   */
  async failRun(runId: string, error: Error): Promise<void> {
    await this.store.updateRun(runId, {
      status: 'failed',
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      completedAt: new Date(),
    });
  }

  /**
   * Execute a task within a workflow step
   */
  async executeTask<T>(
    runId: string,
    stepId: string,
    task: Task<T>
  ): Promise<TaskResult<T>> {
    await this.ensureInitialized();

    // Check if step already completed (for resume after restart)
    const existingStep = await this.store.getStep(runId, stepId);

    if (existingStep && existingStep.status === 'completed') {
      return {
        success: true,
        value: existingStep.output as T,
        cached: true,
      };
    }

    // Create or update step as running
    await this.store.upsertStep({
      runId,
      stepId,
      status: 'running',
      startedAt: new Date(),
    });

    try {
      // Execute the task
      const result = await task();

      // Persist completed step
      await this.store.updateStep(runId, stepId, {
        status: 'completed',
        output: result,
        completedAt: new Date(),
      });

      return {
        success: true,
        value: result,
        cached: false,
      };
    } catch (error) {
      // Persist failed step
      await this.store.updateStep(runId, stepId, {
        status: 'failed',
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } : { message: String(error) },
        completedAt: new Date(),
      });

      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        cached: false,
      };
    }
  }

  /**
   * Schedule a task for later execution
   */
  async scheduleTask(
    runId: string,
    stepId: string,
    task: Task<unknown>,
    delay: number
  ): Promise<void> {
    await this.ensureInitialized();

    await this.store.upsertStep({
      runId,
      stepId,
      status: 'scheduled',
      scheduledFor: new Date(Date.now() + delay),
      taskData: this.serializeTask(task),
    });
  }

  /**
   * Get the status of a workflow run
   */
  async getRunStatus(runId: string): Promise<{
    status: string;
    completedSteps: number;
    totalSteps: number;
  }> {
    const run = await this.store.getRun(runId);
    if (!run) {
      throw new Error(`Run ${runId} not found`);
    }

    const steps = await this.store.getSteps(runId);
    const completedSteps = steps.filter(s => s.status === 'completed').length;

    return {
      status: run.status,
      completedSteps,
      totalSteps: steps.length,
    };
  }

  /**
   * Resume a paused or crashed workflow
   */
  async resumeRun(runId: string): Promise<{
    lastCompletedStep: string | null;
    pendingSteps: string[];
  }> {
    const steps = await this.store.getSteps(runId);

    const completedSteps = steps.filter(s => s.status === 'completed');
    const pendingSteps = steps.filter(s =>
      s.status === 'running' || s.status === 'scheduled'
    );

    const lastCompleted = completedSteps.sort(
      (a, b) => (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0)
    )[0];

    return {
      lastCompletedStep: lastCompleted?.stepId || null,
      pendingSteps: pendingSteps.map(s => s.stepId),
    };
  }

  /**
   * Clean up old workflow data
   */
  async cleanup(olderThanDays: number = 30): Promise<number> {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    return this.store.deleteOldRuns(cutoff);
  }

  /**
   * Close database connections
   */
  async close(): Promise<void> {
    await this.sql.end();
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  private generateRunId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 10);
    return `run_${timestamp}_${random}`;
  }

  private serializeTask(_task: Task<unknown>): string {
    // In production, would serialize the task for later execution
    return JSON.stringify({ type: 'delayed_task' });
  }
}
