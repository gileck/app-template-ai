#!/usr/bin/env tsx
/**
 * Sync Child Projects Script
 *
 * Syncs all child projects (cloned from this template) with safe changes.
 * Only syncs projects that have no uncommitted changes.
 *
 * Usage:
 *   yarn sync-children           # Sync all child projects
 *   yarn sync-children --dry-run # Preview what would be synced
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface ChildProjectsConfig {
  projects: string[];
}

/**
 * JSON result from sync-template --json
 */
interface SyncJsonResult {
  status: 'success' | 'no-changes' | 'checks-failed' | 'error';
  message: string;
  filesApplied: string[];
  filesSkipped: string[];
  filesConflicted: string[];
  projectOnlyChanges: string[];
  errors: string[];
  templateCommit?: string;
  projectCommit?: string;
  checksResult?: {
    passed: boolean;
    tsErrors: string[];
    lintErrors: string[];
  };
}

interface SyncResult {
  project: string;
  status: 'synced' | 'no-changes' | 'skipped' | 'checks-failed' | 'error' | 'not-found';
  message: string;
  filesApplied?: string[];
  checksResult?: {
    passed: boolean;
    tsErrors: string[];
    lintErrors: string[];
  };
}

const CONFIG_FILE = 'child-projects.json';

function loadConfig(templateRoot: string): ChildProjectsConfig | null {
  const configPath = path.join(templateRoot, CONFIG_FILE);

  if (!fs.existsSync(configPath)) {
    console.error(`\n❌ Config file not found: ${configPath}`);
    console.error(`\nCreate ${CONFIG_FILE} with the following format:`);
    console.error(`{
  "projects": [
    "../project-1",
    "../project-2"
  ]
}`);
    return null;
  }

  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(content) as ChildProjectsConfig;
  } catch (error) {
    console.error(`\n❌ Failed to parse ${CONFIG_FILE}:`, error);
    return null;
  }
}

function hasUncommittedChanges(projectPath: string): boolean {
  try {
    const status = execSync('git status --porcelain', {
      cwd: projectPath,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return status.trim().length > 0;
  } catch {
    return true; // If we can't check, assume there are changes
  }
}

function isGitRepo(projectPath: string): boolean {
  try {
    execSync('git rev-parse --git-dir', {
      cwd: projectPath,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return true;
  } catch {
    return false;
  }
}

function syncProject(projectPath: string, dryRun: boolean): SyncResult {
  const projectName = path.basename(projectPath);

  // Check if project directory exists
  if (!fs.existsSync(projectPath)) {
    return {
      project: projectName,
      status: 'not-found',
      message: `Directory not found: ${projectPath}`,
    };
  }

  // Check if it's a git repository
  if (!isGitRepo(projectPath)) {
    return {
      project: projectName,
      status: 'error',
      message: 'Not a git repository',
    };
  }

  // Check for uncommitted changes
  if (hasUncommittedChanges(projectPath)) {
    return {
      project: projectName,
      status: 'skipped',
      message: 'Has uncommitted changes',
    };
  }

  // Run sync-template with --json flag (falls back to legacy mode for older projects)
  try {
    const flags = dryRun ? '--dry-run --json' : '--json';
    const command = `yarn sync-template ${flags}`;

    console.log(`\n📦 Syncing ${projectName}...`);

    const output = execSync(command, {
      cwd: projectPath,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large outputs
    });

    // Try to parse JSON output
    try {
      const jsonResult = JSON.parse(output.trim()) as SyncJsonResult;

      // Map JSON result to SyncResult
      switch (jsonResult.status) {
        case 'success':
          return {
            project: projectName,
            status: 'synced',
            message: jsonResult.message,
            filesApplied: jsonResult.filesApplied,
            checksResult: jsonResult.checksResult,
          };

        case 'no-changes':
          return {
            project: projectName,
            status: 'no-changes',
            message: jsonResult.message,
            checksResult: jsonResult.checksResult,
          };

        case 'checks-failed':
          return {
            project: projectName,
            status: 'checks-failed',
            message: jsonResult.message,
            filesApplied: jsonResult.filesApplied,
            checksResult: jsonResult.checksResult,
          };

        case 'error':
          return {
            project: projectName,
            status: 'error',
            message: jsonResult.message,
          };

        default:
          return {
            project: projectName,
            status: 'error',
            message: `Unknown status: ${jsonResult.status}`,
          };
      }
    } catch {
      // JSON parsing failed - use legacy string matching for older projects
      return parseLegacyOutput(projectName, output, dryRun);
    }
  } catch (error) {
    // Try to extract JSON or legacy output from stdout
    if (error && typeof error === 'object' && 'stdout' in error) {
      const stdout = (error as { stdout?: string }).stdout;
      if (stdout) {
        // Try JSON first
        try {
          const jsonResult = JSON.parse(stdout.trim()) as SyncJsonResult;
          return {
            project: projectName,
            status: jsonResult.status === 'checks-failed' ? 'checks-failed' : 'error',
            message: jsonResult.message,
            filesApplied: jsonResult.filesApplied,
            checksResult: jsonResult.checksResult,
          };
        } catch {
          // Try legacy parsing
          return parseLegacyOutput(projectName, stdout, dryRun);
        }
      }
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      project: projectName,
      status: 'error',
      message: errorMessage.split('\n')[0].substring(0, 80),
    };
  }
}

/**
 * Parse legacy (non-JSON) sync-template output using string matching.
 * Used for backward compatibility with older child projects.
 */
function parseLegacyOutput(projectName: string, output: string, dryRun: boolean): SyncResult {
  const hasChanges = output.includes('✅ Template sync completed') ||
                     output.includes('Committed as');
  const noChanges = output.includes('No changes detected') ||
                    output.includes('Nothing to sync') ||
                    output.includes('up to date');
  const checksFailed = output.includes('yarn checks failed') ||
                       output.includes('Validation failed');

  if (checksFailed) {
    return {
      project: projectName,
      status: 'checks-failed',
      message: 'Validation failed (legacy detection)',
    };
  }

  if (noChanges) {
    return {
      project: projectName,
      status: 'no-changes',
      message: 'Already up to date',
    };
  }

  if (hasChanges) {
    return {
      project: projectName,
      status: 'synced',
      message: dryRun ? 'Changes available (dry run)' : 'Changes synced and committed',
    };
  }

  // Default: assume sync completed
  return {
    project: projectName,
    status: 'synced',
    message: dryRun ? 'Checked (dry run)' : 'Sync completed',
  };
}

function printSummary(results: SyncResult[]): void {
  console.log('\n' + '='.repeat(60));
  console.log('📊 SYNC SUMMARY');
  console.log('='.repeat(60));

  const synced = results.filter(r => r.status === 'synced');
  const noChanges = results.filter(r => r.status === 'no-changes');
  const skipped = results.filter(r => r.status === 'skipped');
  const checksFailed = results.filter(r => r.status === 'checks-failed');
  const errors = results.filter(r => r.status === 'error');
  const notFound = results.filter(r => r.status === 'not-found');

  if (synced.length > 0) {
    console.log(`\n✅ Synced (${synced.length}):`);
    synced.forEach(r => {
      console.log(`   • ${r.project}: ${r.message}`);
      if (r.filesApplied && r.filesApplied.length > 0) {
        r.filesApplied.slice(0, 5).forEach(f => console.log(`     - ${f}`));
        if (r.filesApplied.length > 5) {
          console.log(`     ... and ${r.filesApplied.length - 5} more`);
        }
      }
    });
  }

  if (noChanges.length > 0) {
    console.log(`\n📋 Up to date (${noChanges.length}):`);
    noChanges.forEach(r => console.log(`   • ${r.project}`));
  }

  if (skipped.length > 0) {
    console.log(`\n⏭️  Skipped (${skipped.length}):`);
    skipped.forEach(r => console.log(`   • ${r.project}: ${r.message}`));
  }

  if (checksFailed.length > 0) {
    console.log(`\n⚠️  Checks Failed (${checksFailed.length}):`);
    checksFailed.forEach(r => {
      console.log(`   • ${r.project}: ${r.message}`);
      if (r.checksResult) {
        if (r.checksResult.tsErrors.length > 0) {
          console.log(`     TypeScript errors:`);
          r.checksResult.tsErrors.slice(0, 3).forEach(e => console.log(`       ${e}`));
          if (r.checksResult.tsErrors.length > 3) {
            console.log(`       ... and ${r.checksResult.tsErrors.length - 3} more`);
          }
        }
        if (r.checksResult.lintErrors.length > 0) {
          console.log(`     ESLint errors:`);
          r.checksResult.lintErrors.slice(0, 3).forEach(e => console.log(`       ${e}`));
          if (r.checksResult.lintErrors.length > 3) {
            console.log(`       ... and ${r.checksResult.lintErrors.length - 3} more`);
          }
        }
      }
    });
  }

  if (notFound.length > 0) {
    console.log(`\n⚠️  Not Found (${notFound.length}):`);
    notFound.forEach(r => console.log(`   • ${r.project}: ${r.message}`));
  }

  if (errors.length > 0) {
    console.log(`\n❌ Errors (${errors.length}):`);
    errors.forEach(r => console.log(`   • ${r.project}: ${r.message}`));
  }

  console.log('\n' + '='.repeat(60));
  const successCount = synced.length + noChanges.length;
  const problemCount = checksFailed.length + errors.length + notFound.length;
  console.log(`Total: ${results.length} projects | Success: ${successCount} | Skipped: ${skipped.length} | Problems: ${problemCount}`);
  console.log('='.repeat(60) + '\n');
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  console.log('🔄 Sync Child Projects');
  console.log('='.repeat(60));

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be applied\n');
  }

  const templateRoot = process.cwd();
  const config = loadConfig(templateRoot);

  if (!config) {
    process.exit(1);
  }

  if (config.projects.length === 0) {
    console.log('No projects configured in child-projects.json');
    process.exit(0);
  }

  console.log(`Found ${config.projects.length} child project(s) to sync:\n`);
  config.projects.forEach(p => console.log(`   • ${p}`));

  const results: SyncResult[] = [];

  for (const relativePath of config.projects) {
    const projectPath = path.resolve(templateRoot, relativePath);
    const result = syncProject(projectPath, dryRun);
    results.push(result);
  }

  printSummary(results);

  // Exit with error code if any projects had problems
  const hasProblems = results.some(r => r.status === 'error' || r.status === 'checks-failed');
  if (hasProblems) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
