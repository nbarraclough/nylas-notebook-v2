export const clearAuthStorage = async () => {
  try {
    // Clear all auth-related data from storage
    localStorage.clear();
    sessionStorage.clear();
  } catch (error) {
    console.error('Error clearing auth state:', error);
    throw error;
  }
};

export const isTokenError = (error: any): boolean => {
  return error?.message?.includes('JWT') || 
         error?.message?.includes('token') ||
         error?.message?.includes('postMessage') ||
         error?.message?.includes('origin');
};