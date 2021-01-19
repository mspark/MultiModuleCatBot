/* eslint-disable import/no-unresolved */
/* eslint-disable import/extensions */
import {
  Client, Guild, Message, MessageEmbed,
} from "discord.js";
import CmdActionAsync from "../core/CmdActionAsync";
import Module from "../core/Module";
import PrefixProvider from "../core/PrefixGuildProvider";
import { Perm } from "../core/types";
import DbService from "../database/DbService";
import GuildManagementDbService from "./GuildManagementDbService";
import GuildRefresher from "./GuildRefresher";

export default class GuildManagementModule extends Module implements PrefixProvider {
    private customDbService: GuildManagementDbService;

    constructor(dbService: DbService) {
      super();
      this.customDbService = dbService.getCustomDbService(
        (db) => new GuildManagementDbService(db),
      ) as GuildManagementDbService;
    }

    public provideCustomPrefix(message: Message): string | undefined {
      return this.customDbService.getGuildPrefix(message.guild?.id ?? "0");
    }

    // eslint-disable-next-line class-methods-use-this
    public moduleName(): string {
      return "guild";
    }

    // eslint-disable-next-line class-methods-use-this
    public helpPage(prefix: string): MessageEmbed {
      return new MessageEmbed()
        .setColor("#0099ff")
        .setTitle("Guild Module help page")
        .addField(`${prefix}setprefix`, "Sets the prefix for the bot. Needs server administrator permission")
        .addField(`${prefix}stats guild`, "Shows the number of discord servers");
    }

    public sendStats(message: Message): void {
      const embed = new MessageEmbed()
        .setColor("#450000")
        .setTitle("server statistics")
        .setDescription(`Total amount of servers: ${this.customDbService.getGuildList().length}`);
      message.channel.send(embed);
    }

    public registerActions(client: Client): void {
      client.on("message", (message: Message) => {
        Module.saveRun(async () => {
          if (message.guild) {
            this.customDbService.updateLastCommand(message.guild.id);
            const cmd = Module.extractCommand(message);
            if (cmd.startsWith("setprefix")) {
              this.invokePrefixChange(message, message.guild);
            }
          }
        });
      });
      client.on("ready", () => {
        const guilds = client.guilds.cache;
        new GuildRefresher(guilds, this.customDbService)
          .addMissingToDb()
          .setGuildsToInactive()
          .logNumber();
      });
      client.on("guildDelete", (guild: Guild) => {
        this.customDbService.setState(guild.id, false);
      });
    }

    private invokePrefixChange(message: Message, guild: Guild): void {
      // todo check remote code execution or other unsafe stuff
      const dbGuild = this.customDbService.getGuild(guild.id);
      const params = Module.extractCommand(message).split(" ");
      if (params.length === 2 && params[1].length < 5 && dbGuild) {
        const actionAsPromise = (msg: Message) => {
          this.customDbService.updatePrefix(dbGuild, params[1]);
          msg.reply("Prefix changed.");
        };
        new CmdActionAsync((msg) => new Promise(() => actionAsPromise(msg)))
          .setNeededPermission([Perm.GUILD_ADMIN])
          .setToGuildOnly()
          .invokeWithAutoPermissions(message);
      } else {
        message.reply("Server error. Contact bot developer");
      }
    }
}
