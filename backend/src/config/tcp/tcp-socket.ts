import { JsonSocket } from "@nestjs/microservices";
import { Socket } from "net";

export class TcpSocket extends JsonSocket {
    constructor(socket: Socket) {
        socket.setKeepAlive(true, 10000); // Enable Keep-Alive with a 10s
        super(socket);
    }
}
