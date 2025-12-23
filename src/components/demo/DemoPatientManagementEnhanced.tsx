/**
 * Enhanced Patient Management Demo with improved UX
 */

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Filter, MoreVertical, Phone, Mail, Calendar } from "lucide-react";
import { 
  DebouncedSearch, 
  AvatarWithInitials, 
  LastVisit 
} from "@/components/ui/page-enhancements";
import { StaggeredList, TiltCard } from "@/components/ui/micro-interactions";
import { IllustratedEmptyState } from "@/components/ui/illustrated-empty-states";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback } from "react";

export function DemoPatientManagementEnhanced() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<string>("all");

  const allPatients = [
    { 
      name: "John Smith", 
      email: "john@example.com", 
      phone: "(555) 123-4567", 
      lastVisit: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), 
      status: "Active",
      upcomingAppt: "Dec 28, 2024",
      tags: ["regular", "insurance"]
    },
    { 
      name: "Sarah Johnson", 
      email: "sarah@example.com", 
      phone: "(555) 234-5678", 
      lastVisit: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), 
      status: "Active",
      upcomingAppt: null,
      tags: ["new"]
    },
    { 
      name: "Mike Davis", 
      email: "mike@example.com", 
      phone: "(555) 345-6789", 
      lastVisit: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), 
      status: "Active",
      upcomingAppt: "Dec 30, 2024",
      tags: ["regular"]
    },
    { 
      name: "Emma Wilson", 
      email: "emma@example.com", 
      phone: "(555) 456-7890", 
      lastVisit: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), 
      status: "Inactive",
      upcomingAppt: null,
      tags: ["followup-needed"]
    },
    { 
      name: "David Brown", 
      email: "david@example.com", 
      phone: "(555) 567-8901", 
      lastVisit: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), 
      status: "Active",
      upcomingAppt: "Jan 5, 2025",
      tags: ["insurance", "regular"]
    },
    { 
      name: "Lisa Anderson", 
      email: "lisa@example.com", 
      phone: "(555) 678-9012", 
      lastVisit: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), 
      status: "Active",
      upcomingAppt: null,
      tags: ["recall-due"]
    },
  ];

  // Filter patients based on search and filter
  const filteredPatients = allPatients.filter(patient => {
    const matchesSearch = searchQuery === "" || 
      patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.phone.includes(searchQuery);
    
    const matchesFilter = selectedFilter === "all" ||
      (selectedFilter === "active" && patient.status === "Active") ||
      (selectedFilter === "inactive" && patient.status === "Inactive") ||
      (selectedFilter === "upcoming" && patient.upcomingAppt !== null);

    return matchesSearch && matchesFilter;
  });

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const filters = [
    { id: "all", label: "All", count: allPatients.length },
    { id: "active", label: "Active", count: allPatients.filter(p => p.status === "Active").length },
    { id: "inactive", label: "Inactive", count: allPatients.filter(p => p.status === "Inactive").length },
    { id: "upcoming", label: "Upcoming Appt", count: allPatients.filter(p => p.upcomingAppt).length },
  ];

  return (
    <div className="p-6 space-y-6" data-tour="patients-section">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Patient Management</h1>
          <p className="text-muted-foreground mt-1">
            {allPatients.length} patients • {allPatients.filter(p => p.status === "Active").length} active
          </p>
        </div>
        <Button className="bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg hover:shadow-xl transition-shadow">
          <Plus className="mr-2 h-4 w-4" />
          Add Patient
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <DebouncedSearch
          placeholder="Search patients by name, email, or phone..."
          onSearch={handleSearch}
          className="flex-1"
        />
        <div className="flex gap-2">
          {filters.map((filter) => (
            <Button
              key={filter.id}
              variant={selectedFilter === filter.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedFilter(filter.id)}
              className="gap-1.5"
            >
              {filter.label}
              <Badge variant="secondary" className="ml-1 h-5 min-w-5 text-xs">
                {filter.count}
              </Badge>
            </Button>
          ))}
        </div>
      </div>

      {/* Patient List */}
      <AnimatePresence mode="wait">
        {filteredPatients.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <IllustratedEmptyState
              illustration="users"
              title={searchQuery ? "No patients found" : "No patients yet"}
              description={
                searchQuery 
                  ? `No patients match "${searchQuery}". Try a different search term.`
                  : "Start building your patient list by adding your first patient."
              }
              actionLabel={searchQuery ? "Clear search" : "Add Patient"}
              onAction={() => searchQuery ? setSearchQuery("") : undefined}
            />
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Card className="overflow-hidden">
              <StaggeredList className="divide-y divide-border" staggerDelay={0.05}>
                {filteredPatients.map((patient, idx) => (
                  <TiltCard key={idx} maxTilt={3}>
                    <motion.div
                      className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors cursor-pointer group"
                      whileHover={{ backgroundColor: "hsl(var(--muted) / 0.5)" }}
                    >
                      <div className="flex items-center gap-4">
                        <AvatarWithInitials 
                          name={patient.name} 
                          size="lg"
                          showStatus
                          status={patient.status === "Active" ? "online" : "offline"}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold group-hover:text-primary transition-colors">
                              {patient.name}
                            </span>
                            {patient.tags.includes("new") && (
                              <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                                New
                              </Badge>
                            )}
                            {patient.tags.includes("recall-due") && (
                              <Badge variant="secondary" className="text-xs bg-warning-100 text-warning-700">
                                Recall Due
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <Mail className="h-3.5 w-3.5" />
                              {patient.email}
                            </span>
                            <span className="flex items-center gap-1">
                              <Phone className="h-3.5 w-3.5" />
                              {patient.phone}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        <div className="text-right hidden sm:block">
                          <div className="text-sm text-muted-foreground">Last Visit</div>
                          <LastVisit date={patient.lastVisit} />
                        </div>
                        
                        {patient.upcomingAppt && (
                          <div className="text-right hidden md:block">
                            <div className="text-sm text-muted-foreground">Next Appointment</div>
                            <div className="flex items-center gap-1 text-sm font-medium text-primary">
                              <Calendar className="h-3.5 w-3.5" />
                              {patient.upcomingAppt}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            patient.status === "Active" ? "bg-success-600" : "bg-muted-foreground"
                          }`} />
                          <span className={`text-sm font-medium ${
                            patient.status === "Active" ? "text-success-600" : "text-muted-foreground"
                          }`}>
                            {patient.status}
                          </span>
                        </div>

                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  </TiltCard>
                ))}
              </StaggeredList>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
