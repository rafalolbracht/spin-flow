import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type {
  MatchDetailResponse,
  TagListResponse,
  CreatePointResponse,
  UndoPointResponse,
  FinishSetResponse,
  FinishMatchResponse,
  MatchDetailDto,
  TagDto,
  CreatePointCommandDto,
  CreatePointDto,
  UndoPointDto,
  FinishSetCommandDto,
  FinishSetDto,
  FinishMatchCommandDto,
  FinishMatchDto,
} from '@/types';

/**
 * LiveMatchApiService
 *
 * Angular serwis API dla widoku Live Match.
 * Odpowiada za komunikację z backend API przez HttpClient.
 * Wszystkie metody zwracają Observable z automatycznym rozpakowaniem response wrapperów.
 * Error handling jest obsługiwany przez globalny HTTP interceptor.
 */
@Injectable({
  providedIn: 'root',
})
export class LiveMatchApiService {
  private readonly http = inject(HttpClient);

  /**
   * Pobiera dane meczu z opcjonalnymi relacjami
   * GET /api/matches/{id}?include=sets,points,tags
   */
  getMatch(matchId: number): Observable<MatchDetailDto> {
    const params = new HttpParams().set('include', 'sets,points,tags');

    return this.http
      .get<MatchDetailResponse>(`/api/matches/${matchId}`, { params })
      .pipe(map((response) => response.data));
  }

  /**
   * Pobiera listę dostępnych tagów
   * GET /api/tags
   */
  getTags(): Observable<TagDto[]> {
    return this.http
      .get<TagListResponse>('/api/tags')
      .pipe(map((response) => response.data));
  }

  /**
   * Tworzy nowy punkt w secie
   * POST /api/sets/{setId}/points/create
   */
  createPoint(
    setId: number,
    command: CreatePointCommandDto,
  ): Observable<CreatePointDto> {
    return this.http
      .post<CreatePointResponse>(`/api/sets/${setId}/points/create`, command)
      .pipe(map((response) => response.data));
  }

  /**
   * Cofa ostatni punkt w secie
   * DELETE /api/sets/{setId}/points/delete
   */
  undoPoint(setId: number): Observable<UndoPointDto> {
    return this.http
      .delete<UndoPointResponse>(`/api/sets/${setId}/points/delete`)
      .pipe(map((response) => response.data));
  }

  /**
   * Kończy set z opcjonalnymi uwagami trenera
   * POST /api/sets/{id}/finish
   */
  finishSet(
    setId: number,
    command: FinishSetCommandDto,
  ): Observable<FinishSetDto> {
    return this.http
      .post<FinishSetResponse>(`/api/sets/${setId}/finish`, command)
      .pipe(map((response) => response.data));
  }

  /**
   * Kończy mecz z opcjonalnymi uwagami trenera
   * POST /api/matches/{id}/finish
   */
  finishMatch(
    matchId: number,
    command: FinishMatchCommandDto,
  ): Observable<FinishMatchDto> {
    return this.http
      .post<FinishMatchResponse>(`/api/matches/${matchId}/finish`, command)
      .pipe(map((response) => response.data));
  }
}

