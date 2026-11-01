import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const DECIMAL_2_PLACES = /^\d{1,10}(?:\.\d{1,2})?$/;
const GST_RATE = /^(?:100(?:\.0{1,2})?|[0-9]{1,2}(?:\.\d{1,2})?)$/;

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  sku?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  barcode?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  unit?: string;

  @IsOptional()
  @Matches(DECIMAL_2_PLACES)
  sellingPrice?: string;

  @IsOptional()
  @Matches(DECIMAL_2_PLACES)
  purchasePrice?: string;

  @IsOptional()
  @Matches(GST_RATE)
  gstRate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  hsnCode?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
