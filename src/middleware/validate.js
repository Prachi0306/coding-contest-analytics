const AppError = require('../utils/AppError');

/**
 * Generic request validation middleware.
 * Accepts a Joi schema object whose keys correspond to the request properties
 * to validate (body, query, params).
 *
 * Usage:
 *   const { authSchemas } = require('../validations');
 *   router.post('/register', validate(authSchemas.register), controller.register);
 *
 * @param {import('joi').ObjectSchema} schema - Joi schema for the request part(s) to validate
 * @param {string} [source='body'] - Which part of req to validate: 'body' | 'query' | 'params'
 * @returns {Function} Express middleware
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const dataToValidate = req[source];

    if (!dataToValidate && source === 'body') {
      return next(AppError.badRequest('Request body is required'));
    }

    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,       // Collect all errors, not just the first one
      stripUnknown: true,      // Remove unknown fields for security
      convert: true,           // Allow type coercion (e.g. string → number)
    });

    if (error) {
      const details = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/"/g, ''),
        type: detail.type,
      }));

      const message = details.map((d) => d.message).join('; ');
      const appError = AppError.validation(`Validation failed: ${message}`);

      // Attach structured details for richer client-side handling
      appError.details = details;
      return next(appError);
    }

    // Replace the request source with the validated (and sanitized) data
    req[source] = value;
    return next();
  };
};

/**
 * Validate multiple request sources at once.
 * Accepts an object with keys: body, query, params — each mapped to a Joi schema.
 *
 * Usage:
 *   router.get('/users/:id/stats',
 *     validateMultiple({
 *       params: commonSchemas.objectIdParam,
 *       query: statsSchemas.filterQuery,
 *     }),
 *     controller.getUserStats
 *   );
 *
 * @param {Object} schemas - Object with keys (body|query|params) mapped to Joi schemas
 * @returns {Function} Express middleware
 */
const validateMultiple = (schemas) => {
  return (req, res, next) => {
    const allDetails = [];

    for (const [source, schema] of Object.entries(schemas)) {
      if (!['body', 'query', 'params'].includes(source)) {
        continue; // Skip invalid sources silently
      }

      const { error, value } = schema.validate(req[source], {
        abortEarly: false,
        stripUnknown: true,
        convert: true,
      });

      if (error) {
        const details = error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message.replace(/"/g, ''),
          type: detail.type,
          source,
        }));
        allDetails.push(...details);
      } else {
        req[source] = value;
      }
    }

    if (allDetails.length > 0) {
      const message = allDetails.map((d) => d.message).join('; ');
      const appError = AppError.validation(`Validation failed: ${message}`);
      appError.details = allDetails;
      return next(appError);
    }

    return next();
  };
};

module.exports = { validate, validateMultiple };
