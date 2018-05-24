import {WebsocketConnection, FunctionalSocket} from "./WebsocketConnection";
import { Packet, SocketEvent, SocketRequest } from "./types";

/**
 * A group of sockets / socket clusters, used to downstream events and organize sockets
 */
export class SocketCluster implements FunctionalSocket {
    /** The sockets */
    private sockets: FunctionalSocket[] = [];

    /**
     * Add a socket to this cluster
     * @param socket the socket to add
     */
    public add(socket: FunctionalSocket): number {
        this.sockets.push(socket);
        if (socket instanceof WebsocketConnection) {
            socket.on("close", () => {
                this.remove(socket);
            });
        }
        return this.sockets.length;
    }

    /**
     * Remove a socket from this cluster
     * @param socket the socket to remove
     */
    public remove(socket: FunctionalSocket): number {
        this.sockets.splice(this.sockets.indexOf(socket));
        return this.sockets.length;
    }

    /**
     * Close all sockets in the cluster
     * @param code optional close code
     * @param reason optional close reason
     */
    public async close(code?: number, reason?: string): Promise<void> {
        for (let socket of this.sockets) {
            socket.close(code, reason);
        }
    }

    /**
     * Send a packet to all sockets in the cluster
     * @param packet the packet to send
     */
    public async send(packet: Packet): Promise<void> {
        await this.iterate(s => s.send(packet));
    }

    /**
     * Send requests to all sockets in the cluster
     * @param type the type of request
     * @param data the data of the request
     */
    public async request(type: SocketRequest, data?: string | number | boolean | { [key: string]: any; }): Promise<string | number | boolean | { [key: string]: any; }> {
        return await this.iterate(s => s.request(type, data));
    }

    /**
     * Send a response to all sockets in the cluster
     * @param id the id of request
     * @param data the data of the request
     */
    public async response(id: string, data?: string | number | boolean | { [key: string]: any; }): Promise<void> {
        await this.iterate(s => s.response(id, data));
    }

    /**
     * Dispatch an event to all sockets in the cluster
     * @param event the event type
     * @param data the data of the event
     */
    public async dispatch(event: SocketEvent, data?: string | number | boolean | { [key: string]: any; }): Promise<void> {
        await this.iterate(s => s.dispatch(event, data));
    }

    /**
     * Send a hello packet to all sockets in the cluster
     * @param heartbeatInterval the heartbeat interval
     */
    public async hello(heartbeatInterval: number): Promise<void> {
        await this.iterate(s => s.hello(heartbeatInterval));
    }

    /**
     * Identify to all sockets in the cluster
     * @param token the token
     */
    public async identify(token: string): Promise<void> {
        await this.iterate(s => s.identify(token));
    }

    /**
     * Send a heratbeat to all sockets in the cluster
     */
    public async heartbeat(): Promise<void> {
        await this.iterate(s => s.heartbeat());
    }

    /**
     * Send a heratbeat acknowledgement to all sockets in the server
     */
    public async heartbeatAck(): Promise<void> {
        await this.iterate(s => s.heartbeatAck());
    }

    /**
     * Iterate over all sockets and perform a given operation
     * @param cb the iterator
     */
    private async iterate<T>(cb: (socket: FunctionalSocket) => Promise<T>): Promise<T[]> {
        const operations: Array<Promise<T>> = [];
        for (let socket of this.sockets) {
            operations.push(cb(socket));
        }
        return await Promise.all(operations);
    }
}