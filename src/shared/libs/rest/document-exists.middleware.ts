import { RequestHandler } from 'express';
import { DocumentExists } from './document-exists.interface.js';
import { Middleware } from './middleware.interface.js';
import { HttpError } from './http-error.js';

export class DocumentExistsMiddleware implements Middleware {
  constructor(
    private readonly service: DocumentExists,
    private readonly parameter: string,
    private readonly source: 'params' | 'body' | 'query' = 'params',
    private readonly entity = 'Document',
    private readonly optional = false,
  ) {}

  public execute: RequestHandler = async (request, _response, next) => {
    const id = request[this.source][this.parameter];
    if (id === undefined && this.optional) {
      next();
      return;
    }
    if (!await this.service.exists(id as string)) {
      throw new HttpError(404, `${this.entity} not found`);
    }
    next();
  };
}
