import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  TestTube,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  FileCode,
  FolderOpen,
  AlertTriangle,
  Terminal,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TestSuite {
  name: string;
  path: string;
  tests: number;
  status: 'idle' | 'running' | 'passed' | 'failed';
  duration?: number;
  failedTests?: string[];
}

interface TestResults {
  totalSuites: number;
  passedSuites: number;
  failedSuites: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  duration: number;
  timestamp: string;
  suites: TestSuite[];
}

// Static test coverage data (updated from actual test run)
const TEST_COVERAGE_DATA = {
  lib: {
    name: 'Library Functions',
    path: 'src/lib/__tests__/',
    suites: 11,
    tests: 562,
    coverage: 80,
    files: [
      'appointmentStateMachine.test.ts',
      'appointmentUtils.test.ts',
      'belgianHolidays.test.ts',
      'dataValidation.test.ts',
      'errorHandling.test.ts',
      'formValidationHelpers.test.ts',
      'languages.test.ts',
      'patient-utils.test.ts',
      'security.test.ts',
      'timezone.test.ts',
      'validationSchemas.test.ts',
    ],
  },
  hooks: {
    name: 'React Hooks',
    path: 'src/hooks/__tests__/',
    suites: 17,
    tests: 200,
    coverage: 50,
    files: [
      'useAuth.test.tsx',
      'useBusinessContext.test.tsx',
      'useCurrentDentist.test.ts',
      'useEmailLimit.test.tsx',
      'useFormValidation.test.ts',
      'useMobileGestures.test.ts',
      'useOfflineStatus.test.ts',
      'useOptimisticAppointmentStatus.test.ts',
      'usePaginatedAppointments.test.ts',
      'usePatientProfile.test.ts',
      'usePatientTags.test.ts',
      'useRetry.test.tsx',
      'useScrollRestoration.test.ts',
      'useUndoManager.test.ts',
      'useUnsavedChanges.test.ts',
      'useVoiceRecording.test.ts',
      'use-toast.test.ts',
    ],
  },
  pages: {
    name: 'Page Components',
    path: 'src/pages/__tests__/',
    suites: 9,
    tests: 150,
    coverage: 15,
    files: [
      'Index.test.tsx',
      'Login.test.tsx',
      'Signup.test.tsx',
      'ForgotPassword.test.tsx',
      'NotFound.test.tsx',
      'PatientAppointmentsPage.test.tsx',
      'PaymentCancelled.test.tsx',
      'PaymentSuccess.test.tsx',
    ],
  },
  components: {
    name: 'UI Components',
    path: 'src/components/__tests__/',
    suites: 12,
    tests: 180,
    coverage: 3,
    files: [
      'AuditLogsTab.test.tsx',
      'BusinessesTab.test.tsx',
      'CreateBusinessDialog.test.tsx',
      'DentalChatbot.test.tsx',
      'DiagnosticsCard.test.tsx',
      'EmailTestTab.test.tsx',
      'ErrorsTab.test.tsx',
      'OverviewTab.test.tsx',
      'QuickActionsCard.test.tsx',
      'SuperAdminDashboard.test.tsx',
      'UnifiedDashboard.test.tsx',
      'UsersTab.test.tsx',
    ],
  },
};

export function TestStatusTab() {
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<TestResults | null>(null);
  const [lastRunTime, setLastRunTime] = useState<Date | null>(null);

  const totalSuites = Object.values(TEST_COVERAGE_DATA).reduce((sum, cat) => sum + cat.suites, 0);
  const totalTests = Object.values(TEST_COVERAGE_DATA).reduce((sum, cat) => sum + cat.tests, 0);
  const avgCoverage = Math.round(
    Object.values(TEST_COVERAGE_DATA).reduce((sum, cat) => sum + cat.coverage, 0) /
    Object.keys(TEST_COVERAGE_DATA).length
  );

  const runTests = async (pattern?: string) => {
    setIsRunning(true);

    try {
      // Call edge function to run tests
      const { data, error } = await supabase.functions.invoke('run-tests', {
        body: { pattern },
      });

      if (error) throw error;

      if (data?.results) {
        setTestResults(data.results);
        setLastRunTime(new Date());

        toast({
          title: data.results.failedTests > 0 ? 'Tests Completed with Failures' : 'All Tests Passed',
          description: `${data.results.passedTests}/${data.results.totalTests} tests passed`,
          variant: data.results.failedTests > 0 ? 'destructive' : 'default',
        });
      }
    } catch (error) {
      console.error('Test run error:', error);
      toast({
        title: 'Test Run Failed',
        description: 'Tests must be run from the command line. See instructions below.',
        variant: 'destructive',
      });
    } finally {
      setIsRunning(false);
    }
  };

  const copyCommand = (command: string) => {
    navigator.clipboard.writeText(command);
    toast({
      title: 'Copied',
      description: 'Command copied to clipboard',
    });
  };

  const getCoverageColor = (coverage: number) => {
    if (coverage >= 70) return 'text-green-600';
    if (coverage >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getCoverageBadge = (coverage: number) => {
    if (coverage >= 70) return 'default';
    if (coverage >= 40) return 'secondary';
    return 'destructive';
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileCode className="h-4 w-4" />
              Test Suites
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSuites}</div>
            <p className="text-xs text-muted-foreground">Across all categories</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TestTube className="h-4 w-4" />
              Total Tests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTests}</div>
            <p className="text-xs text-muted-foreground">Individual test cases</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Average Coverage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getCoverageColor(avgCoverage)}`}>
              {avgCoverage}%
            </div>
            <Progress value={avgCoverage} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Last Run
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {lastRunTime ? lastRunTime.toLocaleTimeString() : 'Never'}
            </div>
            <p className="text-xs text-muted-foreground">
              {lastRunTime ? lastRunTime.toLocaleDateString() : 'Run tests to see results'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="coverage" className="space-y-4">
        <TabsList>
          <TabsTrigger value="coverage">Coverage by Category</TabsTrigger>
          <TabsTrigger value="commands">Run Commands</TabsTrigger>
          <TabsTrigger value="results">Test Results</TabsTrigger>
        </TabsList>

        {/* Coverage Tab */}
        <TabsContent value="coverage" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(TEST_COVERAGE_DATA).map(([key, category]) => (
              <Card key={key} className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => setSelectedCategory(selectedCategory === key ? null : key)}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FolderOpen className="h-5 w-5" />
                      {category.name}
                    </CardTitle>
                    <Badge variant={getCoverageBadge(category.coverage)}>
                      {category.coverage}% coverage
                    </Badge>
                  </div>
                  <CardDescription>{category.path}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>{category.suites} test suites</span>
                      <span>{category.tests} tests</span>
                    </div>
                    <Progress value={category.coverage} />

                    {selectedCategory === key && (
                      <ScrollArea className="h-48 mt-4 rounded border p-2">
                        <div className="space-y-1">
                          {category.files.map((file) => (
                            <div key={file} className="text-sm flex items-center gap-2 py-1">
                              <FileCode className="h-3 w-3 text-muted-foreground" />
                              {file}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Commands Tab */}
        <TabsContent value="commands" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Terminal className="h-5 w-5" />
                Test Commands
              </CardTitle>
              <CardDescription>
                Run these commands in your terminal to execute tests
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: 'Run All Tests', command: 'npm test' },
                { label: 'Run Tests in Watch Mode', command: 'npm run test:watch' },
                { label: 'Run Tests with Coverage', command: 'npm run test:coverage' },
                { label: 'Run Library Tests Only', command: 'npm test -- --testPathPattern="src/lib/__tests__"' },
                { label: 'Run Hook Tests Only', command: 'npm test -- --testPathPattern="src/hooks/__tests__"' },
                { label: 'Run Page Tests Only', command: 'npm test -- --testPathPattern="src/pages/__tests__"' },
                { label: 'Run Component Tests Only', command: 'npm test -- --testPathPattern="src/components/__tests__"' },
                { label: 'Run Specific Test File', command: 'npm test -- --testPathPattern="security"' },
              ].map(({ label, command }) => (
                <div key={label} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{label}</p>
                    <code className="text-xs text-muted-foreground">{command}</code>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyCommand(command)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Important Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                <strong>Jest runs in Node.js:</strong> Tests cannot be executed directly from the browser.
                Use the terminal commands above.
              </p>
              <p>
                <strong>Coverage Threshold:</strong> The project requires 70% coverage for branches,
                functions, lines, and statements.
              </p>
              <p>
                <strong>Test Location:</strong> Tests are in <code>__tests__</code> folders next to
                the source files they test.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <TestTube className="h-5 w-5" />
                    Test Results
                  </CardTitle>
                  <CardDescription>
                    {testResults
                      ? `Last run: ${new Date(testResults.timestamp).toLocaleString()}`
                      : 'No test results available. Run tests from terminal.'}
                  </CardDescription>
                </div>
                <Button
                  onClick={() => runTests()}
                  disabled={isRunning}
                  className="gap-2"
                >
                  {isRunning ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Run Tests
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {testResults ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {testResults.passedTests}
                      </div>
                      <div className="text-sm text-muted-foreground">Passed</div>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-red-600">
                        {testResults.failedTests}
                      </div>
                      <div className="text-sm text-muted-foreground">Failed</div>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">
                        {testResults.duration}ms
                      </div>
                      <div className="text-sm text-muted-foreground">Duration</div>
                    </div>
                  </div>

                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {testResults.suites.map((suite) => (
                        <div
                          key={suite.path}
                          className="flex items-center justify-between p-2 rounded border"
                        >
                          <div className="flex items-center gap-2">
                            {suite.status === 'passed' ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-600" />
                            )}
                            <span className="text-sm">{suite.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={suite.status === 'passed' ? 'default' : 'destructive'}>
                              {suite.tests} tests
                            </Badge>
                            {suite.duration && (
                              <span className="text-xs text-muted-foreground">
                                {suite.duration}ms
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <TestTube className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No test results available</p>
                  <p className="text-sm mt-2">
                    Run <code className="bg-muted px-1 rounded">npm test</code> in your terminal
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
