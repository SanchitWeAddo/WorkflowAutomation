/**
 * Zod validation middleware.
 *
 * Validates req.body against the provided Zod schema.
 * On success, replaces req.body with the parsed (and coerced) data.
 * On failure, returns a 400 response with structured error details.
 *
 * Usage:
 *   router.post('/tasks', validate(createTaskSchema), handler);
 */
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
        })),
      });
    }

    req.body = result.data;
    next();
  };
}

module.exports = { validate };
