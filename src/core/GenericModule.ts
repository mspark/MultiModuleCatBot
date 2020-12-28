/* eslint-disable import/extensions */
/* eslint-disable import/no-unresolved */
import { Client, Message, MessageEmbed } from "discord.js";
import { Globals } from "../Utils";
import NotACommandError from "./NotACommandError";

export const PREFIX = "!";
export const STATS_PREFIX = "stats";

export default abstract class Module {
  public registerBasicCommands(client: Client): void {
    client.on("message", (msg: Message) => {
      const statsCmd = `${STATS_PREFIX} ${this.moduleName()}`;
      const helpCmd = `help ${this.moduleName()}`;
      Module.saveRun(async () => {
        const cmd = Module.cmdFilter(msg);
        if (cmd === statsCmd.trim()) {
          this.sendStats(msg);
        } else if (cmd === helpCmd.trim()) {
          msg.reply(this.helpPage());
        }
      });
    });
  }

  protected static cmdFilter(message: Message): string {
    if (this.isCmdAllowed(message.content, message)) {
      return this.getCmd(message.content);
    }
    // DO NOT LOG ANYTHING HERE - PRIVACY
    throw new NotACommandError();
  }

  protected static isCmdAllowed(cmd: string, message: Message): boolean {
    return cmd.startsWith(PREFIX) && message.author.id !== Globals.OWN_DC_ID;
  }

  protected static getCmd(rawCmd: string): string {
    return rawCmd.substring(PREFIX.length, rawCmd.length);
  }

  protected static async saveRun(func: () => Promise<void>): Promise<void> {
    try {
      await func();
    } catch (e) {
      if (!(e as NotACommandError).name) {
        console.log(e);
      }
    }
  }

  abstract moduleName(): string;

  /**
   * Register own actions. Be aware, the client is not connected here.
   *
   * @param client Discord client before without a connected state
   */
  // eslint-disable-next-line no-unused-vars
  abstract registerActions(client: Client): void;

  abstract helpPage(): MessageEmbed;

  // eslint-disable-next-line no-unused-vars
  abstract sendStats(message: Message): void;
}
