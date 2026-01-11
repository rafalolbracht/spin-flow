import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logError, logWarning, logInfo } from '@/lib/utils/logger';

describe('Logger Utils', () => {
  // Spy na console methods
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  describe('logError', () => {
    it('should log error message with endpoint', () => {
      const error = new Error('Test error');
      const endpoint = 'POST /api/test';

      logError(endpoint, error);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `[${endpoint}] ERROR: ${error.message}`,
        error,
      );
    });

    it('should log error with context', () => {
      const error = new Error('Test error');
      const endpoint = 'POST /api/test';
      const context = { userId: '123', action: 'create' };

      logError(endpoint, error, context);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `[${endpoint}] ERROR: ${error.message} | Context: ${JSON.stringify(context)}`,
        error,
      );
    });

    it('should handle error without context', () => {
      const error = new Error('Simple error');
      const endpoint = 'GET /api/data';

      logError(endpoint, error);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[GET /api/data] ERROR: Simple error',
        error,
      );
    });
  });

  describe('logWarning', () => {
    it('should log warning message with endpoint', () => {
      const message = 'Test warning';
      const endpoint = 'POST /api/test';

      logWarning(endpoint, message);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        `[${endpoint}] WARNING: ${message}`,
      );
    });

    it('should log warning with context', () => {
      const message = 'Test warning';
      const endpoint = 'POST /api/test';
      const context = { reason: 'deprecated' };

      logWarning(endpoint, message, context);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        `[${endpoint}] WARNING: ${message} | Context: ${JSON.stringify(context)}`,
      );
    });
  });

  describe('logInfo', () => {
    it('should log info message with endpoint', () => {
      const message = 'Test info';
      const endpoint = 'GET /api/test';

      logInfo(endpoint, message);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        `[${endpoint}] INFO: ${message}`,
      );
    });

    it('should log info with context', () => {
      const message = 'Operation completed';
      const endpoint = 'PUT /api/resource';
      const context = { duration: '250ms', status: 'success' };

      logInfo(endpoint, message, context);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        `[${endpoint}] INFO: ${message} | Context: ${JSON.stringify(context)}`,
      );
    });
  });
});

