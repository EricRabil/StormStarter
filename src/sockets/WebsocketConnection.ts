import { EventEmitter } from "events";
import { Packet, ResponsePacket, SocketRequests, SocketRequest, PacketData, RequestPacket, SocketEvent, DispatchPacket, HelloPacket, IdentifyPacket, HeartbeatPacket, HeartbeatAckPacket } from "./types";
import { SOCKET_OPCODES, SOCKET_EVENTS, SOCKET_REQUESTS } from "../Constants";
import { Security } from "../util";

function isPacketData(data: any): data is PacketData {
    return data ? (typeof data === "object" || typeof data === "string" || typeof data === "boolean" || typeof data === "number") : true;
}

function isPacket(packet: any): packet is Packet {
    return typeof packet === "object" && typeof packet.o === "number" && isPacketData(packet.d);
}

function isDispatchPacket(packet: Packet): packet is DispatchPacket {
    return packet.o === SOCKET_OPCODES.DISPATCH && typeof (packet as any).t === "string" && !!(SOCKET_EVENTS as any)[(packet as any).t];
}

function isHelloPacket(packet: Packet): packet is HelloPacket {
    return packet.o === SOCKET_OPCODES.HELLO && typeof packet.d === "number";
}

function isIdentifyPacket(packet: Packet): packet is IdentifyPacket {
    return packet.o === SOCKET_OPCODES.IDENTIFY && typeof packet.d === "string";
}

function isRequestPacket(packet: Packet): packet is RequestPacket {
    return packet.o === SOCKET_OPCODES.REQUEST && typeof (packet as any).i === "string" && !!(SOCKET_REQUESTS as any)[(packet as any).r];
}

function isResponsePacket(packet: Packet): packet is ResponsePacket {
    return packet.o === SOCKET_OPCODES.RESPONSE && typeof (packet as any).i === "string";
}

function isHeartbeatPacket(packet: Packet): packet is HeartbeatPacket {
    return packet.o === SOCKET_OPCODES.HEARTBEAT;
}

function isHeartbeatAckPacket(packet: Packet): packet is HeartbeatAckPacket {
    return packet.o === SOCKET_OPCODES.HEARTBEAT_ACK;
}

export declare interface WebsocketConnection {
    on(event: any, cb: (...args: any[]) => any): this;
    on(event: "packet", cb: (packet: Packet) => any): this;
    on(event: "dispatch", cb: (packet: DispatchPacket) => any): this;
    on(event: "hello", cb: (packet: HelloPacket) => any): this;
    on(event: "identify", cb: (packet: IdentifyPacket) => any): this;
    on(event: "request", cb: (packet: RequestPacket) => any): this;
    on(event: "response", cb: (packet: ResponsePacket) => any): this;
    on(event: "heartbeat", cb: (packet: HeartbeatPacket) => any): this;
    on(event: "heartbeat_ack", cb: (packet: HeartbeatAckPacket) => any): this;
    on(event: "close", cb: () => any): this;
}

export interface FunctionalSocket {
    close(code?: number, reason?: string): Promise<void>;
    send(packet: Packet): Promise<void>;
    request(type: SocketRequest, data?: PacketData): Promise<PacketData | undefined>;
    response(id: string, data?: PacketData): Promise<void>;
    dispatch(event: SocketEvent, data?: PacketData): Promise<void>;
    hello(heartbeatInterval: number): Promise<void>;
    identify(token: string): Promise<void>;
    heartbeat(): Promise<void>;
    heartbeatAck(): Promise<void>;
}

/**
 * A wrapper around a websocket instance
 */
export class WebsocketConnection extends EventEmitter implements FunctionalSocket {

    /**
     * Pending requests
     */
    public requests: Map<string, (response: PacketData | undefined) => any> = new Map();
    public authenticated: boolean = false;
    public lastHeartbeat: number;

    public constructor(public socket: WebSocket) {
        super();
        this.socket.onmessage = (message) => {
            this.dataReceived(message.data);
        }
        this.socket.onclose = () => this.emit("close");
    }

    public async close(code?: number, reason?: string): Promise<void> {
        this.socket.close(code, reason);
    }

    /**
     * Send a packet to the server
     * @param packet the packet
     */
    public async send(packet: Packet): Promise<void> {
        this.socket.send(JSON.stringify(packet));
    }

    /**
     * Make a request to the other end of the websocket. Resolves with the response.
     * @param type the request type
     * @param data the data, if any
     */
    public request(type: SocketRequest, data?: PacketData): Promise<PacketData | undefined> {
        return new Promise(async (resolve, reject) => {
            const id = await Security.random(16);
            this.requests.set(id, resolve);
            await this.send({
                o: 3,
                r: type,
                d: data,
                i: id
            } as RequestPacket);
        });
    }

    /**
     * Send a response to a request
     * @param id the request ID
     * @param data the data, if any
     */
    public async response(id: string, data?: PacketData): Promise<void> {
        await this.send({
            o: 4,
            i: id,
            d: data
        } as ResponsePacket);
    }

    /**
     * Dispatch an event
     * @param event the event type
     * @param data the data, if any
     */
    public async dispatch(event: SocketEvent, data?: PacketData): Promise<void> {
        await this.send({
            o: 0,
            t: event,
            d: data
        } as DispatchPacket);
    }

    /**
     * Send a hello packet
     * @param heartbeatInterval the heartbeat interval
     */
    public async hello(heartbeatInterval: number): Promise<void> {
        await this.send({
            o: 1,
            d: heartbeatInterval
        });
        this.lastHeartbeat = Date.now();
    }

    /**
     * Send an identify packet
     * @param token the token
     */
    public async identify(token: string): Promise<void> {
        await this.send({
            o: 2,
            d: token
        });
    }

    /**
     * Send a heartbeat
     */
    public async heartbeat(): Promise<void> {
        await this.send({o: 5});
        this.lastHeartbeat = Date.now();
    }

    /**
     * Acknowledge a heartbeat
     */
    public async heartbeatAck(): Promise<void> {
        await this.send({o: 6});
        this.lastHeartbeat = Date.now();
    }

    /**
     * Called whenever data is sent over the socket connection
     * @param data the data received
     */
    private dataReceived(data: any) {
        if (typeof data !== "string") {
            return;
        }
        let packet;
        try {
            packet = JSON.parse(data);
        } catch (e) {
            console.debug("Received malformed packet.");
            return;
        }
        if (!isPacket(packet)) {
            console.debug("Received invalid packet.");
            return;
        }
        switch (packet.o) {
            case SOCKET_OPCODES.DISPATCH:
            if (!isDispatchPacket(packet)) break;
            this.emit("dispatch", packet);
            break;
            case SOCKET_OPCODES.HEARTBEAT:
            this.emit("heartbeat", packet);
            break;
            case SOCKET_OPCODES.HEARTBEAT_ACK:
            this.emit("heartbeat_ack", packet);
            break;
            case SOCKET_OPCODES.HELLO:
            if (!isHelloPacket(packet)) break;
            this.emit("hello", packet);
            break;
            case SOCKET_OPCODES.IDENTIFY:
            if (!isIdentifyPacket(packet)) break;
            this.emit("identify", packet);
            break;
            case SOCKET_OPCODES.REQUEST:
            if (!isRequestPacket(packet)) break;
            this.emit("request", packet);
            break;
            case SOCKET_OPCODES.RESPONSE:
            if (!isResponsePacket(packet)) break;
            this.emit("response", packet);
            break;
        }
        this.emit("packet", packet);
    }
}