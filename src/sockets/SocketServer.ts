import * as uws from "uws";
import {SocketCluster} from "./SocketCluster";
import { WebsocketConnection, FunctionalSocket } from "./WebsocketConnection";
import { SOCKET_HB_INTERVAL, SOCKET_PORT } from "../Constants";
import { User } from "../database/entities/User";

/**
 * A socket server for this stack. Includes authorization.
 */
class SocketServer {
    private server: uws.Server;

    /**
     * Cluster of sockets that have not authenticated with the server yet.
     */
    public unauthenticatedCluster: SocketCluster = new SocketCluster();
    /**
     * Sockets mapped by their user snowflake
     */
    public socketsByUser: Map<string, SocketCluster> = new Map();
    /**
     * Sockets mapped by their IP address
     */
    public socketsByIP: Map<string, SocketCluster> = new Map();

    public constructor(port: number) {
        this.server = new uws.Server({port});
        this.server.on("connection", (client) => {
            const ip: string = (client as any)._socket.remoteAddress;
            const socketWrapper = new WebsocketConnection(client as any);
            this.registerIPSocket(socketWrapper, ip);
            this.unauthenticatedCluster.add(socketWrapper);
            this.bind(socketWrapper);
            socketWrapper.hello(SOCKET_HB_INTERVAL);
        });
    }

    /**
     * Binds events to this socket
     * @param socket 
     */
    private bind(socket: WebsocketConnection) {
        socket.on("identify", async packet => {
            if (!this.unauthenticatedCluster.has(socket)) {
                return;
            }
            const user = await User.findByToken(packet.d);
            if (!user) {
                socket.dispatch("CLOSING", "Invalid token provided.");
                socket.close();
                return;
            }
            this.unauthenticatedCluster.remove(socket);
            this.registerUserSocket(socket, user.snowflake);

        });
        socket.on("request", packet => {
            socket.response(packet.i, "Requests are not implemented.");
        });
        socket.on("heartbeat", packet => {
            socket.heartbeatAck();
            const startTimeout = () => setTimeout(() => {
                const timePassed = Date.now() - socket.lastHeartbeat;
                if (timePassed > SOCKET_HB_INTERVAL) {
                    socket.dispatch("CLOSING", "Failed to maintain heartbeat.");
                    socket.close();
                    return;
                }
                startTimeout();
            }, SOCKET_HB_INTERVAL + (Math.max(Math.random() * 1500, Math.random() * 1500)));
        });
    }

    private registerIPSocket(socket: FunctionalSocket, ip: string) {
        this.registerSocket(socket, ip, this.socketsByIP);
    }

    private registerUserSocket(socket: FunctionalSocket, snowflake: string) {
        this.registerSocket(socket, snowflake, this.socketsByUser);
    }

    private registerSocket(socket: FunctionalSocket, key: string, map: Map<string, SocketCluster>) {
        if (!map.has(key)) {
            map.set(key, new SocketCluster());
        }
        map.get(key)!.add(socket);
    }
}

export const WebsocketServer = new SocketServer(SOCKET_PORT);