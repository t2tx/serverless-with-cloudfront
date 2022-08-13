import Serverless from "serverless";
const { log } = require("@serverless/utils/log");

class ServerlessPlugin {
  serverless: Serverless;
  options: Serverless.Options;

  commands = {};
  hooks: { [key: string]: () => Promise<void> };

  constructor(serverless: Serverless, options: Serverless.Options) {
    this.serverless = serverless;
    this.options = options;

    this.commands = {
      welcome: {
        usage: "Helps you start your first Serverless plugin",
        lifecycleEvents: ["hello", "world"],
        options: {
          message: {
            usage:
              "Specify the message you want to deploy " +
              "(e.g. \"--message 'My Message'\" or \"-m 'My Message'\")",
            required: true,
            shortcut: "m",
          },
        },
      },
    };

    this.hooks = {
      "before:welcome:hello": this.beforeWelcome.bind(this),
      "welcome:hello": this.welcomeUser.bind(this),
      "welcome:world": this.displayHelloMessage.bind(this),
      "after:welcome:world": this.afterHelloWorld.bind(this),
    };
  }

  async beforeWelcome(): Promise<void> {
    log("Hello from Serverless!");
    Promise.resolve();
  }

  async welcomeUser() {
    log("Your message:");
  }

  async displayHelloMessage() {
    log(`${(this.options as any).message}`);
  }

  async afterHelloWorld() {
    log("Please come again!111");
  }
}

module.exports = ServerlessPlugin;
