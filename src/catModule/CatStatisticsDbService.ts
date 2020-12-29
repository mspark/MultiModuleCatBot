/* eslint-disable import/no-unresolved */
/* eslint-disable import/extensions */
import Lowdb from "lowdb";
import {
  CATBOT_STATS_COUNT, CATBOT_STATS_IDENTIFIER, DbSchema,
} from "../database/DbSchema";
import GenericDbService from "../database/GenericDbService";
import {
  CatBotGuildStatistic, Statistics,
} from "./types";

export default class CatStatisticsDbService extends GenericDbService {
  constructor(private db: Lowdb.LowdbAsync<DbSchema>) {
    super();
  }

  public async incrementGuildCount(guildId: string): Promise<void> {
    const guild = this.db
      .get(CATBOT_STATS_IDENTIFIER)
      .find({ guildId });
    if (guild.isEmpty().value()) {
      this.createGuildInDb(guildId);
    } else {
      await guild.update("picturesViewed", (count) => count + 1).write();
    }
  }

  public async createGuildInDb(guildId: string): Promise<void> {
    const newGuildStat = {
      guildId,
      picturesViewed: 1,
    } as CatBotGuildStatistic;
    await this.db
      .get(CATBOT_STATS_IDENTIFIER)
      .push(newGuildStat)
      .write();
  }

  public async incrementOverallCount(): Promise<void> {
    await this.db
      .update(CATBOT_STATS_COUNT, (c) => c + 1)
      .write();
  }

  public getStatistics(): Statistics {
    const guildStats = this.db.get(CATBOT_STATS_IDENTIFIER).value();
    const overallCount = this.db.get(CATBOT_STATS_COUNT).value();
    return { guildStats, overallPicturesViewed: overallCount };
  }
}
