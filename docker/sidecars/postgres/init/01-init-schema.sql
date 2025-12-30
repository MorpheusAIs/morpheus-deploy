-- Morpheus Workflow Schema
-- Initialize tables for durable execution

-- Create workflow database if not exists
SELECT 'CREATE DATABASE workflow'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'workflow')\gexec

\connect workflow;

-- Workflow runs table
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

-- Workflow steps table
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

-- Execution logs table
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

-- Schema migrations tracking
CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert initial migration record
INSERT INTO schema_migrations (version, name) VALUES (1, 'init-schema')
ON CONFLICT (version) DO NOTHING;

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_workflow_runs_workflow_id ON workflow_runs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_status ON workflow_runs(status);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_created_at ON workflow_runs(created_at);
CREATE INDEX IF NOT EXISTS idx_workflow_steps_status ON workflow_steps(status);
CREATE INDEX IF NOT EXISTS idx_workflow_steps_scheduled ON workflow_steps(scheduled_for)
    WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_workflow_steps_parent ON workflow_steps(run_id, parent_step_id)
    WHERE parent_step_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workflow_logs_run ON workflow_logs(run_id);
CREATE INDEX IF NOT EXISTS idx_workflow_logs_timestamp ON workflow_logs(timestamp);

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
