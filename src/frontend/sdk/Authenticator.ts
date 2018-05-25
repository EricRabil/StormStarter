import REST from "./REST";
import { API_V0 } from "../../Constants";

/**
 * Tracks and manages authentication with the API
 */
class AuthenticatorClass {
    private token?: string;

    /**
     * Attempts to log-in to the server. Returns token upon success.
     * @param username the username
     * @param password the password
     * @returns the token
     */
    public async login(username: string, password: string): Promise<string> {
        const res = await REST.post({
            url: API_V0.LOGIN,
            body: {
                username,
                password
            }
        });
        this.token = res.body.token;
        localStorage.setItem("token", this.token!);
        return this.token as string;
    }
    
    public get loggedIn() {
        return typeof this.token === "string";
    }

    public get authToken() {
        return this.token as string;
    }
}

export const Authenticator = new AuthenticatorClass();