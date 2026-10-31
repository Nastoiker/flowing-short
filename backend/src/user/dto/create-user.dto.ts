import { IsEmail, IsOptional, IsString, Length, MaxLength } from 'class-validator';
export class CreateUserDto {
  @IsOptional() @IsString() @MaxLength(80)
  authorUrl?: string;
  @IsEmail() @MaxLength(254)
  email: string;
  @IsString() @Length(2, 80)
  login: string;
  @IsOptional() @IsString() @MaxLength(30)
  phone?: string | null;
  // Legacy API field name: AuthService hashes this submitted password.
  @IsString() @Length(8, 72)
  hashpassword: string;
}
