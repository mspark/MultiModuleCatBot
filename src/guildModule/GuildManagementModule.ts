/* eslint-disable import/no-unresolved */
/* eslint-disable import/extensions */
import {
  Client, Guild, Message, MessageEmbed,
} from "discord.js";
import CmdActionAsync from "../core/CmdActionAsync";
import Module, { PREFIX } from "../core/GenericModule";
import { Perm } from "../core/types";
import DbService from "../database/DbService";
import GuildManagementDbService from "./GuildManagementDbService";
import GuildRefresher from "./GuildRefresher";

export default class GuildManagementModule extends Module {
    private customDbService: GuildManagementDbService;

    constructor(dbService: DbService) {
      super();
      this.customDbService = dbService.getCustomDbService(
        (db) => new GuildManagementDbService(db),
      ) as GuildManagementDbService;
    }

    // eslint-disable-next-line class-methods-use-this
    public moduleName(): string {
      return "guild";
    }

    // eslint-disable-next-line class-methods-use-this
    public helpPage(): MessageEmbed {
      return new MessageEmbed()
        .setColor("#0099ff")
        .setTitle("Guild Module help page")
        .addField(`${PREFIX}setprefix`, "Sets the prefix for the bot. Needs server admin permission")
        .addField(`${PREFIX}stats guild`, "Shows the number of discord servers");
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
            const cmd = Module.cmdFilter(message);
            if (cmd.startsWith("setprefix")) {
              this.changePrefix(message, message.guild);
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

    private changePrefix(message: Message, guild: Guild): void {
      // todo check remote code execution or other unsafe stuff
      const dbGuild = this.customDbService.getGuild(guild.id);
      const params = Module.cmdFilter(message).split(" ");
      if (params.length === 2 && params[1].length < 5 && dbGuild) {
        const actionAsPromise: Promise<void> = new Promise(
          () => this.customDbService.updatePrefix(dbGuild, params[1]),
        );
        new CmdActionAsync(() => actionAsPromise)
          .setNeededPermission([Perm.GUILD_ADMIN])
          .setToGuildOnly()
          .invokeWithAutoPermissions(message);
      } else {
        message.reply("Server error. Contact bot developer");
      }
    }
}
