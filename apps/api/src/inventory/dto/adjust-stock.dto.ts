import {
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

const QUANTITY = /^\d{1,9}(?:\.\d{1,3})?$/;

export class AdjustStockDto {
  @IsIn(['ADJUSTMENT_IN', 'ADJUSTMENT_OUT'])
  type!: 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT';

  @Matches(QUANTITY, {
    message: 'Quantity must be a positive decimal with up to 3 decimal places',
  })
  quantity!: string;

  @IsString()
  @MaxLength(500)
  note!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  referenceId?: string;
}
