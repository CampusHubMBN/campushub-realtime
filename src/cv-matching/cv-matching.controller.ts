import {
  Controller,
  Post,
  Body,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CvMatchingService } from './cv-matching.service';
import { AnalyzeCvDto } from './dto/analyze-cv.dto';
import { MatchCvDto } from './dto/match-cv.dto';

@Controller('cv-matching')
export class CvMatchingController {
  constructor(private readonly cvMatchingService: CvMatchingService) {}

  /**
   * POST /cv-matching/parse
   * Accepts a PDF file (multipart/form-data, field name: "file")
   * Returns { rawText, pageCount, fileName }
   */
  @Post('parse')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  async parsePdf(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Seuls les fichiers PDF sont acceptés');
    }

    return this.cvMatchingService.parsePdf(file.buffer, file.originalname);
  }

  /**
   * POST /cv-matching/analyze
   * Body: { rawText: string }
   * Returns ParsedCV (skills, experience, education, languages)
   */
  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  analyzeCV(@Body() dto: AnalyzeCvDto) {
    return this.cvMatchingService.analyzeText(dto.rawText);
  }

  /**
   * POST /cv-matching/match
   * Body: { cv: { rawText, skills, experience, education, languages } }
   * Returns MatchResult[] sorted by score desc
   */
  @Post('match')
  @HttpCode(HttpStatus.OK)
  async matchCV(@Body() dto: MatchCvDto) {
    return this.cvMatchingService.matchCV(dto.cv);
  }
}
