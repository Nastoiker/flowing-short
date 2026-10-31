import { IsOptional, IsString, MaxLength } from 'class-validator';
export class VideoModel {
  @IsOptional() @IsString() @MaxLength(200) name?: string;
  @IsOptional() @IsString() @MaxLength(200) Title?: string;
  @IsOptional() @IsString() @MaxLength(5000) Description?: string;
}
