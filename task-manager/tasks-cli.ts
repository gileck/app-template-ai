#!/usr/bin/env npx tsx
import '../src/agents/shared/loadEnv';

/**
 * Tasks Management CLI
 *
 * A CLI tool for managing tasks from tasks.md
 *
 * Usage:
 *   yarn task <command> [options]
 *
 * Commands:
 *   list                List all tasks by priority
 *   work                Work on a specific task
 *   worktree            Create worktree and work on task
 *   plan                Plan implementation for a task
 *   mark-done           Mark task as completed
 *
 * Examples:
 *   yarn task list
 *   yarn task work --task 1
 *   yarn task worktree --task 3
 *   yarn task plan --task 5
 *   yarn task mark-done --task 1
 */

import { Command } from 'commander';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Types
// ============================================================================

interface Task {
    number: number;
    title: string;
    priority: 'Critical' | 'High' | 'Medium' | 'Low';
    complexity: string;
    size: string;
    startLine: number;
    endLine: number;
    content: string;
}

// ============================================================================
// Task Parser
// ============================================================================

const TASKS_FILE = path.join(process.cwd(), 'task-manager', 'tasks.md');

function parseTasks(): Task[] {
    if (!fs.existsSync(TASKS_FILE)) {
        console.error('❌ tasks.md not found');
        process.exit(1);
    }

    const content = fs.readFileSync(TASKS_FILE, 'utf-8');
    const lines = content.split('\n');
    const tasks: Task[] = [];

    let currentTask: Partial<Task> | null = null;
    let taskStartLine = 0;
    let taskContent: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Detect task header: ## 1. Task Title
        const headerMatch = line.match(/^## (\d+)\.\s+(.+)/);
        if (headerMatch) {
            // Save previous task
            if (currentTask) {
                tasks.push({
                    ...currentTask,
                    endLine: i - 1,
                    content: taskContent.join('\n'),
                } as Task);
            }

            // Start new task
            currentTask = {
                number: parseInt(headerMatch[1]),
                title: headerMatch[2],
                startLine: i,
            };
            taskContent = [line];
            taskStartLine = i;
            continue;
        }

        // Parse metadata table
        if (currentTask && line.includes('| Priority |')) {
            // Next line has the values
            const nextLine = lines[i + 2];
            if (nextLine) {
                const valuesMatch = nextLine.match(/\|\s*\*\*(.+?)\*\*\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|/);
                if (valuesMatch) {
                    currentTask.priority = valuesMatch[1].trim() as Task['priority'];
                    currentTask.complexity = valuesMatch[2].trim();
                    currentTask.size = valuesMatch[3].trim();
                }
            }
        }

        if (currentTask) {
            taskContent.push(line);
        }
    }

    // Save last task
    if (currentTask) {
        tasks.push({
            ...currentTask,
            endLine: lines.length - 1,
            content: taskContent.join('\n'),
        } as Task);
    }

    return tasks;
}

function getTask(taskNumber: number): Task {
    const tasks = parseTasks();
    const task = tasks.find((t) => t.number === taskNumber);
    if (!task) {
        console.error(`❌ Task ${taskNumber} not found`);
        process.exit(1);
    }
    return task;
}

// ============================================================================
// Commands
// ============================================================================

function listTasks() {
    const tasks = parseTasks();

    console.log('\n📋 Tasks by Priority\n');

    const priorityOrder: Task['priority'][] = ['Critical', 'High', 'Medium', 'Low'];

    priorityOrder.forEach((priority) => {
        const tasksInPriority = tasks.filter((t) => t.priority === priority);
        if (tasksInPriority.length === 0) return;

        const emoji = {
            Critical: '🔴',
            High: '🟠',
            Medium: '🟡',
            Low: '🟢',
        }[priority];

        console.log(`\n${emoji} ${priority}:`);
        tasksInPriority.forEach((task) => {
            console.log(`  ${task.number}. ${task.title} (${task.size})`);
        });
    });

    console.log('');
}

function workOnTask(taskNumber: number) {
    const task = getTask(taskNumber);

    console.log(`\n🚀 Working on Task ${taskNumber}: ${task.title}\n`);
    console.log(`Priority: ${task.priority}`);
    console.log(`Size: ${task.size}`);
    console.log(`Complexity: ${task.complexity}\n`);

    // Create a branch name
    const branchName = `task/${taskNumber}-${task.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .substring(0, 50)}`;

    console.log(`📌 Branch: ${branchName}\n`);

    // Check if branch exists
    try {
        execSync(`git rev-parse --verify ${branchName}`, { stdio: 'ignore' });
        console.log('ℹ️  Branch already exists, switching to it...');
        execSync(`git checkout ${branchName}`, { stdio: 'inherit' });
    } catch {
        console.log('🌿 Creating new branch...');
        execSync(`git checkout -b ${branchName}`, { stdio: 'inherit' });
    }

    console.log('\n✅ Ready to work on task!');
    console.log('\n📝 Task details:\n');
    console.log(task.content);
    console.log('\n💡 Next steps:');
    console.log('  1. Implement the task');
    console.log('  2. Run: yarn checks');
    console.log('  3. Commit your changes');
    console.log('  4. Create a PR');
    console.log(`  5. After merge: yarn task mark-done --task ${taskNumber}`);
}

function createWorktree(taskNumber: number) {
    const task = getTask(taskNumber);

    console.log(`\n🔧 Creating worktree for Task ${taskNumber}: ${task.title}\n`);

    const branchName = `task/${taskNumber}-${task.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .substring(0, 50)}`;

    const worktreePath = path.join(process.cwd(), '..', `worktree-task-${taskNumber}`);

    console.log(`📂 Worktree path: ${worktreePath}`);
    console.log(`🌿 Branch: ${branchName}\n`);

    // Check if worktree already exists
    if (fs.existsSync(worktreePath)) {
        console.log('⚠️  Worktree already exists. Removing old one...');
        try {
            execSync(`git worktree remove ${worktreePath} --force`, { stdio: 'inherit' });
        } catch (e) {
            console.error('Failed to remove old worktree:', e);
        }
    }

    // Create worktree
    try {
        const mainProjectPath = process.cwd();
        execSync(`git worktree add ${worktreePath} -b ${branchName}`, { stdio: 'inherit' });
        console.log('\n✅ Worktree created!');
        console.log(`\n💡 To start working (squash-merge workflow):`);
        console.log(`  cd ${worktreePath}`);
        console.log(`  ln -s "${mainProjectPath}/node_modules" node_modules`);
        console.log(`  # Make your changes (WIP commits OK)`);
        console.log(`  yarn checks`);
        console.log(`  git add . && git commit -m "WIP: changes"`);
        console.log(``);
        console.log(`  # Return to main and squash merge:`);
        console.log(`  cd ${mainProjectPath}`);
        console.log(`  git merge --squash ${branchName}`);
        console.log(`  git commit -m "fix: description (task #${taskNumber})"`);
        console.log(`  git push origin main`);
        console.log(``);
        console.log(`  # Cleanup:`);
        console.log(`  git worktree remove ${worktreePath}`);
        console.log(`  git branch -d ${branchName}`);
        console.log(`  yarn task mark-done --task ${taskNumber}`);
    } catch (error) {
        console.error('❌ Failed to create worktree:', error);
        process.exit(1);
    }
}

function planTask(taskNumber: number) {
    const task = getTask(taskNumber);

    console.log(`\n📐 Planning Task ${taskNumber}: ${task.title}\n`);
    console.log(`Priority: ${task.priority}`);
    console.log(`Size: ${task.size}`);
    console.log(`Complexity: ${task.complexity}\n`);

    console.log('📝 Task details:\n');
    console.log(task.content);

    console.log('\n\n🤖 Launching Plan Agent...\n');

    // TODO: Integrate with actual plan agent when available
    // For now, just display the task content for manual planning
    console.log('⚠️  Plan agent integration not yet implemented.');
    console.log('💡 For now, please review the task details above and create a plan manually.');
}

function markTaskDone(taskNumber: number) {
    const task = getTask(taskNumber);

    console.log(`\n✅ Marking Task ${taskNumber} as done: ${task.title}\n`);

    // Read the file
    const content = fs.readFileSync(TASKS_FILE, 'utf-8');
    const lines = content.split('\n');

    // Add DONE marker to the task header
    const taskHeaderLine = task.startLine;
    const currentHeader = lines[taskHeaderLine];

    if (currentHeader.includes('✅ DONE')) {
        console.log('⚠️  Task already marked as done');
        return;
    }

    // Add ✅ DONE to the header
    lines[taskHeaderLine] = currentHeader + ' ✅ DONE';

    // Write back
    fs.writeFileSync(TASKS_FILE, lines.join('\n'), 'utf-8');

    console.log('✅ Task marked as done in tasks.md');
    console.log('\n💡 Remember to commit the change:');
    console.log(`  git add tasks.md`);
    console.log(`  git commit -m "docs: mark task ${taskNumber} as done"`);
    console.log(`  git push`);
}

// ============================================================================
// CLI Setup
// ============================================================================

const program = new Command();

program.name('task').description('Tasks Management CLI').version('1.0.0');

program
    .command('list')
    .description('List all tasks by priority')
    .action(() => {
        listTasks();
    });

program
    .command('work')
    .description('Work on a specific task (creates/switches to branch)')
    .requiredOption('--task <number>', 'Task number to work on')
    .action((options) => {
        workOnTask(parseInt(options.task));
    });

program
    .command('worktree')
    .description('Create a git worktree and work on task')
    .requiredOption('--task <number>', 'Task number to work on')
    .action((options) => {
        createWorktree(parseInt(options.task));
    });

program
    .command('plan')
    .description('Plan implementation for a task')
    .requiredOption('--task <number>', 'Task number to plan')
    .action((options) => {
        planTask(parseInt(options.task));
    });

program
    .command('mark-done')
    .description('Mark task as completed')
    .requiredOption('--task <number>', 'Task number to mark as done')
    .action((options) => {
        markTaskDone(parseInt(options.task));
    });

program.parse();
