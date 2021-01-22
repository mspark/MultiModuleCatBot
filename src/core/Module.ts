/* eslint-disable import/no-unresolved */
/* eslint-disable import/extensions */
import { Client, Message, MessageEmbed } from "discord.js";
import { CONFIG } from "../Config";
import PrefixGuildProvider from "./PrefixGuildProvider";
import { NotACommandError } from "./types";

export const DEFAULT_PREFIX = "!";
export const STATS_PREFIX = "stats";

export default abstract class Module {
  private static modules: Module[]

  public static init(modules: Module[]): void {
    if (this.modules) {
      throw new Error("Already defined");
    }
    this.modules = modules;
  }

  public static getModules(): Module[] {
    if (!this.modules) {
      throw new Error("Modules not intialized");
    }
    return this.modules;
  }

  public registerBasicCommands(client: Client): void {
    client.on("message", (msg: Message) => {
      const statsCmd = `${STATS_PREFIX} ${this.moduleName()}`;
      const helpCmd = `help ${this.moduleName()}`;
      Module.saveRun(async () => {
        const cmd = Module.extractCommand(msg);
        if (cmd === statsCmd.trim()) {
          this.sendStats(msg);
        } else if (cmd === helpCmd.trim()) {
          const prefix = Module.getPrefix(msg);
          msg.reply(this.helpPage(prefix));
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
    const prefix = this.getPrefix(message);
    if (this.isCmdAllowed(message.content, message, prefix)) {
      return this.filterPrefix(message.content, prefix);
    }
    // DO NOT LOG ANYTHING HERE - PRIVACY
    throw new NotACommandError();
  }

  private static isCmdAllowed(cmd: string, message: Message, prefix: string): boolean {
    return cmd.startsWith(prefix) && !message.author.bot;
  }

  private static filterPrefix(rawCmd: string, prefix: string): string {
    return rawCmd.substring(prefix.length, rawCmd.length);
  }

  protected static async saveRun(func: () => Promise<void>): Promise<void> {
    try {
      await func();
    } catch (e) {
      if (!(e as NotACommandError).name) {
        console.log(e);
      } else if (CONFIG.debug) {
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

  abstract helpPage(prefix: string): MessageEmbed;

  abstract sendStats(message: Message): void;

  /**
   * Returns a prefix for the current guild context. If no guild provider is set,
   * a default prefix is returned.
   *
   * @param message The current discord context.
   */
  public static getPrefix(message: Message): string {
    const possiblePrefixProv = Module.getModules().find((a) => a.moduleName() === "guild");

    const isProvider = (variable: any):
      variable is PrefixGuildProvider => (variable as PrefixGuildProvider).provideCustomPrefix !== undefined;

    if (isProvider(possiblePrefixProv)) {
      const pp = possiblePrefixProv as PrefixGuildProvider;
      return pp.provideCustomPrefix(message) ?? DEFAULT_PREFIX;
    }
    return DEFAULT_PREFIX;
  }
}
