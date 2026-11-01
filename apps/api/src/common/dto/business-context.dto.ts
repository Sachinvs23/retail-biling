import { IsString, MaxLength, MinLength } from 'class-validator';

export class BusinessContextDto {
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  businessId!: string;
}
