import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateStoreDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Matches(/^\s*\S[\s\S]*\S\s*$/, {
    message: 'storeName must contain at least two non-whitespace characters',
  })
  storeName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  storeCode?: string;
}
