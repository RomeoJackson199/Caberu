import * as fs from 'fs';
import * as path from 'path';
import { Page } from '@playwright/test';

/**
 * Bug Reporter Utility
 * 
 * Captures evidence and generates structured bug reports from test failures
 */

export interface BugReport {
    id: string;
    title: string;
    description: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    category: string;
    testId: string;
    url: string;
    timestamp: string;
    screenshot?: string;
    consoleErrors: string[];
    networkErrors: string[];
    steps: string[];
    expectedBehavior: string;
    actualBehavior: string;
}

export class BugReporter {
    private bugs: BugReport[] = [];
    private outputDir: string;

    constructor(outputDir: string = 'test-results/bugs') {
        this.outputDir = outputDir;
        this.ensureDirectoryExists(outputDir);
    }

    private ensureDirectoryExists(dir: string): void {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    async reportBug(
        page: Page,
        options: {
            testId: string;
            title: string;
            description: string;
            severity: 'critical' | 'high' | 'medium' | 'low';
            category: string;
            steps: string[];
            expectedBehavior: string;
            actualBehavior: string;
            consoleErrors?: string[];
            networkErrors?: string[];
        }
    ): Promise<BugReport> {
        const timestamp = new Date().toISOString();
        const bugId = `BUG-${Date.now()}-${Math.random().toString(36).substring(7)}`;

        // Capture screenshot
        const screenshotFilename = `${bugId}.png`;
        const screenshotPath = path.join(this.outputDir, 'screenshots', screenshotFilename);
        this.ensureDirectoryExists(path.dirname(screenshotPath));

        await page.screenshot({
            path: screenshotPath,
            fullPage: true,
        });

        const bug: BugReport = {
            id: bugId,
            title: options.title,
            description: options.description,
            severity: options.severity,
            category: options.category,
            testId: options.testId,
            url: page.url(),
            timestamp,
            screenshot: screenshotFilename,
            consoleErrors: options.consoleErrors || [],
            networkErrors: options.networkErrors || [],
            steps: options.steps,
            expectedBehavior: options.expectedBehavior,
            actualBehavior: options.actualBehavior,
        };

        this.bugs.push(bug);
        return bug;
    }

    generateReport(): string {
        const criticalBugs = this.bugs.filter(b => b.severity === 'critical');
        const highBugs = this.bugs.filter(b => b.severity === 'high');
        const mediumBugs = this.bugs.filter(b => b.severity === 'medium');
        const lowBugs = this.bugs.filter(b => b.severity === 'low');

        let report = `# DentiBot AI Browser Testing - Bug Report\n\n`;
        report += `**Generated:** ${new Date().toISOString()}\n`;
        report += `**Total Bugs Found:** ${this.bugs.length}\n\n`;

        report += `## Summary\n\n`;
        report += `| Severity | Count |\n`;
        report += `|----------|-------|\n`;
        report += `| 🔴 Critical | ${criticalBugs.length} |\n`;
        report += `| 🟠 High | ${highBugs.length} |\n`;
        report += `| 🟡 Medium | ${mediumBugs.length} |\n`;
        report += `| 🟢 Low | ${lowBugs.length} |\n\n`;

        if (criticalBugs.length > 0) {
            report += `## 🔴 Critical Bugs\n\n`;
            report += this.formatBugList(criticalBugs);
        }

        if (highBugs.length > 0) {
            report += `## 🟠 High Priority Bugs\n\n`;
            report += this.formatBugList(highBugs);
        }

        if (mediumBugs.length > 0) {
            report += `## 🟡 Medium Priority Bugs\n\n`;
            report += this.formatBugList(mediumBugs);
        }

        if (lowBugs.length > 0) {
            report += `## 🟢 Low Priority Bugs\n\n`;
            report += this.formatBugList(lowBugs);
        }

        return report;
    }

    private formatBugList(bugs: BugReport[]): string {
        let output = '';

        for (const bug of bugs) {
            output += `### ${bug.id}: ${bug.title}\n\n`;
            output += `**Category:** ${bug.category}\n`;
            output += `**Test ID:** ${bug.testId}\n`;
            output += `**URL:** ${bug.url}\n`;
            output += `**Found:** ${bug.timestamp}\n\n`;

            output += `**Description:**\n${bug.description}\n\n`;

            output += `**Steps to Reproduce:**\n`;
            bug.steps.forEach((step, i) => {
                output += `${i + 1}. ${step}\n`;
            });
            output += '\n';

            output += `**Expected:** ${bug.expectedBehavior}\n`;
            output += `**Actual:** ${bug.actualBehavior}\n\n`;

            if (bug.screenshot) {
                output += `**Screenshot:** [View](./screenshots/${bug.screenshot})\n\n`;
            }

            if (bug.consoleErrors.length > 0) {
                output += `**Console Errors:**\n`;
                output += '```\n';
                bug.consoleErrors.forEach(err => {
                    output += `${err}\n`;
                });
                output += '```\n\n';
            }

            output += '---\n\n';
        }

        return output;
    }

    saveReport(): void {
        const report = this.generateReport();
        const reportPath = path.join(this.outputDir, 'bug-report.md');
        fs.writeFileSync(reportPath, report);

        // Also save raw JSON
        const jsonPath = path.join(this.outputDir, 'bugs.json');
        fs.writeFileSync(jsonPath, JSON.stringify(this.bugs, null, 2));
    }

    getBugs(): BugReport[] {
        return this.bugs;
    }

    getBugsByCategory(category: string): BugReport[] {
        return this.bugs.filter(b => b.category === category);
    }

    getBugsBySeverity(severity: 'critical' | 'high' | 'medium' | 'low'): BugReport[] {
        return this.bugs.filter(b => b.severity === severity);
    }
}

// Singleton instance for global access
let globalReporter: BugReporter | null = null;

export function getGlobalBugReporter(): BugReporter {
    if (!globalReporter) {
        globalReporter = new BugReporter();
    }
    return globalReporter;
}

export function resetGlobalBugReporter(): void {
    globalReporter = null;
}
