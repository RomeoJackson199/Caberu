import { useState } from "react";
import { DentistAppShell, DentistSection } from "@/components/layout/DentistAppShell";
import { DentistDemoTour } from "@/components/DentistDemoTour";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

// Import ENHANCED demo components with fake data
import { DemoClinicalTodayEnhanced } from "@/components/demo/DemoClinicalTodayEnhanced";
import { DemoPatientManagement } from "@/components/demo/DemoPatientManagement";
import { DemoAppointments } from "@/components/demo/DemoAppointments";
import { DemoStaff } from "@/components/demo/DemoStaff";
import { DemoMessages } from "@/components/demo/DemoMessages";

export default function DemoDentistDashboard() {
  const [activeSection, setActiveSection] = useState<DentistSection>('dashboard');
  const [showDemoTour, setShowDemoTour] = useState(true);
  const navigate = useNavigate();

  // Get demo data from sessionStorage
  const demoBusinessName = sessionStorage.getItem('demo_business_name') || 'Demo Clinic';

  const handleTourComplete = () => {
    setShowDemoTour(false);
    // Show signup prompt after tour
    setTimeout(() => {
      if (confirm('Ready to create your own practice? Sign up now for just €1!')) {
        navigate('/signup');
      }
    }, 500);
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <DemoClinicalTodayEnhanced />;
      case 'patients':
        return <DemoPatientManagement />;
      case 'appointments':
        return <DemoAppointments />;
      case 'employees':
        return <DemoStaff />;
      case 'messages':
        return <DemoMessages />;
      default:
        return <DemoClinicalTodayEnhanced />;
    }
  };

  return (
    <div className="relative">
      {/* Demo Mode Banner */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 text-center text-sm font-medium shadow-lg">
        🎭 Demo Mode - {demoBusinessName} | Exploring features with sample data
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
          className="ml-4 text-white hover:bg-white/20"
        >
          Exit Demo
        </Button>
      </div>

      <div className="pt-10">
        <DentistAppShell
          activeSection={activeSection}
          onChangeSection={setActiveSection}
          dentistId="demo-dentist-id"
        >
          {/* Demo Notice - only show on dashboard */}
          {activeSection === 'dashboard' && (
            <div className="p-6 pb-0">
              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3" data-tour="demo-notice">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900">Welcome to Your Demo Experience!</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    You're viewing the actual dashboard with sample data. Follow the interactive tour to explore all features.
                  </p>
                </div>
              </div>
            </div>
          )}

          {renderContent()}
        </DentistAppShell>

        {/* Interactive Demo Tour */}
        <DentistDemoTour
          run={showDemoTour}
          onClose={handleTourComplete}
          onChangeSection={(section) => setActiveSection(section)}
        />
      </div>
    </div>
  );
}
