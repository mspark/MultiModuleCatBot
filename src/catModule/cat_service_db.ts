import Lowdb from "lowdb";
import { CATBOT_STATS_COUNT, CATBOT_STATS_IDENTIFIER, DbSchema, PICTURES_IDENTIFIER, SEND_CACHE_IDENTIFIER } from "../database/DbSchema";
import { GenericDbService } from "../database/DbService";
import { CatBotGuildStatistic, PictureCacheModel, SendPicturesModel, Statistics } from "./types";

export class CatDbService extends GenericDbService {

	constructor(private db: Lowdb.LowdbAsync<DbSchema>) {
		super();
	}

	public loadPictures(): PictureCacheModel[] {
		return this.db.get(PICTURES_IDENTIFIER).value() ?? [];
	}

	public refreshPicturePath(models: PictureCacheModel[]): void {
		let pictures = this.db.get(PICTURES_IDENTIFIER);
		pictures.remove(a => true).write(); // delete all
		models.forEach(e => pictures.push(e).write());
	}

	public hasPictures(): boolean {
		return this.loadPictures().length > 0;
	}

	public async addSendPicture(model: SendPicturesModel): Promise<void> {
		await this.db.get(SEND_CACHE_IDENTIFIER).push(model).write();
	}

	public async deleteSendPictures(guildId?: string): Promise<void> {
		const dbs = this.db.get(SEND_CACHE_IDENTIFIER);
		if (guildId) {
			dbs.remove(a => a.guildId == guildId);
		} else {
			dbs.remove(a => true);
		}
		await dbs.write();
	}

	public alreadySentPictures(guildId: string): SendPicturesModel[] {
		let content = this.db.get(SEND_CACHE_IDENTIFIER).value() ?? [];
		return content.filter(a => a.guildId === guildId);
	}
}

export class CatStatisticsDbService extends GenericDbService {

	constructor(private db: Lowdb.LowdbAsync<DbSchema>) {
		super();
	}

	public async incrementGuildCount(guildId: string): Promise<void> {
		const guild = this.db
			.get(CATBOT_STATS_IDENTIFIER)
			.find({guildId: guildId});
		if (guild.isEmpty().value()) {
			this.createGuildInDb(guildId);
		} else {
			await guild.update('picturesViewed', count => count + 1).write();
		}
	}

	public async createGuildInDb(guildId: string): Promise<void> {
		const newGuildStat = {
			guildId: guildId, 
			picturesViewed: 1,
		} as CatBotGuildStatistic;
		await this.db
			.get(CATBOT_STATS_IDENTIFIER)
			.push(newGuildStat)
			.write();
	}

	public async incrementOverallCount(): Promise<void> {
		await this.db
			.update(CATBOT_STATS_COUNT, c => c + 1)
			.write()
	}

	public getStatistics(): Statistics {
		const guildStats = this.db.get(CATBOT_STATS_IDENTIFIER).value();
		const overallCount = this.db.get(CATBOT_STATS_COUNT).value();
		return {guildStats: guildStats, overallPicturesViewed: overallCount};
	}
}