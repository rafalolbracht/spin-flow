import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { HttpErrorInterceptor } from '../interceptors/http-error.interceptor';

export const httpProviders = [
  provideHttpClient(withInterceptors([HttpErrorInterceptor])),
  MessageService,
];

