import { Request, Response } from 'express';
import { plainToInstance } from 'class-transformer';
import { inject, injectable } from 'inversify';
import { Component } from '../../container/component.js';
import { Controller } from '../../libs/rest/controller.js';
import { HttpMethod } from '../../libs/rest/route.interface.js';
import { toResponse } from '../../libs/rest/response.js';
import { ValidateDataMiddleware } from '../../libs/rest/validate-data.middleware.js';
import { CreateUserDto } from './create-user.dto.js';
import { UserService } from './user.service.js';
import { UserRdo } from './rdo/user.rdo.js';
import { HttpError } from '../../libs/rest/http-error.js';
import { Config } from '../../libs/config/config.interface.js';
import { DocumentExistsMiddleware } from '../../libs/rest/document-exists.middleware.js';
import { ValidateObjectIdMiddleware } from '../../libs/rest/validate-object-id.middleware.js';
import { UploadFileMiddleware } from '../../libs/rest/upload-file.middleware.js';

@injectable()
export class UserController extends Controller {
  constructor(
    @inject(Component.UserService) private readonly users: UserService,
    @inject(Component.Config) config: Config,
  ) {
    super();
    this.addRoute({ path: '/:userId/avatar', method: HttpMethod.Post, handler: this.uploadAvatar,
      middleware: [new ValidateObjectIdMiddleware('userId'),
        new UploadFileMiddleware(config.get('UPLOAD_DIRECTORY'), 'avatar'),
        new DocumentExistsMiddleware(users, 'userId', 'params', 'User')] });
    this.addRoute({ path: '/', method: HttpMethod.Post, handler: this.create, middleware: [new ValidateDataMiddleware(CreateUserDto)] });
  }

  private async uploadAvatar(request: Request, response: Response): Promise<void> {
    const file = request.file;
    if (!file) {
      throw new HttpError(400, 'File is required');
    }
    const user = await this.users.updateAvatar(request.params.userId, `/uploads/${file.filename}`);
    this.ok(response, toResponse(UserRdo, user));
  }

  private async create(request: Request<Record<string, string>, unknown, CreateUserDto>, response: Response): Promise<void> {
    const dto = plainToInstance(CreateUserDto, request.body);
    const user = await this.users.create(dto);
    this.created(response, toResponse(UserRdo, user));
  }
}
