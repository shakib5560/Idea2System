import { ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { firstValueFrom, Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  /**
   * Evaluates if the route should allow access.
   * Checks for @Public() metadata on both the handler (method) and controller (class) level.
   * If marked public, bypasses JWT authentication. Otherwise, runs JwtStrategy checks.
   * Also verifies that the user's email is verified.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const result = super.canActivate(context);
    let canActivateParent = false;
    
    if (typeof result === 'boolean') {
      canActivateParent = result;
    } else if (result instanceof Observable) {
      canActivateParent = await firstValueFrom(result);
    } else {
      canActivateParent = await result;
    }

    if (!canActivateParent) {
      return false;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user && !user.emailVerified) {
      throw new ForbiddenException('Please verify your email address to access this resource.');
    }

    return true;
  }
}
