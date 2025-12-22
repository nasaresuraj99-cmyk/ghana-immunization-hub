import { useState, useCallback, useMemo } from "react";
import { Child, VaccineRecord, DashboardStats } from "@/types/child";

// Ghana EPI Schedule
const getVaccineSchedule = (dateOfBirth: string): VaccineRecord[] => {
  const dob = new Date(dateOfBirth);
  const today = new Date();
  
  const vaccines = [
    { name: "BCG", weeksAfterBirth: 0 },
    { name: "OPV 0", weeksAfterBirth: 0 },
    { name: "OPV 1", weeksAfterBirth: 6 },
    { name: "Penta 1", weeksAfterBirth: 6 },
    { name: "Pneumo 1", weeksAfterBirth: 6 },
    { name: "Rota 1", weeksAfterBirth: 6 },
    { name: "OPV 2", weeksAfterBirth: 10 },
    { name: "Penta 2", weeksAfterBirth: 10 },
    { name: "Pneumo 2", weeksAfterBirth: 10 },
    { name: "Rota 2", weeksAfterBirth: 10 },
    { name: "OPV 3", weeksAfterBirth: 14 },
    { name: "Penta 3", weeksAfterBirth: 14 },
    { name: "Pneumo 3", weeksAfterBirth: 14 },
    { name: "IPV", weeksAfterBirth: 14 },
    { name: "Measles Rubella 1", weeksAfterBirth: 36 }, // 9 months
    { name: "Yellow Fever", weeksAfterBirth: 36 },
    { name: "Meningitis A", weeksAfterBirth: 36 },
    { name: "Measles Rubella 2", weeksAfterBirth: 72 }, // 18 months
  ];

  return vaccines.map(vaccine => {
    const dueDate = new Date(dob);
    dueDate.setDate(dueDate.getDate() + vaccine.weeksAfterBirth * 7);
    
    let status: VaccineRecord['status'] = 'pending';
    if (dueDate < today) {
      status = 'overdue';
    }

    return {
      name: vaccine.name,
      dueDate: dueDate.toISOString().split('T')[0],
      status,
    };
  });
};

// Sample data for demo
const generateSampleChildren = (): Child[] => {
  const names = [
    { name: "Kwame Asante", mother: "Ama Asante", sex: "Male" as const },
    { name: "Akua Mensah", mother: "Efua Mensah", sex: "Female" as const },
    { name: "Kofi Owusu", mother: "Abena Owusu", sex: "Male" as const },
    { name: "Adwoa Boateng", mother: "Akosua Boateng", sex: "Female" as const },
    { name: "Yaw Ankrah", mother: "Esi Ankrah", sex: "Male" as const },
  ];

  const communities = ["Accra New Town", "Tema", "Kumasi Central", "Takoradi", "Cape Coast"];
  const phones = ["0241234567", "0551234567", "0271234567", "0201234567", "0541234567"];

  return names.map((data, index) => {
    const monthsAgo = Math.floor(Math.random() * 24) + 1;
    const dob = new Date();
    dob.setMonth(dob.getMonth() - monthsAgo);
    const dobString = dob.toISOString().split('T')[0];

    const vaccines = getVaccineSchedule(dobString);
    // Mark some vaccines as completed for demo
    const completedCount = Math.min(Math.floor(monthsAgo / 2), vaccines.length);
    for (let i = 0; i < completedCount; i++) {
      vaccines[i].status = 'completed';
      vaccines[i].givenDate = vaccines[i].dueDate;
    }

    return {
      id: `child-${index + 1}`,
      regNo: `GHS-2024-${String(index + 1).padStart(4, '0')}`,
      name: data.name,
      dateOfBirth: dobString,
      sex: data.sex,
      motherName: data.mother,
      telephoneAddress: phones[index],
      community: communities[index],
      registeredAt: new Date().toISOString(),
      vaccines,
    };
  });
};

export function useChildren() {
  const [children, setChildren] = useState<Child[]>(generateSampleChildren());

  const addChild = useCallback((childData: Omit<Child, 'id' | 'registeredAt' | 'vaccines'>) => {
    const newChild: Child = {
      ...childData,
      id: `child-${Date.now()}`,
      registeredAt: new Date().toISOString(),
      vaccines: getVaccineSchedule(childData.dateOfBirth),
    };
    setChildren(prev => [...prev, newChild]);
    return newChild;
  }, []);

  const updateChild = useCallback((childId: string, childData: Partial<Child>) => {
    setChildren(prev => prev.map(child => 
      child.id === childId 
        ? { ...child, ...childData }
        : child
    ));
  }, []);

  const deleteChild = useCallback((childId: string) => {
    setChildren(prev => prev.filter(child => child.id !== childId));
  }, []);

  const updateVaccine = useCallback((childId: string, vaccineName: string, givenDate: string, batchNumber?: string) => {
    setChildren(prev => prev.map(child => {
      if (child.id !== childId) return child;
      
      return {
        ...child,
        vaccines: child.vaccines.map(vaccine => 
          vaccine.name === vaccineName
            ? { 
                ...vaccine, 
                status: 'completed' as const, 
                givenDate,
                batchNumber: batchNumber || undefined,
                administeredBy: 'Current User'
              }
            : vaccine
        ),
      };
    }));
  }, []);

  const stats = useMemo((): DashboardStats => {
    const today = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(today.getDate() + 7);

    let vaccinatedToday = 0;
    let dueSoon = 0;
    let defaulters = 0;
    let fullyImmunized = 0;

    children.forEach(child => {
      const hasOverdue = child.vaccines.some(v => v.status === 'overdue');
      const allCompleted = child.vaccines.every(v => v.status === 'completed');
      
      if (hasOverdue) defaulters++;
      if (allCompleted) fullyImmunized++;

      child.vaccines.forEach(vaccine => {
        if (vaccine.givenDate === today.toISOString().split('T')[0]) {
          vaccinatedToday++;
        }
        
        if (vaccine.status === 'pending') {
          const dueDate = new Date(vaccine.dueDate);
          if (dueDate >= today && dueDate <= sevenDaysFromNow) {
            dueSoon++;
          }
        }
      });
    });

    const totalVaccines = children.reduce((sum, child) => sum + child.vaccines.length, 0);
    const completedVaccines = children.reduce((sum, child) => 
      sum + child.vaccines.filter(v => v.status === 'completed').length, 0
    );

    return {
      totalChildren: children.length,
      vaccinatedToday,
      dueSoon,
      defaulters,
      coverageRate: totalVaccines > 0 ? Math.round((completedVaccines / totalVaccines) * 100) : 0,
      fullyImmunized,
      dropoutRate: children.length > 0 ? Math.round((defaulters / children.length) * 100) : 0,
    };
  }, [children]);

  return {
    children,
    stats,
    addChild,
    updateChild,
    deleteChild,
    updateVaccine,
  };
}
