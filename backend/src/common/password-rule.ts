import { ValidateBy, ValidationOptions } from 'class-validator';

export function PasswordRule(
  name: string,
  pattern: RegExp,
  message: string,
  options?: ValidationOptions,
): PropertyDecorator {
  return ValidateBy(
    {
      name,
      validator: {
        validate: (value: unknown) =>
          typeof value === 'string' && pattern.test(value),
        defaultMessage: () => message,
      },
    },
    options,
  );
}
