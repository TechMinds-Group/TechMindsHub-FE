import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const isExternalUrl =
    (req.url.startsWith('http://') || req.url.startsWith('https://')) &&
    !req.url.startsWith(environment.apiUrl);

  if (isExternalUrl) {
    return next(req);
  }

  const tenantId = localStorage.getItem('tenant_id');

  if (tenantId) {
    const tenantReq = req.clone({
      headers: req.headers.set('X-Tenant-Id', tenantId),
      withCredentials: true,
    });
    return next(tenantReq);
  }

  const credentialsReq = req.clone({
    withCredentials: true,
  });
  return next(credentialsReq);
};
