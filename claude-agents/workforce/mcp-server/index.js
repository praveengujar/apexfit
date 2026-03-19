#!/usr/bin/env node

/**
 * Workforce MCP Server — stdio transport.
 *
 * Exposes 20 tools for managing autonomous Claude Code agent sessions.
 * Replaces the Express+WebSocket backend with a single MCP server process.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// Core modules
import { getDb } from './core/db.js';
import { loadCostModel } from './core/cost-model.js';
import { loadProfiles } from './core/profiles.js';
import { startRecoveryEngine, setProjectDir as setRecoveryProjectDir } from './core/recovery-engine.js';
import { initWorkerManager, stopWorkerManager } from './core/worker-manager.js';

// Tool handlers
import {
  createTaskHandler, listTasksHandler, getTaskHandler,
  cancelTaskHandler, retryTaskHandler, archiveTaskHandler,
  taskEventsHandler, taskOutputHandler, replyToTaskHandler,
  pauseTaskHandler, resumeTaskHandler, analyzePromptHandler,
} from './tools/task-tools.js';

import {
  getDiffHandler, approveTaskHandler, rejectTaskHandler,
  setProjectDir as setLifecycleProjectDir,
} from './tools/lifecycle-tools.js';

import {
  backlogListHandler, backlogAddHandler, backlogUpdateHandler,
  backlogDeleteHandler, backlogReorderHandler,
} from './tools/backlog-tools.js';

import {
  healthMetricsHandler, costSummaryHandler, listProjectsHandler,
  listProfilesHandler, runRecoveryHandler,
} from './tools/monitoring-tools.js';

// ---------------------------------------------------------------------------
// Server setup
// ---------------------------------------------------------------------------
const server = new McpServer({
  name: 'workforce',
  version: '1.0.0',
});

// Helper: wrap handler so errors become tool error results instead of crashes
function wrap(handler) {
  return async (params) => {
    try {
      const result = await handler(params);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
    }
  };
}

// ---------------------------------------------------------------------------
// Task Management Tools
// ---------------------------------------------------------------------------

server.tool(
  'workforce_create_task',
  'Create a new autonomous agent task. Spawns Claude CLI in an isolated git worktree.',
  { prompt: z.string().describe('Task instruction for the agent'), project: z.string().optional().describe('Project name'), profile: z.string().optional().describe('Agent profile (default/interactive)'), autoMerge: z.boolean().optional().describe('Auto-merge on success (default: false)') },
  wrap(createTaskHandler),
);

server.tool(
  'workforce_list_tasks',
  'List all active tasks with status, project, and timing info.',
  { status_filter: z.string().optional().describe('Filter by status (pending/running/review/done/failed)'), include_archived: z.boolean().optional().describe('Include archived tasks') },
  wrap(listTasksHandler),
);

server.tool(
  'workforce_get_task',
  'Get detailed info for a specific task.',
  { task_id: z.string().describe('Task ID') },
  wrap(getTaskHandler),
);

server.tool(
  'workforce_cancel_task',
  'Cancel a running or pending task. Kills the process and cleans up the worktree.',
  { task_id: z.string().describe('Task ID to cancel') },
  wrap(cancelTaskHandler),
);

server.tool(
  'workforce_retry_task',
  'Retry a failed task. Resets to pending and increments retry count.',
  { task_id: z.string().describe('Task ID to retry') },
  wrap(retryTaskHandler),
);

server.tool(
  'workforce_archive_task',
  'Archive a completed task to hide it from the active list.',
  { task_id: z.string().describe('Task ID to archive') },
  wrap(archiveTaskHandler),
);

server.tool(
  'workforce_task_events',
  'Get the full lifecycle event timeline for a task.',
  { task_id: z.string().describe('Task ID') },
  wrap(taskEventsHandler),
);

server.tool(
  'workforce_task_output',
  'Get current output from a running or completed task (captures tmux pane or reads log).',
  { task_id: z.string().describe('Task ID') },
  wrap(taskOutputHandler),
);

server.tool(
  'workforce_reply_to_task',
  'Send a message to a running interactive task (via tmux).',
  { task_id: z.string().describe('Task ID'), message: z.string().describe('Message to send') },
  wrap(replyToTaskHandler),
);

server.tool(
  'workforce_pause_task',
  'Pause a running task (tmux sessions only).',
  { task_id: z.string().describe('Task ID to pause') },
  wrap(pauseTaskHandler),
);

server.tool(
  'workforce_resume_task',
  'Resume a paused task.',
  { task_id: z.string().describe('Task ID to resume') },
  wrap(resumeTaskHandler),
);

// ---------------------------------------------------------------------------
// Change Review Tools
// ---------------------------------------------------------------------------

server.tool(
  'workforce_get_diff',
  'Get the git diff for a task branch vs main. Shows files changed, additions, deletions.',
  { task_id: z.string().describe('Task ID') },
  wrap(getDiffHandler),
);

server.tool(
  'workforce_approve_task',
  'Approve a task in review status — merges its branch to main.',
  { task_id: z.string().describe('Task ID to approve') },
  wrap(approveTaskHandler),
);

server.tool(
  'workforce_reject_task',
  'Reject a task in review status — discards changes and cleans up worktree.',
  { task_id: z.string().describe('Task ID to reject') },
  wrap(rejectTaskHandler),
);

// ---------------------------------------------------------------------------
// Backlog Tools
// ---------------------------------------------------------------------------

server.tool(
  'workforce_backlog_list',
  'List all backlog items with priority, title, and description.',
  {},
  wrap(backlogListHandler),
);

server.tool(
  'workforce_backlog_add',
  'Add a new item to the backlog.',
  { title: z.string().describe('Item title'), description: z.string().optional().describe('Item description'), priority: z.enum(['high', 'medium', 'low']).optional().describe('Priority level') },
  wrap(backlogAddHandler),
);

server.tool(
  'workforce_backlog_update',
  'Update an existing backlog item.',
  { id: z.string().describe('Item ID'), title: z.string().optional(), description: z.string().optional(), priority: z.enum(['high', 'medium', 'low']).optional() },
  wrap(backlogUpdateHandler),
);

server.tool(
  'workforce_backlog_delete',
  'Remove an item from the backlog.',
  { id: z.string().describe('Item ID to delete') },
  wrap(backlogDeleteHandler),
);

// ---------------------------------------------------------------------------
// Monitoring Tools
// ---------------------------------------------------------------------------

server.tool(
  'workforce_health_metrics',
  'Get workforce health metrics: success rate, failure rate, one-shot rate, suggestions.',
  {},
  wrap(healthMetricsHandler),
);

server.tool(
  'workforce_cost_summary',
  'Get cost summary: today, this week, this month, breakdown by tier.',
  {},
  wrap(costSummaryHandler),
);

// ---------------------------------------------------------------------------
// Initialization and startup
// ---------------------------------------------------------------------------

let stopRecovery = null;

async function main() {
  const projectDir = process.cwd();

  // 1. Initialize database
  getDb();
  console.error('[workforce] Database initialized');

  // 2. Load cost model and profiles
  loadCostModel();
  loadProfiles();

  // 3. Set project directory for all modules
  setRecoveryProjectDir(projectDir);
  setLifecycleProjectDir(projectDir);

  // 4. Initialize worker manager (starts promote loop)
  initWorkerManager(projectDir);
  console.error('[workforce] Worker manager initialized');

  // 5. Start recovery engine
  stopRecovery = startRecoveryEngine();

  // 6. Connect MCP transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('[workforce] MCP server running on stdio');
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.error('[workforce] Shutting down...');
  if (stopRecovery) stopRecovery();
  stopWorkerManager();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.error('[workforce] Shutting down...');
  if (stopRecovery) stopRecovery();
  stopWorkerManager();
  process.exit(0);
});

main().catch(err => {
  console.error('[workforce] Fatal error:', err);
  process.exit(1);
});
