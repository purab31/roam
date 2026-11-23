const { ValidationError } = require('../errors');

function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const dataToValidate = source === 'query' ? req.query : req.body;
    const result = schema.safeParse(dataToValidate);

    if (!result.success) {
      const fieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path.join('.') || 'root';
        fieldErrors[field] = issue.message;
      }
      return next(new ValidationError('Validation failed', fieldErrors));
    }

    if (source === 'query') {
      req.validatedQuery = result.data;
    } else {
      req.body = result.data;
    }
    next();
  };
}

module.exports = validate;
