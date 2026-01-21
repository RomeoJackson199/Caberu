/**
 * UI/UX Analysis Agent
 *
 * Analyzes user interface code for UX improvements, accessibility,
 * design consistency, and user experience best practices.
 */

import * as fs from 'fs';
import * as path from 'path';

interface UXRecommendation {
  file: string;
  line: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  issue: string;
  recommendation: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  codeSnippet?: string;
}

export class UXAnalyzer {
  private recommendations: UXRecommendation[] = [];

  /**
   * Analyze a file for UX improvements
   */
  async analyzeFile(filePath: string): Promise<UXRecommendation[]> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const fileRecommendations: UXRecommendation[] = [];

    lines.forEach((line, index) => {
      const lineNumber = index + 1;

      // Check for missing alt text on images
      if (this.hasMissingAltText(line)) {
        fileRecommendations.push({
          file: filePath,
          line: lineNumber,
          priority: 'high',
          category: 'Accessibility',
          issue: 'Image without alt text',
          recommendation: 'Add descriptive alt text for screen readers',
          impact: 'Users with screen readers cannot understand image content',
          effort: 'low',
          codeSnippet: line.trim()
        });
      }

      // Check for missing ARIA labels
      if (this.hasMissingAriaLabel(line)) {
        fileRecommendations.push({
          file: filePath,
          line: lineNumber,
          priority: 'high',
          category: 'Accessibility',
          issue: 'Interactive element without ARIA label',
          recommendation: 'Add aria-label or aria-labelledby attribute',
          impact: 'Screen reader users cannot identify button purpose',
          effort: 'low',
          codeSnippet: line.trim()
        });
      }

      // Check for poor color contrast
      if (this.hasPoorColorContrast(line)) {
        fileRecommendations.push({
          file: filePath,
          line: lineNumber,
          priority: 'medium',
          category: 'Accessibility',
          issue: 'Potential poor color contrast',
          recommendation: 'Ensure WCAG AA contrast ratio (4.5:1 for text)',
          impact: 'Users with visual impairments struggle to read text',
          effort: 'low',
          codeSnippet: line.trim()
        });
      }

      // Check for missing loading feedback
      if (this.hasMissingLoadingFeedback(content, lineNumber)) {
        fileRecommendations.push({
          file: filePath,
          line: lineNumber,
          priority: 'medium',
          category: 'User Feedback',
          issue: 'Async action without loading indicator',
          recommendation: 'Add spinner, skeleton, or progress indicator',
          impact: 'Users unsure if action is processing',
          effort: 'medium',
          codeSnippet: line.trim()
        });
      }

      // Check for missing error messages
      if (this.hasMissingErrorMessage(content, lineNumber)) {
        fileRecommendations.push({
          file: filePath,
          line: lineNumber,
          priority: 'high',
          category: 'User Feedback',
          issue: 'Error handling without user-facing message',
          recommendation: 'Display user-friendly error message',
          impact: 'Users confused when errors occur',
          effort: 'low',
          codeSnippet: line.trim()
        });
      }

      // Check for missing success feedback
      if (this.hasMissingSuccessMessage(line)) {
        fileRecommendations.push({
          file: filePath,
          line: lineNumber,
          priority: 'low',
          category: 'User Feedback',
          issue: 'Action without success confirmation',
          recommendation: 'Add success toast or message',
          impact: 'Users unsure if action completed successfully',
          effort: 'low',
          codeSnippet: line.trim()
        });
      }

      // Check for non-semantic HTML
      if (this.hasNonSemanticHTML(line)) {
        fileRecommendations.push({
          file: filePath,
          line: lineNumber,
          priority: 'medium',
          category: 'Accessibility',
          issue: 'Non-semantic HTML element',
          recommendation: 'Use semantic HTML (button, nav, main, etc.)',
          impact: 'Reduced accessibility and SEO',
          effort: 'low',
          codeSnippet: line.trim()
        });
      }

      // Check for missing form labels
      if (this.hasMissingFormLabel(line)) {
        fileRecommendations.push({
          file: filePath,
          line: lineNumber,
          priority: 'high',
          category: 'Accessibility',
          issue: 'Form input without associated label',
          recommendation: 'Add <Label> component with htmlFor attribute',
          impact: 'Screen readers cannot identify input purpose',
          effort: 'low',
          codeSnippet: line.trim()
        });
      }

      // Check for missing keyboard navigation
      if (this.hasMissingKeyboardNav(line)) {
        fileRecommendations.push({
          file: filePath,
          line: lineNumber,
          priority: 'high',
          category: 'Accessibility',
          issue: 'Interactive element not keyboard accessible',
          recommendation: 'Add onKeyDown handler for Enter/Space keys',
          impact: 'Keyboard users cannot interact with element',
          effort: 'medium',
          codeSnippet: line.trim()
        });
      }

      // Check for missing focus indicators
      if (this.hasMissingFocusIndicator(line)) {
        fileRecommendations.push({
          file: filePath,
          line: lineNumber,
          priority: 'medium',
          category: 'Accessibility',
          issue: 'Focus outline removed without alternative',
          recommendation: 'Provide custom focus indicator or use ring-* classes',
          impact: 'Keyboard users cannot see focused element',
          effort: 'low',
          codeSnippet: line.trim()
        });
      }

      // Check for improper heading hierarchy
      if (this.hasImproperHeadingHierarchy(content, lineNumber)) {
        fileRecommendations.push({
          file: filePath,
          line: lineNumber,
          priority: 'medium',
          category: 'Accessibility',
          issue: 'Heading hierarchy skipped',
          recommendation: 'Use proper heading order (h1 -> h2 -> h3)',
          impact: 'Screen reader navigation broken',
          effort: 'low',
          codeSnippet: line.trim()
        });
      }

      // Check for missing empty states
      if (this.hasMissingEmptyState(line)) {
        fileRecommendations.push({
          file: filePath,
          line: lineNumber,
          priority: 'medium',
          category: 'User Experience',
          issue: 'List rendering without empty state',
          recommendation: 'Add empty state with helpful message/action',
          impact: 'Confusing blank screen when no data',
          effort: 'low',
          codeSnippet: line.trim()
        });
      }

      // Check for missing responsive design
      if (this.hasMissingResponsiveDesign(line)) {
        fileRecommendations.push({
          file: filePath,
          line: lineNumber,
          priority: 'high',
          category: 'Responsive Design',
          issue: 'Fixed dimensions without responsive alternatives',
          recommendation: 'Use responsive Tailwind classes (sm:, md:, lg:)',
          impact: 'Poor mobile experience',
          effort: 'medium',
          codeSnippet: line.trim()
        });
      }

      // Check for missing touch targets
      if (this.hasSmallTouchTarget(line)) {
        fileRecommendations.push({
          file: filePath,
          line: lineNumber,
          priority: 'medium',
          category: 'Mobile UX',
          issue: 'Touch target too small (< 44px)',
          recommendation: 'Increase button/link size to 44px minimum',
          impact: 'Difficult to tap on mobile devices',
          effort: 'low',
          codeSnippet: line.trim()
        });
      }

      // Check for missing hover states
      if (this.hasMissingHoverState(line)) {
        fileRecommendations.push({
          file: filePath,
          line: lineNumber,
          priority: 'low',
          category: 'Visual Feedback',
          issue: 'Interactive element without hover state',
          recommendation: 'Add hover: variant for visual feedback',
          impact: 'Unclear if element is interactive',
          effort: 'low',
          codeSnippet: line.trim()
        });
      }

      // Check for missing disabled states
      if (this.hasMissingDisabledState(line)) {
        fileRecommendations.push({
          file: filePath,
          line: lineNumber,
          priority: 'medium',
          category: 'User Feedback',
          issue: 'Form without proper disabled state',
          recommendation: 'Disable button during submission',
          impact: 'Users can submit multiple times',
          effort: 'low',
          codeSnippet: line.trim()
        });
      }

      // Check for inconsistent spacing
      if (this.hasInconsistentSpacing(line)) {
        fileRecommendations.push({
          file: filePath,
          line: lineNumber,
          priority: 'low',
          category: 'Design Consistency',
          issue: 'Arbitrary spacing values used',
          recommendation: 'Use Tailwind spacing scale (p-4, m-2, etc.)',
          impact: 'Inconsistent visual design',
          effort: 'low',
          codeSnippet: line.trim()
        });
      }

      // Check for long text without truncation
      if (this.hasUntruncatedLongText(line)) {
        fileRecommendations.push({
          file: filePath,
          line: lineNumber,
          priority: 'low',
          category: 'Visual Layout',
          issue: 'Long text without truncation/overflow handling',
          recommendation: 'Add truncate, line-clamp, or overflow handling',
          impact: 'Text overflow breaks layout',
          effort: 'low',
          codeSnippet: line.trim()
        });
      }

      // Check for missing confirmation dialogs
      if (this.hasMissingConfirmation(line)) {
        fileRecommendations.push({
          file: filePath,
          line: lineNumber,
          priority: 'high',
          category: 'User Safety',
          issue: 'Destructive action without confirmation',
          recommendation: 'Add confirmation dialog for delete actions',
          impact: 'Users may accidentally delete data',
          effort: 'medium',
          codeSnippet: line.trim()
        });
      }

      // Check for missing skeleton/placeholders
      if (this.hasMissingSkeleton(content, lineNumber)) {
        fileRecommendations.push({
          file: filePath,
          line: lineNumber,
          priority: 'low',
          category: 'Performance Perception',
          issue: 'Data loading without skeleton screen',
          recommendation: 'Add skeleton placeholders for better perceived performance',
          impact: 'App feels slower than it is',
          effort: 'medium',
          codeSnippet: line.trim()
        });
      }

      // Check for missing animations
      if (this.hasMissingAnimation(line)) {
        fileRecommendations.push({
          file: filePath,
          line: lineNumber,
          priority: 'low',
          category: 'User Experience',
          issue: 'Abrupt state change without transition',
          recommendation: 'Add transition or animation for smoother UX',
          impact: 'Jarring user experience',
          effort: 'low',
          codeSnippet: line.trim()
        });
      }

      // Check for missing error prevention
      if (this.hasMissingErrorPrevention(line)) {
        fileRecommendations.push({
          file: filePath,
          line: lineNumber,
          priority: 'medium',
          category: 'Error Prevention',
          issue: 'Form without validation feedback',
          recommendation: 'Add real-time validation and error messages',
          impact: 'Users submit invalid forms repeatedly',
          effort: 'medium',
          codeSnippet: line.trim()
        });
      }
    });

    this.recommendations.push(...fileRecommendations);
    return fileRecommendations;
  }

  private hasMissingAltText(line: string): boolean {
    return /<img\s/i.test(line) && !line.includes('alt=');
  }

  private hasMissingAriaLabel(line: string): boolean {
    const hasButton = /<button/i.test(line) || /<Button/i.test(line);
    const hasIconOnly = /Icon|icon/.test(line);
    const hasLabel = /aria-label|aria-labelledby/.test(line) || />\s*\w+/.test(line);
    return hasButton && hasIconOnly && !hasLabel;
  }

  private hasPoorColorContrast(line: string): boolean {
    return /text-gray-[345]/.test(line) && /bg-gray-[234]/.test(line);
  }

  private hasMissingLoadingFeedback(content: string, lineNumber: number): boolean {
    const lines = content.split('\n');
    const line = lines[lineNumber - 1];

    if (line.includes('useMutation') || line.includes('useQuery')) {
      const surroundingLines = lines.slice(lineNumber - 1, lineNumber + 30).join('\n');
      return !/isLoading|isPending|Skeleton|Spinner|Loading/.test(surroundingLines);
    }
    return false;
  }

  private hasMissingErrorMessage(content: string, lineNumber: number): boolean {
    const lines = content.split('\n');
    const line = lines[lineNumber - 1];

    if (line.includes('.catch(') || line.includes('try {')) {
      const surroundingLines = lines.slice(lineNumber - 1, lineNumber + 15).join('\n');
      return !/toast|alert|notification|error/.test(surroundingLines);
    }
    return false;
  }

  private hasMissingSuccessMessage(line: string): boolean {
    return /onSubmit|handleSubmit|mutate\(/.test(line);
  }

  private hasNonSemanticHTML(line: string): boolean {
    const hasDiv = /<div\s+onClick/i.test(line);
    const hasSpan = /<span\s+onClick/i.test(line);
    return hasDiv || hasSpan;
  }

  private hasMissingFormLabel(line: string): boolean {
    return /<Input|<input/i.test(line) && !/Label|label/.test(line);
  }

  private hasMissingKeyboardNav(line: string): boolean {
    return /<div\s+onClick/.test(line) && !/onKeyDown|onKeyPress/.test(line);
  }

  private hasMissingFocusIndicator(line: string): boolean {
    return /outline-none/.test(line) && !/ring-|focus:/.test(line);
  }

  private hasImproperHeadingHierarchy(content: string, lineNumber: number): boolean {
    const lines = content.split('\n');
    const line = lines[lineNumber - 1];

    if (/<h[3-6]/i.test(line)) {
      const previousLines = lines.slice(0, lineNumber - 1).join('\n');
      const currentLevel = parseInt(line.match(/<h([3-6])/i)?.[1] || '0');
      const hasParentHeading = new RegExp(`<h[${currentLevel - 1}]`).test(previousLines);
      return !hasParentHeading && currentLevel > 2;
    }
    return false;
  }

  private hasMissingEmptyState(line: string): boolean {
    return /\.map\(/.test(line) && !/\.length\s*===\s*0|\.length\s*>\s*0/.test(line);
  }

  private hasMissingResponsiveDesign(line: string): boolean {
    return /w-\d+|h-\d+|text-\d+xl/.test(line) && !/sm:|md:|lg:|xl:/.test(line);
  }

  private hasSmallTouchTarget(line: string): boolean {
    return /<Button|<button/i.test(line) && /size="sm"|size="xs"|p-1\b|p-0\b/.test(line);
  }

  private hasMissingHoverState(line: string): boolean {
    return /onClick|href/.test(line) && !/hover:/.test(line);
  }

  private hasMissingDisabledState(line: string): boolean {
    return /<Button.*type="submit"/i.test(line) && !/disabled/.test(line);
  }

  private hasInconsistentSpacing(line: string): boolean {
    return /className.*["'].*\d+px/.test(line) || /style=.*margin|padding.*\d+px/.test(line);
  }

  private hasUntruncatedLongText(line: string): boolean {
    const hasText = /\{.*\.\w+\}/.test(line);
    const isInCard = /Card|List|Table/.test(line);
    return hasText && isInCard && !/truncate|line-clamp|overflow-/.test(line);
  }

  private hasMissingConfirmation(line: string): boolean {
    return /delete|remove|destroy/i.test(line) && /onClick/.test(line) && !/confirm|dialog|alert/.test(line);
  }

  private hasMissingSkeleton(content: string, lineNumber: number): boolean {
    const lines = content.split('\n');
    const line = lines[lineNumber - 1];

    if (line.includes('useQuery')) {
      const surroundingLines = lines.slice(lineNumber, lineNumber + 30).join('\n');
      return !/Skeleton|skeleton/.test(surroundingLines) && /isLoading/.test(surroundingLines);
    }
    return false;
  }

  private hasMissingAnimation(line: string): boolean {
    return /className=.*\b(show|hide|open|close)\b/.test(line) && !/transition|animate|duration/.test(line);
  }

  private hasMissingErrorPrevention(line: string): boolean {
    return /<Form|<form/i.test(line) && !/validate|schema/.test(line);
  }

  /**
   * Get all recommendations
   */
  getRecommendations(): UXRecommendation[] {
    return this.recommendations;
  }

  /**
   * Get recommendations by priority
   */
  getRecommendationsByPriority(priority: UXRecommendation['priority']): UXRecommendation[] {
    return this.recommendations.filter(r => r.priority === priority);
  }

  /**
   * Get quick wins (high impact, low effort)
   */
  getQuickWins(): UXRecommendation[] {
    return this.recommendations.filter(
      r => (r.priority === 'high' || r.priority === 'critical') && r.effort === 'low'
    );
  }

  /**
   * Get summary statistics
   */
  getSummary() {
    return {
      total: this.recommendations.length,
      critical: this.getRecommendationsByPriority('critical').length,
      high: this.getRecommendationsByPriority('high').length,
      medium: this.getRecommendationsByPriority('medium').length,
      low: this.getRecommendationsByPriority('low').length,
      quickWins: this.getQuickWins().length,
      byCategory: this.groupByCategory(),
      byEffort: this.groupByEffort()
    };
  }

  private groupByCategory(): Record<string, number> {
    const grouped: Record<string, number> = {};
    this.recommendations.forEach(rec => {
      grouped[rec.category] = (grouped[rec.category] || 0) + 1;
    });
    return grouped;
  }

  private groupByEffort(): Record<string, number> {
    const grouped: Record<string, number> = { low: 0, medium: 0, high: 0 };
    this.recommendations.forEach(rec => {
      grouped[rec.effort]++;
    });
    return grouped;
  }
}
