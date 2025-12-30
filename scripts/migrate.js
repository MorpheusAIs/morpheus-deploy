#!/usr/bin/env node

/**
 * Morpheus Database Migration Script
 * Runs on container startup to ensure schema is up to date
 */

import postgres from 'postgres';

const MIGRATIONS = [
  {
    version: 1,
    name: 'create_workflow_tables',
    up: `
      CREATE TABLE IF NOT EXISTS workflow_runs (
        id TEXT PRIMARY KEY,
        workflow_id TEXT NOT NULL,
        input JSONB,
        output JSONB,
        status TEXT NOT NULL DEFAULT 'running',
        error JSONB,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMPTZ,
        CONSTRAINT valid_status CHECK (status IN ('running', 'completed', 'failed', 'paused'))
      );

      CREATE TABLE IF NOT EXISTS workflow_steps (
        run_id TEXT NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
        step_id TEXT NOT NULL,
        parent_step_id TEXT,
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

      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_workflow_runs_workflow_id ON workflow_runs(workflow_id);
      CREATE INDEX IF NOT EXISTS idx_workflow_runs_status ON workflow_runs(status);
      CREATE INDEX IF NOT EXISTS idx_workflow_runs_created_at ON workflow_runs(created_at);
      CREATE INDEX IF NOT EXISTS idx_workflow_steps_status ON workflow_steps(status);
      CREATE INDEX IF NOT EXISTS idx_workflow_steps_scheduled ON workflow_steps(scheduled_for) WHERE status = 'scheduled';
      CREATE INDEX IF NOT EXISTS idx_workflow_logs_run ON workflow_logs(run_id);
      CREATE INDEX IF NOT EXISTS idx_workflow_logs_timestamp ON workflow_logs(timestamp);
    `,
  },
];

async function runMigrations() {
  const connectionString = process.env.WORKFLOW_POSTGRES_URL ||
    'postgres://postgres:password@postgres:5432/workflow';

  console.log('Connecting to database...');

  const sql = postgres(connectionString, {
    max: 1,
    connect_timeout: 30,
  });

  try {
    // Ensure migrations table exists
    await sql`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    // Get applied migrations
    const applied = await sql`SELECT version FROM schema_migrations`;
    const appliedVersions = new Set(applied.map(r => r.version));

    // Run pending migrations
    for (const migration of MIGRATIONS) {
      if (appliedVersions.has(migration.version)) {
        console.log(`Migration ${migration.version} (${migration.name}) already applied`);
        continue;
      }

      console.log(`Applying migration ${migration.version}: ${migration.name}...`);

      await sql.begin(async (tx) => {
        await tx.unsafe(migration.up);
        await tx`
          INSERT INTO schema_migrations (version, name)
          VALUES (${migration.version}, ${migration.name})
        `;
      });

      console.log(`Migration ${migration.version} applied successfully`);
    }

    console.log('All migrations complete!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigrations();
