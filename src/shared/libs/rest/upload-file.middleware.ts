import { RequestHandler } from 'express';
import { mkdir, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import multer from 'multer';
import { extension } from 'mime-types';
import { nanoid } from 'nanoid';
import { Middleware } from './middleware.interface.js';
import { HttpError } from './http-error.js';

export class UploadFileMiddleware implements Middleware {
  private readonly upload: RequestHandler;

  constructor(directory: string, field: string, allowedTypes: string[] = ['image/jpeg', 'image/png']) {
    const destination = resolve(directory);
    this.upload = multer({
      storage: multer.diskStorage({
        destination: (_request, _file, callback) => {
          mkdir(destination, { recursive: true }).then(() => callback(null, destination), (error: Error) => callback(error, destination));
        },
        filename: (_request, file, callback) => {
          const suffix = extension(file.mimetype);
          if (!suffix) {
            callback(new HttpError(415, 'Unsupported file type'), '');
            return;
          }
          callback(null, `${nanoid()}.${suffix}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0 },
      fileFilter: (_request, file, callback) => {
        if (!allowedTypes.includes(file.mimetype)) {
          callback(new HttpError(415, 'Only JPEG and PNG images are supported'));
          return;
        }
        callback(null, true);
      },
    }).single(field);
  }

  public execute: RequestHandler = async (request, response, next) => {
    await new Promise<void>((resolveUpload, reject) => {
      this.upload(request, response, (error) => error ? reject(error) : resolveUpload());
    });
    const file = request.file;
    if (!file) {
      throw new HttpError(400, 'File is required');
    }
    // A later database check or handler may fail after multer has saved the file.
    response.once('close', () => {
      if (!response.writableFinished || response.statusCode >= 400) {
        void unlink(file.path).catch(() => undefined);
      }
    });
    next();
  };
}
