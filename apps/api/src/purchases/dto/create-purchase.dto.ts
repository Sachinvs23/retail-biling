import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsDateString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreatePurchaseItemDto } from './create-purchase-item.dto.js';

export class CreatePurchaseDto {
  @IsString()
  @MaxLength(30)
  storeId!: string;

  @IsString()
  @MaxLength(30)
  supplierId!: string;

  @IsString()
  @MaxLength(100)
  invoiceNumber!: string;

  @IsDateString()
  invoiceDate!: string;

  @IsIn(['GST_EXCLUSIVE', 'GST_INCLUSIVE'])
  priceMode!: 'GST_EXCLUSIVE' | 'GST_INCLUSIVE';

  @IsIn(['CGST_SGST', 'IGST'])
  taxType!: 'CGST_SGST' | 'IGST';

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseItemDto)
  items!: CreatePurchaseItemDto[];
}
