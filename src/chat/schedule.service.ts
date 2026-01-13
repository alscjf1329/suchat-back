import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Schedule, ScheduleParticipant } from './entities';
import { ChatRoom } from './entities/chat-room.entity';

@Injectable()
export class ScheduleService {
  private readonly logger = new Logger(ScheduleService.name);

  constructor(
    @InjectRepository(Schedule)
    private readonly scheduleRepository: Repository<Schedule>,
    @InjectRepository(ScheduleParticipant)
    private readonly participantRepository: Repository<ScheduleParticipant>,
    @InjectRepository(ChatRoom)
    private readonly roomRepository: Repository<ChatRoom>,
  ) {}

  // 일정 생성
  async createSchedule(
    roomId: string,
    userId: string,
    data: {
      title: string;
      memo?: string;
      startDate: Date;
      endDate?: Date;
      notificationDateTime?: Date;
      notificationInterval?: string;
      notificationRepeatCount?: string;
      participantIds: string[];
    },
  ): Promise<Schedule> {
    // 채팅방 존재 확인
    const room = await this.roomRepository.findOne({ where: { id: roomId } });
    if (!room) {
      throw new NotFoundException('채팅방을 찾을 수 없습니다.');
    }

    // 채팅방 참여자 확인
    if (!room.participants.includes(userId)) {
      throw new ForbiddenException('채팅방에 참여하지 않은 사용자입니다.');
    }

    // 일정 생성
    this.logger.debug(`[createSchedule] 일정 생성 시작: roomId=${roomId}, userId=${userId}`, {
      title: data.title,
      participantIds: data.participantIds,
    })
    
    const schedule = this.scheduleRepository.create({
      roomId: roomId,
      createdBy: userId,
      title: data.title,
      memo: data.memo || null,
      startDate: data.startDate,
      endDate: data.endDate || null,
      notificationDateTime: data.notificationDateTime || null,
      notificationInterval: data.notificationInterval || null,
      notificationRepeatCount: data.notificationRepeatCount || null,
    } as Schedule);

    const savedSchedule = await this.scheduleRepository.save(schedule);
    this.logger.debug(`[createSchedule] 일정 저장 완료: id=${savedSchedule.id}`)

    // 참여자 추가 (작성자 포함)
    const participantIds = [...new Set([userId, ...data.participantIds])];
    this.logger.debug(`[createSchedule] 참여자 추가: ${participantIds.length}명`, { participantIds })
    
    const participants = participantIds.map((participantId) =>
      this.participantRepository.create({
        scheduleId: savedSchedule.id,
        userId: participantId,
      }),
    );

    await this.participantRepository.save(participants);
    this.logger.debug(`[createSchedule] 참여자 저장 완료: ${participants.length}명`)

    // 참여자 정보와 함께 반환 (QueryBuilder 사용)
    const result = await this.scheduleRepository
      .createQueryBuilder('schedule')
      .leftJoinAndSelect('schedule.participants', 'participants')
      .leftJoinAndSelect('participants.user', 'participantUser')
      .leftJoinAndSelect('schedule.creator', 'creator')
      .where('schedule.id = :id', { id: savedSchedule.id })
      .getOne();

    if (!result) {
      throw new NotFoundException('일정을 찾을 수 없습니다.');
    }

    // 디버깅: 로드된 데이터 확인
    this.logger.debug(`[createSchedule] 일정 생성 완료: ${result.title}`, {
      creator: result.creator ? { id: result.creator.id, name: result.creator.name } : null,
      participantsCount: result.participants?.length || 0,
      participants: result.participants?.map(p => ({
        id: p.id,
        userId: p.userId,
        userName: p.user?.name || '없음',
      })),
    })

    // password 제거 및 직렬화
    const serialized = this.serializeSchedule(result)
    
    // 직렬화 후 디버깅
    this.logger.debug(`[createSchedule] 직렬화 완료`, {
      creator: serialized.creator ? { id: serialized.creator.id, name: serialized.creator.name } : null,
      participants: serialized.participants?.map(p => ({
        id: p.id,
        userId: p.userId,
        userName: p.user?.name || '없음',
      })),
    })
    
    return serialized;
  }

  // 일정 조회 (타임라인 스타일, 작성자 또는 참여자만 조회 가능)
  async getSchedules(roomId: string, userId: string): Promise<Schedule[]> {
    // 채팅방 존재 확인
    const room = await this.roomRepository.findOne({ where: { id: roomId } });
    if (!room) {
      throw new NotFoundException('채팅방을 찾을 수 없습니다.');
    }

    // 채팅방 참여자 확인
    if (!room.participants.includes(userId)) {
      throw new ForbiddenException('채팅방에 참여하지 않은 사용자입니다.');
    }

    // 일정 조회 (작성자이거나 참여자인 일정만) - QueryBuilder 사용
    const schedules = await this.scheduleRepository
      .createQueryBuilder('schedule')
      .leftJoinAndSelect('schedule.participants', 'participants')
      .leftJoinAndSelect('participants.user', 'participantUser')
      .leftJoinAndSelect('schedule.creator', 'creator')
      .where('schedule.roomId = :roomId', { roomId })
      .orderBy('schedule.startDate', 'ASC')
      .getMany();
    
    // 디버깅: 실제 SQL 쿼리 확인
    const query = this.scheduleRepository
      .createQueryBuilder('schedule')
      .leftJoinAndSelect('schedule.participants', 'participants')
      .leftJoinAndSelect('participants.user', 'participantUser')
      .leftJoinAndSelect('schedule.creator', 'creator')
      .where('schedule.roomId = :roomId', { roomId })
      .orderBy('schedule.startDate', 'ASC')
    this.logger.debug(`[getSchedules] SQL: ${query.getSql()}`)
    this.logger.debug(`[getSchedules] Parameters: ${JSON.stringify(query.getParameters())}`)
    
    // 디버깅: 조인 결과 확인
    this.logger.debug(`[getSchedules] QueryBuilder 결과: ${schedules.length}개, roomId: ${roomId}, userId: ${userId}`)
    if (schedules.length > 0) {
      schedules.forEach((schedule, index) => {
        this.logger.debug(`[getSchedules] 일정 ${index + 1}:`, {
          id: schedule.id,
          title: schedule.title,
          createdBy: schedule.createdBy,
          hasCreator: !!schedule.creator,
          creatorName: schedule.creator?.name,
          creatorId: schedule.creator?.id,
          participantsCount: schedule.participants?.length || 0,
          participants: schedule.participants?.map(p => ({
            id: p.id,
            userId: p.userId,
            hasUser: !!p.user,
            userName: p.user?.name || '없음',
          })),
          isCreator: schedule.createdBy === userId,
          isParticipant: schedule.participants?.some((p) => p.userId === userId) || false,
        })
      })
    } else {
      // 일정이 없는 경우, 실제로 DB에 일정이 있는지 확인
      const count = await this.scheduleRepository.count({ where: { roomId } })
      this.logger.debug(`[getSchedules] DB에 일정 ${count}개 존재 (roomId: ${roomId})`)
    }

    // 권한 필터링: 작성자이거나 참여자인 일정만 반환
    const filteredSchedules = schedules.filter((schedule) => {
      const isCreator = schedule.createdBy === userId
      const isParticipant = schedule.participants?.some((p) => p.userId === userId) || false
      const result = isCreator || isParticipant
      
      if (!result && schedules.length > 0) {
        this.logger.debug(`[getSchedules] 일정 필터링 제외: ${schedule.title}`, {
          createdBy: schedule.createdBy,
          userId,
          participants: schedule.participants?.map(p => p.userId),
        })
      }
      
      return result
    })
    
    this.logger.debug(`[getSchedules] 필터링 후: ${filteredSchedules.length}개 일정`)

    // password 제거 및 직렬화
    const serialized = filteredSchedules.map(schedule => this.serializeSchedule(schedule))
    
    // 직렬화 후 디버깅
    this.logger.debug(`[getSchedules] 직렬화 완료: ${serialized.length}개`)
    serialized.forEach(schedule => {
      this.logger.debug(`[getSchedules] 직렬화된 일정: ${schedule.title}`, {
        creator: schedule.creator ? { id: schedule.creator.id, name: schedule.creator.name } : null,
        participants: schedule.participants?.map(p => ({
          id: p.id,
          userId: p.userId,
          userName: p.user?.name || '없음',
        })),
      })
    })
    
    return serialized;
  }

  // 일정 수정 (작성자만 가능)
  async updateSchedule(
    scheduleId: string,
    userId: string,
    data: {
      title?: string;
      memo?: string;
      startDate?: Date;
      endDate?: Date;
      notificationDateTime?: Date;
      notificationInterval?: string;
      notificationRepeatCount?: string;
      participantIds?: string[];
    },
  ): Promise<Schedule> {
    const schedule = await this.scheduleRepository
      .createQueryBuilder('schedule')
      .leftJoinAndSelect('schedule.participants', 'participants')
      .where('schedule.id = :id', { id: scheduleId })
      .getOne();

    if (!schedule) {
      throw new NotFoundException('일정을 찾을 수 없습니다.');
    }

    // 작성자 확인
    if (schedule.createdBy !== userId) {
      throw new ForbiddenException('일정을 수정할 권한이 없습니다.');
    }

    // 일정 정보 업데이트
    if (data.title !== undefined) schedule.title = data.title;
    if (data.memo !== undefined) schedule.memo = data.memo;
    if (data.startDate !== undefined) schedule.startDate = data.startDate;
    if (data.endDate !== undefined) schedule.endDate = data.endDate;
    if (data.notificationDateTime !== undefined) schedule.notificationDateTime = data.notificationDateTime;
    if (data.notificationInterval !== undefined) schedule.notificationInterval = data.notificationInterval;
    if (data.notificationRepeatCount !== undefined) schedule.notificationRepeatCount = data.notificationRepeatCount;

    await this.scheduleRepository.save(schedule);

    // 참여자 업데이트
    if (data.participantIds !== undefined) {
      // 기존 참여자 삭제
      await this.participantRepository.delete({ scheduleId });

      // 새 참여자 추가 (작성자 포함)
      const participantIds = [...new Set([userId, ...data.participantIds])];
      const participants = participantIds.map((participantId) =>
        this.participantRepository.create({
          scheduleId: schedule.id,
          userId: participantId,
        }),
      );

      await this.participantRepository.save(participants);
    }

    // 업데이트된 일정 반환 (QueryBuilder 사용)
    const result = await this.scheduleRepository
      .createQueryBuilder('schedule')
      .leftJoinAndSelect('schedule.participants', 'participants')
      .leftJoinAndSelect('participants.user', 'participantUser')
      .leftJoinAndSelect('schedule.creator', 'creator')
      .where('schedule.id = :id', { id: scheduleId })
      .getOne();

    if (!result) {
      throw new NotFoundException('일정을 찾을 수 없습니다.');
    }

    // password 제거 및 직렬화
    return this.serializeSchedule(result);
  }

  // 일정 삭제 (작성자만 가능)
  async deleteSchedule(scheduleId: string, userId: string): Promise<void> {
    const schedule = await this.scheduleRepository.findOne({
      where: { id: scheduleId },
    });

    if (!schedule) {
      throw new NotFoundException('일정을 찾을 수 없습니다.');
    }

    // 작성자 확인
    if (schedule.createdBy !== userId) {
      throw new ForbiddenException('일정을 삭제할 권한이 없습니다.');
    }

    await this.scheduleRepository.remove(schedule);
  }

  // 일정 직렬화 (password 제거)
  private serializeSchedule(schedule: Schedule): Schedule {
    const serialized = { ...schedule };
    
    // creator의 password 제거
    if (serialized.creator && 'password' in serialized.creator) {
      const { password, ...creatorWithoutPassword } = serialized.creator as any;
      serialized.creator = creatorWithoutPassword;
    }
    
    // participants의 user password 제거
    if (serialized.participants) {
      serialized.participants = serialized.participants.map(participant => {
        if (participant.user && 'password' in participant.user) {
          const { password, ...userWithoutPassword } = participant.user as any;
          return {
            ...participant,
            user: userWithoutPassword,
          };
        }
        return participant;
      });
    }
    
    return serialized;
  }
}

