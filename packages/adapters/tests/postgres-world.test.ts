import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { PostgresWorld } from '../src/postgres/world';

// Create a tracked storage for runs and steps
const runsStorage = new Map<string, unknown>();
const stepsStorage = new Map<string, unknown>();

// Mock postgres with a more complete implementation
vi.mock('postgres', () => {
  const mockSql = Object.assign(
    vi.fn().mockImplementation(async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const query = strings.join('?');

      // Handle SELECT queries
      if (query.includes('SELECT') && query.includes('workflow_runs')) {
        const id = values[0] as string;
        const run = runsStorage.get(id);
        if (run) {
          return [run];
        }
        return [];
      }

      if (query.includes('SELECT') && query.includes('workflow_steps')) {
        const runId = values[0] as string;
        const steps = Array.from(stepsStorage.values()).filter(
          (s: unknown) => (s as { run_id: string }).run_id === runId
        );
        return steps;
      }

      // Handle INSERT for runs
      if (query.includes('INSERT') && query.includes('workflow_runs')) {
        const run = {
          id: values[0],
          workflow_id: values[1],
          input: values[2],
          status: values[3],
          created_at: values[4],
          output: null,
          error: null,
          completed_at: null,
        };
        runsStorage.set(values[0] as string, run);
        return [];
      }

      // Handle INSERT for steps
      if (query.includes('INSERT') && query.includes('workflow_steps')) {
        const step = {
          run_id: values[0],
          step_id: values[1],
          status: values[2],
          input: values[3],
          started_at: values[4],
          scheduled_for: values[5],
          task_data: values[6],
          output: null,
          error: null,
          completed_at: null,
          retry_count: 0,
        };
        stepsStorage.set(`${values[0]}-${values[1]}`, step);
        return [];
      }

      // Handle UPDATE
      if (query.includes('UPDATE') && query.includes('workflow_runs')) {
        return [];
      }

      if (query.includes('UPDATE') && query.includes('workflow_steps')) {
        return [];
      }

      // Handle DELETE
      if (query.includes('DELETE')) {
        return { count: 5 };
      }

      return [];
    }),
    {
      begin: vi.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = Object.assign(
          vi.fn().mockResolvedValue([]),
          { unsafe: vi.fn().mockReturnValue('') }
        );
        return fn(tx);
      }),
      end: vi.fn().mockResolvedValue(undefined),
      unsafe: vi.fn().mockImplementation((str: string) => str),
    }
  );

  return { default: vi.fn(() => mockSql) };
});

describe('PostgresWorld', () => {
  let world: PostgresWorld;

  beforeEach(async () => {
    // Clear storage before each test
    runsStorage.clear();
    stepsStorage.clear();

    world = new PostgresWorld({
      connectionString: 'postgres://test:test@localhost:5432/test',
    });
  });

  afterEach(async () => {
    await world.close();
  });

  describe('startRun', () => {
    it('should create a new workflow run', async () => {
      const workflowId = 'my-workflow';
      const input = { key: 'value' };

      const runId = await world.startRun(workflowId, input);

      expect(runId).toBeDefined();
      expect(typeof runId).toBe('string');
      expect(runId).toMatch(/^run_/);
    });

    it('should generate unique run IDs', async () => {
      const runId1 = await world.startRun('workflow', {});
      const runId2 = await world.startRun('workflow', {});

      expect(runId1).not.toBe(runId2);
    });
  });

  describe('executeTask', () => {
    it('should execute task and return result', async () => {
      const runId = await world.startRun('workflow', {});
      const task = vi.fn().mockResolvedValue('result');

      const result = await world.executeTask(runId, 'step-1', task);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.value).toBe('result');
    });

    it('should handle task failure', async () => {
      const runId = await world.startRun('workflow', {});
      const task = vi.fn().mockRejectedValue(new Error('Task failed'));

      const result = await world.executeTask(runId, 'step-1', task);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should record task execution', async () => {
      const runId = await world.startRun('workflow', {});
      const task = vi.fn().mockResolvedValue('result');

      await world.executeTask(runId, 'step-1', task);

      // Verify task was called
      expect(task).toHaveBeenCalled();
    });
  });

  describe('completeRun', () => {
    it('should mark run as completed', async () => {
      const runId = await world.startRun('workflow', {});

      // Should not throw
      await expect(world.completeRun(runId, { result: 'done' })).resolves.not.toThrow();
    });
  });

  describe('failRun', () => {
    it('should mark run as failed', async () => {
      const runId = await world.startRun('workflow', {});
      const error = new Error('Workflow failed');

      // Should not throw
      await expect(world.failRun(runId, error)).resolves.not.toThrow();
    });
  });

  describe('getRunStatus', () => {
    it('should return run status', async () => {
      const runId = await world.startRun('workflow', {});

      const status = await world.getRunStatus(runId);

      expect(status).toBeDefined();
      expect(status.status).toBeDefined();
      expect(typeof status.completedSteps).toBe('number');
      expect(typeof status.totalSteps).toBe('number');
    });
  });

  describe('resumeRun', () => {
    it('should return resume state', async () => {
      const runId = await world.startRun('workflow', { initial: 'input' });

      const state = await world.resumeRun(runId);

      expect(state).toBeDefined();
      expect(Array.isArray(state.pendingSteps)).toBe(true);
    });
  });

  describe('scheduleTask', () => {
    it('should schedule task for future execution', async () => {
      const runId = await world.startRun('workflow', {});
      const task = vi.fn().mockResolvedValue('result');
      const delay = 60000; // 1 minute

      // Should not throw
      await expect(world.scheduleTask(runId, 'step-1', task, delay)).resolves.not.toThrow();
    });
  });

  describe('cleanup', () => {
    it('should delete old runs and return count', async () => {
      const deleted = await world.cleanup(30);

      expect(typeof deleted).toBe('number');
    });
  });

  describe('close', () => {
    it('should close database connections', async () => {
      await expect(world.close()).resolves.not.toThrow();
    });
  });
});
