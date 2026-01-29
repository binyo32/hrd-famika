import { supabase } from "@/lib/supabaseClient";

export const fetchMySubordinates = async (managerId) => {
  const { data, error } = await supabase.rpc("get_my_subordinates", {
    manager_uuid: managerId,
  });

  if (error) throw error;

  return data ?? [];
};