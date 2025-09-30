import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { FileController } from './file.controller';
import { FileService } from './file.service';
import { FileProcessor } from './file.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'file-processing',
    }),
  ],
  controllers: [FileController],
  providers: [FileService, FileProcessor],
  exports: [FileService],
})
export class FileModule {}
