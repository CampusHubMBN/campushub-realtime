import { Module } from '@nestjs/common';
import { CvMatchingController } from './cv-matching.controller';
import { CvMatchingService } from './cv-matching.service';

@Module({
  controllers: [CvMatchingController],
  providers:   [CvMatchingService],
  exports:     [CvMatchingService],
})
export class CvMatchingModule {}
