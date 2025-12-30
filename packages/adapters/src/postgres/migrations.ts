import type postgres from 'postgres';

interface Migration {
  version: number;
  name: string;
  up: string;
  down: string;
}

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'create_workflow_tables',
    up: `
      -- Workflow runs table
      CREATE TABLE IF NOT EXISTS workflow_runs (
        id TEXT PRIMARY KEY,
        workflow_id TEXT NOT NULL,
        input JSONB,
        output JSONB,
        status TEXT NOT NULL DEFAULT 'running',
        error JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMPTZ,

        CONSTRAINT valid_status CHECK (status IN ('running', 'completed', 'failed', 'paused'))
      );

      -- Workflow steps table
      CREATE TABLE IF NOT EXISTS workflow_steps (
        run_id TEXT NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
        step_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        input JSONB,
        output JSONB,
        error JSONB,
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        scheduled_for TIMESTAMPTZ,
        task_data TEXT,
        retry_count INTEGER DEFAULT 0,

        PRIMARY KEY (run_id, step_id),
        CONSTRAINT valid_step_status CHECK (status IN ('pending', 'running', 'completed', 'failed', 'scheduled'))
      );

      -- Indexes for efficient queries
      CREATE INDEX IF NOT EXISTS idx_workflow_runs_workflow_id ON workflow_runs(workflow_id);
      CREATE INDEX IF NOT EXISTS idx_workflow_runs_status ON workflow_runs(status);
      CREATE INDEX IF NOT EXISTS idx_workflow_runs_created_at ON workflow_runs(created_at);
      CREATE INDEX IF NOT EXISTS idx_workflow_steps_status ON workflow_steps(status);
      CREATE INDEX IF NOT EXISTS idx_workflow_steps_scheduled ON workflow_steps(scheduled_for)
        WHERE status = 'scheduled';

      -- Schema version tracking
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `,
    down: `
      DROP TABLE IF EXISTS workflow_steps;
      DROP TABLE IF EXISTS workflow_runs;
      DROP TABLE IF EXISTS schema_migrations;
    `,
  },
  {
    version: 2,
    name: 'add_workflow_metadata',
    up: `
      -- Add metadata column for workflow-level data
      ALTER TABLE workflow_runs
      ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

      -- Add parent_step for nested workflows
      ALTER TABLE workflow_steps
      ADD COLUMN IF NOT EXISTS parent_step_id TEXT;

      -- Index for parent step queries
      CREATE INDEX IF NOT EXISTS idx_workflow_steps_parent
      ON workflow_steps(run_id, parent_step_id)
      WHERE parent_step_id IS NOT NULL;
    `,
    down: `
      ALTER TABLE workflow_steps DROP COLUMN IF EXISTS parent_step_id;
      ALTER TABLE workflow_runs DROP COLUMN IF EXISTS metadata;
    `,
  },
  {
    version: 3,
    name: 'add_execution_logs',
    up: `
      -- Execution logs for debugging and observability
      CREATE TABLE IF NOT EXISTS workflow_logs (
        id SERIAL PRIMARY KEY,
        run_id TEXT NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
        step_id TEXT,
        level TEXT NOT NULL DEFAULT 'info',
        message TEXT NOT NULL,
        data JSONB,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        CONSTRAINT valid_log_level CHECK (level IN ('debug', 'info', 'warn', 'error'))
      );

      CREATE INDEX IF NOT EXISTS idx_workflow_logs_run ON workflow_logs(run_id);
      CREATE INDEX IF NOT EXISTS idx_workflow_logs_timestamp ON workflow_logs(timestamp);
    `,
    down: `
      DROP TABLE IF EXISTS workflow_logs;
    `,
  },
];

export class MigrationRunner {
  private sql: postgres.Sql;

  constructor(sql: postgres.Sql) {
    this.sql = sql;
  }

  /**
   * Run all pending migrations
   */
  async run(): Promise<number> {
    // Ensure migrations table exists
    await this.ensureMigrationsTable();

    const appliedVersions = await this.getAppliedVersions();
    const pendingMigrations = MIGRATIONS.filter(
      m => !appliedVersions.includes(m.version)
    );

    if (pendingMigrations.length === 0) {
      return 0;
    }

    // Run migrations in order
    for (const migration of pendingMigrations) {
      await this.applyMigration(migration);
    }

    return pendingMigrations.length;
  }

  /**
   * Rollback the last migration
   */
  async rollback(): Promise<boolean> {
    const appliedVersions = await this.getAppliedVersions();
    if (appliedVersions.length === 0) {
      return false;
    }

    const lastVersion = Math.max(...appliedVersions);
    const migration = MIGRATIONS.find(m => m.version === lastVersion);

    if (!migration) {
      throw new Error(`Migration version ${lastVersion} not found`);
    }

    await this.revertMigration(migration);
    return true;
  }

  /**
   * Get the current schema version
   */
  async getVersion(): Promise<number> {
    const versions = await this.getAppliedVersions();
    return versions.length > 0 ? Math.max(...versions) : 0;
  }

  /**
   * Reset database (dangerous - drops all data)
   */
  async reset(): Promise<void> {
    // Rollback all migrations in reverse order
    const appliedVersions = await this.getAppliedVersions();
    const sortedVersions = [...appliedVersions].sort((a, b) => b - a);

    for (const version of sortedVersions) {
      const migration = MIGRATIONS.find(m => m.version === version);
      if (migration) {
        await this.revertMigration(migration);
      }
    }
  }

  private async ensureMigrationsTable(): Promise<void> {
    await this.sql`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
  }

  private async getAppliedVersions(): Promise<number[]> {
    try {
      const rows = await this.sql<{ version: number }[]>`
        SELECT version FROM schema_migrations ORDER BY version
      `;
      return rows.map(r => r.version);
    } catch {
      return [];
    }
  }

  private async applyMigration(migration: Migration): Promise<void> {
    console.log(`Applying migration ${migration.version}: ${migration.name}`);

    await this.sql.begin(async sql => {
      // Run the up migration
      await sql.unsafe(migration.up);

      // Record the migration
      await sql`
        INSERT INTO schema_migrations (version, name)
        VALUES (${migration.version}, ${migration.name})
      `;
    });

    console.log(`Migration ${migration.version} applied successfully`);
  }

  private async revertMigration(migration: Migration): Promise<void> {
    console.log(`Reverting migration ${migration.version}: ${migration.name}`);

    await this.sql.begin(async sql => {
      // Run the down migration
      await sql.unsafe(migration.down);

      // Remove the migration record
      await sql`
        DELETE FROM schema_migrations WHERE version = ${migration.version}
      `;
    });

    console.log(`Migration ${migration.version} reverted successfully`);
  }
}
