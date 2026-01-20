import { supabase } from "@/lib/supabaseClient";

export const fetchMySubordinates = async (managerId) => {
  const result = [];
  const visited = new Set();

  const traverse = async (currentId) => {
    if (visited.has(currentId)) return;
    visited.add(currentId);

    const { data, error } = await supabase
      .from("employees")
      .select(`
        id,
        name,
        photo,
        position,
        division,
        email,
        phone,
        direct_manager_id
      `)
      .eq("direct_manager_id", currentId);

    if (error) {
      console.error("fetchMySubordinates error:", error);
      return;
    }

    for (const emp of data) {
      result.push(emp);
      await traverse(emp.id); // n-level
    }
  };

  await traverse(managerId);
  return result;
};
