import {
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreatePurchasePaymentDto {
  @IsString()
  @Matches(/^\d{1,10}(\.\d{1,2})?$/, {
    message: 'Amount must be a positive value with up to 2 decimal places',
  })
  amount!: string;

  @IsIn(['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'CHEQUE', 'OTHER'])
  method!: 'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER' | 'CHEQUE' | 'OTHER';

  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
