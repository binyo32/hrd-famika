import { useState, useEffect, useMemo } from 'react';

export const useEmployeeFilters = (initialEmployees) => {
  const [filteredEmployees, setFilteredEmployees] = useState(initialEmployees);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDivision, setFilterDivision] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterJobPosition, setFilterJobPosition] = useState('all');
  const [filterWorkLocation, setFilterWorkLocation] = useState('all');
  const [filterProject, setFilterProject] = useState('all');
  const [sortKey, setSortKey] = useState('name'); 
  const [sortOrder, setSortOrder] = useState('asc'); 

  const sortedAndFilteredEmployees = useMemo(() => {
    let tempEmployees = [...initialEmployees];

    if (searchTerm) {
      tempEmployees = tempEmployees.filter(
        (employee) =>
          employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (employee.nik && employee.nik.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (employee.email && employee.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (employee.project && employee.project.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (filterDivision !== 'all') {
      tempEmployees = tempEmployees.filter(
        (employee) => employee.division === filterDivision
      );
    }

    if (filterStatus !== 'all') {
      tempEmployees = tempEmployees.filter(
        (employee) => employee.status === filterStatus
      );
    }
    
    if (filterJobPosition !== 'all') {
      tempEmployees = tempEmployees.filter(
        (employee) => employee.position === filterJobPosition
      );
    }

    if (filterWorkLocation !== 'all') {
      tempEmployees = tempEmployees.filter(
        (employee) => employee.workLocation === filterWorkLocation
      );
    }

    if (filterProject !== 'all') {
      tempEmployees = tempEmployees.filter(
        (employee) => employee.project === filterProject
      );
    }

    // Sorting logic
    if (sortKey) {
      tempEmployees.sort((a, b) => {
        let valA = a[sortKey];
        let valB = b[sortKey];

        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        
        if (valA === null || valA === undefined) valA = sortOrder === 'asc' ? Infinity : -Infinity;
        if (valB === null || valB === undefined) valB = sortOrder === 'asc' ? Infinity : -Infinity;
        
        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return tempEmployees;
  }, [searchTerm, filterDivision, filterStatus, filterJobPosition, filterWorkLocation, filterProject, initialEmployees, sortKey, sortOrder]);
  
  useEffect(() => {
    setFilteredEmployees(sortedAndFilteredEmployees);
  }, [sortedAndFilteredEmployees]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  return {
    filteredEmployees,
    searchTerm,
    setSearchTerm,
    filterDivision,
    setFilterDivision,
    filterStatus,
    setFilterStatus,
    filterJobPosition,
    setFilterJobPosition,
    filterWorkLocation,
    setFilterWorkLocation,
    filterProject,
    setFilterProject,
    sortKey,
    sortOrder,
    handleSort,
  };
};