import { IsObject, IsNotEmpty } from 'class-validator';

export class MatchCvDto {
  @IsObject()
  @IsNotEmpty()
  cv: {
    rawText: string;
    skills: string[];
    experience: string[];
    education: string[];
    languages: string[];
  };
}
