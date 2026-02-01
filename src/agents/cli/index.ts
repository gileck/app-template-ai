#!/usr/bin/env npx ts-node
/**
 * Agent Workflow CLI
 *
 * CLI tool for creating feature requests and bug reports that feed
 * into the GitHub agents workflow.
 *
 * Usage:
 *   yarn agent-workflow start
 *   yarn agent-workflow create --type feature --title "..." --description "..."
 */

import '../shared/loadEnv';
import { handleStart, handleCreate } from './commands';

type CommandHandler = (args: string[]) => Promise<void>;

const COMMANDS: Record<string, CommandHandler> = {
    start: handleStart,
    create: handleCreate,
    // Future commands: list, get, delete
};

function printUsage(): void {
    console.log(`
Agent Workflow CLI

Usage: yarn agent-workflow <command> [options]

Commands:
  start     Interactive guided process (prompts for all options)
  create    Create with named arguments

Create options:
  --type <type>           Required: feature | bug
  --title <title>         Required: Title of the request
  --description <desc>    Required: Description
  --auto-approve          Optional: Skip approval notification, sync to GitHub immediately
  --route <phase>         Optional: product-dev | product-design | tech-design | implementation | backlog
                          (implies --auto-approve)
  --priority <level>      Optional: low | medium | high | critical (features only)
  --dry-run               Optional: Preview without creating

Workflow:
  Default (no flags):
    1. Creates item with status 'new'
    2. Sends approval notification to Telegram
    3. Waits for admin to approve before syncing to GitHub

  With --auto-approve:
    1. Creates item with status 'in_progress'
    2. Syncs to GitHub immediately
    3. Sends routing notification to Telegram (asks where to route)

  With --auto-approve --route <phase>:
    1. Creates item with status 'in_progress'
    2. Syncs to GitHub immediately
    3. Auto-routes to specified phase (no Telegram notifications)

Examples:
  # Interactive mode
  yarn agent-workflow start

  # Create feature request (sends approval notification, waits for Telegram approval)
  yarn agent-workflow create --type feature --title "Add dark mode" --description "Toggle theme"

  # Auto-approve and sync to GitHub (sends routing notification)
  yarn agent-workflow create --type feature --title "Add dark mode" --description "Toggle theme" --auto-approve

  # Auto-approve and route directly to implementation (no notifications)
  yarn agent-workflow create --type feature --title "Fix typo" --description "Header says Welcom" --route implementation

  # Preview without creating
  yarn agent-workflow create --type feature --title "Test" --description "Description" --dry-run
`);
}

async function main(): Promise<void> {
    const [command, ...args] = process.argv.slice(2);

    if (!command || command === '--help' || command === '-h') {
        printUsage();
        process.exit(0);
    }

    const handler = COMMANDS[command];
    if (!handler) {
        console.error(`Unknown command: ${command}`);
        printUsage();
        process.exit(1);
    }

    try {
        await handler(args);
        process.exit(0);
    } catch (error) {
        console.error('\nError:', error instanceof Error ? error.message : error);
        process.exit(1);
    }
}

main();
