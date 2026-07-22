import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Decorator to bypass global JWT authentication guard.
 * Can be applied on controller classes or individual route handlers.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
