import { describe, it, expect } from 'vitest';
import {
  createSuccessResponse,
  createListResponse,
  createPaginatedResponse,
  createErrorResponse,
  createUnauthorizedResponse,
  createNotFoundResponse,
  createInternalErrorResponse,
  createNoContentResponse,
} from '@/lib/utils/api-response';

describe('API Response Utils', () => {
  describe('createSuccessResponse', () => {
    it('should create success response with default status 200', async () => {
      const data = { id: 1, name: 'Test' };
      const response = createSuccessResponse(data);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/json');

      const body = await response.json();
      expect(body).toEqual({ data });
    });

    it('should create success response with custom status', async () => {
      const data = { id: 1 };
      const response = createSuccessResponse(data, 201);

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body).toEqual({ data });
    });

    it('should handle null data', async () => {
      const response = createSuccessResponse(null);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({ data: null });
    });
  });

  describe('createListResponse', () => {
    it('should create list response with array', async () => {
      const data = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
      ];
      const response = createListResponse(data);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({ data });
    });

    it('should handle empty array', async () => {
      const response = createListResponse([]);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({ data: [] });
    });
  });

  describe('createPaginatedResponse', () => {
    it('should create paginated response with total', async () => {
      const data = [{ id: 1 }, { id: 2 }];
      const total = 10;
      const response = createPaginatedResponse(data, total);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({
        data,
        pagination: { total },
      });
    });

    it('should handle empty page with non-zero total', async () => {
      const response = createPaginatedResponse([], 5);

      const body = await response.json();
      expect(body).toEqual({
        data: [],
        pagination: { total: 5 },
      });
    });
  });

  describe('createErrorResponse', () => {
    it('should create error response without details', async () => {
      const response = createErrorResponse('TEST_ERROR', 'Test error message', 400);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toEqual({
        error: {
          code: 'TEST_ERROR',
          message: 'Test error message',
        },
      });
    });

    it('should create error response with validation details', async () => {
      const details = [
        { field: 'email', message: 'Invalid email format' },
        { field: 'password', message: 'Password too short' },
      ];
      const response = createErrorResponse(
        'VALIDATION_ERROR',
        'Validation failed',
        422,
        details,
      );

      expect(response.status).toBe(422);
      const body = await response.json();
      expect(body).toEqual({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details,
        },
      });
    });
  });

  describe('createUnauthorizedResponse', () => {
    it('should create 401 response with default message', async () => {
      const response = createUnauthorizedResponse();

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body).toEqual({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid authentication token',
        },
      });
    });

    it('should create 401 response with custom message', async () => {
      const customMessage = 'Session expired';
      const response = createUnauthorizedResponse(customMessage);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error.message).toBe(customMessage);
    });
  });

  describe('createNotFoundResponse', () => {
    it('should create 404 response with default message', async () => {
      const response = createNotFoundResponse();

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body).toEqual({
        error: {
          code: 'NOT_FOUND',
          message: 'Resource not found',
        },
      });
    });

    it('should create 404 response with custom message', async () => {
      const customMessage = 'Match not found';
      const response = createNotFoundResponse(customMessage);

      const body = await response.json();
      expect(body.error.message).toBe(customMessage);
    });
  });

  describe('createInternalErrorResponse', () => {
    it('should create 500 response with default message', async () => {
      const response = createInternalErrorResponse();

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toEqual({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      });
    });

    it('should create 500 response with custom message', async () => {
      const customMessage = 'Database connection failed';
      const response = createInternalErrorResponse(customMessage);

      const body = await response.json();
      expect(body.error.message).toBe(customMessage);
    });
  });

  describe('createNoContentResponse', () => {
    it('should create 204 response with no body', async () => {
      const response = createNoContentResponse();

      expect(response.status).toBe(204);
      expect(response.body).toBe(null);
    });
  });
});

