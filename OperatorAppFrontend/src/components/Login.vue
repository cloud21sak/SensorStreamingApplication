<template>
  <!-- Login Module -->
  <v-card width="400" class="mx-auto mt-5">
    <v-card-title>
      <h1 class="display-1">Login</h1>
    </v-card-title>
    <v-card-text>
      <v-form @submit.prevent="submitForm">
        <v-text-field
          label="Username"
          v-model.trim="username"
          prepend-icon="mdi-account-circle"
        />
        <v-text-field
          :type="showPassword ? 'text' : 'password'"
          label="Password"
          v-model.trim="password"
          prepend-icon="mdi-lock"
          :append-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
          @click:append="showPassword = !showPassword"
        />
      </v-form>
    </v-card-text>
    <v-divider></v-divider>
    <v-card-actions>
      <v-btn color="info" type="submit" @click="submitForm">Login</v-btn>
    </v-card-actions>
  </v-card>
</template>
<script>
//import Vue from "vue";
import appconfig from "@/configurations/appconfig.json";
const AWS = require("aws-sdk");

// SAK TEMP???
//const AWSIoTData = require("aws-iot-device-sdk");
const AmazonCognito = require("amazon-cognito-identity-js");
import appStore from "../store";

var sessionUserAttributes;
var authenticationData = {};
var userSession;
var cognitoUser;

export default {
  data() {
    return {
      username: "",
      password: "",
      formIsValid: true,
      mode: "login",
      isLoading: false,
      error: null,
      showPassword: false,
    };
  },
  async created() {
    this.$store.dispatch("setAppConfiguration", appconfig);
    console.log(
      "Store appconfiguration.userPoolId: ",
      this.$store.getters.appConfiguration.userPoolId
    );
    console.log(
      "Store appconfiguration.identityPoolId: ",
      this.$store.getters.appConfiguration.identityPoolId
    );
    console.log(
      "Store appconfiguration.iotHost: ",
      this.$store.getters.appConfiguration.iotHost
    );
    console.log(
      "Store appconfiguration.region: ",
      this.$store.getters.appConfiguration.region
    );
  },

  computed: {
    submitButtonCaption() {
      if (this.mode === "login") {
        return "Login";
      } else {
        return "Signup";
      }
    },
    switchModeButtonCaption() {
      if (this.mode === "login") {
        return "Signup instead";
      } else {
        return "Login instead";
      }
    },
  },
  methods: {
    submitForm() {
      console.log("submitForm() form submitted");
      // console.log("appConfig: ", this.$appConfig);
      console.log("Store appConfig: ", this.$store.getters.appConfiguration);

      this.formIsValid = true;
      if (this.username === "" || this.password.length < 8) {
        this.formIsValid = false;
        return;
      }
      // Send http request ...
      this.isLoading = true;
      console.log("name: ", this.username);
      console.log("password: ", this.password);

      const poolData = {
        UserPoolId: this.$store.getters.appConfiguration.userPoolId,
        ClientId: this.$store.getters.appConfiguration.appClientId,
      };

      // Perform authentication:
      const userPool = new AmazonCognito.CognitoUserPool(poolData);

      authenticationData = {
        Username: this.username,
        Password: this.password,
      };

      const authenticationDetails = new AmazonCognito.AuthenticationDetails(
        authenticationData
      );
      const userData = {
        Username: this.username,
        Pool: userPool,
      };

      cognitoUser = new AmazonCognito.CognitoUser(userData);

      const appRouter = this.$router;
      cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: function() {
          console.log("User successfully authenticated");
          cognitoUser.getSession(function(err, session) {
            if (err) {
              console.log("Error: ", err);
              return;
            }
            userSession = session;
            const token = session.getIdToken().getJwtToken();
            console.log("token: ", token);
          });

          AWS.config.region = appStore.getters.appConfiguration.region;
          var authData = {
            // ClientId: "4abq6psn3ie7te4dgu4thg767", // Your client id here
            AppWebDomain: "iot-23.auth.us-east-1.amazoncognito.com",
            //  TokenScopesArray: ["email", "openid"], // e.g.['phone', 'email', 'profile','openid', 'aws.cognito.signin.user.admin'],
            //  RedirectUriSignIn: "http://localhost:8000",
            //  RedirectUriSignOut: "http://localhost:8000",
            // UserPoolId: "us-east-1_WbzqvIv3C", // Your user pool id here
            UserPoolId: appStore.getters.appConfiguration.userPoolId,
          };
          var login = {};

          var loginKey =
            "cognito-idp." +
            AWS.config.region +
            ".amazonaws.com/" +
            authData["UserPoolId"];
          login[loginKey] = userSession.getIdToken().getJwtToken();
          AWS.config.credentials = new AWS.CognitoIdentityCredentials({
            IdentityPoolId: appStore.getters.appConfiguration.identityPoolId,
            Logins: login,
          });

          AWS.config.credentials.refresh((error) => {
            if (error) {
              console.error(error);
            } else {
              var principal = AWS.config.credentials.identityId;
              console.log("IdentityId: " + principal);
              // console.log("Attaching principal policy");
              // new AWS.Iot().attachPrincipalPolicy(
              //   { policyName: "demo-policy", principal: principal },
              //   function(err, data) {
              //     console.log("data: ", data);
              //     if (err) {
              //       console.error(err); // an error occurred
              //     }
              //   }
              // );

              console.log(
                "Configuration in store: ",
                appStore.getters.appConfiguration
              );
              appStore.dispatch("setAuthCredentials", AWS.config.credentials);
              appStore.dispatch("setAuthenticationStatus", true);
              appStore.dispatch("storeUserPool", userPool);

              // Connecting to IoT here:
              //var clientID = "webapp:" + new Date().getTime(); //needs to be unique
              console.log(AWS.config.credentials.accessKeyId);
              console.log(AWS.config.credentials.secretAccessKey);
              console.log(AWS.config.credentials.sessionToken);

              // Connection to IoT happens after redirection
              appRouter.push("/home");
            }
          });
        },
        onFailure: function(err) {
          console.log("Login failed");
          alert(err);
        },
        newPasswordRequired: function(userAttributes, requiredAttributes) {
          // User was signed up by an admin and must provide new
          // password and required attributes, if any, to complete
          // authentication.

          this.dialogprompt = true;

          // the api doesn't accept this field back
          delete userAttributes.email_verified;
          console.log("New password required", requiredAttributes);
          console.log("User attributes: ", userAttributes);

          // store userAttributes in global variable
          sessionUserAttributes = userAttributes;

          // SAK TEMP??? modified to handle password confirmation
          const userPswd = window.prompt("Please enter password:");
          // This is just for testing:

          //document.getElementById("promptdialog").close();
          // const userPswd = this.promptForPassword();

          cognitoUser.completeNewPasswordChallenge(
            (authenticationData.Password = userPswd),
            sessionUserAttributes,
            this
          );

          console.log(
            "Completed new password challenge:",
            authenticationData.Password
          );
        },
      });

      this.isLoading = false;
    },
    switchAuthMode() {
      if (this.mode === "login") {
        this.mode = "signup";
      } else {
        this.mode = "login";
      }
    },
    handleError() {
      this.error = null;
    },
  },
};
</script>

<style scoped>
.modal {
  display: true; /* Hidden by default */
  position: fixed; /* Stay in place */
  z-index: 1; /* Sit on top */
  left: 100;
  top: 100;
  width: 30%; /* Full width */
  height: 30%; /* Full height */
  overflow: auto; /* Enable scroll if needed */
  background-color: rgb(0, 0, 0); /* Fallback color */
  background-color: rgba(0, 0, 0, 0.4); /* Black w/ opacity */
}

form {
  margin: 1rem;

  padding: 1rem;
}

.form-control {
  margin: 0.5rem 0;
}

label {
  font-weight: bold;
  margin-bottom: 0.5rem;
  display: block;
}

input,
textarea {
  display: block;
  width: 100%;
  font: inherit;
  border: 1px solid #ccc;
  padding: 0.15rem;
}

input:focus,
textarea:focus {
  border-color: #3d008d;
  background-color: #faf6ff;
  outline: none;
}
</style>
