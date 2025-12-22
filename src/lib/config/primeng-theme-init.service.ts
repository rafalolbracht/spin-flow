import { Injectable, inject } from '@angular/core';
import { PrimeNG } from 'primeng/config';
import { PrimeNGPreset, PrimeNGOptions } from './primeng.config';

@Injectable({
  providedIn: 'root',
})
export class PrimeNGThemeInitService {
  private readonly primeng = inject(PrimeNG);
  private initialized = false;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    if (this.initialized) return;

    this.primeng.theme.set({
      preset: PrimeNGPreset,
      options: PrimeNGOptions,
    });

    this.initialized = true;
  }
}

