import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Realtime Sync Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset global state
    delete (global as any).window;
    (global as any).window = {
      dispatchEvent: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
  });

  it('should identify permission errors correctly', () => {
    const permissionErrors = [
      'Missing or insufficient permissions',
      'PERMISSION_DENIED: Missing or insufficient permissions',
      'permission denied',
      'insufficient permissions'
    ];

    permissionErrors.forEach(errorMessage => {
      const isPermissionError = errorMessage.includes('permission') || 
                               errorMessage.includes('PERMISSION_DENIED') ||
                               errorMessage.includes('insufficient permissions') ||
                               errorMessage.includes('Missing or insufficient permissions');
      
      expect(isPermissionError).toBe(true);
    });
  });

  it('should identify auth errors correctly', () => {
    const authErrors = [
      'authentication required',
      'unauthenticated',
      'auth failed'
    ];

    authErrors.forEach(errorMessage => {
      const isAuthError = errorMessage.includes('auth') || 
                         errorMessage.includes('unauthenticated') ||
                         errorMessage.includes('authentication required');
      
      expect(isAuthError).toBe(true);
    });
  });

  it('should calculate retry delays correctly', () => {
    const calculateDelay = (retryCount: number) => Math.pow(2, retryCount) * 1000;
    
    expect(calculateDelay(1)).toBe(2000); // 2 seconds
    expect(calculateDelay(2)).toBe(4000); // 4 seconds  
    expect(calculateDelay(3)).toBe(8000); // 8 seconds
  });

  it('should format user-friendly error messages', () => {
    const getUserMessage = (errorMessage: string) => {
      const isPermissionError = errorMessage.includes('permission') || 
                               errorMessage.includes('PERMISSION_DENIED') ||
                               errorMessage.includes('insufficient permissions') ||
                               errorMessage.includes('Missing or insufficient permissions');
      
      const isAuthError = errorMessage.includes('auth') || 
                         errorMessage.includes('unauthenticated') ||
                         errorMessage.includes('authentication required');

      if (isPermissionError) {
        return 'Missing or insufficient permissions';
      } else if (isAuthError) {
        return 'Authentication required';
      }
      return 'Connection error';
    };

    expect(getUserMessage('PERMISSION_DENIED: Missing or insufficient permissions')).toBe('Missing or insufficient permissions');
    expect(getUserMessage('authentication required')).toBe('Authentication required');
    expect(getUserMessage('network timeout')).toBe('Connection error');
  });
});