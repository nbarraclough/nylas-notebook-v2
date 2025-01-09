export const clearAuthStorage = async () => {
  try {
    // Clear all auth-related data from storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear any specific auth items that might persist
    localStorage.removeItem('supabase.auth.token');
    localStorage.removeItem('supabase.auth.refreshToken');
    sessionStorage.removeItem('supabase.auth.token');
    sessionStorage.removeItem('supabase.auth.refreshToken');
    
    // Clear any cookies related to auth
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
  } catch (error) {
    console.error('Error clearing auth state:', error);
    throw error;
  }
};

export const isTokenError = (error: any): boolean => {
  return error?.message?.includes('JWT') || 
         error?.message?.includes('token') ||
         error?.message?.includes('postMessage') ||
         error?.message?.includes('origin') ||
         error?.message?.includes('session_not_found');
};