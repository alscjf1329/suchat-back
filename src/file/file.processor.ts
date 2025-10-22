import { Process, Processor } from '@nestjs/bull';
import type { Job } from 'bull';
import { FileUploadJob } from './file.service';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

@Processor('file-processing')
export class FileProcessor {
  @Process('process-file')
  async handleFileProcessing(job: Job<FileUploadJob>) {
    const { fileId, originalName, mimeType, size, tempPath, userId, roomId } = job.data;
    
    try {
      // Update progress
      await job.progress(10);
      
      // Create final directory based on file type
      const fileType = this.getFileType(mimeType);
      const uploadPath = process.env.UPLOAD_PATH || './uploads';
      const finalDir = path.join(uploadPath, fileType);
      
      // Ensure directory exists
      if (!fs.existsSync(finalDir)) {
        fs.mkdirSync(finalDir, { recursive: true });
      }
      
      // Generate unique filename
      let fileExtension = path.extname(originalName);
      
      // HEIC/HEIF는 JPEG로 변환되므로 확장자 변경
      if (fileType === 'images' && this.isHeicFormat(originalName)) {
        fileExtension = '.jpg';
      }
      
      const finalFileName = `${fileId}${fileExtension}`;
      const finalPath = path.join(finalDir, finalFileName);
      
      await job.progress(30);
      
      // Process file based on type
      if (fileType === 'images') {
        await this.processImage(tempPath, finalPath);
      } else {
        // For videos and docs, just move the file
        fs.copyFileSync(tempPath, finalPath);
      }
      
      await job.progress(70);
      
      // Generate thumbnail for images
      let thumbnailPath: string | undefined;
      if (fileType === 'images') {
        thumbnailPath = await this.generateThumbnail(finalPath, fileId);
      }
      
      await job.progress(90);
      
      // Clean up temp file
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
      
      await job.progress(100);
      
      // Return processed file info
      return {
        fileId,
        originalName,
        mimeType,
        size,
        finalPath: `/${fileType}/${finalFileName}`,
        thumbnailPath,
        processedAt: new Date(),
      };
      
    } catch (error) {
      console.error('File processing error:', error);
      throw error;
    }
  }

  private async processImage(inputPath: string, outputPath: string) {
    // Resize and optimize image
    await sharp(inputPath)
      .rotate() // 📱 EXIF orientation 자동 적용 (휴대폰 사진 회전 문제 해결)
      .resize(1920, 1080, { 
        fit: 'inside',
        withoutEnlargement: true 
      })
      .jpeg({ quality: 85 })
      .toFile(outputPath);
  }

  private async generateThumbnail(imagePath: string, fileId: string): Promise<string> {
    const uploadPath = process.env.UPLOAD_PATH || './uploads';
    const thumbnailDir = path.join(uploadPath, 'thumbnails');
    
    if (!fs.existsSync(thumbnailDir)) {
      fs.mkdirSync(thumbnailDir, { recursive: true });
    }
    
    const thumbnailPath = path.join(thumbnailDir, `${fileId}_thumb.jpg`);
    
    await sharp(imagePath)
      .rotate() // 📱 EXIF orientation 자동 적용 (휴대폰 사진 회전 문제 해결)
      .resize(300, 300, { 
        fit: 'cover' 
      })
      .jpeg({ quality: 80 })
      .toFile(thumbnailPath);
    
    return `/thumbnails/${fileId}_thumb.jpg`;
  }

  private getFileType(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'images';
    if (mimeType.startsWith('video/')) return 'videos';
    return 'docs';
  }

  private isHeicFormat(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    return ['.heic', '.heif'].includes(ext);
  }
}
