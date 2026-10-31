import { IsEmail, IsString, Length, MaxLength } from 'class-validator';
export class AuthDto {
  @IsEmail() @MaxLength(254)
  email: string;
  @IsString() @Length(1, 72)
  password: string;
}
