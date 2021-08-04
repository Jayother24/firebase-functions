// The MIT License (MIT)
//
// Copyright (c) 2021 Firebase
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import * as cors from 'cors';
import * as express from 'express';

import * as common from '../../common/providers/https';
import * as options from '../options';

export type Request = common.Request;

export type CallableContext = common.CallableContext;
export type FunctionsErrorCode = common.FunctionsErrorCode;
export type HttpsError = common.HttpsError;

export interface HttpsOptions extends Omit<options.GlobalOptions, 'region'> {
  region?:
    | options.SupportedRegion
    | string
    | Array<options.SupportedRegion | string>;
  cors?: string | boolean;
}

export type HttpsHandler = (
  request: Request,
  response: express.Response
) => void | Promise<void>;
export type CallableHandler<T, Ret> = (
  data: T,
  context: CallableContext
) => Ret;

export type HttpsFunction = HttpsHandler & { __trigger: unknown };
export interface CallableFunction<T, Ret> extends HttpsHandler {
  __trigger: unknown;
  run(data: T, context: CallableContext): Ret;
}

export function onRequest(
  opts: HttpsOptions,
  handler: HttpsHandler
): HttpsFunction;
export function onRequest(handler: HttpsHandler): HttpsFunction;
export function onRequest(
  optsOrHandler: HttpsOptions | HttpsHandler,
  handler?: HttpsHandler
): HttpsFunction {
  let opts: HttpsOptions;
  if (arguments.length === 1) {
    opts = {};
    handler = optsOrHandler as HttpsHandler;
  } else {
    opts = optsOrHandler as HttpsOptions;
  }

  if ('cors' in opts) {
    const userProvidedHandler = handler;
    handler = (req: Request, res: express.Response) => {
      cors({ origin: opts.cors })(req, res, () => {
        userProvidedHandler(req, res);
      });
    };
  }
  Object.defineProperty(handler, '__trigger', {
    get: () => {
      const baseOpts = options.optionsToTriggerAnnotations(
        options.getGlobalOptions()
      );
      // global options calls region a scalar and https allows it to be an array,
      // but optionsToTriggerAnnotations handles both cases.
      const specificOpts = options.optionsToTriggerAnnotations(
        opts as options.GlobalOptions
      );
      return {
        // TODO(inlined): Remove "apiVersion" once the latest version of the CLI
        // has migrated to "platform".
        apiVersion: 2,
        platform: 'gcfv2',
        ...baseOpts,
        ...specificOpts,
        labels: {
          ...baseOpts?.labels,
          ...specificOpts?.labels,
        },
        httpsTrigger: {
          allowInsecure: false,
        },
      };
    },
  });
  return handler as HttpsFunction;
}

export function onCall<T = unknown, Ret = any | Promise<any>>(
  opts: HttpsOptions,
  handler: CallableHandler<T, Ret>
): CallableFunction<T, Ret>;
export function onCall<T = unknown, Ret = any | Promise<any>>(
  handler: CallableHandler<T, Ret>
): CallableFunction<T, Ret>;
export function onCall<T = unknown, Ret = any | Promise<any>>(
  optsOrHandler: HttpsOptions | CallableHandler<T, Ret>,
  handler?: CallableHandler<T, Ret>
): CallableFunction<T, Ret> {
  let opts: HttpsOptions;
  if (arguments.length == 1) {
    opts = {};
    handler = optsOrHandler as CallableHandler<T, Ret>;
  } else {
    opts = optsOrHandler as HttpsOptions;
  }

  const origin = 'cors' in opts ? opts.cors : true;
  const func: any = common.onCallHandler({ origin, methods: 'POST' }, handler);

  Object.defineProperty(func, '__trigger', {
    get: () => {
      const baseOpts = options.optionsToTriggerAnnotations(
        options.getGlobalOptions()
      );
      // global options calls region a scalar and https allows it to be an array,
      // but optionsToTriggerAnnotations handles both cases.
      const specificOpts = options.optionsToTriggerAnnotations(
        opts as options.GlobalOptions
      );
      return {
        // TODO(inlined): Remove "apiVersion" once the latest version of the CLI
        // has migrated to "platform".
        apiVersion: 2,
        platform: 'gcfv2',
        ...baseOpts,
        ...specificOpts,
        labels: {
          ...baseOpts?.labels,
          ...specificOpts?.labels,
          'deployment-callable': 'true',
        },
        httpsTrigger: {
          allowInsecure: false,
        },
      };
    },
  });

  func.run = handler;
  return func;
}