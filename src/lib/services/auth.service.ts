import { Injectable, signal, computed, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { lastValueFrom } from "rxjs";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
}

export interface SessionResponse {
  data: {
    user: SupabaseUser | null;
  };
}

@Injectable({
  providedIn: "root",
})
export class AuthService {
  private readonly http = inject(HttpClient);

  // Stan sesji
  private readonly _user = signal<User | null>(null);
  private readonly _isInitialized = signal<boolean>(false);

  // Publiczne signals (readonly)
  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);
  readonly isInitialized = this._isInitialized.asReadonly();

  constructor() {
    // Automatyczna inicjalizacja sesji przy starcie aplikacji
    // (można wywołać ręcznie w app initialization jeśli preferowane)
    if (typeof window !== "undefined") {
      this.initializeSession();
    }
  }

  /**
   * Inicjalizacja sesji - pobiera informacje o użytkowniku z API
   */
  async initializeSession(): Promise<void> {
    try {
      const response = await lastValueFrom(
        this.http.get<SessionResponse>("/api/auth/session"),
      );

      if (response.data.user) {
        this._user.set({
          id: response.data.user.id,
          email: response.data.user.email || '',
          full_name: response.data.user.user_metadata?.full_name || response.data.user.user_metadata?.name,
          avatar_url: response.data.user.user_metadata?.avatar_url ||
                     response.data.user.user_metadata?.picture ||
                     response.data.user.user_metadata?.avatar,
        });
      } else {
        this._user.set(null);
      }
    } catch {
      this._user.set(null);
    } finally {
      this._isInitialized.set(true);
    }
  }

  /**
   * Rozpoczęcie procesu logowania przez Google
   */
  async signInWithGoogle(redirectUrl?: string): Promise<void> {
    await this.signInWithProvider("google", redirectUrl);
  }

  /**
   * Rozpoczęcie procesu logowania przez Facebook
   */
  async signInWithFacebook(redirectUrl?: string): Promise<void> {
    await this.signInWithProvider("facebook", redirectUrl);
  }

  /**
   * Rozpoczęcie procesu logowania przez wybranego providera
   */
  private async signInWithProvider(
    provider: "google" | "facebook",
    redirectUrl?: string,
  ): Promise<void> {
    const response = await lastValueFrom(
      this.http.post<{ data: { url: string } }>("/api/auth/login", {
        provider,
        redirectUrl,
      }),
    );

    // Przekierowanie do OAuth URL
    if (typeof window !== "undefined") {
      window.location.href = response.data.url;
    }
  }

  /**
   * Wylogowanie użytkownika
   */
  async signOut(): Promise<void> {
    await lastValueFrom(this.http.post("/api/auth/logout", {}));

    this._user.set(null);
  }

  /**
   * Wymuszenie wyczyszczenia lokalnego stanu sesji
   * Używane gdy sesja została unieważniona po stronie serwera
   */
  clearSession(): void {
    this._user.set(null);
    this._isInitialized.set(true);
  }

  /**
   * Odświeżenie sesji (opcjonalne - Supabase robi to automatycznie)
   */
  async refreshSession(): Promise<void> {
    await this.initializeSession();
  }
}
