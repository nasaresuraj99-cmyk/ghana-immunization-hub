import { useState, useEffect } from "react";
import { Save, X, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Child } from "@/types/child";
import { generateRegistrationId } from "@/lib/registrationId";

interface RegistrationSectionProps {
  editingChild?: Child | null;
  onSave: (child: Omit<Child, 'id' | 'userId' | 'registeredAt' | 'vaccines'>) => void;
  onCancel: () => void;
  onBack: () => void;
  existingChildren: Child[];
}

export function RegistrationSection({ editingChild, onSave, onCancel, onBack, existingChildren }: RegistrationSectionProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    dateOfBirth: "",
    sex: "" as 'Male' | 'Female' | '',
    regNo: "",
    motherName: "", // Caregiver/Parent
    telephoneAddress: "",
    community: "",
    healthFacilityName: "",
    regionDistrict: "",
  });
  const [ageValidation, setAgeValidation] = useState<{ valid: boolean; message: string }>({ valid: true, message: "" });

  useEffect(() => {
    if (editingChild) {
      setFormData({
        name: editingChild.name,
        dateOfBirth: editingChild.dateOfBirth,
        sex: editingChild.sex,
        regNo: editingChild.regNo,
        motherName: editingChild.motherName,
        telephoneAddress: editingChild.telephoneAddress,
        community: editingChild.community,
        healthFacilityName: editingChild.healthFacilityName || '',
        regionDistrict: editingChild.regionDistrict || '',
      });
    } else {
      // Generate new unique registration number
      const newRegNo = generateRegistrationId(existingChildren);
      setFormData(prev => ({
        ...prev,
        regNo: newRegNo
      }));
    }
  }, [editingChild, existingChildren]);

  const validateAge = (dob: string) => {
    if (!dob) return;
    
    const birthDate = new Date(dob);
    const today = new Date();
    const ageInMonths = (today.getFullYear() - birthDate.getFullYear()) * 12 + 
                        (today.getMonth() - birthDate.getMonth());
    
    if (ageInMonths < 0) {
      setAgeValidation({ valid: false, message: "Date of birth cannot be in the future" });
    } else if (ageInMonths > 59) {
      setAgeValidation({ valid: false, message: "Child must be 0-59 months old" });
    } else {
      setAgeValidation({ valid: true, message: `Age: ${ageInMonths} months` });
    }
  };

  const checkDuplicate = () => {
    if (!formData.name || !formData.motherName || !formData.dateOfBirth) return false;
    
    return existingChildren.some(child => 
      child.name.toLowerCase() === formData.name.toLowerCase() &&
      child.motherName.toLowerCase() === formData.motherName.toLowerCase() &&
      child.dateOfBirth === formData.dateOfBirth &&
      child.id !== editingChild?.id
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.sex) {
      toast({
        title: "Error",
        description: "Please select the child's sex",
        variant: "destructive",
      });
      return;
    }

    if (!ageValidation.valid) {
      toast({
        title: "Error",
        description: ageValidation.message,
        variant: "destructive",
      });
      return;
    }

    if (checkDuplicate()) {
      toast({
        title: "Duplicate Entry",
        description: "A child with the same name, caregiver/parent, and date of birth already exists",
        variant: "destructive",
      });
      return;
    }

    onSave({
      name: formData.name,
      dateOfBirth: formData.dateOfBirth,
      sex: formData.sex as 'Male' | 'Female',
      regNo: formData.regNo,
      motherName: formData.motherName,
      telephoneAddress: formData.telephoneAddress,
      community: formData.community,
      healthFacilityName: formData.healthFacilityName,
      regionDistrict: formData.regionDistrict,
    });

    toast({
      title: "Success",
      description: editingChild ? "Child record updated" : "Child registered successfully",
    });
  };

  const maxDate = new Date().toISOString().split('T')[0];

  return (
    <div className="animate-fade-in">
      <div className="bg-card rounded-lg p-6 shadow-elevation-1">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2 mb-6">
          👶 {editingChild ? "Edit Child Record" : "Register New Child"} 
          <span className="text-sm font-normal text-muted-foreground">(0-59 months only)</span>
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="childName">Child's Name *</Label>
              <Input
                id="childName"
                placeholder="Enter full name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dob">Date of Birth *</Label>
              <Input
                id="dob"
                type="date"
                max={maxDate}
                value={formData.dateOfBirth}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }));
                  validateAge(e.target.value);
                }}
                required
              />
              {ageValidation.message && (
                <p className={`text-xs ${ageValidation.valid ? 'text-muted-foreground' : 'text-destructive'}`}>
                  {ageValidation.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Sex *</Label>
              <Select
                value={formData.sex}
                onValueChange={(value) => setFormData(prev => ({ ...prev, sex: value as 'Male' | 'Female' }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="regNo">Registration Number</Label>
              <Input
                id="regNo"
                value={formData.regNo}
                readOnly
                className="bg-muted font-semibold"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="motherName">Caregiver/Parent Name *</Label>
              <Input
                id="motherName"
                placeholder="Enter caregiver/parent name"
                value={formData.motherName}
                onChange={(e) => setFormData(prev => ({ ...prev, motherName: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telephone">Telephone No./Address *</Label>
              <Input
                id="telephone"
                placeholder="024XXXXXXX or House No./Street"
                value={formData.telephoneAddress}
                onChange={(e) => setFormData(prev => ({ ...prev, telephoneAddress: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="community">Community</Label>
              <Input
                id="community"
                placeholder="Enter community"
                value={formData.community}
                onChange={(e) => setFormData(prev => ({ ...prev, community: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="healthFacilityName">Health Facility Name</Label>
              <Input
                id="healthFacilityName"
                placeholder="Enter health facility name"
                value={formData.healthFacilityName}
                onChange={(e) => setFormData(prev => ({ ...prev, healthFacilityName: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="regionDistrict">Region/District</Label>
              <Input
                id="regionDistrict"
                placeholder="Enter region/district"
                value={formData.regionDistrict}
                onChange={(e) => setFormData(prev => ({ ...prev, regionDistrict: e.target.value }))}
              />
            </div>
          </div>

          {checkDuplicate() && (
            <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg text-warning-foreground">
              <p className="text-sm font-medium">⚠️ Potential duplicate detected</p>
              <p className="text-xs mt-1">A child with similar details already exists in the register.</p>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Button type="submit">
              <Save className="w-4 h-4 mr-2" />
              {editingChild ? "Update Child" : "Register Child with Immunization Schedule"}
            </Button>
            
            {editingChild && (
              <Button type="button" variant="secondary" onClick={onCancel}>
                <X className="w-4 h-4 mr-2" />
                Cancel Edit
              </Button>
            )}
            
            <Button type="button" variant="outline" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
