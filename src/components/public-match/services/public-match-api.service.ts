import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { PublicMatchResponse } from '@/types';

/**
 * PublicMatchApiService
 *
 * Serwis Angular do komunikacji z API dla widoku publicznego meczu.
 * Endpoint publiczny - brak wymagania autentykacji.
 */
@Injectable({
  providedIn: 'root',
})
export class PublicMatchApiService {
  private readonly http = inject(HttpClient);

  /**
   * Pobiera dane publicznego meczu po tokenie
   * GET /api/public/matches/{token}
   *
   * @param token - 43-znakowy token base64url
   * @returns Observable z danymi meczu
   */
  getPublicMatch(token: string): Observable<PublicMatchResponse> {
    return this.http.get<PublicMatchResponse>(`/api/public/matches/${token}`);
  }
}

