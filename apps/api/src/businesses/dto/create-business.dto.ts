import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateBusinessDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  businessName!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(60)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      'Slug must contain lowercase letters, numbers, and single hyphens only',
  })
  slug!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  storeName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  storeCode?: string;
}
