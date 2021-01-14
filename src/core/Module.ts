/* eslint-disable import/no-unresolved */
/* eslint-disable import/extensions */
import { Client, Message, MessageEmbed } from "discord.js";
import { Globals } from "../Utils";
import { NotACommandError } from "./types";

export const PREFIX = "!";
export const STATS_PREFIX = "stats";

export default abstract class Module {
  public registerBasicCommands(client: Client): void {
    client.on("message", (msg: Message) => {
      const statsCmd = `${STATS_PREFIX} ${this.moduleName()}`;
      const helpCmd = `help ${this.moduleName()}`;
      Module.saveRun(async () => {
        const cmd = Module.extractCommand(msg);
        if (cmd === statsCmd.trim()) {
          this.sendStats(msg);
        } else if (cmd === helpCmd.trim()) {
          msg.reply(this.helpPage());
        }
      });
    });
  }

  /**
   * Returns the real invoked command without prefix. Can throw a NotACommandError.
   *
   * @param message Discord message which probably contains a command
   */
  protected static extractCommand(message: Message): string {
    if (this.isCmdAllowed(message.content, message)) {
      return this.filterPrefix(message.content);
    }
    // DO NOT LOG ANYTHING HERE - PRIVACY
    throw new NotACommandError();
  }

  private static isCmdAllowed(cmd: string, message: Message): boolean {
    return cmd.startsWith(PREFIX) && message.author.id !== Globals.OWN_DC_ID;
  }

  private static filterPrefix(rawCmd: string): string {
    return rawCmd.substring(PREFIX.length, rawCmd.length);
  }

  protected static async saveRun(func: () => Promise<void>): Promise<void> {
    try {
      await func();
    } catch (e) {
      if (!(e as NotACommandError).name) {
        console.log(e);
      } else if (Globals.CONFIG.debug) {
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
  abstract registerActions(client: Client): void;

  abstract helpPage(): MessageEmbed;

  abstract sendStats(message: Message): void;
}
