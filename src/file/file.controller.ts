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
          'image/bmp',
          'image/tiff',
          'image/svg+xml',
          // 아이폰 HEIC/HEIF 포맷 (모든 변형 포함)
          'image/heic',
          'image/heif',
          'image/heic-sequence',
          'image/heif-sequence',
          'image/x-heic',
          'image/x-heif',
          // 아이폰에서 때때로 사용하는 대체 MIME 타입
          'application/octet-stream', // HEIC 파일이 이 MIME type으로 올 수 있음
          // 비디오 포맷
          'video/mp4',
          'video/webm',
          'video/quicktime',     // 아이폰 MOV
          'video/x-m4v',
          // 문서 포맷
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];
        
        // 확장자 기반 체크 (MIME type이 정확하지 않을 수 있음)
        // 특히 아이폰에서는 HEIC 파일이 잘못된 MIME type으로 전송될 수 있음
        const allowedExtensions = [
          // 이미지 확장자
          '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.svg',
          '.heic', '.heif', // 아이폰 HEIC/HEIF
          // 비디오 확장자
          '.mp4', '.webm', '.mov', '.m4v',
          // 문서 확장자
          '.pdf', '.doc', '.docx'
        ];
        
        const ext = extname(file.originalname).toLowerCase();
        const isMimeAllowed = allowedMimes.includes(file.mimetype);
        const isExtAllowed = allowedExtensions.includes(ext);
        
        console.log('📁 파일 업로드 시도:', {
          filename: file.originalname,
          mimetype: file.mimetype,
          extension: ext,
          mimeAllowed: isMimeAllowed,
          extAllowed: isExtAllowed
        });
        
        // MIME type 또는 확장자 둘 중 하나라도 허용되면 OK
        // 이렇게 하면 아이폰에서 잘못된 MIME type으로 전송되어도 확장자로 검증 가능
        if (isMimeAllowed || isExtAllowed) {
          console.log('✅ 파일 업로드 허용:', file.originalname);
          cb(null, true);
        } else {
          console.error(`❌ 허용되지 않은 파일: ${file.originalname} (MIME: ${file.mimetype}, EXT: ${ext})`);
          cb(new BadRequestException(`File type not allowed: ${file.originalname}`), false);
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
