/* eslint-disable no-useless-constructor */
/* eslint-disable import/no-unresolved */
/* eslint-disable import/extensions */
import { Collection, Guild } from "discord.js";
import { DEFAULT_PREFIX } from "../core/Module";
import GuildManagementDbService from "./GuildManagementDbService";

export default class GuildRefresher {
  // eslint-disable-next-line no-empty-function
  constructor(private guilds: Collection<string, Guild>, private customDbService: GuildManagementDbService) {}

  addMissingToDb(): GuildRefresher {
    this.guilds.forEach((_guild: Guild, gid: string) => {
      if (this.customDbService.getGuildList().includes(gid)) {
        this.customDbService.setState(gid, true);
      } else {
        this.customDbService.addGuild({
          guildId: gid,
          isActive: true,
          prefix: DEFAULT_PREFIX,
          guildName: this.guilds.get(gid)?.name ?? "unknown",
          lastAction: new Date(),
        });
      }
    });
    return this;
  }

  setGuildsToInactive(): GuildRefresher {
    this.customDbService
      .getGuildList()
      .filter((e) => !this.guilds.has(e))
      .forEach((e) => this.customDbService.setState(e, false));
    return this;
  }

  logNumber(): GuildRefresher {
    console.log(`Bot is running on ${this.guilds.size} servers.`);
    return this;
  }
}
