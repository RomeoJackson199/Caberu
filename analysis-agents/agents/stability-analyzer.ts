/**
 * Stability Analysis Agent
 *
 * Analyzes code for stability issues including error handling,
 * edge cases, race conditions, and resilience patterns.
 */

import * as fs from 'fs';
import * as path from 'path';

interface StabilityIssue {
  file: string;
  line: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  issue: string;
  recommendation: string;
  impact: string;
  codeSnippet?: string;
}

export class StabilityAnalyzer {
  private issues: StabilityIssue[] = [];

  /**
   * Analyze a file for stability issues
   */
  async analyzeFile(filePath: string): Promise<StabilityIssue[]> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const fileIssues: StabilityIssue[] = [];

    lines.forEach((line, index) => {
      const lineNumber = index + 1;

      // Check for missing error handling in async operations
      if (this.hasMissingAsyncErrorHandling(content, lineNumber)) {
        fileIssues.push({
          file: filePath,
          line: lineNumber,
          severity: 'high',
          category: 'Error Handling',
          issue: 'Async operation without proper error handling',
          recommendation: 'Add try-catch blocks or .catch() handlers',
          impact: 'Unhandled errors can crash the application',
          codeSnippet: line.trim()
        });
      }

      // Check for race conditions in state updates
      if (this.hasRaceCondition(content, lineNumber)) {
        fileIssues.push({
          file: filePath,
          line: lineNumber,
          severity: 'high',
          category: 'Race Condition',
          issue: 'Potential race condition in state updates',
          recommendation: 'Use functional state updates or add proper synchronization',
          impact: 'Inconsistent state and unpredictable behavior',
          codeSnippet: line.trim()
        });
      }

      // Check for missing loading states
      if (this.hasMissingLoadingState(content, lineNumber)) {
        fileIssues.push({
          file: filePath,
          line: lineNumber,
          severity: 'medium',
          category: 'User Experience',
          issue: 'Async operation without loading state',
          recommendation: 'Add loading indicator for better UX',
          impact: 'Poor user experience during data fetching',
          codeSnippet: line.trim()
        });
      }

      // Check for missing empty state handling
      if (this.hasMissingEmptyState(line)) {
        fileIssues.push({
          file: filePath,
          line: lineNumber,
          severity: 'medium',
          category: 'Edge Cases',
          issue: 'Array operation without empty state check',
          recommendation: 'Add check for empty arrays',
          impact: 'Broken UI when no data is available',
          codeSnippet: line.trim()
        });
      }

      // Check for uncontrolled component inputs
      if (this.hasUncontrolledInput(line)) {
        fileIssues.push({
          file: filePath,
          line: lineNumber,
          severity: 'medium',
          category: 'Form Stability',
          issue: 'Uncontrolled input component',
          recommendation: 'Add value and onChange props',
          impact: 'Inconsistent form state',
          codeSnippet: line.trim()
        });
      }

      // Check for missing dependency arrays in useEffect
      if (this.hasMissingDependencies(content, lineNumber)) {
        fileIssues.push({
          file: filePath,
          line: lineNumber,
          severity: 'high',
          category: 'React Hooks',
          issue: 'useEffect with missing dependencies',
          recommendation: 'Add all dependencies to dependency array',
          impact: 'Stale closures and incorrect behavior',
          codeSnippet: line.trim()
        });
      }

      // Check for improper cleanup in effects
      if (this.hasMissingCleanup(content, lineNumber)) {
        fileIssues.push({
          file: filePath,
          line: lineNumber,
          severity: 'high',
          category: 'Memory Management',
          issue: 'Side effect without cleanup function',
          recommendation: 'Add cleanup function to prevent memory leaks',
          impact: 'Memory leaks and performance degradation',
          codeSnippet: line.trim()
        });
      }

      // Check for concurrent state updates
      if (this.hasConcurrentStateUpdates(content, lineNumber)) {
        fileIssues.push({
          file: filePath,
          line: lineNumber,
          severity: 'medium',
          category: 'State Management',
          issue: 'Multiple state updates in quick succession',
          recommendation: 'Batch state updates or use reducer',
          impact: 'Multiple re-renders and performance issues',
          codeSnippet: line.trim()
        });
      }

      // Check for missing error boundaries
      if (this.shouldHaveErrorBoundary(line)) {
        fileIssues.push({
          file: filePath,
          line: lineNumber,
          severity: 'high',
          category: 'Error Recovery',
          issue: 'Page component without error boundary',
          recommendation: 'Wrap component in ErrorBoundary',
          impact: 'Entire app crashes on component error',
          codeSnippet: line.trim()
        });
      }

      // Check for unsafe type assertions
      if (this.hasUnsafeTypeAssertion(line)) {
        fileIssues.push({
          file: filePath,
          line: lineNumber,
          severity: 'medium',
          category: 'Type Safety',
          issue: 'Unsafe type assertion (as any)',
          recommendation: 'Use proper type guards or validation',
          impact: 'Runtime type errors',
          codeSnippet: line.trim()
        });
      }

      // Check for missing timeout in API calls
      if (this.hasMissingTimeout(line)) {
        fileIssues.push({
          file: filePath,
          line: lineNumber,
          severity: 'medium',
          category: 'Network Resilience',
          issue: 'API call without timeout',
          recommendation: 'Add timeout to prevent hanging requests',
          impact: 'Application hangs on slow/failed requests',
          codeSnippet: line.trim()
        });
      }

      // Check for missing retry logic
      if (this.shouldHaveRetryLogic(line)) {
        fileIssues.push({
          file: filePath,
          line: lineNumber,
          severity: 'low',
          category: 'Resilience',
          issue: 'Critical operation without retry logic',
          recommendation: 'Add retry mechanism for transient failures',
          impact: 'Poor reliability on network issues',
          codeSnippet: line.trim()
        });
      }

      // Check for improper date handling
      if (this.hasImproperDateHandling(line)) {
        fileIssues.push({
          file: filePath,
          line: lineNumber,
          severity: 'medium',
          category: 'Data Integrity',
          issue: 'Improper date handling without timezone',
          recommendation: 'Use date-fns-tz or proper timezone handling',
          impact: 'Date-related bugs across timezones',
          codeSnippet: line.trim()
        });
      }

      // Check for missing validation
      if (this.hasMissingValidation(line)) {
        fileIssues.push({
          file: filePath,
          line: lineNumber,
          severity: 'high',
          category: 'Data Validation',
          issue: 'User input without validation',
          recommendation: 'Add Zod schema validation',
          impact: 'Invalid data can cause errors',
          codeSnippet: line.trim()
        });
      }

      // Check for non-deterministic behavior
      if (this.hasNonDeterministicBehavior(line)) {
        fileIssues.push({
          file: filePath,
          line: lineNumber,
          severity: 'medium',
          category: 'Consistency',
          issue: 'Non-deterministic behavior detected',
          recommendation: 'Use stable keys or controlled randomness',
          impact: 'Inconsistent behavior across runs',
          codeSnippet: line.trim()
        });
      }

      // Check for missing offline handling
      if (this.shouldHandleOffline(line)) {
        fileIssues.push({
          file: filePath,
          line: lineNumber,
          severity: 'low',
          category: 'Offline Support',
          issue: 'Operation without offline fallback',
          recommendation: 'Add offline detection and fallback',
          impact: 'Poor experience when offline',
          codeSnippet: line.trim()
        });
      }
    });

    this.issues.push(...fileIssues);
    return fileIssues;
  }

  private hasMissingAsyncErrorHandling(content: string, lineNumber: number): boolean {
    const lines = content.split('\n');
    const line = lines[lineNumber - 1];

    if (line.includes('async') || line.includes('await')) {
      const block = this.extractBlock(lines, lineNumber - 1);
      return !/try\s*{/.test(block) && !block.includes('.catch(');
    }
    return false;
  }

  private hasRaceCondition(content: string, lineNumber: number): boolean {
    const lines = content.split('\n');
    const line = lines[lineNumber - 1];

    // Check for multiple setState calls without functional updates
    if (/set[A-Z]\w+\(/.test(line)) {
      const surroundingLines = lines.slice(Math.max(0, lineNumber - 5), lineNumber + 5).join('\n');
      const setStateCalls = (surroundingLines.match(/set[A-Z]\w+\(/g) || []).length;
      return setStateCalls > 2 && !/set\w+\(\s*prev\s*=>/.test(surroundingLines);
    }
    return false;
  }

  private hasMissingLoadingState(content: string, lineNumber: number): boolean {
    const lines = content.split('\n');
    const line = lines[lineNumber - 1];

    if (line.includes('useQuery') || line.includes('useMutation')) {
      const surroundingLines = lines.slice(lineNumber - 1, lineNumber + 20).join('\n');
      return !/isLoading|isPending/.test(surroundingLines);
    }
    return false;
  }

  private hasMissingEmptyState(line: string): boolean {
    return /\.map\(/.test(line) && !/\.length\s*>/.test(line) && !/\?\./.test(line);
  }

  private hasUncontrolledInput(line: string): boolean {
    return /<input/i.test(line) && !line.includes('value=') && !line.includes('defaultValue=');
  }

  private hasMissingDependencies(content: string, lineNumber: number): boolean {
    const lines = content.split('\n');
    const line = lines[lineNumber - 1];

    if (line.includes('useEffect') || line.includes('useCallback') || line.includes('useMemo')) {
      const block = this.extractBlock(lines, lineNumber - 1);
      const hasDependencies = /\]\s*\)\s*$/.test(block) || /\],\s*\)\s*$/.test(block);
      return !hasDependencies;
    }
    return false;
  }

  private hasMissingCleanup(content: string, lineNumber: number): boolean {
    const lines = content.split('\n');
    const line = lines[lineNumber - 1];

    if (line.includes('useEffect')) {
      const block = this.extractBlock(lines, lineNumber - 1);
      const needsCleanup = /addEventListener|subscribe|setInterval|setTimeout|WebSocket/.test(block);
      const hasCleanup = /return\s*\(\s*\)\s*=>|return\s*function|return\s*\(\)/.test(block);
      return needsCleanup && !hasCleanup;
    }
    return false;
  }

  private hasConcurrentStateUpdates(content: string, lineNumber: number): boolean {
    const lines = content.split('\n');
    const line = lines[lineNumber - 1];

    const surroundingLines = lines.slice(Math.max(0, lineNumber - 3), lineNumber + 3).join('\n');
    const setStateCount = (surroundingLines.match(/set[A-Z]\w+\(/g) || []).length;
    return setStateCount >= 3;
  }

  private shouldHaveErrorBoundary(line: string): boolean {
    return /export\s+(default\s+)?function\s+\w+(Page|Route)/.test(line);
  }

  private hasUnsafeTypeAssertion(line: string): boolean {
    return /as\s+any\b/.test(line) || /as\s+unknown\s+as/.test(line);
  }

  private hasMissingTimeout(line: string): boolean {
    return /fetch\(|axios\.|supabase\./.test(line) && !/timeout|signal/.test(line);
  }

  private shouldHaveRetryLogic(line: string): boolean {
    return /\.from\(|\.insert\(|\.update\(|\.delete\(/.test(line) && /supabase/.test(line);
  }

  private hasImproperDateHandling(line: string): boolean {
    return /new Date\(|Date\.parse|\.toISOString/.test(line) && !/timezone|utc|format/.test(line);
  }

  private hasMissingValidation(line: string): boolean {
    return /onSubmit|handleSubmit/.test(line) && !/\.parse\(|\.safeParse\(|validate/.test(line);
  }

  private hasNonDeterministicBehavior(line: string): boolean {
    return /Math\.random\(\)|Date\.now\(\)/.test(line) && /key=/.test(line);
  }

  private shouldHandleOffline(line: string): boolean {
    return /fetch\(|supabase\./.test(line) && !/navigator\.onLine|useOffline/.test(line);
  }

  private extractBlock(lines: string[], startLine: number): string {
    let braceCount = 0;
    let blockCode = '';
    let started = false;

    for (let i = startLine; i < Math.min(startLine + 100, lines.length); i++) {
      const line = lines[i];
      blockCode += line + '\n';

      for (const char of line) {
        if (char === '{') {
          braceCount++;
          started = true;
        } else if (char === '}') {
          braceCount--;
          if (started && braceCount === 0) {
            return blockCode;
          }
        }
      }
    }
    return blockCode;
  }

  /**
   * Get all issues
   */
  getIssues(): StabilityIssue[] {
    return this.issues;
  }

  /**
   * Get issues by severity
   */
  getIssuesBySeverity(severity: StabilityIssue['severity']): StabilityIssue[] {
    return this.issues.filter(i => i.severity === severity);
  }

  /**
   * Get summary statistics
   */
  getSummary() {
    return {
      total: this.issues.length,
      critical: this.getIssuesBySeverity('critical').length,
      high: this.getIssuesBySeverity('high').length,
      medium: this.getIssuesBySeverity('medium').length,
      low: this.getIssuesBySeverity('low').length,
      byCategory: this.groupByCategory(),
      topIssues: this.getTopIssues(5)
    };
  }

  private groupByCategory(): Record<string, number> {
    const grouped: Record<string, number> = {};
    this.issues.forEach(issue => {
      grouped[issue.category] = (grouped[issue.category] || 0) + 1;
    });
    return grouped;
  }

  private getTopIssues(count: number): StabilityIssue[] {
    return this.issues
      .sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      })
      .slice(0, count);
  }
}
