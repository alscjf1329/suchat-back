import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  BadRequestException,
  Get,
  Param,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { FileService } from './file.service';

@Controller('file')
export class FileController {
  constructor(
    private readonly fileService: FileService,
  ) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/temp',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB
      },
      fileFilter: (req, file, cb) => {
        const allowedMimes = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'video/mp4',
          'video/webm',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];
        
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('File type not allowed'), false);
        }
      },
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { userId: string; roomId: string },
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const fileId = this.generateFileId();
    
    const fileData = {
      fileId,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      tempPath: file.path,
      userId: body.userId,
      roomId: body.roomId,
    };

    // Start file processing
    const result = await this.fileService.processFile(fileData);
    
    return {
      ...result,
      message: 'File uploaded successfully, processing...',
    };
  }

  @Get('status/:jobId')
  async getFileStatus(@Param('jobId') jobId: string) {
    return await this.fileService.getFileStatus(jobId);
  }

  @Get('serve/:type/:filename')
  async serveFile(@Param('type') type: string, @Param('filename') filename: string) {
    const filePath = `./uploads/${type}/${filename}`;
    
    // In production, you might want to use a proper file serving solution
    // like nginx or a CDN instead of serving files directly from Node.js
    
    return {
      filePath,
      message: 'File path returned. In production, serve files through nginx or CDN.',
    };
  }

  private generateFileId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}
