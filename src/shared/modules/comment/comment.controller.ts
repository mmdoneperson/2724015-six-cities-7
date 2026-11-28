import { Request, Response } from 'express';
import { inject, injectable } from 'inversify';
import { Component } from '../../container/component.js';
import { Controller } from '../../libs/rest/controller.js';
import { HttpMethod } from '../../libs/rest/route.interface.js';
import { ValidateDataMiddleware } from '../../libs/rest/validate-data.middleware.js';
import { ValidateObjectIdMiddleware } from '../../libs/rest/validate-object-id.middleware.js';
import { toResponse, toResponseList } from '../../libs/rest/response.js';
import { CommentService } from './comment.service.js';
import { CreateCommentDto } from './create-comment.dto.js';
import { CommentRdo } from './comment.rdo.js';
import { DocumentExistsMiddleware } from '../../libs/rest/document-exists.middleware.js';
import { UserService } from '../user/user.service.js';
import { OfferService } from '../offer/offer.service.js';

@injectable()
export class CommentController extends Controller {
  constructor(
    @inject(Component.CommentService) private readonly comments: CommentService,
    @inject(Component.OfferService) offers: OfferService,
    @inject(Component.UserService) users: UserService,
  ) {
    super();
    const offerExists = new DocumentExistsMiddleware(offers, 'offerId', 'params', 'Offer');
    const id = new ValidateObjectIdMiddleware('offerId');
    this.addRoute({ path: '/:offerId/comments', method: HttpMethod.Get, handler: this.index, middleware: [id, offerExists] });
    this.addRoute({ path: '/:offerId/comments', method: HttpMethod.Post, handler: this.create,
      middleware: [id, new ValidateDataMiddleware(CreateCommentDto), offerExists,
        new DocumentExistsMiddleware(users, 'author', 'body', 'User')] });
  }

  private async index(request: Request, response: Response): Promise<void> {
    this.ok(response, toResponseList(CommentRdo, await this.comments.findByOfferId(request.params.offerId)));
  }

  private async create(request: Request, response: Response): Promise<void> {
    this.created(response, toResponse(CommentRdo, await this.comments.create({
      ...request.body, offer: request.params.offerId,
    })));
  }
}
