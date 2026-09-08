import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';

export function setupWebsocket(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: { origin: '*' },
  });

  io.on('connection', (socket) => {
    socket.on('join_test', (testId: string) => {
      socket.join(`test:${testId}`);
    });
    // Socket.IO auto-cleans room membership on disconnect - no leave_test needed.
  });

  return io;
}
