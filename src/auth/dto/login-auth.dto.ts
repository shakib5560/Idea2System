import { IsString, IsNotEmpty, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(254)
  identifier!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;
}