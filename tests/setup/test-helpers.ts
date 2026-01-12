/**
 * Helpery do testów - mockowanie Supabase i inne narzędzia
 */

import type { SupabaseClient } from '@/db/supabase.client';

// Mock data storage
interface MockDataStore {
  matches: unknown[];
  sets: unknown[];
  points: unknown[];
  point_tags: unknown[];
  matches_ai_reports: unknown[];
  matches_public_share: unknown[];
  analytics_events: unknown[];
  tags: unknown[];
}

// Supabase Query Builder Mock
class SupabaseQueryBuilder {
  private table: string;
  private operations: unknown[] = [];
  private dataStore: MockDataStore;

  constructor(table: string, dataStore: MockDataStore) {
    this.table = table;
    this.dataStore = dataStore;
  }

  select(columns: string = '*', options?: { count?: string; head?: boolean }) {
    this.operations.push({ type: 'select', columns, options });
    return this;
  }

  insert(data: unknown | unknown[]) {
    this.operations.push({ type: 'insert', data });
    return this;
  }

  update(data: Record<string, unknown>) {
    this.operations.push({ type: 'update', data });
    return this;
  }

  delete() {
    this.operations.push({ type: 'delete' });
    return this;
  }

  eq(column: string, value: unknown) {
    this.operations.push({ type: 'eq', column, value });
    return this;
  }

  ilike(column: string, value: unknown) {
    this.operations.push({ type: 'ilike', column, value });
    return this;
  }

  in(column: string, values: unknown[]) {
    this.operations.push({ type: 'in', column, values });
    return this;
  }

  order(column: string, options: { ascending?: boolean; foreignTable?: string } = {}) {
    this.operations.push({ type: 'order', column, options });
    return this;
  }

  range(start: number, end: number) {
    this.operations.push({ type: 'range', start, end });
    return this;
  }

  limit(count: number) {
    this.operations.push({ type: 'limit', count });
    return this;
  }

  single() {
    this.operations.push({ type: 'single' });
    return this;
  }

  async then(resolve: (result: unknown) => unknown, reject?: (error: unknown) => unknown) {
    try {
      const result = await this.execute();
      resolve(result);
    } catch (error) {
      if (reject) reject(error);
      else throw error;
    }
  }

  private async execute() {
    const operation = this.operations[0] as { type: string } | undefined;
    if (!operation) return { data: null, error: null };

    switch (operation.type) {
      case 'select':
        return this.executeSelect();
      case 'insert':
        return this.executeInsert();
      case 'update':
        return this.executeUpdate();
      case 'delete':
        return this.executeDelete();
      default:
        return { data: null, error: null };
    }
  }

  private executeSelect() {
    let data = [...this.dataStore[this.table as keyof MockDataStore]] as Record<string, unknown>[];
    const selectOp = this.operations.find((op: unknown) => (op as { type: string }).type === 'select') as { options?: { count?: string } } | undefined;

    // Handle count queries
    if (selectOp?.options?.count === 'exact') {
      // Apply filters first
      for (const op of this.operations) {
        switch (op.type) {
          case 'eq':
            data = data.filter(item => item[op.column] === op.value);
            break;
          case 'ilike':
            data = data.filter(item =>
              item[op.column] && item[op.column].toLowerCase().includes(op.value.toLowerCase()),
            );
            break;
          case 'in':
            data = data.filter(item => op.values.includes(item[op.column]));
            break;
        }
      }

      // Return count result
      return { data: null, error: null, count: data.length };
    }

    // Apply filters in order
    for (const operation of this.operations) {
      const op = operation as { type: string; column: string; value: unknown; values: unknown[] };
      switch (op.type) {
        case 'eq':
          data = data.filter(item => item[op.column] === op.value);
          break;
        case 'ilike':
          data = data.filter(item => {
            const val = item[op.column];
            const searchVal = op.value;
            return val && typeof val === 'string' && typeof searchVal === 'string' && val.toLowerCase().includes(searchVal.toLowerCase());
          });
          break;
        case 'in':
          data = data.filter(item => op.values.includes(item[op.column]));
          break;
      }
    }

    // Apply ordering
    for (const operation of this.operations) {
      const op = operation as { type: string; column: string; options: { ascending?: boolean } };
      if (op.type === 'order') {
        const { ascending = true } = op.options;
        data.sort((a, b) => {
          const aVal = a[op.column];
          const bVal = b[op.column];
          if (aVal < bVal) return ascending ? -1 : 1;
          if (aVal > bVal) return ascending ? 1 : -1;
          return 0;
        });
      }
    }

    // Apply range/limit
    for (const operation of this.operations) {
      const op = operation as { type: string; start: number; end: number; limit: number };
      if (op.type === 'range') {
        data = data.slice(op.start, op.end + 1);
      } else if (op.type === 'limit') {
        data = data.slice(0, op.limit);
      }
    }

    // Handle single
    const hasSingle = this.operations.some((op: unknown) => (op as { type: string }).type === 'single');
    if (hasSingle) {
      if (data.length === 0) {
        return { data: null, error: { code: 'PGRST116' } };
      }
      return { data: data[0], error: null };
    }

    return { data, error: null };
  }

  private executeInsert() {
    const insertOp = this.operations.find((op: unknown) => (op as { type: string }).type === 'insert') as { data: unknown } | undefined;
    if (!insertOp) return { data: null, error: null };

    const dataToInsert = Array.isArray(insertOp.data) ? insertOp.data : [insertOp.data];
    const insertedData = dataToInsert.map((item: Record<string, unknown>, index) => ({
      ...item,
      id: item.id || (this.dataStore[this.table as keyof MockDataStore].length + index + 1),
      created_at: item.created_at || new Date().toISOString(),
      updated_at: item.updated_at || new Date().toISOString(),
    }));

    // Add to mock store
    (this.dataStore[this.table as keyof MockDataStore] as unknown[]).push(...insertedData);

    // Supabase returns inserted data, and for .select().single() it returns the data directly
    const hasSelect = this.operations.some((op: unknown) => (op as { type: string }).type === 'select');
    const hasSingle = this.operations.some((op: unknown) => (op as { type: string }).type === 'single');

    if (hasSelect && hasSingle) {
      return { data: insertedData[0], error: null };
    }

    return { data: insertedData, error: null };
  }

  private executeUpdate() {
    const updateOp = this.operations.find((op: unknown) => (op as { type: string }).type === 'update') as { data: Record<string, unknown> } | undefined;
    if (!updateOp) return { data: null, error: null };

    let data = [...this.dataStore[this.table as keyof MockDataStore]] as Record<string, unknown>[];

    // Apply filters first
    for (const operation of this.operations) {
      const op = operation as { type: string; column: string; value: unknown };
      if (op.type === 'eq') {
        data = data.filter(item => item[op.column] === op.value);
      }
    }

    // Update matching records
    const updatedData = data.map(item => ({
      ...item,
      ...updateOp.data,
      updated_at: new Date().toISOString(),
    }));

    // Update in mock store
    const store = this.dataStore[this.table as keyof MockDataStore];
    updatedData.forEach(updatedItem => {
      const index = store.findIndex(item => item.id === updatedItem.id);
      if (index !== -1) {
        store[index] = updatedItem;
      }
    });

    return { data: updatedData, error: null };
  }

  private executeDelete() {
    let data = [...this.dataStore[this.table as keyof MockDataStore]] as Record<string, unknown>[];

    // Apply filters
    for (const operation of this.operations) {
      const op = operation as { type: string; column: string; value: unknown };
      if (op.type === 'eq') {
        data = data.filter(item => item[op.column] === op.value);
      }
    }

    // Remove from mock store
    const store = this.dataStore[this.table as keyof MockDataStore] as Record<string, unknown>[];
    const idsToDelete = data.map(item => item.id);
    this.dataStore[this.table as keyof MockDataStore] = store.filter(item => !idsToDelete.includes(item.id)) as unknown[];

    return { data: null, error: null };
  }
}

// Mock Supabase client creator
export function createMockSupabaseClient(initialData: Partial<MockDataStore> = {}): SupabaseClient {
  const dataStore: MockDataStore = {
    matches: initialData.matches || [],
    sets: initialData.sets || [],
    points: initialData.points || [],
    point_tags: initialData.point_tags || [],
    matches_ai_reports: initialData.matches_ai_reports || [],
    matches_public_share: initialData.matches_public_share || [],
    analytics_events: initialData.analytics_events || [],
    tags: initialData.tags || [],
  };

  const mockClient = {
    from: (table: string) => new SupabaseQueryBuilder(table, dataStore),
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            user: { id: 'test-user-id', email: 'test@example.com' },
            access_token: 'mock-token',
          },
        },
        error: null,
      }),
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: { id: 'test-user-id', email: 'test@example.com' },
        },
        error: null,
      }),
      signInWithOAuth: vi.fn().mockResolvedValue({
        data: { url: 'https://mock-oauth-url.com' },
        error: null,
      }),
      exchangeCodeForSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            user: { id: 'test-user-id', email: 'test@example.com' },
            access_token: 'mock-token',
          },
        },
        error: null,
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  return mockClient;
}

// Test data factories
export const createMockMatch = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 1,
  player_name: 'Test Player',
  opponent_name: 'Test Opponent',
  max_sets: 3,
  golden_set_enabled: false,
  first_server_first_set: 'player',
  generate_ai_summary: true,
  status: 'in_progress',
  sets_won_player: 0,
  sets_won_opponent: 0,
  coach_notes: null,
  started_at: '2024-01-01T10:00:00Z',
  ended_at: null,
  created_at: '2024-01-01T10:00:00Z',
  updated_at: '2024-01-01T10:00:00Z',
  user_id: 'test-user-id',
  ...overrides,
});

export const createMockSet = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 1,
  match_id: 1,
  sequence_in_match: 1,
  is_golden: false,
  set_score_player: 0,
  set_score_opponent: 0,
  current_server: 'player',
  is_finished: false,
  started_at: '2024-01-01T10:00:00Z',
  ended_at: null,
  created_at: '2024-01-01T10:00:00Z',
  updated_at: '2024-01-01T10:00:00Z',
  user_id: 'test-user-id',
  ...overrides,
});

export const createMockPoint = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 1,
  set_id: 1,
  sequence_in_set: 1,
  scoring_player: 'player',
  point_type: 'regular',
  created_at: '2024-01-01T10:00:00Z',
  user_id: 'test-user-id',
  ...overrides,
});