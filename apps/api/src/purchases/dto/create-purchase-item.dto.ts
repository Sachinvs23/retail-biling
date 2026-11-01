import { IsString, Matches, MaxLength } from 'class-validator';

export class CreatePurchaseItemDto {
  @IsString()
  @MaxLength(30)
  productId!: string;

  @IsString()
  @Matches(/^\d{1,9}(\.\d{1,3})?$/, {
    message: 'Quantity must be a positive decimal with up to 3 decimal places',
  })
  quantity!: string;

  @IsString()
  @Matches(/^\d{1,10}(\.\d{1,2})?$/, {
    message: 'Unit cost must have up to 2 decimal places',
  })
  unitCost!: string;

  @IsString()
  @Matches(/^\d{1,10}(\.\d{1,2})?$/, {
    message: 'Discount must have up to 2 decimal places',
  })
  discountAmount: string = '0';
}
