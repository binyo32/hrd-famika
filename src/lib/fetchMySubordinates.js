import { supabase } from "@/lib/supabaseClient";

export const fetchMySubordinates = async (managerId) => {
  const { data, error } = await supabase
    .from("employees")
    .select(`
      id,
      name,
      position,
      division,
      email,
      phone,
      direct_manager_id
    `);

  if (error) throw error;

  const map = new Map();
  data.forEach(emp => map.set(emp.id, emp));

  const result = [];
  const stack = [managerId];

  while (stack.length) {
    const current = stack.pop();
    data
      .filter(e => e.direct_manager_id === current)
      .forEach(e => {
        result.push(e);
        stack.push(e.id);
      });
  }

  return result;
};

