import type postgres from 'postgres';

export interface WorkflowRun {
  id: string;
  workflowId: string;
  input: unknown;
  output?: unknown;
  status: 'running' | 'completed' | 'failed' | 'paused';
  error?: { name?: string; message: string; stack?: string };
  createdAt: Date;
  completedAt?: Date;
}

export interface WorkflowStep {
  runId: string;
  stepId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'scheduled';
  input?: unknown;
  output?: unknown;
  error?: { name?: string; message: string; stack?: string };
  startedAt?: Date;
  completedAt?: Date;
  scheduledFor?: Date;
  taskData?: string;
  retryCount?: number;
}

export class WorkflowStore {
  private sql: postgres.Sql;

  constructor(sql: postgres.Sql) {
    this.sql = sql;
  }

  // Workflow Runs

  async createRun(run: WorkflowRun): Promise<void> {
    await this.sql`
      INSERT INTO workflow_runs (
        id, workflow_id, input, status, created_at
      ) VALUES (
        ${run.id},
        ${run.workflowId},
        ${JSON.stringify(run.input)},
        ${run.status},
        ${run.createdAt}
      )
    `;
  }

  async getRun(id: string): Promise<WorkflowRun | null> {
    const rows = await this.sql<WorkflowRunRow[]>`
      SELECT * FROM workflow_runs WHERE id = ${id}
    `;

    if (rows.length === 0) return null;

    return this.mapRunRow(rows[0]!);
  }

  async updateRun(
    id: string,
    updates: Partial<Omit<WorkflowRun, 'id' | 'workflowId' | 'createdAt'>>
  ): Promise<void> {
    const setClauses: string[] = [];
    const values: unknown[] = [];

    if (updates.status !== undefined) {
      setClauses.push('status = $' + (values.length + 1));
      values.push(updates.status);
    }
    if (updates.output !== undefined) {
      setClauses.push('output = $' + (values.length + 1));
      values.push(JSON.stringify(updates.output));
    }
    if (updates.error !== undefined) {
      setClauses.push('error = $' + (values.length + 1));
      values.push(JSON.stringify(updates.error));
    }
    if (updates.completedAt !== undefined) {
      setClauses.push('completed_at = $' + (values.length + 1));
      values.push(updates.completedAt);
    }

    if (setClauses.length === 0) return;

    await this.sql`
      UPDATE workflow_runs
      SET ${this.sql.unsafe(setClauses.join(', '))}
      WHERE id = ${id}
    `;
  }

  async listRuns(workflowId?: string, limit = 100): Promise<WorkflowRun[]> {
    const rows = workflowId
      ? await this.sql<WorkflowRunRow[]>`
          SELECT * FROM workflow_runs
          WHERE workflow_id = ${workflowId}
          ORDER BY created_at DESC
          LIMIT ${limit}
        `
      : await this.sql<WorkflowRunRow[]>`
          SELECT * FROM workflow_runs
          ORDER BY created_at DESC
          LIMIT ${limit}
        `;

    return rows.map(this.mapRunRow);
  }

  async deleteOldRuns(olderThan: Date): Promise<number> {
    const result = await this.sql`
      DELETE FROM workflow_runs
      WHERE created_at < ${olderThan}
        AND status IN ('completed', 'failed')
    `;

    return result.count;
  }

  // Workflow Steps

  async upsertStep(step: Partial<WorkflowStep> & { runId: string; stepId: string }): Promise<void> {
    await this.sql`
      INSERT INTO workflow_steps (
        run_id, step_id, status, input, started_at, scheduled_for, task_data
      ) VALUES (
        ${step.runId},
        ${step.stepId},
        ${step.status || 'pending'},
        ${step.input ? JSON.stringify(step.input) : null},
        ${step.startedAt || null},
        ${step.scheduledFor || null},
        ${step.taskData || null}
      )
      ON CONFLICT (run_id, step_id)
      DO UPDATE SET
        status = EXCLUDED.status,
        started_at = COALESCE(EXCLUDED.started_at, workflow_steps.started_at),
        scheduled_for = EXCLUDED.scheduled_for,
        task_data = EXCLUDED.task_data
    `;
  }

  async getStep(runId: string, stepId: string): Promise<WorkflowStep | null> {
    const rows = await this.sql<WorkflowStepRow[]>`
      SELECT * FROM workflow_steps
      WHERE run_id = ${runId} AND step_id = ${stepId}
    `;

    if (rows.length === 0) return null;

    return this.mapStepRow(rows[0]!);
  }

  async getSteps(runId: string): Promise<WorkflowStep[]> {
    const rows = await this.sql<WorkflowStepRow[]>`
      SELECT * FROM workflow_steps
      WHERE run_id = ${runId}
      ORDER BY started_at ASC NULLS LAST
    `;

    return rows.map(this.mapStepRow);
  }

  async updateStep(
    runId: string,
    stepId: string,
    updates: Partial<Omit<WorkflowStep, 'runId' | 'stepId'>>
  ): Promise<void> {
    await this.sql`
      UPDATE workflow_steps
      SET
        status = COALESCE(${updates.status || null}, status),
        output = COALESCE(${updates.output ? JSON.stringify(updates.output) : null}, output),
        error = COALESCE(${updates.error ? JSON.stringify(updates.error) : null}, error),
        completed_at = COALESCE(${updates.completedAt || null}, completed_at),
        retry_count = COALESCE(${updates.retryCount || null}, retry_count)
      WHERE run_id = ${runId} AND step_id = ${stepId}
    `;
  }

  async getScheduledSteps(before: Date): Promise<WorkflowStep[]> {
    const rows = await this.sql<WorkflowStepRow[]>`
      SELECT * FROM workflow_steps
      WHERE status = 'scheduled'
        AND scheduled_for <= ${before}
      ORDER BY scheduled_for ASC
    `;

    return rows.map(this.mapStepRow);
  }

  private mapRunRow(row: WorkflowRunRow): WorkflowRun {
    return {
      id: row.id,
      workflowId: row.workflow_id,
      input: row.input ? JSON.parse(row.input) : undefined,
      output: row.output ? JSON.parse(row.output) : undefined,
      status: row.status as WorkflowRun['status'],
      error: row.error ? JSON.parse(row.error) : undefined,
      createdAt: new Date(row.created_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
    };
  }

  private mapStepRow(row: WorkflowStepRow): WorkflowStep {
    return {
      runId: row.run_id,
      stepId: row.step_id,
      status: row.status as WorkflowStep['status'],
      input: row.input ? JSON.parse(row.input) : undefined,
      output: row.output ? JSON.parse(row.output) : undefined,
      error: row.error ? JSON.parse(row.error) : undefined,
      startedAt: row.started_at ? new Date(row.started_at) : undefined,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      scheduledFor: row.scheduled_for ? new Date(row.scheduled_for) : undefined,
      taskData: row.task_data || undefined,
      retryCount: row.retry_count,
    };
  }
}

interface WorkflowRunRow {
  id: string;
  workflow_id: string;
  input: string | null;
  output: string | null;
  status: string;
  error: string | null;
  created_at: string;
  completed_at: string | null;
}

interface WorkflowStepRow {
  run_id: string;
  step_id: string;
  status: string;
  input: string | null;
  output: string | null;
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
  scheduled_for: string | null;
  task_data: string | null;
  retry_count: number;
}
