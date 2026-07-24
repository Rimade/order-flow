import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlContextType, GqlExecutionContext } from '@nestjs/graphql';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { IS_PUBLIC_KEY, PUBLIC_AUTH_PATHS } from '../../common/constants';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  getRequest(context: ExecutionContext): Request {
    if (context.getType<GqlContextType>() === 'graphql') {
      const gqlCtx = GqlExecutionContext.create(context);
      return gqlCtx.getContext<{ req: Request }>().req;
    }

    return context.switchToHttp().getRequest<Request>();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = this.getRequest(context);

    // Apollo Sandbox landing page (GET) — queries still require JWT
    if (
      context.getType() === 'http' &&
      request.method === 'GET' &&
      (request.path === '/graphql' || request.path.startsWith('/graphql'))
    ) {
      return true;
    }

    if (
      request.path.startsWith('/docs') ||
      request.path === '/docs-json' ||
      request.path === '/docs-yaml'
    ) {
      return true;
    }

    if (PUBLIC_AUTH_PATHS.has(request.path)) {
      return true;
    }

    return super.canActivate(context);
  }
}
