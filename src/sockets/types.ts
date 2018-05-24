import { SOCKET_EVENTS, SOCKET_REQUESTS } from "../Constants";

/**
 * Dispatch: Server Only - An event was dispatched
 * Hello: Server Only - Server sends heartbeat interval
 * Identify: Client Only - Client sends its token
 * Request: Client/Server - Client/server makes a request (response is guaranteed)
 * Response: Client/Server - Client/server makes a response to a request
 * Heartbeat: Client Only - Client sends heartbeats to the server
 * Heartbeat Ack: Server Only - Server acknowledges the heartbeat
 */

export type SocketEvents = typeof SOCKET_EVENTS;
export type SocketEvent = keyof SocketEvents;
export type SocketRequests = typeof SOCKET_REQUESTS;
export type SocketRequest = keyof SocketRequests;

export type PacketData = {
    [key: string]: any;
} | string | boolean | number;

export interface Packet {
    /**
     * The operation code
     */
    o: number;
    /**
     * The data in the packet
     */
    d?: PacketData;
}

export interface DispatchPacket extends Packet {
    o: 0;
    /**
     * The dispatch event
     */
    t: SocketEvent;
}

export interface HelloPacket extends Packet {
    o: 1;
    /**
     * The heartbeat interval
     */
    d: number;
}

export interface IdentifyPacket extends Packet {
    o: 2;
    /**
     * The token
     */
    d: string;
}

export interface RequestPacket extends Packet {
    o: 3;
    /**
     * The request type
     */
    r: SocketRequest;
    /**
     * The ID of this request
     */
    i: string;
}

export interface ResponsePacket extends Packet {
    o: 4;
    /**
     * The ID of this response
     */
    i: string;
}

export interface HeartbeatPacket extends Packet {
    o: 5;
}

export interface HeartbeatAckPacket extends Packet {
    o: 6;
}