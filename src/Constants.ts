import keymirror = require("keymirror");

const prefix: <T>(routes: T, prefix: string) => T = <T>(routes: T, prefix: string) => {
    for (const key in routes) {
        routes[key] = `${prefix}${routes[key]}` as any;
    }
    return routes;
}

export const API_V0 = prefix({
    LOGIN: "/auth/login",
    ABOUT_ME: "/auth/@me"
}, "/api/v0");

export const ERROR_CODES = {
    BAD_USERNAME_OR_PASSWORD: 1001
}

export const SOCKET_EVENTS = keymirror({
});

export const SOCKET_REQUESTS = keymirror({
});

/**
 * Dispatch: Server Only - An event was dispatched
 * Hello: Server Only - Server sends heartbeat interval
 * Identify: Client Only - Client sends its token
 * Request: Client/Server - Client/server makes a request (response is guaranteed)
 * Response: Client/Server - Client/server makes a response to a request
 * Heartbeat: Client Only - Client sends heartbeats to the server
 * Heartbeat Ack: Server Only - Server acknowledges the heartbeat
 */
export const SOCKET_OPCODES = {
    DISPATCH: 0,
    HELLO: 1,
    IDENTIFY: 2,
    REQUEST: 3,
    RESPONSE: 4,
    HEARTBEAT: 5,
    HEARTBEAT_ACK: 6
}

// Heartbeat interval, in ms
export const SOCKET_HB_INTERVAL = 10000;