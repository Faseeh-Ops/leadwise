import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AnyZodObject, ZodError } from 'zod';

type ValidateTarget = 'body' | 'query' | 'params';

/**
 * Middleware factory that validates req[target] against a Zod schema.
 * Mutates req[target] with the parsed (coerced + stripped) value.
 */
export function validate(
  schema: AnyZodObject,
  target: ValidateTarget = 'body',
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req[target]);
      // Replace with coerced/stripped value
      (req as any)[target] = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(422).json({
          success: false,
          message: 'Validation failed',
          errors: err.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
        return;
      }
      next(err);
    }
  };
}
