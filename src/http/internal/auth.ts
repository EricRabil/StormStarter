import { Route } from "..";
import passport from "passport";
import { API_V0 } from "../../Constants";

const version0: Route[] = [{
    opts: {
        path: API_V0.LOGIN,
        method: "post",
        classicMiddleware: [passport.authenticate("local", {failWithError: true, failureFlash: false, failureMessage: false})]
    },
    handler: async (req, res) => {
        const user = req.user;
        if (user) {
            res.json({token: await user.token()});
            return;
        }
        res.json({error: "Invalid credentials"});
    }
}, {
    opts: {
        path: API_V0.ABOUT_ME,
        method: "get"
    },
    handler: async (req, res) => {
        res.json(req.user || {not: "authenticated"});
    }
}];

export default version0;