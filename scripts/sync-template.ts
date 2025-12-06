#!/usr/bin/env ts-node

/**
 * Template Sync Script
 * 
 * This script helps merge updates from the template repository into a project
 * that was created from the template.
 * 
 * Usage:
 *   yarn sync-template [--dry-run] [--force]
 * 
 * Options:
 *   --dry-run    Show what would be done without making changes
 *   --force      Force update even if there are uncommitted changes
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

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

const CONFIG_FILE = '.template-sync.json';
const TEMPLATE_DIR = '.template-sync-temp';

class TemplateSyncTool {
  private config: TemplateSyncConfig;
  private projectRoot: string;
  private dryRun: boolean;
  private force: boolean;

  constructor(dryRun = false, force = false) {
    this.projectRoot = process.cwd();
    this.dryRun = dryRun;
    this.force = force;
    this.config = this.loadConfig();
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

  private async syncFiles(changes: FileChange[]): Promise<SyncResult> {
    const result: SyncResult = {
      autoMerged: [],
      conflicts: [],
      skipped: [],
      errors: [],
    };

    const templatePath = path.join(this.projectRoot, TEMPLATE_DIR);

    for (const change of changes) {
      const templateFilePath = path.join(templatePath, change.path);
      const projectFilePath = path.join(this.projectRoot, change.path);

      try {
        // Skip project-specific files
        if (this.config.projectSpecificFiles.includes(change.path)) {
          result.skipped.push(change.path);
          continue;
        }

        if (change.status === 'added') {
          // New file - safe to copy
          if (!this.dryRun) {
            const dir = path.dirname(projectFilePath);
            if (!fs.existsSync(dir)) {
              fs.mkdirSync(dir, { recursive: true });
            }
            fs.copyFileSync(templateFilePath, projectFilePath);
          }
          result.autoMerged.push(change.path);
        } else if (change.status === 'modified') {
          // File modified - check if project has changes
          const projectHasChanges = this.hasProjectChanges(change.path);

          if (!projectHasChanges) {
            // Only template changed - safe to overwrite
            if (!this.dryRun) {
              fs.copyFileSync(templateFilePath, projectFilePath);
            }
            result.autoMerged.push(change.path);
          } else {
            // Both changed - needs manual merge
            result.conflicts.push(change.path);
            
            // Save template version with .template extension for manual review
            if (!this.dryRun) {
              fs.copyFileSync(templateFilePath, projectFilePath + '.template');
            }
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
    if (!this.dryRun) {
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
      console.log('🔍 Analyzing changes...\n');
      const changes = this.compareFiles();

      if (changes.length === 0) {
        console.log('✅ No changes detected. Your project is up to date!');
        return;
      }

      console.log(`📝 Found ${changes.length} changed files\n`);

      // Step 5: Sync files
      const result = await this.syncFiles(changes);

      // Step 6: Update config
      if (!this.dryRun) {
        this.config.lastSyncCommit = templateCommit;
        this.config.lastSyncDate = new Date().toISOString();
        this.saveConfig();
      }

      // Step 7: Print results
      this.printResults(result);

      if (!this.dryRun && result.autoMerged.length > 0) {
        console.log('\n✅ Template sync completed!');
        if (result.conflicts.length === 0) {
          console.log('   All changes were auto-merged successfully.');
        }
      }
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

const tool = new TemplateSyncTool(dryRun, force);
tool.run().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});

