import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Request, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ScheduleService } from './schedule.service';
import { ChatService } from './chat.service';

@Controller('chat/schedule')
@UseGuards(JwtAuthGuard)
export class ScheduleController {
  private readonly logger = new Logger(ScheduleController.name);

  constructor(
    private readonly scheduleService: ScheduleService,
    private readonly chatService: ChatService,
  ) {}

  /**
   * ISO string 또는 yyyymmddHH24mmss 형식을 yyyymmddHH24mmss 형식으로 변환
   */
  private convertToDateFormat(dateStr: string | undefined): string | undefined {
    if (!dateStr) return undefined;
    
    // 이미 yyyymmddHH24mmss 형식인 경우 (14자리 숫자)
    if (/^\d{14}$/.test(dateStr)) {
      return dateStr;
    }
    
    // ISO string 형식인 경우 변환
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        throw new Error(`Invalid date format: ${dateStr}`);
      }
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${year}${month}${day}${hours}${minutes}${seconds}`;
    } catch (error) {
      this.logger.warn(`날짜 변환 실패: ${dateStr}`, error);
      return dateStr; // 변환 실패 시 원본 반환
    }
  }

  // 일정 생성
  @Post(':roomId')
  async createSchedule(
    @Param('roomId') roomId: string,
    @Body() data: {
      title: string;
      memo?: string;
      startDate: string; // ISO string 또는 yyyymmddHH24mmss
      endDate?: string; // ISO string 또는 yyyymmddHH24mmss
      notificationDateTime?: string; // ISO string 또는 yyyymmddHH24mmss
      notificationInterval?: string; // 분 단위
      notificationRepeatCount?: string; // 반복 횟수
      participantIds: string[];
    },
    @Request() req,
  ) {
    this.logger.debug(`[createSchedule] 요청 받음: roomId=${roomId}, userId=${req.user.userId}`, {
      title: data.title,
      startDate: data.startDate,
      participantIds: data.participantIds,
    })
    
    try {
      const schedule = await this.scheduleService.createSchedule(roomId, req.user.userId, {
        title: data.title,
        memo: data.memo,
        startDate: this.convertToDateFormat(data.startDate)!,
        endDate: this.convertToDateFormat(data.endDate),
        notificationDateTime: this.convertToDateFormat(data.notificationDateTime),
        notificationInterval: data.notificationInterval,
        notificationRepeatCount: data.notificationRepeatCount,
        participantIds: data.participantIds || [],
      });
      
      this.logger.debug(`[createSchedule] 일정 생성 성공: id=${schedule.id}`)
      return { success: true, data: schedule };
    } catch (error: any) {
      this.logger.error(`[createSchedule] 일정 생성 실패:`, error.message, error.stack)
      throw error
    }
  }

  // 채팅방 참여자 목록 조회 (일정 만들기용) - ⚠️ 라우팅 순서: 구체적인 경로가 먼저 와야 함
  @Get(':roomId/participants')
  async getRoomParticipants(
    @Param('roomId') roomId: string,
    @Request() req,
  ) {
    const participants = await this.chatService.getRoomParticipants(roomId);
    
    // user 정보 포함하여 반환
    const participantsWithUser = participants.map(p => ({
      id: p.userId,
      name: p.user?.name || '알 수 없음',
      email: p.user?.email || '',
      role: p.role,
    }));
    
    return { success: true, data: participantsWithUser };
  }

  // 일정 조회 (타임라인)
  @Get(':roomId')
  async getSchedules(
    @Param('roomId') roomId: string,
    @Request() req,
  ) {
    const schedules = await this.scheduleService.getSchedules(roomId, req.user.userId);
    
    // 디버깅: 응답 데이터 확인
    this.logger.debug(`[getSchedules] 응답: ${schedules.length}개 일정`)
    if (schedules.length > 0) {
      const firstSchedule = schedules[0]
      this.logger.debug(`[getSchedules] 첫 번째 일정 응답:`, {
        id: firstSchedule.id,
        title: firstSchedule.title,
        creator: firstSchedule.creator ? { id: firstSchedule.creator.id, name: firstSchedule.creator.name } : null,
        participants: firstSchedule.participants?.map(p => ({
          id: p.id,
          userId: p.userId,
          user: p.user ? { id: p.user.id, name: p.user.name } : null,
        })),
      })
    }
    
    return { success: true, data: schedules };
  }

  // 일정 수정
  @Put(':scheduleId')
  async updateSchedule(
    @Param('scheduleId') scheduleId: string,
    @Body() data: {
      title?: string;
      memo?: string;
      startDate?: string; // ISO string 또는 yyyymmddHH24mmss
      endDate?: string; // ISO string 또는 yyyymmddHH24mmss
      notificationDateTime?: string; // ISO string 또는 yyyymmddHH24mmss
      notificationInterval?: string; // 분 단위
      notificationRepeatCount?: string; // 반복 횟수
      participantIds?: string[];
    },
    @Request() req,
  ) {
    const schedule = await this.scheduleService.updateSchedule(scheduleId, req.user.userId, {
      title: data.title,
      memo: data.memo,
      startDate: data.startDate ? this.convertToDateFormat(data.startDate) : undefined,
      endDate: data.endDate ? this.convertToDateFormat(data.endDate) : undefined,
      notificationDateTime: data.notificationDateTime ? this.convertToDateFormat(data.notificationDateTime) : undefined,
      notificationInterval: data.notificationInterval,
      notificationRepeatCount: data.notificationRepeatCount,
      participantIds: data.participantIds,
    });
    return { success: true, data: schedule };
  }

  // 일정 삭제
  @Delete(':scheduleId')
  async deleteSchedule(
    @Param('scheduleId') scheduleId: string,
    @Request() req,
  ) {
    await this.scheduleService.deleteSchedule(scheduleId, req.user.userId);
    return { success: true };
  }
}

