import { supabase } from '@/lib/supabaseClient';
import { format } from 'date-fns';
import { mapEmployeeDataFromSupabase, mapEmployeeDataToSupabase, calculateAge } from './employeeUtils';
import { addLog } from './activityLogService';

const camelToSnakeCase = (str) => {
  if (str === 'workDurationYears') return 'join_date'; 
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

export const getEmployees = async (sortBy = 'name', ascending = true) => {
  let allEmployees = [];
  let from = 0;
  const step = 1000; 
  let keepFetching = true;

  const supabaseSortBy = camelToSnakeCase(sortBy);

  while (keepFetching) {
    let query = supabase
      .from('employees')
      .select('*, manager:direct_manager_id ( name )')
      .range(from, from + step - 1);

    if (sortBy !== 'age') {
      query = query.order(supabaseSortBy, { ascending });
    } else {
      query = query.order('name', { ascending: true }); 
    }
    
    const { data, error } = await query;

    if (error) {
      console.error('Error fetching employees in range:', error);
      throw error;
    }

    if (data) {
      allEmployees.push(...data);
    }

    if (!data || data.length < step) {
      keepFetching = false;
    }

    from += step;
  }
  
  const mappedData = allEmployees.map(emp => {
      const mappedEmp = mapEmployeeDataFromSupabase(emp);
      return mappedEmp;
  });

  if (sortBy === 'age') {
    mappedData.sort((a, b) => {
      const ageA = a.age === null ? (ascending ? Infinity : -Infinity) : a.age;
      const ageB = b.age === null ? (ascending ? Infinity : -Infinity) : b.age;
      if (ageA < ageB) return ascending ? -1 : 1;
      if (ageA > b.age) return ascending ? 1 : -1;
      return 0;
    });
  } else if (sortBy === 'workDurationYears') {
    mappedData.sort((a, b) => {
      const durationA = a.workDurationYears === null ? (ascending ? Infinity : -Infinity) : (a.workDurationYears * 365 + a.workDurationMonths * 30 + a.workDurationDays);
      const durationB = b.workDurationYears === null ? (ascending ? Infinity : -Infinity) : (b.workDurationYears * 365 + b.workDurationMonths * 30 + b.workDurationDays);
      if (durationA < durationB) return ascending ? -1 : 1;
      if (durationA > durationB) return ascending ? 1 : -1;
      return 0;
    });
  }
  
  return mappedData;
};

export const getEmployeeById = async (id) => {
  const { data, error } = await supabase
    .from('employees')
    .select('*, manager:direct_manager_id ( id, name, position )')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching employee by ID:', error);
    throw error;
  }
  return data ? mapEmployeeDataFromSupabase(data) : null;
};

export const addEmployee = async (employee, adminUser) => {
  const payload = mapEmployeeDataToSupabase(employee);

  // ⚠️ pastikan password ikut jika ada
  if (employee.password && employee.password.trim() !== "") {
    payload.password = employee.password;
  }

  const { data, error } = await supabase.functions.invoke("employee-sync", {
    body: {
      mode: "create",
      payload,
       email: employee.email,
    },
  });

  if (error) {
    console.error("Edge create error:", error);
    throw error;
  }

  if (adminUser) {
    await addLog({
      userId: adminUser.id,
      userName: adminUser.name || adminUser.email,
      userRole: adminUser.role,
      action: "CREATE",
      targetType: "EMPLOYEE",
      targetName: employee.name,
    });
  }

  return data;
};

export const updateEmployee = async (
  updatedEmployee,
  adminUser,
  originalEmployeeData
) => {
  const { id, password, ...rest } = updatedEmployee;
  const payload = mapEmployeeDataToSupabase(rest);

  // ⚠️ hanya kirim password jika diisi
  if (password && password.trim() !== "") {
    payload.password = password;
  }

  const { data, error } = await supabase.functions.invoke("employee-sync", {
    body: {
      mode: "update",
      employeeId: id,
      payload,
    },
  });

  if (error) {
    console.error("Edge update error:", error);
    throw error;
  }

  if (adminUser) {
    const changes = {};
    for (const key in payload) {
      if (payload[key] !== originalEmployeeData[key]) {
        changes[key] = {
          from: originalEmployeeData[key],
          to: payload[key],
        };
      }
    }

    await addLog({
      userId: adminUser.id,
      userName: adminUser.name || adminUser.email,
      userRole: adminUser.role,
      action: "UPDATE",
      targetType: "EMPLOYEE",
      targetId: id,
      targetName: updatedEmployee.name,
      details: { changes },
    });
  }

  return data;
};



export const deleteEmployee = async (id, adminUser, employeeName) => {
  const { error } = await supabase
    .from('employees')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting employee:', error);
    throw error;
  }

  if (adminUser) {
    await addLog({
      userId: adminUser.id,
      userName: adminUser.name || adminUser.email,
      userRole: adminUser.role,
      action: 'DELETE',
      targetType: 'EMPLOYEE',
      targetId: id,
      targetName: employeeName,
    });
  }
};