import { CATBOT_STATS_IDENTIFIER, DbSchema, DbService, GenericDbService, PICTURES_IDENTIFIER, SEND_CACHE_IDENTIFIER } from "./dbservice";
import Filesystem from "fs/promises";
import { Client, Message } from "discord.js";
import lowdb from "lowdb";
import { Module, PREFIX } from "./GenericModule";
import { PropertyAccessEntityNameExpression, textChangeRangeIsUnchanged } from "typescript";
import cron from "node-cron";
import { WSASERVICE_NOT_FOUND } from "constants";

export interface PictureCacheModel {
	id: number,
	picturePath: string,
}

export interface SendPicturesModel {
	guildId: string,
	sendPictureId: number
}

export interface CatBotGuildStatistic {
	guildId: string,
	picturesViewed: number,
}

export interface CatBotStatistics {
	guildStatistics: CatBotGuildStatistic[],
	overallPicturesViewed: number,
	lastCommand: Date,
}

class CatDbService extends GenericDbService {

	constructor(private db: lowdb.LowdbAsync<DbSchema>) {
		super();
	}
	
	public loadPictures(): PictureCacheModel[] {
		return this.db.get(PICTURES_IDENTIFIER).value();
	}

	public refreshPicturePath(models: PictureCacheModel[]): void {
		let pictures = this.db.get(PICTURES_IDENTIFIER);
		pictures.remove(a => true).write(); // delete all
		models.forEach(e => pictures.push(e).write());
	}

	public hasPictures(): boolean {
		return this.db.get(PICTURES_IDENTIFIER).value().length > 0;
	}

	public addSendPicture(model: SendPicturesModel): void {
		this.db.get(SEND_CACHE_IDENTIFIER).push(model).write();
	}

	public deleteSendPictures(guildId: string) {
		this.db.get(SEND_CACHE_IDENTIFIER)
			.remove(a => a.guildId == guildId)
			.write();
	}

	public alreadySentPictures(guildId: string): SendPicturesModel[] {
		let content = this.db.get(SEND_CACHE_IDENTIFIER).value();
		return content.filter(a => a.guildId === guildId);
	}

	public updateDbStatistics(stats: CatBotStatistics): void{
		this.db.assign(stats).write();
	}

	public getStatistics(): CatBotStatistics {
		let statistics = this.db.get(CATBOT_STATS_IDENTIFIER).value();
		if (!statistics) {
			console.log("No statistics found in database. Create new...");
			statistics = {guildStatistics: [{guildId: "0", picturesViewed: 0}], overallPicturesViewed: 0, lastCommand: new Date()};
		}
		return statistics;
	}
}

class CatBotStatisticsHelper {
	constructor(private stats: CatBotStatistics) {}

	public incrementGuildCount(guildId: string): number {
		let guildStat = this.stats.guildStatistics?.find(e => e.guildId == guildId);
		if (guildStat) {
			return guildStat.picturesViewed++;
		} else {
			this.stats.guildStatistics = [{guildId: guildId, picturesViewed: 1}];
			return 1;
		}
	}

	public incrementOverallCount(): number {
		return this.stats.overallPicturesViewed++;
	}

	public updateLastCmd(): void  {
		this.stats.lastCommand = new Date();
	}
	
	accept(dbService: CatDbService): void {
		console.log("Save statistics.")
		dbService.updateDbStatistics(this.stats);
	}

	// returns a copy of the current statistics
	public getStatistics(): CatBotStatistics {
		const stats = JSON.parse(JSON.stringify(this.stats));
		return stats;
	}
}

export class CatBot extends Module {
	private dbService: CatDbService;
	private picturePaths: PictureCacheModel[];
	private dir: string;
	private stats: CatBotStatisticsHelper;

	constructor(dbService: DbService) {
		super();
		this.picturePaths = [];
		this.dir = "";
		this.dbService = dbService.getCustomDbService(db => new CatDbService(db)) as CatDbService;
		this.stats = new CatBotStatisticsHelper(this.dbService.getStatistics());
		
		this.stats.accept(this.dbService);
        cron.schedule('5 * * * *', () => {
			this.stats.accept(this.dbService);
        });
	}
	
	public static async newInstance(picturesPath: string | undefined, dbService: DbService): Promise<CatBot> {
		const catbot = new CatBot(dbService);
		await catbot.initCache(picturesPath);
		return catbot;
	}

	public async initCache(picturesPath: string | undefined){
		if (!picturesPath) {
			console.log("Warning: No PICTURE_DIR_PATH in .env specified. Using ./pictures/")
		}
		this.dir = picturesPath ?? "./pictures/"
		if (this.dbService.hasPictures()) {
			this.readCache();
		} else {
			await this.fillCache(this.dir);
		}
	}

	public helpPage(): string {
		throw new Error("Method not implemented.");
	}

	public moduleName(): string {
		return "cat";
	}

	private async fillCache(filePath: string): Promise<void> {
		const pictureModels = await this.readFiles(filePath);
		this.dbService.refreshPicturePath(pictureModels);
		console.log("Filled cache with " + pictureModels.length + " paths")
		this.picturePaths = pictureModels;
	}

	private readCache(): void {
		this.picturePaths = this.dbService.loadPictures();
		console.log("Loaded " + this.picturePaths.length + " picture paths from database");
	}

	private async readFiles(path: string): Promise<PictureCacheModel[]> {
		let cacheEntrys: PictureCacheModel[] = [];
		let files = await Filesystem.readdir(path);
		for (let index = 0; index < files.length; index++) {
			const element = files[index];
			const pictureCacheEntry = { id: index + 1, picturePath: path + element} as PictureCacheModel;
			cacheEntrys.push(pictureCacheEntry);
			console.log("Found " + path + element);
		}
		return cacheEntrys;
	}

	public registerActions(discordClient: Client) {
		discordClient.on('message', async (msg: Message) => {
			if (super.isCmdAllowed(msg.content)) {
				if (msg.guild) {
					const action = this.actionOnCmd(super.getCmd(msg.content));
					await action(msg);
				}
			}
		});
	}

	private actionOnCmd(cmd: string): (message: Message) => Promise<void>  {
		this.stats.updateLastCmd();
		switch (cmd) {
			case "reload": case "r":
				return async (message: Message) => await this.reload(message);
			case "reset":
				return (message: Message) => new Promise(() => this.resetCache(message.guild?.id ?? "0"));
			case "list": case "l":
				return (message: Message) => this.list(message);
			case "pic": case "p":
				return (message: Message) => this.sendPic(message);
			case "stats cat":
				return (message: Message) => new Promise(() => this.sendStats(message));
			default:
				return (message: Message) => new Promise(() => "");
		}
	}

	private async reload(message: Message): Promise<void> {
		console.log("Reload invoked from " + message.author);
		message.reply("Reload...");
		await this.fillCache(this.dir);
		message.reply("Reloaded. Found " + this.picturePaths.length + " files");
	}

	private async list(message: Message): Promise<void> {
		message.reply(
			this.picturePaths
				.map(p => p.picturePath)
				.reduce( (a,b) => a + " | " + b, "")
		);
	}

	private async sendPic(message: Message): Promise<void> {
		const guildId = message.guild?.id ?? "0";
		this.stats.incrementGuildCount(guildId);
		this.stats.incrementOverallCount();
		let alreadySentIds = this.dbService.alreadySentPictures(guildId)
			.map(entry => entry.sendPictureId);
		const randomPicId = this.generateRandomValidPictureId(alreadySentIds);
		const randomPicPath = this.picturePaths.find(entry => entry.id == randomPicId)?.picturePath;
		if (!randomPicPath) {
			message.channel.send({
				content: "All photos were watched on this server! Starting again!"
			});
			this.resetCache(guildId);
			this.sendPic(message);
		} else {
			message.channel.send({
				files: [randomPicPath]
			});
			this.dbService.addSendPicture({guildId: guildId, sendPictureId: randomPicId})
		}
	}

	private resetCache(guildId: string): void {
		console.log("Reset cache for guild: " + guildId)
		this.dbService.deleteSendPictures(guildId);
	}

	private generateRandomValidPictureId(alreadySentIds: number[]) {
		let items = this.picturePaths
			.map(p => p.id)
			.filter(id => !alreadySentIds.includes(id));
		return items[Math.floor(Math.random() * items.length)];
	}

	public sendStats(message: Message): void {
		const overallCount = this.stats.getStatistics().overallPicturesViewed;
		const guildCount = this.stats.getStatistics().guildStatistics.find(e => e.guildId == message.guild?.id)?.picturesViewed;

		message.channel.send({
			content: "ToDo: Make a fancy statistic page here! \n Pictures Send on this server: " + guildCount + " . Overall count: " + overallCount
		})
	}
}