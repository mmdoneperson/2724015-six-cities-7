import { Request, Response } from 'express';
import { plainToInstance } from 'class-transformer';
import { inject, injectable } from 'inversify';
import { Component } from '../../container/component.js';
import { Controller } from '../../libs/rest/controller.js';
import { HttpMethod } from '../../libs/rest/route.interface.js';
import { toResponse, toResponseList } from '../../libs/rest/response.js';
import { ValidateDataMiddleware } from '../../libs/rest/validate-data.middleware.js';
import { ValidateObjectIdMiddleware } from '../../libs/rest/validate-object-id.middleware.js';
import { OfferQueryDto, PremiumQueryDto, FavoriteQueryDto } from './offer-query.dto.js';
import { CreateOfferDto } from './create-offer.dto.js';
import { UpdateOfferDto } from './update-offer.dto.js';
import { City } from './offer.entity.js';
import { OfferService } from './offer.service.js';
import { OfferRdo, OfferSummaryRdo } from './rdo/offer.rdo.js';
import { DocumentExistsMiddleware } from '../../libs/rest/document-exists.middleware.js';
import { UserService } from '../user/user.service.js';

@injectable()
export class OfferController extends Controller {
  constructor(
    @inject(Component.OfferService) private readonly offers: OfferService,
    @inject(Component.UserService) users: UserService,
  ) {
    super();
    const offerExists = new DocumentExistsMiddleware(offers, 'id', 'params', 'Offer');
    const userExists = new DocumentExistsMiddleware(users, 'userId', 'query', 'User');
    const optionalUser = new DocumentExistsMiddleware(users, 'userId', 'query', 'User', true);
    const id = new ValidateObjectIdMiddleware('id');
    const query = new ValidateDataMiddleware(OfferQueryDto, 'query');
    const favoriteQuery = new ValidateDataMiddleware(FavoriteQueryDto, 'query');
    this.addRoute({ path: '/', method: HttpMethod.Get, handler: this.index, middleware: [query, optionalUser] });
    this.addRoute({ path: '/premium', method: HttpMethod.Get, handler: this.premium,
      middleware: [new ValidateDataMiddleware(PremiumQueryDto, 'query'), optionalUser] });
    this.addRoute({ path: '/favorites', method: HttpMethod.Get, handler: this.favorites, middleware: [favoriteQuery, userExists] });
    this.addRoute({ path: '/', method: HttpMethod.Post, handler: this.create,
      middleware: [new ValidateDataMiddleware(CreateOfferDto), new DocumentExistsMiddleware(users, 'author', 'body', 'User')] });
    this.addRoute({ path: '/:id', method: HttpMethod.Get, handler: this.show, middleware: [id, query, offerExists, optionalUser] });
    this.addRoute({ path: '/:id', method: HttpMethod.Patch, handler: this.update,
      middleware: [id, new ValidateDataMiddleware(UpdateOfferDto), offerExists] });
    this.addRoute({ path: '/:id', method: HttpMethod.Delete, handler: this.delete, middleware: [id, offerExists] });
    this.addRoute({ path: '/:id/favorite', method: HttpMethod.Post, handler: this.addFavorite, middleware: [id, favoriteQuery, offerExists, userExists] });
    this.addRoute({ path: '/:id/favorite', method: HttpMethod.Delete, handler: this.removeFavorite, middleware: [id, favoriteQuery, offerExists, userExists] });
  }

  private async index(request: Request, response: Response): Promise<void> {
    const count = request.query.count === undefined ? undefined : Number(request.query.count);
    this.ok(response, toResponseList(OfferSummaryRdo, await this.offers.find(count, request.query.userId as string | undefined)));
  }

  private async premium(request: Request, response: Response): Promise<void> {
    this.ok(response, toResponseList(OfferSummaryRdo,
      await this.offers.findPremium(request.query.city as City, request.query.userId as string | undefined)));
  }

  private async favorites(request: Request, response: Response): Promise<void> {
    this.ok(response, toResponseList(OfferSummaryRdo, await this.offers.findFavorites(request.query.userId as string)));
  }

  private async show(request: Request, response: Response): Promise<void> {
    const offer = await this.offers.findById(request.params.id, request.query.userId as string | undefined);
    this.ok(response, toResponse(OfferRdo, offer));
  }

  private async create(request: Request<Record<string, string>, unknown, CreateOfferDto>, response: Response): Promise<void> {
    const dto = plainToInstance(CreateOfferDto, request.body);
    this.created(response, toResponse(OfferRdo, await this.offers.create(dto)));
  }

  private async update(request: Request<Record<string, string>, unknown, UpdateOfferDto>, response: Response): Promise<void> {
    const dto = plainToInstance(UpdateOfferDto, request.body);
    const offer = await this.offers.update(request.params.id, dto);
    this.ok(response, toResponse(OfferRdo, offer));
  }

  private async delete(request: Request, response: Response): Promise<void> {
    await this.offers.delete(request.params.id);
    this.noContent(response);
  }

  private async addFavorite(request: Request, response: Response): Promise<void> {
    this.ok(response, toResponse(OfferRdo, await this.offers.setFavorite({
      offerId: request.params.id, userId: request.query.userId as string, isFavorite: true,
    })));
  }

  private async removeFavorite(request: Request, response: Response): Promise<void> {
    this.ok(response, toResponse(OfferRdo, await this.offers.setFavorite({
      offerId: request.params.id, userId: request.query.userId as string, isFavorite: false,
    })));
  }
}
