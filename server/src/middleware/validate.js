const { ValidationError } = require('../errors');

function validate(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const fieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path.join('.') || 'root';
        fieldErrors[field] = issue.message;
      }
      return next(new ValidationError('Validation failed', fieldErrors));
    }

    req.body = result.data;
    next();
  };
}

module.exports = validate;
