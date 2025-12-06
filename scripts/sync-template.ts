#!/usr/bin/env ts-node

/**
 * Template Sync Script
 * 
 * This script helps merge updates from the template repository into a project
 * that was created from the template.
 * 
 * Usage:
 *   yarn sync-template [--dry-run] [--force] [--auto]
 * 
 * Options:
 *   --dry-run    Show what would be done without making changes
 *   --force      Force update even if there are uncommitted changes
 *   --auto       Skip interactive prompts, take all changes (old behavior)
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as readline from 'readline';

interface TemplateSyncConfig {
  templateRepo: string;
  templateBranch: string;
  baseCommit: string | null;
  lastSyncCommit: string | null;
  lastSyncDate: string | null;
  ignoredFiles: string[];
  projectSpecificFiles: string[];
}

interface FileChange {
  path: string;
  status: 'added' | 'modified' | 'deleted';
  inTemplate: boolean;
  inProject: boolean;
}

interface SyncResult {
  autoMerged: string[];
  conflicts: string[];
  skipped: string[];
  errors: string[];
}

interface AnalysisResult {
  safeChanges: FileChange[];    // Only changed in template
  conflictChanges: FileChange[]; // Changed in both
  skipped: string[];
}

type SyncMode = 'safe' | 'all' | 'none';

const CONFIG_FILE = '.template-sync.json';
const TEMPLATE_DIR = '.template-sync-temp';

class TemplateSyncTool {
  private config: TemplateSyncConfig;
  private projectRoot: string;
  private dryRun: boolean;
  private force: boolean;
  private auto: boolean;
  private rl: readline.Interface;

  constructor(dryRun = false, force = false, auto = false) {
    this.projectRoot = process.cwd();
    this.dryRun = dryRun;
    this.force = force;
    this.auto = auto;
    this.config = this.loadConfig();
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  private loadConfig(): TemplateSyncConfig {
    const configPath = path.join(this.projectRoot, CONFIG_FILE);
    
    if (!fs.existsSync(configPath)) {
      console.error('❌ Error: .template-sync.json not found.');
      console.error('Run "yarn init-template" first to initialize template tracking.');
      process.exit(1);
    }

    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  }

  private saveConfig(): void {
    const configPath = path.join(this.projectRoot, CONFIG_FILE);
    fs.writeFileSync(
      configPath,
      JSON.stringify(this.config, null, 2) + '\n',
      'utf-8'
    );
  }

  private exec(command: string, options: { cwd?: string; silent?: boolean } = {}): string {
    try {
      return execSync(command, {
        cwd: options.cwd || this.projectRoot,
        encoding: 'utf-8',
        stdio: options.silent ? 'pipe' : 'inherit',
      }).toString().trim();
    } catch (error: any) {
      if (!options.silent) {
        throw error;
      }
      return '';
    }
  }

  private checkGitStatus(): void {
    const status = this.exec('git status --porcelain', { silent: true });
    
    if (status && !this.force) {
      console.error('❌ Error: You have uncommitted changes.');
      console.error('Please commit or stash your changes before syncing the template.');
      console.error('Or use --force to override this check.');
      process.exit(1);
    }
  }

  private cloneTemplate(): void {
    const templatePath = path.join(this.projectRoot, TEMPLATE_DIR);

    // Clean up any existing template directory
    if (fs.existsSync(templatePath)) {
      fs.rmSync(templatePath, { recursive: true, force: true });
    }

    console.log(`📥 Cloning template from ${this.config.templateRepo}...`);
    this.exec(
      `git clone --branch ${this.config.templateBranch} --depth 1 ${this.config.templateRepo} ${TEMPLATE_DIR}`,
      { silent: true }
    );
  }

  private cleanupTemplate(): void {
    const templatePath = path.join(this.projectRoot, TEMPLATE_DIR);
    if (fs.existsSync(templatePath)) {
      fs.rmSync(templatePath, { recursive: true, force: true });
    }
  }

  private getAllFiles(dir: string, baseDir = dir): string[] {
    const files: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(baseDir, fullPath);

      // Skip ignored files/directories
      if (this.shouldIgnore(relativePath)) {
        continue;
      }

      if (entry.isDirectory()) {
        files.push(...this.getAllFiles(fullPath, baseDir));
      } else {
        files.push(relativePath);
      }
    }

    return files;
  }

  private shouldIgnore(filePath: string): boolean {
    const normalized = filePath.replace(/\\/g, '/');
    
    return this.config.ignoredFiles.some(pattern => {
      // Exact match
      if (normalized === pattern) return true;
      
      // Directory match (if pattern is a directory name anywhere in path)
      if (normalized.split('/').includes(pattern)) return true;
      
      // Start with match
      if (normalized.startsWith(pattern + '/')) return true;
      
      return false;
    });
  }

  private getFileHash(filePath: string): string {
    if (!fs.existsSync(filePath)) return '';
    
    const content = fs.readFileSync(filePath);
    return crypto.createHash('md5').update(content).digest('hex');
  }

  private compareFiles(): FileChange[] {
    const templatePath = path.join(this.projectRoot, TEMPLATE_DIR);
    const templateFiles = this.getAllFiles(templatePath);
    const projectFiles = this.getAllFiles(this.projectRoot);

    const allFiles = Array.from(new Set([...templateFiles, ...projectFiles]));
    const changes: FileChange[] = [];

    for (const file of allFiles) {
      const templateFilePath = path.join(templatePath, file);
      const projectFilePath = path.join(this.projectRoot, file);

      const inTemplate = fs.existsSync(templateFilePath);
      const inProject = fs.existsSync(projectFilePath);

      if (!inProject && inTemplate) {
        // New file in template
        changes.push({
          path: file,
          status: 'added',
          inTemplate: true,
          inProject: false,
        });
      } else if (inProject && !inTemplate) {
        // File removed from template (keep in project)
        continue;
      } else if (inProject && inTemplate) {
        // File exists in both - check if different
        const templateHash = this.getFileHash(templateFilePath);
        const projectHash = this.getFileHash(projectFilePath);

        if (templateHash !== projectHash) {
          changes.push({
            path: file,
            status: 'modified',
            inTemplate: true,
            inProject: true,
          });
        }
      }
    }

    return changes;
  }

  private hasProjectChanges(filePath: string): boolean {
    // Check if file has been modified in the project since creation
    try {
      // If we have a base commit, check against it
      if (this.config.lastSyncCommit) {
        const diff = this.exec(
          `git diff ${this.config.lastSyncCommit} HEAD -- "${filePath}"`,
          { silent: true }
        );
        return diff.length > 0;
      }

      // Otherwise, check if file is tracked and has history
      const log = this.exec(`git log --oneline -- "${filePath}"`, { silent: true });
      return log.length > 0;
    } catch {
      return false;
    }
  }

  private analyzeChanges(changes: FileChange[]): AnalysisResult {
    const result: AnalysisResult = {
      safeChanges: [],
      conflictChanges: [],
      skipped: [],
    };

    for (const change of changes) {
      // Skip project-specific files
      if (this.config.projectSpecificFiles.includes(change.path)) {
        result.skipped.push(change.path);
        continue;
      }

      if (change.status === 'added') {
        // New file - safe to add
        result.safeChanges.push(change);
      } else if (change.status === 'modified') {
        // Check if project has changes
        const projectHasChanges = this.hasProjectChanges(change.path);
        
        if (!projectHasChanges) {
          // Only template changed - safe
          result.safeChanges.push(change);
        } else {
          // Both changed - conflict
          result.conflictChanges.push(change);
        }
      }
    }

    return result;
  }

  private async promptUser(analysis: AnalysisResult): Promise<SyncMode> {
    console.log('\n' + '='.repeat(60));
    console.log('📊 ANALYSIS SUMMARY');
    console.log('='.repeat(60));
    
    if (analysis.safeChanges.length > 0) {
      console.log(`\n✅ Safe changes (${analysis.safeChanges.length} files):`);
      console.log('   Only changed in template, no conflicts:');
      analysis.safeChanges.slice(0, 10).forEach(f => 
        console.log(`   • ${f.path}`)
      );
      if (analysis.safeChanges.length > 10) {
        console.log(`   ... and ${analysis.safeChanges.length - 10} more`);
      }
    }

    if (analysis.conflictChanges.length > 0) {
      console.log(`\n⚠️  Potential conflicts (${analysis.conflictChanges.length} files):`);
      console.log('   Changed in both template and your project:');
      analysis.conflictChanges.slice(0, 10).forEach(f => 
        console.log(`   • ${f.path}`)
      );
      if (analysis.conflictChanges.length > 10) {
        console.log(`   ... and ${analysis.conflictChanges.length - 10} more`);
      }
    }

    if (analysis.skipped.length > 0) {
      console.log(`\n⏭️  Skipped (${analysis.skipped.length} files):`);
      console.log('   Project-specific files (ignored):');
      analysis.skipped.slice(0, 5).forEach(f => 
        console.log(`   • ${f}`)
      );
      if (analysis.skipped.length > 5) {
        console.log(`   ... and ${analysis.skipped.length - 5} more`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n🤔 What would you like to do?\n');
    console.log('  [1] Safe only  - Apply only safe changes (no conflicts)');
    console.log('  [2] All changes - Apply all changes (may need manual merge)');
    console.log('  [3] Cancel     - Don\'t apply any changes\n');

    return new Promise((resolve) => {
      this.rl.question('Enter your choice (1/2/3): ', (answer) => {
        const choice = answer.trim();
        
        if (choice === '1') {
          resolve('safe');
        } else if (choice === '2') {
          resolve('all');
        } else if (choice === '3') {
          resolve('none');
        } else {
          console.log('Invalid choice. Please enter 1, 2, or 3.');
          this.promptUser(analysis).then(resolve);
        }
      });
    });
  }

  private async syncFiles(analysis: AnalysisResult, mode: SyncMode): Promise<SyncResult> {
    const result: SyncResult = {
      autoMerged: [],
      conflicts: [],
      skipped: analysis.skipped,
      errors: [],
    };

    if (mode === 'none') {
      console.log('\n❌ Cancelled. No changes applied.');
      return result;
    }

    const templatePath = path.join(this.projectRoot, TEMPLATE_DIR);
    const changesToApply: FileChange[] = mode === 'safe' 
      ? analysis.safeChanges 
      : [...analysis.safeChanges, ...analysis.conflictChanges];

    console.log(`\n🔄 Applying ${changesToApply.length} changes...\n`);

    for (const change of changesToApply) {
      const templateFilePath = path.join(templatePath, change.path);
      const projectFilePath = path.join(this.projectRoot, change.path);
      const isConflict = analysis.conflictChanges.includes(change);

      try {
        if (change.status === 'added' || !isConflict) {
          // New file or safe change - copy directly
          if (!this.dryRun) {
            const dir = path.dirname(projectFilePath);
            if (!fs.existsSync(dir)) {
              fs.mkdirSync(dir, { recursive: true });
            }
            fs.copyFileSync(templateFilePath, projectFilePath);
          }
          result.autoMerged.push(change.path);
        } else {
          // Conflict - save template version for manual merge
          result.conflicts.push(change.path);
          
          if (!this.dryRun) {
            fs.copyFileSync(templateFilePath, projectFilePath + '.template');
          }
        }
      } catch (error: any) {
        result.errors.push(`${change.path}: ${error.message}`);
      }
    }

    return result;
  }

  private printResults(result: SyncResult): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 SYNC RESULTS');
    console.log('='.repeat(60));

    if (result.autoMerged.length > 0) {
      console.log(`\n✅ Auto-merged (${result.autoMerged.length} files):`);
      result.autoMerged.forEach(f => console.log(`   ${f}`));
    }

    if (result.conflicts.length > 0) {
      console.log(`\n⚠️  Conflicts - Manual merge needed (${result.conflicts.length} files):`);
      result.conflicts.forEach(f => {
        console.log(`   ${f}`);
        console.log(`      → Template version saved to: ${f}.template`);
      });
    }

    if (result.skipped.length > 0) {
      console.log(`\n⏭️  Skipped (${result.skipped.length} files):`);
      result.skipped.forEach(f => console.log(`   ${f}`));
    }

    if (result.errors.length > 0) {
      console.log(`\n❌ Errors (${result.errors.length}):`);
      result.errors.forEach(e => console.log(`   ${e}`));
    }

    console.log('\n' + '='.repeat(60));

    if (result.conflicts.length > 0) {
      console.log('\n💡 Next steps:');
      console.log('   1. Review each conflict file');
      console.log('   2. Compare with the .template version');
      console.log('   3. Manually merge the changes');
      console.log('   4. Delete the .template files when done');
      console.log('   5. Commit your changes');
    }
  }

  async run(): Promise<void> {
    console.log('🔄 Template Sync Tool');
    console.log('='.repeat(60));
    
    if (this.dryRun) {
      console.log('🔍 DRY RUN MODE - No changes will be made\n');
    }

    // Step 1: Check git status
    if (!this.dryRun && !this.force) {
      this.checkGitStatus();
    }

    // Step 2: Clone template
    try {
      this.cloneTemplate();

      // Step 3: Get template commit
      const templatePath = path.join(this.projectRoot, TEMPLATE_DIR);
      const templateCommit = this.exec('git rev-parse HEAD', {
        cwd: templatePath,
        silent: true,
      });

      console.log(`📍 Template commit: ${templateCommit}\n`);

      // Step 4: Compare files
      console.log('🔍 Analyzing changes...');
      const changes = this.compareFiles();

      if (changes.length === 0) {
        console.log('✅ No changes detected. Your project is up to date!');
        this.rl.close();
        return;
      }

      // Step 5: Analyze changes (categorize into safe/conflict)
      const analysis = this.analyzeChanges(changes);

      // Step 6: Prompt user for choice (unless auto mode or dry-run)
      let mode: SyncMode;
      
      if (this.dryRun) {
        // In dry-run, show analysis but don't apply
        mode = 'all'; // Show everything
        const result = await this.syncFiles(analysis, mode);
        this.printResults(result);
        console.log('\n🔍 DRY RUN - No changes were actually applied.');
        this.rl.close();
        return;
      } else if (this.auto) {
        // Auto mode: apply all changes (old behavior)
        mode = 'all';
        console.log('\n🤖 AUTO MODE - Applying all changes...');
      } else {
        // Interactive mode: ask user
        mode = await this.promptUser(analysis);
      }

      this.rl.close();

      if (mode === 'none') {
        console.log('\n✅ No changes applied.');
        return;
      }

      // Step 7: Apply changes based on mode (mode is 'safe' or 'all' here)
      const result = await this.syncFiles(analysis, mode);

      // Step 8: Update config (only if not dry-run)
      if (!this.dryRun) {
        this.config.lastSyncCommit = templateCommit;
        this.config.lastSyncDate = new Date().toISOString();
        this.saveConfig();
      }

      // Step 9: Print results
      this.printResults(result);

      if (result.autoMerged.length > 0) {
        console.log('\n✅ Template sync completed!');
        if (result.conflicts.length === 0) {
          console.log('   All changes were auto-merged successfully.');
        }
      }
    } catch (error: any) {
      this.rl.close();
      throw error;
    } finally {
      // Cleanup
      this.cleanupTemplate();
    }
  }
}

// Main execution
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const force = args.includes('--force');
const auto = args.includes('--auto');

const tool = new TemplateSyncTool(dryRun, force, auto);
tool.run().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});

