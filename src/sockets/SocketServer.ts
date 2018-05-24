import * as uws from "uws";
import { EventEmitter } from "events";

/**
 * A socket server for this stack. Includes authorization.
 */
class SocketServer extends EventEmitter {
    private server: uws.Server;

    public constructor() {
        super();
        this.server = new uws.Server();
        
    }
}