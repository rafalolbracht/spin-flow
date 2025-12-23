import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type {
  MatchDetailResponse,
  AiReportResponse,
  CreatePublicShareResponse,
  IncludeQueryDto,
} from '@/types';

/**
 * MatchSummaryApiService
 *
 * Serwis Angular odpowiedzialny za komunikację HTTP z backendem dla widoku Match Summary.
 * Wykorzystuje HttpClient z Angular oraz zdefiniowane typy odpowiedzi z types.ts.
 */
@Injectable({
  providedIn: 'root',
})
export class MatchSummaryApiService {
  private readonly http = inject(HttpClient);

  /**
   * Pobiera szczegóły meczu z setami i raportem AI
   * GET /api/matches/{id}?include=sets,ai_report
   */
  getMatchDetail(matchId: number): Observable<MatchDetailResponse> {
    const params: IncludeQueryDto = {
      include: 'sets,ai_report',
    };

    return this.http.get<MatchDetailResponse>(`/api/matches/${matchId}`, {
      params: params as Record<string, string>,
    });
  }

  /**
   * Odświeża raport AI
   * GET /api/matches/{matchId}/ai-report
   */
  refreshAiReport(matchId: number): Observable<AiReportResponse> {
    return this.http.get<AiReportResponse>(`/api/matches/${matchId}/ai-report`);
  }

  /**
   * Generuje publiczny link do meczu
   * POST /api/matches/{matchId}/share
   */
  createPublicShare(matchId: number): Observable<CreatePublicShareResponse> {
    return this.http.post<CreatePublicShareResponse>(
      `/api/matches/${matchId}/share`,
      {},
    );
  }
}

