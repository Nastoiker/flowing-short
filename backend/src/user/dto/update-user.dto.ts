import { IsOptional, IsString, Length, MaxLength } from 'class-validator';
export class UpdateUserDto {
  @IsOptional() @IsString() @Length(2,80) login?: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @IsOptional() @IsString() @Length(8,72) password?: string;
  @IsOptional() @IsString() @MaxLength(72) oldpassword?: string;
}
