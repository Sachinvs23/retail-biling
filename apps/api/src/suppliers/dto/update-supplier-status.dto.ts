import { IsBoolean } from 'class-validator';

export class UpdateSupplierStatusDto {
  @IsBoolean()
  isActive!: boolean;
}
