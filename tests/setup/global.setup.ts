/* eslint-disable no-console */
/**
 * Global setup dla testów E2E
 * Uruchamia się przed rozpoczęciem wszystkich testów
 * 
 * Czyści dane testowe z bazy danych aby zapewnić czysty stan początkowy
 */

import { test as setup } from '@playwright/test';
import { cleanupTestData } from './cleanup';

setup('prepare clean test environment', async () => {
  console.log('🚀 Running global setup - preparing clean test environment...');
  
  try {
    await cleanupTestData();
    console.log('✅ Global setup completed - test environment is ready');
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  }
});
