import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthGuard } from '@nestjs/passport';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new JwtAuthGuard(reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow activation when route is marked public', async () => {
    const mockContext = {
      getHandler: () => {},
      getClass: () => {},
    } as unknown as ExecutionContext;

    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

    const result = await guard.canActivate(mockContext);
    expect(result).toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
      mockContext.getHandler(),
      mockContext.getClass(),
    ]);
  });

  it('should call super.canActivate when route is not marked public', async () => {
    const mockContext = {
      getHandler: () => {},
      getClass: () => {},
      switchToHttp: () => ({
        getRequest: () => ({ user: { emailVerified: true } }),
      }),
    } as unknown as ExecutionContext;

    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

    // Spy on the parent class's canActivate method.
    // AuthGuard('jwt') returns a class whose prototype has canActivate.
    const superCanActivateSpy = jest
      .spyOn(AuthGuard('jwt').prototype, 'canActivate')
      .mockReturnValue(true);

    const result = await guard.canActivate(mockContext);
    expect(result).toBe(true);
    expect(superCanActivateSpy).toHaveBeenCalledWith(mockContext);

    superCanActivateSpy.mockRestore();
  });
});
