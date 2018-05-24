import express, {Request as ExpressRequest, Response as ExpressResponse} from "express";
import { Server } from "http";
import { User } from "../database/entities/User";
import fs from "fs-extra";
import path from "path";
import bodyParser from "body-parser";
import passport from "passport";
import expressSession = require('express-session');

import { Logger, Security, ArrayUtils } from "../util";
import { RestError } from "./util";
import { FrontendWatcher } from "./frontend";

/**
 * Validates a raw route object
 * @param route the route to validate
 */
const isRoute = (route: any): route is Route => {
    return typeof route === "object"
        && typeof route.opts === "object"
        && typeof route.opts.path === "string"
        && typeof route.opts.method === "string"
        && (
            route.opts.method === "get"
            || route.opts.method === "post"
            || route.opts.method === "options"
            || route.opts.method === "patch"
            || route.opts.method === "delete"
        )
        && typeof route.handler === "function";
};

export class HttpServer {

    private server: express.Express;
    private httpServer: Server;

    private apiRouter: express.Router;
    private publicRouter: express.Router;

    public constructor(port: number) {
        this.server = express();
        this.apiRouter = express.Router();
        this.publicRouter = express.Router();
        Logger.info("starting parcel bundler");
        const watcher = new FrontendWatcher();
        watcher.start();
        this.loadServer().then(() => {
            this.httpServer = this.server.listen(port);
        });
    }

    /**
     * Adds middleware to routers and adds routers to the main server
     */
    private async loadServer(): Promise<void> {
        const COOKIE_SECRET = process.env.COOKIE_SECRET || await Security.random(32);

        // Prints the request information to Winston
        this.server.use((req, res, next) => {
            Logger.debug(req.url, "http", "req", req.method);
            next();
        }); 

        // Enable express cookie-based session management
        this.publicRouter.use(expressSession({
            secret: COOKIE_SECRET,
            resave: false,
            saveUninitialized: true
        }));

        // For the API, JSON body.
        this.apiRouter.use(bodyParser.json());
        // For the public, form-based.
        this.publicRouter.use(bodyParser.urlencoded({extended: true}));

        await this.loadDirectory(path.join(__dirname, "internal"));
        await this.loadDirectory(path.join(__dirname, "..", "api"));

        // Add cookie parsing
        this.server.use(require('cookie-parser')(process.env.COOKIE_SECRET || await Security.random(32)));
        this.server.use(passport.initialize());

        this.publicRouter.use(passport.session());

        // used for error reporting
        this.apiRouter.use(async (err: any, req: any, res: any, next: any) => {
            const transmit = (error: RestError<any>) => res.status(typeof error.statusCode === "number" ? error.statusCode : 400).json(error.body);
            if (err instanceof RestError) {
                transmit(err);
                return;
            }
            const tracking = await Security.random(16);
            transmit(RestError.INTERNAL_ERROR(tracking));
            Logger.error(`------- error reported`);
            Logger.error(`tracking ref: ${tracking}`);
            Logger.error(err);
            Logger.error(`------- eof`);
        });

        // Token-based authentication is always welcome on any router
        this.server.use(passport.authenticate("token"));

        // Add static resources
        this.publicRouter.use("/", express.static(path.join(__dirname, "..", "frontend")));

        // Serve the SPA for any other requetss
        this.publicRouter.use((req, res) => {
            res.sendFile(path.join(__dirname, "..", "frontend", "index.html"));
        });

        this.server.use(this.apiRouter);
        this.server.use(this.publicRouter);

        await this.load();
    }

    /** A load function you can implement if you want to */
    protected async load(): Promise<void> {

    }

    /**
     * Takes in route classes and parses them. They are injected directly into Express namespace.
     * @param route the route to load
     */
    private loadRoute(route: Route): void {
        if (!isRoute(route)) {
            Logger.warn("Not loading an invalid route in express");
            return;
        }
        Logger.debug(`[EXPRESS ROUTE] [${route.opts.method.toUpperCase()}] PATH: "${route.opts.path}"`);
        // Determine whether this route is for the api or for the public
        const router = (route.opts.path.startsWith("/api") ? this.apiRouter : this.publicRouter);
        const middleware = (route.opts.classicMiddleware || []);
        if (!route.opts.guards) {
            router[route.opts.method](route.opts.path, ...middleware, route.handler as any);
            return;
        }
        const errorHandler = ArrayUtils.optional(route.error);
        router[route.opts.method](route.opts.path, ...middleware, (req, res) => {
            let currentIndex: number = 0;
            let previous: any;
            const next: () => void = () => {
                const guard = (route.opts.guards as RouteHandler[])[currentIndex++];
                if (!guard || previous === guard) {
                    route.handler((req as any), (res as any), () => null);
                } else {
                    previous = guard;
                    guard(req as any, res as any, next);
                }
            };
            next();
        });
    }

    /**
     * Takes a **file** path and loads it, passing it to loadRoute.
     *
     * This method checks whether the file contains an array of routes or a single route.
     * @param filePath the file path
     */
    private async loadFile(filePath: string): Promise<void> {
        let rawFile: any;
        try {
            rawFile = require(filePath);
        } catch (e) {
            Logger.warn(`Couldn't load route(s) from ${filePath}`);
            console.warn(e);
            return;
        }
        if (typeof rawFile === "object" && rawFile.default) {
            rawFile = rawFile.default;
        }
        if (Array.isArray(rawFile)) {
            for (let i = 0; i < rawFile.length; i++) {
                this.loadRoute(rawFile[i]);
            }
        } else {
            this.loadRoute(rawFile);
        }
    }

    /**
     * Recursively loops over a directory and loads all files in it.
     * @param directory the directory to load
     */
    private async loadDirectory(directory: string): Promise<void> {
        const contents = await fs.readdir(directory);
        const recursivePromises: Array<Promise<void>> = [];
        for (let i = 0; i < contents.length; i++) {
            const item = contents[i];
            const itemPath = path.join(directory, item);
            let isFile: boolean = false;
            try {
                const itemStats = await fs.stat(itemPath);
                isFile = itemStats.isFile();
            } catch (e) {
                Logger.warn(`Couldn't load route(s) from ${itemPath}`);
                console.warn(e);
                continue;
            }
            if (!isFile) {
                recursivePromises.push(this.loadDirectory(itemPath));
                continue;
            }
            recursivePromises.push(this.loadFile(itemPath));
        }
        await Promise.all(recursivePromises);
    }
}

export interface RequestDataStore {
    [key: string]: any;
}

export interface Request extends ExpressRequest {
    data: RequestDataStore;
    body: {
        [key: string]: any;
    };
    params: any;
    user?: User;
    query: {[key: string]: string | undefined};
}

export interface Response extends ExpressResponse {
    reject(code: number): Promise<void>;
}

export type RouteHandler = (req: Request, res: Response, next: () => void) => void;
export type ErrorRouteHandler = (error: any, req: Request, res: Response, next: () => void) => void;

/**
 * Structure for API routes - API routes are streamed into express and are integrated as efficiently as possible.
 */
export interface Route {
    opts: {
        /**
         * The publicly accessible path
         */
        path: string;
        /**
         * The request method
         */
        method: "get" | "post" | "options" | "patch" | "delete";
        /**
         * Middleware to be hardcoded into express
         */
        classicMiddleware?: express.RequestHandler[];
        /**
         * The guards, if any, for this route
         */
        guards?: RouteHandler[];
    };
    /**
     * The actual handler for this route
     */
    handler: RouteHandler;
    error?: ErrorRouteHandler;
}