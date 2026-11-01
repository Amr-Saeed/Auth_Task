import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { PasswordRule } from '../../common/password-rule.js';
import { normalizeEmail, trim } from '../../common/transformers.js';

export class SignUpDto {
  @Transform(normalizeEmail)
  @IsEmail({}, { message: 'Email must be a valid email address' })
  @MaxLength(254)
  email: string;

  @Transform(trim)
  @IsString()
  @MinLength(3, { message: 'Name must be at least 3 characters' })
  @MaxLength(50, { message: 'Name must be at most 50 characters' })
  name: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(72, { message: 'Password must be at most 72 characters' })
  @PasswordRule(
    'hasLetter',
    /[A-Za-z]/,
    'Password must contain at least one letter',
  )
  @PasswordRule('hasNumber', /\d/, 'Password must contain at least one number')
  @PasswordRule(
    'hasSpecialChar',
    /[^A-Za-z0-9]/,
    'Password must contain at least one special character',
  )
  password: string;
}
