<template>
    <div>
        <input type="text" placeholder="Username" id="username">
        <input type="password" placeholder="Password" id="password">
        <input type="submit" id="login-submit">
        <hr>
        Status: <span id="status-field">Not Logged In</span>
    </div>
</template>

<script lang="ts">
import Vue from 'vue'
import {Authenticator} from '../sdk/Authenticator';
import * as Util from '../sdk/Util';

export default Vue.extend({
    mounted() {
        const submit = document.getElementById("login-submit");
        if (submit) {
            submit.addEventListener("click", () => {
                const usernameField = document.getElementById("username") as HTMLInputElement;
                const passwordField = document.getElementById("password") as HTMLInputElement;
                const statusField = document.getElementById("status-field") as HTMLSpanElement;
                if (!usernameField || !passwordField || !statusField) {
                    return;
                }
                const username = usernameField.value, password = passwordField.value;
                Authenticator.login(username, password).then(token => {
                    statusField.innerText = `Login Successful - Token: ${token}`;
                }).catch(e => {
                    if (Util.isRESTError(e)) {
                        statusField.innerText = `Login Failed - ${e.message} (${e.code})`;
                    }
                });
            });
        }
    }
})
</script>
