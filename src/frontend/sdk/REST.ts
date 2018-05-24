/* @flow */

import superagent from 'superagent';
import * as Constants from "./Constants";
import { Authenticator } from './Authenticator';

type HTTPMethod = 'get' | 'post' | 'put' | 'patch' | 'del';

type HTTPHeaders = {[key: string]: string};

type HTTPRequest = {
  url: string,
  query?: {[key: string]: any} | string,
  body?: any,
  headers?: HTTPHeaders,
};

type HTTPResponse = {
  status: number,
  headers: HTTPHeaders,
  body: any,
};

type HTTPError = {
  err: Error,
};

type HTTPResponseCallback = (res: ({ok: boolean} & HTTPResponse) | ({ok: boolean} & HTTPError)) => void;

export interface Response {
    headers: {
        [key: string]: string
    };
    body: any;
    status: number;
}

function sendRequest(method: HTTPMethod, opts: HTTPRequest, resolve: (res: Response) => any, reject: (res: Response) => any) {
  const r = superagent[method](opts.url);
  if (opts.url.startsWith("/") && Authenticator.loggedIn) {
      if (opts.headers) {
          opts.headers.Authorization = Authenticator.authToken;
      } else {
          opts.headers = {
              Authorization: Authenticator.authToken
          }
      }
  }
  if (opts.query) {
    r.query(opts.query);
  }
  if (opts.body) {
    r.send(opts.body);
  }
  if (opts.headers) {
    r.set(opts.headers);
  }

  r.on('error', (err: any) => {
    reject(err.response && err.response.body || err);
  });
  r.end((err, res) => {
    const newRes = {
      headers: (res as any).headers,
      body: res.body,
      status: res.status,
    };

    if (res.ok) {
      resolve(newRes);
    } else {
      reject(newRes);
    }
  });
}

function makeRequest(
  method: HTTPMethod,
  opts: string | HTTPRequest
): Promise<HTTPResponse> {
  return new Promise((resolve, reject) => {
    if (typeof opts === 'string') {
      opts = {url: opts};
    }
    sendRequest(method, opts, resolve, reject);
  });
}

export type HTTPFunction = (req: string | HTTPRequest) => Promise<HTTPResponse>;

export default {
  get: makeRequest.bind(null, 'get') as HTTPFunction,
  post: makeRequest.bind(null, 'post') as HTTPFunction,
  put: makeRequest.bind(null, 'put') as HTTPFunction,
  patch: makeRequest.bind(null, 'patch') as HTTPFunction,
  delete: makeRequest.bind(null, 'del') as HTTPFunction
};
