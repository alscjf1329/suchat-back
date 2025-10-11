import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';

export interface FileUploadJob {
  fileId: string;
  originalName: string;
  mimeType: string;
  size: number;
  tempPath: string;
  userId: string;
  roomId: string;
}

@Injectable()
export class FileService {
  constructor(
    @InjectQueue('file-processing') private fileQueue: Queue,
  ) {}

  async processFile(fileData: FileUploadJob) {
    // Add job to queue
    const job = await this.fileQueue.add('process-file', fileData, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });

    // Wait for job to complete
    const result = await job.finished();

    return {
      jobId: job.id,
      fileId: fileData.fileId,
      status: 'completed',
      result,
    };
  }

  async getFileStatus(jobId: string) {
    const job = await this.fileQueue.getJob(jobId);
    
    if (!job) {
      return { status: 'not_found' };
    }

    return {
      status: await job.getState(),
      progress: job.progress(),
      result: job.returnvalue,
    };
  }
}
