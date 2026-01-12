/* eslint-disable no-console */
/**
 * Global teardown dla testów E2E
 * Uruchamia się po zakończeniu wszystkich testów
 *
 * Czyści dane testowe z bazy danych
 */

import { test as teardown } from '@playwright/test';
import { cleanupTestData } from './cleanup';

teardown('cleanup test data', async () => {
  console.log('🧹 Running global teardown - cleaning test data...');

  try {
    await cleanupTestData();
    console.log('✅ Global teardown completed successfully');
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    throw error;
  }
});
