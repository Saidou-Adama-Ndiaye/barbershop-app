// .\.\apps\api\src\modules\auth\decorators\public.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
// Marque une route comme publique (bypass JwtAuthGuard)
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
