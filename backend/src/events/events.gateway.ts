import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: true }) // CORS 활성화
export class EventsGateway {
  @WebSocketServer()
  server: Server;

  // 클라이언트에게 메시지를 브로드캐스트하는 메서드
  sendMessage(event: string, data: any) {
    this.server.emit(event, data);
  }

  @SubscribeMessage('message')
  handleMessage(@MessageBody() data: string): string {
    this.server.emit('message', data); // 받은 메시지를 모든 클라이언트에게 다시 전송
    return data;
  }
}
