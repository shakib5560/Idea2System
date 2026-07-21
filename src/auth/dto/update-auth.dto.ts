import { PartialType, OmitType } from '@nestjs/swagger';
import { RegisterDto } from './create-auth.dto';


export class UpdateAuthDto extends PartialType(
  OmitType(RegisterDto, ['password'] as const),
) {}
