import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search, User, CheckCircle } from "lucide-react";

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface PatientSelectionProps {
  onSelect: (patient: Patient) => void;
  selectedPatient?: Patient | null;
}

export function PatientSelection({ onSelect, selectedPatient }: PatientSelectionProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);

  const mockPatients: Patient[] = [
    { id: "1", first_name: "John", last_name: "Doe", email: "john@example.com" },
    { id: "2", first_name: "Jane", last_name: "Smith", email: "jane@example.com" }
  ];

  useEffect(() => {
    setPatients(mockPatients);
  }, []);

  const filteredPatients = patients.filter(p => 
    `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-dental-muted-foreground" />
        <Input
          placeholder="Search patients by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-12 rounded-xl border-dental-primary/20 focus:border-dental-primary bg-white/50 backdrop-blur-sm"
        />
      </div>
      
      <div className="max-h-80 overflow-y-auto space-y-3 scroll-smooth">
        {filteredPatients.length === 0 ? (
          <Card variant="glass" className="p-8 text-center">
            <div className="flex flex-col items-center space-y-3">
              <User className="h-12 w-12 text-dental-muted-foreground opacity-50" />
              <p className="text-dental-muted-foreground">No patients found</p>
              <p className="text-sm text-dental-muted-foreground">Try adjusting your search terms</p>
            </div>
          </Card>
        ) : (
          filteredPatients.map((patient) => (
            <Card 
              key={patient.id}
              variant={selectedPatient?.id === patient.id ? "gradient" : "interactive"}
              className={`relative overflow-hidden group ${
                selectedPatient?.id === patient.id ? 'ring-2 ring-dental-primary/50' : ''
              }`}
              onClick={() => onSelect(patient)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center">
                        <User className="h-6 w-6 text-white" />
                      </div>
                      {selectedPatient?.id === patient.id && (
                        <CheckCircle className="absolute -top-1 -right-1 h-5 w-5 text-dental-success bg-white rounded-full" />
                      )}
                    </div>
                    <div>
                      <p className={`font-semibold ${selectedPatient?.id === patient.id ? 'text-white' : 'text-dental-foreground'}`}>
                        {patient.first_name} {patient.last_name}
                      </p>
                      <p className={`text-sm ${selectedPatient?.id === patient.id ? 'text-white/80' : 'text-dental-muted-foreground'}`}>
                        {patient.email}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Button 
                      variant={selectedPatient?.id === patient.id ? "glass" : "outline"}
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {selectedPatient?.id === patient.id ? 'Selected' : 'Select'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}