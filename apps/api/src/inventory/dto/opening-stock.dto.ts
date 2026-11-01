import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

const QUANTITY = /^\d{1,9}(?:\.\d{1,3})?$/;
const UNIT_COST = /^\d{1,10}(?:\.\d{1,2})?$/;

export class OpeningStockDto {
  @IsString()
  @Matches(QUANTITY, {
    message: 'Quantity must be a positive decimal with up to 3 decimal places',
  })
  quantity!: string;

  @IsOptional()
  @Matches(UNIT_COST, {
    message:
      'Unit cost must be a non-negative decimal with up to 2 decimal places',
  })
  unitCost?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
