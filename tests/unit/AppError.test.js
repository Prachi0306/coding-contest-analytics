const AppError = require('../../src/utils/AppError');

describe('AppError Utility', () => {
  it('should instantiate correctly with defaults', () => {
    const error = new AppError('Default error');
    
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('AppError');
    expect(error.message).toBe('Default error');
    expect(error.statusCode).toBe(500);
    expect(error.isOperational).toBe(true);
    expect(error.timestamp).toBeDefined();
  });

  it('should correctly set status codes via factory methods', () => {
    const badRequest = AppError.badRequest();
    expect(badRequest.statusCode).toBe(400);

    const unauthorized = AppError.unauthorized();
    expect(unauthorized.statusCode).toBe(401);

    const notFound = AppError.notFound();
    expect(notFound.statusCode).toBe(404);

    const internal = AppError.internal();
    expect(internal.statusCode).toBe(500);
    expect(internal.isOperational).toBe(false);
  });

  it('should serialize to JSON correctly', () => {
    const error = AppError.conflict('Already exists');
    const json = error.toJSON();

    expect(json).toHaveProperty('name', 'AppError');
    expect(json).toHaveProperty('message', 'Already exists');
    expect(json).toHaveProperty('statusCode', 409);
    expect(json).toHaveProperty('isOperational', true);
    expect(json).toHaveProperty('timestamp');
  });
});
