import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpErrorInterceptor } from '../interceptors/http-error.interceptor';

export const httpProviders = provideHttpClient(
  withInterceptors([HttpErrorInterceptor]),
);

