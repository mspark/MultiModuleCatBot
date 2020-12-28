/* eslint-disable import/no-unresolved */
/* eslint-disable import/extensions */
import {
  Client, Guild, Message, MessageEmbed,
} from "discord.js";
import Module from "../core/GenericModule";
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
      throw new Error("Method not implemented.");
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
}
