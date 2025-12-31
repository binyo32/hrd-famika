import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { mapEmployeeDataFromSupabase } from '@/lib/employeeUtils';
import { addLog } from '@/lib/activityLogService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUserString = localStorage.getItem('currentUser');
    if (savedUserString) {
      try {
        const savedUser = JSON.parse(savedUserString);
        if (savedUser && savedUser.employeeData && typeof savedUser.employeeData === 'object') {
          setUser(savedUser);
        } else if (savedUser && savedUser.id && savedUser.role === 'employee') {
          fetchAndSetUserData(savedUser.id, savedUser.role);
        } else {
          setUser(savedUser);
        }
      } catch (error) {
        console.error("Failed to parse user from localStorage", error);
        localStorage.removeItem('currentUser');
      }
    }
    setLoading(false);
  }, []);

  const fetchAndSetUserData = async (userId, userRole) => {
    let userData = { id: userId, role: userRole };
    if (userRole === 'employee') {
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('*')
        .eq('id', userId)
        .single();

      if (employeeError) {
        console.error('Error fetching employee details on auth load:', employeeError);
      } else if (employeeData) {
        userData.employeeData = mapEmployeeDataFromSupabase(employeeData);
        userData.name = employeeData.name;
        userData.email = employeeData.email;
      }
    } else if (userRole === 'admin') {
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('id, name, email')
        .eq('id', userId)
        .single();
      if (adminError) {
        console.error('Error fetching admin details on auth load:', adminError);
      } else if (adminData) {
        userData.name = adminData.name;
        userData.email = adminData.email;
      }
    }
    setUser(userData);
    localStorage.setItem('currentUser', JSON.stringify(userData));
  };


  const login = (userData) => {
    let fullUserData;
    if (userData.role === 'employee' && userData.employeeData) {
      const mappedEmployeeData = mapEmployeeDataFromSupabase(userData.employeeData);
      fullUserData = {
        ...userData,
        employeeData: mappedEmployeeData,
        name: mappedEmployeeData.name,
      };
    } else {
      fullUserData = userData;
    }
    
    setUser(fullUserData);
    localStorage.setItem('currentUser', JSON.stringify(fullUserData));

    addLog({
      userId: fullUserData.id,
      userName: fullUserData.name || fullUserData.email,
      userRole: fullUserData.role,
      action: 'LOGIN',
      targetType: 'SESSION',
      details: { message: `User ${fullUserData.name || fullUserData.email} logged in successfully.` }
    });
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};