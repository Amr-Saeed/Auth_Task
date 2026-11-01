import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { normalizeEmail } from '../../common/transformers.js';

export class SignInDto {
  @Transform(normalizeEmail)
  @IsEmail({}, { message: 'Email must be a valid email address' })
  @MaxLength(254)
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MaxLength(72)
  password: string;
}
