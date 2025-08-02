
import React from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Filter, X, Search } from 'lucide-react';

interface AdvancedFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filters: {
    entity: string;
    profile: string;
    cashRange: { min: string; max: string };
    marginRange: { min: string; max: string };
  };
  onFiltersChange: (filters: any) => void;
  onClearFilters: () => void;
  activeFiltersCount: number;
}

const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  searchQuery,
  onSearchChange,
  filters,
  onFiltersChange,
  onClearFilters,
  activeFiltersCount
}) => {
  const updateFilter = (key: string, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-lg">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search Entity or Profile..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 w-64 bg-white"
        />
      </div>

      {/* Entity Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="bg-white">
            <Filter className="h-4 w-4 mr-2" />
            Entity
            {filters.entity && <Badge variant="secondary" className="ml-2">1</Badge>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64">
          <div className="space-y-2">
            <label className="text-sm font-medium">Filter by Entity</label>
            <Input
              placeholder="Enter entity code..."
              value={filters.entity}
              onChange={(e) => updateFilter('entity', e.target.value)}
            />
          </div>
        </PopoverContent>
      </Popover>

      {/* Profile Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="bg-white">
            <Filter className="h-4 w-4 mr-2" />
            Profile
            {filters.profile && <Badge variant="secondary" className="ml-2">1</Badge>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64">
          <div className="space-y-2">
            <label className="text-sm font-medium">Filter by Profile</label>
            <Input
              placeholder="Enter profile..."
              value={filters.profile}
              onChange={(e) => updateFilter('profile', e.target.value)}
            />
          </div>
        </PopoverContent>
      </Popover>

      {/* Cash Range Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="bg-white">
            <Filter className="h-4 w-4 mr-2" />
            Cash Range
            {(filters.cashRange.min || filters.cashRange.max) && 
              <Badge variant="secondary" className="ml-2">1</Badge>
            }
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64">
          <div className="space-y-3">
            <label className="text-sm font-medium">Cash Range</label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-500">Min</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={filters.cashRange.min}
                  onChange={(e) => updateFilter('cashRange', { ...filters.cashRange, min: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">Max</label>
                <Input
                  type="number"
                  placeholder="999999"
                  value={filters.cashRange.max}
                  onChange={(e) => updateFilter('cashRange', { ...filters.cashRange, max: e.target.value })}
                />
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Margin Range Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="bg-white">
            <Filter className="h-4 w-4 mr-2" />
            Margin Range
            {(filters.marginRange.min || filters.marginRange.max) && 
              <Badge variant="secondary" className="ml-2">1</Badge>
            }
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64">
          <div className="space-y-3">
            <label className="text-sm font-medium">Available Margin Range</label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-500">Min</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={filters.marginRange.min}
                  onChange={(e) => updateFilter('marginRange', { ...filters.marginRange, min: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">Max</label>
                <Input
                  type="number"
                  placeholder="999999"
                  value={filters.marginRange.max}
                  onChange={(e) => updateFilter('marginRange', { ...filters.marginRange, max: e.target.value })}
                />
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Clear Filters */}
      {activeFiltersCount > 0 && (
        <Button 
          variant="ghost" 
          onClick={onClearFilters}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <X className="h-4 w-4 mr-2" />
          Clear ({activeFiltersCount})
        </Button>
      )}
    </div>
  );
};

export default AdvancedFilters;
