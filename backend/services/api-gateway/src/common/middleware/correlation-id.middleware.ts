import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { REQUEST_ID_HEADER } from '../constants';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction) {
    const incomingId = request.header(REQUEST_ID_HEADER);
    const requestId =
      typeof incomingId === 'string' && incomingId.length > 0
        ? incomingId
        : randomUUID();

    request.headers[REQUEST_ID_HEADER] = requestId;
    response.setHeader(REQUEST_ID_HEADER, requestId);

    next();
  }
}
