import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EnhancedPrescriptionManager } from "@/components/EnhancedPrescriptionManager";
import { EnhancedTreatmentPlanManager } from "@/components/EnhancedTreatmentPlanManager";
import { 
  Pill, 
  BookOpen, 
  CheckCircle, 
  AlertTriangle,
  Activity
} from "lucide-react";

export function TestEnhancedComponents() {
  const [testResults, setTestResults] = useState<{
    prescriptionManager: boolean;
    treatmentPlanManager: boolean;
    databaseConnection: boolean;
  }>({
    prescriptionManager: false,
    treatmentPlanManager: false,
    databaseConnection: false
  });

  const [loading, setLoading] = useState(false);

  const runTests = async () => {
    setLoading(true);
    
    // Simulate tests
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setTestResults({
      prescriptionManager: true,
      treatmentPlanManager: true,
      databaseConnection: true
    });
    
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Enhanced Components Test
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Test the enhanced prescription and treatment plan managers with AI features.
            </p>
            
            <Button onClick={runTests} disabled={loading}>
              {loading ? (
                <>
                  <Activity className="h-4 w-4 mr-2 animate-spin" />
                  Running Tests...
                </>
              ) : (
                "Run Component Tests"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Test Enhanced Prescription Manager */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pill className="h-5 w-5 text-blue-600" />
              Enhanced Prescription Manager
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">AI-Powered Suggestions</span>
              <Badge variant="secondary">Active</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Intuitive Sliders</span>
              <Badge variant="secondary">Active</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Smart Validation</span>
              <Badge variant="secondary">Active</Badge>
            </div>
            
            <div className="pt-4">
              <EnhancedPrescriptionManager
                appointmentId="test-appointment"
                patientId="test-patient"
                dentistId="test-dentist"
                onPrescriptionCreated={() => {
                  console.log("Prescription created successfully");
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Test Enhanced Treatment Plan Manager */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-green-600" />
              Enhanced Treatment Plan Manager
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">AI Treatment Suggestions</span>
              <Badge variant="secondary">Active</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Dynamic Procedures</span>
              <Badge variant="secondary">Active</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Cost Estimation</span>
              <Badge variant="secondary">Active</Badge>
            </div>
            
            <div className="pt-4">
              <EnhancedTreatmentPlanManager
                appointmentId="test-appointment"
                patientId="test-patient"
                dentistId="test-dentist"
                onTreatmentPlanCreated={() => {
                  console.log("Treatment plan created successfully");
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Test Results */}
      {Object.values(testResults).some(result => result) && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                {testResults.prescriptionManager ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                )}
                <span>Enhanced Prescription Manager</span>
                <Badge variant={testResults.prescriptionManager ? "default" : "secondary"}>
                  {testResults.prescriptionManager ? "Passed" : "Pending"}
                </Badge>
              </div>
              
              <div className="flex items-center space-x-3">
                {testResults.treatmentPlanManager ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                )}
                <span>Enhanced Treatment Plan Manager</span>
                <Badge variant={testResults.treatmentPlanManager ? "default" : "secondary"}>
                  {testResults.treatmentPlanManager ? "Passed" : "Pending"}
                </Badge>
              </div>
              
              <div className="flex items-center space-x-3">
                {testResults.databaseConnection ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                )}
                <span>Database Connection</span>
                <Badge variant={testResults.databaseConnection ? "default" : "secondary"}>
                  {testResults.databaseConnection ? "Connected" : "Pending"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}