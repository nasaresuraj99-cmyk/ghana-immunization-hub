import { useState, useMemo, useRef, useEffect } from "react";
import { Search, X, User, Phone, Calendar, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Child } from "@/types/child";
import { calculateExactAge } from "@/lib/ageCalculator";

interface GlobalSearchBarProps {
  children: Child[];
  onSelectChild: (child: Child) => void;
  onViewVaccines: (child: Child) => void;
}

export function GlobalSearchBar({ children, onSelectChild, onViewVaccines }: GlobalSearchBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredChildren = useMemo(() => {
    if (!searchTerm || searchTerm.length < 2) return [];
    const term = searchTerm.toLowerCase();
    return children.filter(child =>
      child.name.toLowerCase().includes(term) ||
      child.regNo.toLowerCase().includes(term) ||
      child.telephoneAddress.toLowerCase().includes(term) ||
      child.motherName.toLowerCase().includes(term) ||
      child.community.toLowerCase().includes(term)
    ).slice(0, 8);
  }, [children, searchTerm]);


  const getStatus = (child: Child) => {
    const hasOverdue = child.vaccines.some(v => v.status === 'overdue');
    if (hasOverdue) return { label: 'Defaulter', variant: 'destructive' as const };
    const allCompleted = child.vaccines.every(v => v.status === 'completed');
    if (allCompleted) return { label: 'Complete', variant: 'default' as const };
    return { label: 'Active', variant: 'outline' as const };
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setIsOpen(filteredChildren.length > 0);
  }, [filteredChildren]);

  const handleSelect = (child: Child) => {
    onViewVaccines(child);
    setSearchTerm("");
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          placeholder="Search children by name, ID, phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-10 w-80"
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={() => setSearchTerm("")}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {isOpen && filteredChildren.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-card border rounded-lg shadow-elevation-3 max-h-96 overflow-y-auto">
          {filteredChildren.map(child => {
            const status = getStatus(child);
            return (
              <button
                key={child.id}
                className="w-full p-3 text-left hover:bg-muted/50 transition-colors border-b last:border-b-0 focus:outline-none focus:bg-muted/50"
                onClick={() => handleSelect(child)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="font-medium truncate">{child.name}</span>
                      <span className="text-xs text-muted-foreground">({child.regNo})</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {calculateExactAge(child.dateOfBirth)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {child.telephoneAddress}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {child.community}
                      </span>
                    </div>
                  </div>
                  <Badge variant={status.variant} className="flex-shrink-0">
                    {status.label}
                  </Badge>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
