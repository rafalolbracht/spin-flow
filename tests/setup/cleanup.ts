/* eslint-disable no-console */
/**
 * Cleanup utility dla testów E2E
 *
 * Usuwa dane testowe z bazy danych przed każdym testem,
 * aby zapewnić czystą bazę i deterministyczne testy.
 */

import { createClient } from '@supabase/supabase-js';

/**
 * Czyści dane testowe dla użytkownika testowego
 * Używa service role key aby ominąć RLS policies
 */
export async function cleanupTestData() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  const testUserId = process.env.TEST_USER_ID;

  if (!supabaseUrl || !serviceKey || !testUserId) {
    throw new Error(
      'Missing required environment variables for test cleanup: ' +
      'SUPABASE_URL, SUPABASE_SERVICE_KEY, TEST_USER_ID',
    );
  }

  // Service role client - bypass RLS
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // Najpierw pobierz wszystkie match IDs użytkownika testowego
    const { data: matches, error: matchesError } = await supabase
      .from('matches')
      .select('id')
      .eq('user_id', testUserId);

    if (matchesError) {
      console.error('❌ Error fetching test matches:', matchesError);
      throw matchesError;
    }

    if (!matches || matches.length === 0) {
      console.log('✅ No test data to clean up');
      return;
    }

    const matchIds = matches.map((m) => m.id);
     
    console.log(`🧹 Cleaning up ${matchIds.length} test matches...`);

    // Pobierz wszystkie set IDs dla tych meczów
    const { data: sets } = await supabase
      .from('sets')
      .select('id')
      .in('match_id', matchIds);

    const setIds = sets?.map((s) => s.id) || [];

    // 1. Usuń point_tags (zależą od points)
    if (setIds.length > 0) {
      const { data: points, error: pointsSelectError } = await supabase
        .from('points')
        .select('id')
        .in('set_id', setIds);

      if (!pointsSelectError && points && points.length > 0) {
        const pointIds = points.map((p) => p.id);
        await supabase.from('point_tags').delete().in('point_id', pointIds);
      }

      // 2. Usuń points (zależą od sets)
      await supabase.from('points').delete().in('set_id', setIds);

      // 3. Usuń sets (zależą od matches)
      await supabase.from('sets').delete().in('match_id', matchIds);
    }

    // 4. Usuń matches_ai_reports
    await supabase.from('matches_ai_reports').delete().in('match_id', matchIds);

    // 5. Usuń matches_public_share
    await supabase.from('matches_public_share').delete().in('match_id', matchIds);

    // 6. Na końcu usuń matches
    const { error: matchDeleteError } = await supabase
      .from('matches')
      .delete()
      .eq('user_id', testUserId);

    if (matchDeleteError) {
      console.error('❌ Error deleting matches:', matchDeleteError);
      throw matchDeleteError;
    }

    console.log(`✅ Test data cleaned up successfully (${matchIds.length} matches)`);
  } catch (error) {
    console.error('❌ Failed to cleanup test data:', error);
    throw error;
  }
}

/**
 * Weryfikuje czy użytkownik testowy istnieje w bazie
 */
export async function verifyTestUser() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  const testUserId = process.env.TEST_USER_ID;

  if (!supabaseUrl || !serviceKey || !testUserId) {
    throw new Error(
      'Missing required environment variables: ' +
      'SUPABASE_URL, SUPABASE_SERVICE_KEY, TEST_USER_ID',
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // Sprawdź czy użytkownik istnieje w auth.users
    const { data, error } = await supabase.rpc('auth.users').select('id, email').eq('id', testUserId).single();

    if (error || !data) {
      throw new Error(
        `Test user with ID ${testUserId} does not exist in the database. ` +
        'Please create the user or update TEST_USER_ID in .env',
      );
    }

    console.log(`✅ Test user verified: ${data.email} (${testUserId})`);
    return true;
  } catch (error) {
    console.error('❌ Test user verification failed:', error);
    throw error;
  }
}
