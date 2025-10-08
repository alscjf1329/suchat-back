import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { PostgresChatRepository } from './repositories/postgres-chat.repository';
import { MemoryChatRepository } from './repositories/memory-chat.repository';
import { ChatRoom, Message, ChatRoomParticipant } from './entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatRoom, Message, ChatRoomParticipant]),
  ],
  providers: [
    ChatGateway,
    ChatService,
    {
      provide: 'CHAT_REPOSITORY',
      useClass: process.env.NODE_ENV === 'development' && process.env.USE_MEMORY_DB === 'true' 
        ? MemoryChatRepository 
        : PostgresChatRepository,
    },
  ],
  exports: [ChatService],
})
export class ChatModule {}
