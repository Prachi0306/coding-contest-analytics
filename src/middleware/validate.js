const AppError = require('../utils/AppError');


const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const dataToValidate = req[source];

    if (!dataToValidate && source === 'body') {
      return next(AppError.badRequest('Request body is required'));
    }

    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const details = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/"/g, ''),
        type: detail.type,
      }));

      const message = details.map((d) => d.message).join('; ');
      const appError = AppError.validation(`Validation failed: ${message}`);

      appError.details = details;
      return next(appError);
    }

    req[source] = value;
    return next();
  };
};


const validateMultiple = (schemas) => {
  return (req, res, next) => {
    const allDetails = [];

    for (const [source, schema] of Object.entries(schemas)) {
      if (!['body', 'query', 'params'].includes(source)) {
        continue;
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
