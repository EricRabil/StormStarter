import "./security";

import { connect } from './database';
import { HttpServer } from "./http";
import * as repl from 'repl';
import * as passport from 'passport';
import { User } from "./database/entities/User";

connect().then(() => {
    const server: HttpServer = new HttpServer(Number.parseInt(process.env.HTTP_PORT as string) || 8080);

    // const replServer = repl.start();
    // replServer.context.server = server;
    // replServer.context.passport = passport;
    // replServer.context.User = User;
    // replServer.context.replServer = replServer;
});