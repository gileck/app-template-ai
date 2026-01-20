#!/usr/bin/env tsx
/**
 * GitHub Workflows Agent - Master script for running all agent workflows
 *
 * Usage:
 *   yarn github-workflows-agent --product-design [options]    # Run product design agent
 *   yarn github-workflows-agent --tech-design [options]       # Run technical design agent
 *   yarn github-workflows-agent --implement [options]         # Run implementation agent
 *   yarn github-workflows-agent --auto-advance [options]      # Run auto-advance script
 *   yarn github-workflows-agent --all [options]               # Run all in sequence
 *
 * Options are passed through to the individual scripts:
 *   --dry-run       Preview without changes
 *   --id <id>       Process specific item
 *   --limit <n>     Limit items to process
 *   --stream        Stream Claude output (agents only)
 *
 * Examples:
 *   yarn github-workflows-agent --product-design --dry-run
 *   yarn github-workflows-agent --tech-design --id PVTI_xxx
 *   yarn github-workflows-agent --all --dry-run
 */

import { spawn } from 'child_process';
import { resolve } from 'path';

const SCRIPTS = {
    'product-design': resolve(__dirname, 'product-design.ts'),
    'tech-design': resolve(__dirname, 'tech-design.ts'),
    'implement': resolve(__dirname, 'implement.ts'),
    'auto-advance': resolve(__dirname, 'auto-advance.ts'),
};

// Order for --all flag
const ALL_ORDER = ['auto-advance', 'product-design', 'tech-design', 'implement'];

function printUsage() {
    console.log(`
GitHub Workflows Agent - Master script for running all agent workflows

Usage:
  yarn github-workflows-agent --product-design [options]    Run product design agent
  yarn github-workflows-agent --tech-design [options]       Run technical design agent
  yarn github-workflows-agent --implement [options]         Run implementation agent
  yarn github-workflows-agent --auto-advance [options]      Run auto-advance script
  yarn github-workflows-agent --all [options]               Run all in sequence

Options (passed through to individual scripts):
  --dry-run       Preview without changes
  --id <id>       Process specific item
  --limit <n>     Limit items to process
  --stream        Stream Claude output (agents only)

Examples:
  yarn github-workflows-agent --product-design --dry-run
  yarn github-workflows-agent --tech-design --id PVTI_xxx
  yarn github-workflows-agent --all --dry-run
`);
}

function runScript(scriptPath: string, args: string[]): Promise<number> {
    return new Promise((resolve) => {
        const child = spawn('tsx', [scriptPath, ...args], {
            stdio: 'inherit',
            env: process.env,
        });

        child.on('close', (code) => {
            resolve(code ?? 0);
        });

        child.on('error', (err) => {
            console.error(`Failed to run script: ${err.message}`);
            resolve(1);
        });
    });
}

async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
        printUsage();
        process.exit(0);
    }

    // Find which script(s) to run
    const scriptsToRun: string[] = [];
    const passThrough: string[] = [];

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        if (arg === '--all') {
            scriptsToRun.push(...ALL_ORDER);
        } else if (arg === '--product-design') {
            scriptsToRun.push('product-design');
        } else if (arg === '--tech-design') {
            scriptsToRun.push('tech-design');
        } else if (arg === '--implement') {
            scriptsToRun.push('implement');
        } else if (arg === '--auto-advance') {
            scriptsToRun.push('auto-advance');
        } else {
            // Pass through to scripts
            passThrough.push(arg);
        }
    }

    if (scriptsToRun.length === 0) {
        console.error('Error: No agent specified. Use --product-design, --tech-design, --implement, --auto-advance, or --all\n');
        printUsage();
        process.exit(1);
    }

    // Remove duplicates while preserving order
    const uniqueScripts = [...new Set(scriptsToRun)];

    // Options that only apply to Claude-based agents (not auto-advance)
    const claudeOnlyOptions = ['--stream', '--verbose'];

    // Run scripts in sequence
    for (const scriptName of uniqueScripts) {
        const scriptPath = SCRIPTS[scriptName as keyof typeof SCRIPTS];

        if (!scriptPath) {
            console.error(`Unknown script: ${scriptName}`);
            continue;
        }

        console.log(`\n${'='.repeat(60)}`);
        console.log(`Running: ${scriptName}`);
        console.log('='.repeat(60));

        // Filter out Claude-only options for auto-advance
        const scriptArgs = scriptName === 'auto-advance'
            ? passThrough.filter(arg => !claudeOnlyOptions.includes(arg))
            : passThrough;

        const exitCode = await runScript(scriptPath, scriptArgs);

        if (exitCode !== 0 && !passThrough.includes('--dry-run')) {
            console.error(`\nScript ${scriptName} failed with exit code ${exitCode}`);
            // Continue with other scripts even if one fails
        }
    }

    console.log('\nDone!');
}

main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
