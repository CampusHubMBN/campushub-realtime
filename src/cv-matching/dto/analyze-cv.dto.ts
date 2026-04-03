import { IsString, IsNotEmpty } from 'class-validator';

export class AnalyzeCvDto {
  @IsString()
  @IsNotEmpty()
  rawText!: string;
}
