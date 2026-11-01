import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const DECIMAL_2_PLACES = /^\d{1,10}(?:\.\d{1,2})?$/;
const GST_RATE = /^(?:100(?:\.0{1,2})?|[0-9]{1,2}(?:\.\d{1,2})?)$/;

export class CreateProductDto {
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  sku?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  barcode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  unit?: string;

  @Matches(DECIMAL_2_PLACES, {
    message:
      'Selling price must be a non-negative decimal with up to 2 decimal places',
  })
  sellingPrice!: string;

  @IsOptional()
  @Matches(DECIMAL_2_PLACES, {
    message:
      'Purchase price must be a non-negative decimal with up to 2 decimal places',
  })
  purchasePrice?: string;

  @IsOptional()
  @Matches(GST_RATE, {
    message: 'GST rate must be a percentage between 0 and 100',
  })
  gstRate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  hsnCode?: string;
}
