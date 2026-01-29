import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Search, SortAsc, SortDesc } from "lucide-react";

type SortByType = 'name' | 'date' | 'status' | 'priority';
type FilterStatusType = 'all' | 'draft' | 'active' | 'completed' | 'cancelled';

interface TreatmentPlanFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  sortBy: SortByType;
  onSortByChange: (value: SortByType) => void;
  sortOrder: 'asc' | 'desc';
  onSortOrderToggle: () => void;
  filterStatus: FilterStatusType;
  onFilterStatusChange: (value: FilterStatusType) => void;
}

export function TreatmentPlanFilters({
  searchTerm,
  onSearchChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderToggle,
  filterStatus,
  onFilterStatusChange,
}: TreatmentPlanFiltersProps) {
  return (
    <div className="flex flex-col md:flex-row gap-4">
      <div className="flex-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search treatment plans..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Select value={sortBy} onValueChange={onSortByChange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="date">Date</SelectItem>
            <SelectItem value="status">Status</SelectItem>
            <SelectItem value="priority">Priority</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="sm"
          onClick={onSortOrderToggle}
        >
          {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
        </Button>
        <Select value={filterStatus} onValueChange={onFilterStatusChange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
