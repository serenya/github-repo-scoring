import { HttpException, Logger, NotFoundException } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

function makeHost(method = 'GET', url = '/test') {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const response = { status };
  const request = { method, url };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
    json,
    status,
  } as any;
}

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('returns the HTTP status and body for an HttpException', () => {
    const host = makeHost();
    filter.catch(new NotFoundException('repo not found'), host);

    expect(host.status).toHaveBeenCalledWith(404);
    expect(host.json).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
  });

  it('logs HttpException at warn level', () => {
    const warnSpy = jest.spyOn(Logger.prototype, 'warn');
    filter.catch(new HttpException('forbidden', 403), makeHost('POST', '/api/v1/foo'));

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('POST /api/v1/foo → 403'));
  });

  it('returns 500 with a generic message for an unknown Error', () => {
    const host = makeHost();
    filter.catch(new Error('something exploded'), host);

    expect(host.status).toHaveBeenCalledWith(500);
    expect(host.json).toHaveBeenCalledWith({
      statusCode: 500,
      message: 'Internal server error',
      error: 'Internal Server Error',
    });
  });

  it('logs unknown errors at error level with the stack trace', () => {
    const errorSpy = jest.spyOn(Logger.prototype, 'error');
    const err = new Error('boom');
    filter.catch(err, makeHost());

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('500 Unhandled exception'),
      err.stack,
    );
  });

  it('returns 500 safely when a non-Error value is thrown', () => {
    const host = makeHost();
    filter.catch('plain string thrown', host);

    expect(host.status).toHaveBeenCalledWith(500);
    expect(host.json).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500 }));
  });
});
