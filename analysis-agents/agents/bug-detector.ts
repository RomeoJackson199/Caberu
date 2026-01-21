/**
 * Bug Detection Agent
 *
 * Deeply analyzes files for common bug patterns, potential runtime errors,
 * and code smells that could lead to issues.
 */

import * as fs from 'fs';
import * as path from 'path';

interface BugReport {
  file: string;
  line: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  issue: string;
  recommendation: string;
  codeSnippet?: string;
}

export class BugDetector {
  private reports: BugReport[] = [];

  /**
   * Analyze a file for potential bugs
   */
  async analyzeFile(filePath: string): Promise<BugReport[]> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const fileReports: BugReport[] = [];

    lines.forEach((line, index) => {
      const lineNumber = index + 1;

      // Check for console statements in production code
      if (this.hasConsoleStatement(line) && !filePath.includes('test')) {
        fileReports.push({
          file: filePath,
          line: lineNumber,
          severity: 'low',
          category: 'Debug Code',
          issue: 'Console statement found in production code',
          recommendation: 'Remove console.log or use a proper logging service',
          codeSnippet: line.trim()
        });
      }

      // Check for unhandled promise rejections
      if (this.hasUnhandledPromise(line)) {
        fileReports.push({
          file: filePath,
          line: lineNumber,
          severity: 'high',
          category: 'Error Handling',
          issue: 'Potential unhandled promise rejection',
          recommendation: 'Add .catch() or wrap in try-catch block',
          codeSnippet: line.trim()
        });
      }

      // Check for TODO/FIXME comments
      if (this.hasTodoOrFixme(line)) {
        fileReports.push({
          file: filePath,
          line: lineNumber,
          severity: 'medium',
          category: 'Technical Debt',
          issue: 'TODO/FIXME comment found',
          recommendation: 'Address this technical debt item',
          codeSnippet: line.trim()
        });
      }

      // Check for direct DOM manipulation in React
      if (this.hasDirectDOMManipulation(line)) {
        fileReports.push({
          file: filePath,
          line: lineNumber,
          severity: 'medium',
          category: 'React Anti-pattern',
          issue: 'Direct DOM manipulation detected',
          recommendation: 'Use React refs or state instead',
          codeSnippet: line.trim()
        });
      }

      // Check for missing null/undefined checks
      if (this.hasPotentialNullError(line)) {
        fileReports.push({
          file: filePath,
          line: lineNumber,
          severity: 'high',
          category: 'Null Safety',
          issue: 'Potential null/undefined access without check',
          recommendation: 'Add null/undefined check or use optional chaining',
          codeSnippet: line.trim()
        });
      }

      // Check for hardcoded credentials
      if (this.hasHardcodedCredentials(line)) {
        fileReports.push({
          file: filePath,
          line: lineNumber,
          severity: 'critical',
          category: 'Security',
          issue: 'Potential hardcoded credentials or API keys',
          recommendation: 'Move to environment variables',
          codeSnippet: '*** REDACTED FOR SECURITY ***'
        });
      }

      // Check for setState in useEffect without dependencies
      if (this.hasStateInUseEffectIssue(content, lineNumber)) {
        fileReports.push({
          file: filePath,
          line: lineNumber,
          severity: 'high',
          category: 'React Hooks',
          issue: 'setState in useEffect may cause infinite loop',
          recommendation: 'Add proper dependencies or conditions',
          codeSnippet: line.trim()
        });
      }

      // Check for == instead of ===
      if (this.hasLooseEquality(line)) {
        fileReports.push({
          file: filePath,
          line: lineNumber,
          severity: 'medium',
          category: 'Type Safety',
          issue: 'Loose equality operator (==) used',
          recommendation: 'Use strict equality (===) instead',
          codeSnippet: line.trim()
        });
      }

      // Check for missing error boundaries
      if (this.shouldHaveErrorBoundary(line)) {
        fileReports.push({
          file: filePath,
          line: lineNumber,
          severity: 'medium',
          category: 'Error Handling',
          issue: 'Component may benefit from error boundary',
          recommendation: 'Wrap component in ErrorBoundary',
          codeSnippet: line.trim()
        });
      }

      // Check for missing key prop in map
      if (this.hasMissingKeyInMap(line)) {
        fileReports.push({
          file: filePath,
          line: lineNumber,
          severity: 'high',
          category: 'React Performance',
          issue: 'Missing or incorrect key prop in map',
          recommendation: 'Add unique key prop to mapped elements',
          codeSnippet: line.trim()
        });
      }

      // Check for memory leaks in useEffect
      if (this.hasPotentialMemoryLeak(content, lineNumber)) {
        fileReports.push({
          file: filePath,
          line: lineNumber,
          severity: 'high',
          category: 'Memory Management',
          issue: 'Potential memory leak in useEffect',
          recommendation: 'Add cleanup function to useEffect',
          codeSnippet: line.trim()
        });
      }

      // Check for async function without error handling
      if (this.hasAsyncWithoutErrorHandling(line)) {
        fileReports.push({
          file: filePath,
          line: lineNumber,
          severity: 'high',
          category: 'Error Handling',
          issue: 'Async function without try-catch',
          recommendation: 'Add error handling for async operations',
          codeSnippet: line.trim()
        });
      }
    });

    this.reports.push(...fileReports);
    return fileReports;
  }

  private hasConsoleStatement(line: string): boolean {
    return /console\.(log|warn|error|debug|info)/.test(line) && !line.trim().startsWith('//');
  }

  private hasUnhandledPromise(line: string): boolean {
    // Check for promises without .catch() or await without try-catch
    return /\.(then|fetch)\(/.test(line) && !/\.catch/.test(line) && !line.includes('await');
  }

  private hasTodoOrFixme(line: string): boolean {
    return /\/\/\s*(TODO|FIXME|HACK|XXX)/i.test(line);
  }

  private hasDirectDOMManipulation(line: string): boolean {
    return /document\.(getElementById|querySelector|getElementsBy)/.test(line);
  }

  private hasPotentialNullError(line: string): boolean {
    // Check for property access that might be null
    const hasNullableAccess = /\?\.\w+\.\w+(?!\?)/.test(line);
    const hasDirectAccess = /\.then\(\w+\s*=>\s*\w+\.\w+\)/.test(line);
    return hasNullableAccess || hasDirectAccess;
  }

  private hasHardcodedCredentials(line: string): boolean {
    const patterns = [
      /password\s*[:=]\s*['"][^'"]+['"]/i,
      /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/i,
      /secret\s*[:=]\s*['"][^'"]+['"]/i,
      /token\s*[:=]\s*['"][a-zA-Z0-9]{20,}['"]/i
    ];
    return patterns.some(pattern => pattern.test(line)) && !line.includes('process.env');
  }

  private hasStateInUseEffectIssue(content: string, lineNumber: number): boolean {
    const lines = content.split('\n');
    const line = lines[lineNumber - 1];

    if (line.includes('useEffect')) {
      // Check if there's a setState call without proper dependencies
      const effectBlock = this.extractEffectBlock(lines, lineNumber - 1);
      return /set[A-Z]\w+\(/.test(effectBlock) && !effectBlock.includes('[]');
    }
    return false;
  }

  private hasLooseEquality(line: string): boolean {
    return /[^=!<>]==[^=]/.test(line) && !line.trim().startsWith('//');
  }

  private shouldHaveErrorBoundary(line: string): boolean {
    return /export\s+(default\s+)?function\s+\w+Page/.test(line);
  }

  private hasMissingKeyInMap(line: string): boolean {
    if (line.includes('.map(') && line.includes('return')) {
      return !line.includes('key=');
    }
    return false;
  }

  private hasPotentialMemoryLeak(content: string, lineNumber: number): boolean {
    const lines = content.split('\n');
    const line = lines[lineNumber - 1];

    if (line.includes('useEffect')) {
      const effectBlock = this.extractEffectBlock(lines, lineNumber - 1);
      const hasSubscription = /addEventListener|subscribe|setInterval|setTimeout/.test(effectBlock);
      const hasCleanup = /return\s*\(\s*\)\s*=>|return\s*function/.test(effectBlock);
      return hasSubscription && !hasCleanup;
    }
    return false;
  }

  private hasAsyncWithoutErrorHandling(line: string): boolean {
    return /async\s+function/.test(line) || /async\s*\(/.test(line);
  }

  private extractEffectBlock(lines: string[], startLine: number): string {
    let braceCount = 0;
    let effectCode = '';
    let started = false;

    for (let i = startLine; i < Math.min(startLine + 50, lines.length); i++) {
      const line = lines[i];
      effectCode += line + '\n';

      for (const char of line) {
        if (char === '{') {
          braceCount++;
          started = true;
        } else if (char === '}') {
          braceCount--;
          if (started && braceCount === 0) {
            return effectCode;
          }
        }
      }
    }
    return effectCode;
  }

  /**
   * Get all reports
   */
  getReports(): BugReport[] {
    return this.reports;
  }

  /**
   * Get reports by severity
   */
  getReportsBySeverity(severity: BugReport['severity']): BugReport[] {
    return this.reports.filter(r => r.severity === severity);
  }

  /**
   * Get summary statistics
   */
  getSummary() {
    return {
      total: this.reports.length,
      critical: this.getReportsBySeverity('critical').length,
      high: this.getReportsBySeverity('high').length,
      medium: this.getReportsBySeverity('medium').length,
      low: this.getReportsBySeverity('low').length,
      byCategory: this.groupByCategory()
    };
  }

  private groupByCategory(): Record<string, number> {
    const grouped: Record<string, number> = {};
    this.reports.forEach(report => {
      grouped[report.category] = (grouped[report.category] || 0) + 1;
    });
    return grouped;
  }
}
