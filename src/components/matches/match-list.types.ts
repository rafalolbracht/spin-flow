/**
 * Typy specyficzne dla widoku listy meczów
 */

/**
 * Filtry dla listy meczów
 */
export interface MatchListFilters {
  playerName: string;
  opponentName: string;
}

/**
 * Paginacja dla listy meczów
 */
export interface MatchListPagination {
  page: number; // 0-based (PrimeNG Paginator)
  limit: number;
  total: number;
}

/**
 * Domyślne wartości filtrów
 */
export const DEFAULT_MATCH_LIST_FILTERS: MatchListFilters = {
  playerName: '',
  opponentName: '',
};

/**
 * Domyślne wartości paginacji
 */
export const DEFAULT_MATCH_LIST_PAGINATION: MatchListPagination = {
  page: 0,
  limit: 20,
  total: 0,
};

/**
 * Opcje liczby elementów na stronie
 */
export const ROWS_PER_PAGE_OPTIONS = [10, 20, 50];

