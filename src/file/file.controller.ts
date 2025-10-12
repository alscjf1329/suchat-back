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
          // 이미지 포맷
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/gif',
          'image/webp',
          'image/heic',          // ✅ iPhone HEIC
          'image/heif',          // ✅ iPhone HEIF
          'image/heic-sequence', // ✅ Live Photo
          'image/heif-sequence', // ✅ Live Photo
          // 비디오 포맷
          'video/mp4',
          'video/webm',
          'video/quicktime',     // ✅ iPhone MOV
          // 문서 포맷
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];
        
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          console.error(`❌ 허용되지 않은 파일 형식: ${file.mimetype}`);
          cb(new BadRequestException(`File type not allowed: ${file.mimetype}`), false);
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
    const fileExtension = extname(file.originalname);
    
    // Determine file type
    const fileType = this.getFileType(file.mimetype);
    const fileName = `${fileId}${fileExtension}`;
    
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
    
    // Return immediately usable URL
    return {
      ...result,
      fileId,
      fileName,
      fileType,
      fileUrl: `/uploads/${fileType}/${fileName}`,
      originalName: file.originalname,
      size: file.size,
      message: 'File uploaded successfully, processing...',
    };
  }

  private getFileType(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'images';
    if (mimeType.startsWith('video/')) return 'videos';
    return 'docs';
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
