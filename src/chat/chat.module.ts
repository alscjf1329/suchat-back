import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { ChatAlbumController } from './chat-album.controller';
import { ChatAlbumService } from './chat-album.service';
import { PostgresChatRepository } from './repositories/postgres-chat.repository';
import { MemoryChatRepository } from './repositories/memory-chat.repository';
import { ChatRoom, Message, ChatRoomParticipant, RoomAlbum, RoomAlbumFolder } from './entities';
import { PushModule } from '../push/push.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatRoom, Message, ChatRoomParticipant, RoomAlbum, RoomAlbumFolder]),
    PushModule,
  ],
  controllers: [ChatAlbumController],
  providers: [
    ChatGateway,
    ChatService,
    ChatAlbumService,
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
