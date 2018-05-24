import passport from "passport";
import {Strategy as LocalStrategy} from "passport-local";
import {Strategy as TokenStrategy} from "passport-unique-token";

import { User } from "../database/entities/User";
import { Logger, StringUtils } from "../util";
import { RestError } from "../http/util";

passport.use(new LocalStrategy(
    async function(username, password, done) {
        Logger.debug(`login: ${username} (${password[0]}${await StringUtils.repeatChar("*", password.length - 1)})`, "auth", "u/p");
        User.findOne({ username }).then(user => {
            if (!user) {
                return done(RestError.BAD_CREDENTIALS);
            }
            user.passwordMatches(password).then(matches => {
                Logger.debug(`login for ${username} was successful? ${matches}.`, "auth", "u/p");
                if (matches) {
                    return done(null, user);
                } else {
                    return done(RestError.BAD_CREDENTIALS);
                }
            });
        }).catch(err => {
            return done(err);
        });
    }
));

passport.use(new TokenStrategy({
    tokenHeader: "Authorization",
    failedOnMissing: false,
}, async (token, done) => {
    try {
        const user = await User.findByToken(token);
        return done(null, user || false);
    } catch (e) {
        return done(e);
    }
}));

passport.serializeUser((user: User, done: (err: Error | null, id: string) => void) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    User.findOne(id).then(user => {
        done(null, user);
    }).catch(err => {
        done(err);
    });
});