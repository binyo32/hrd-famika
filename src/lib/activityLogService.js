import { supabase } from '@/lib/supabaseClient';

export const addLog = async ({
  userId,
  userName,
  userRole,
  action,
  targetType,
  targetId,
  targetName,
  details,
}) => {
  try {
    const { error } = await supabase.from('activity_logs').insert([
      {
        user_id: userId,
        user_name: userName,
        user_role: userRole,
        action,
        target_type: targetType,
        target_id: targetId,
        target_name: targetName,
        details,
      },
    ]);
    if (error) {
      console.error('Failed to add activity log:', error);
    }
  } catch (error) {
    console.error('Exception in addLog:', error);
  }
};