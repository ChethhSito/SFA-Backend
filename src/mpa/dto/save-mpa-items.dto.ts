import { IsArray, IsObject } from 'class-validator';

export class SaveMpaItemsDto {
  @IsArray() @IsObject({ each: true }) items: Record<string, unknown>[];
}
