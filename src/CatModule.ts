import { DbService, GenericDbService } from "./DbService";
import Filesystem from "fs/promises";
import { Client, Message, MessageEmbed } from "discord.js";
import lowdb from "lowdb";
import { Module, PREFIX } from "./GenericModule";
import { CATBOT_STATS_COUNT, CATBOT_STATS_IDENTIFIER, DbSchema, PICTURES_IDENTIFIER, SEND_CACHE_IDENTIFIER } from "./DbSchema";
import { GuildManagementDbService } from "./GuildManagementModule";
import { CmdActionAsync, Perm } from "./CmdPermUtils";

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

class CatDbService extends GenericDbService {

	constructor(private db: lowdb.LowdbAsync<DbSchema>) {
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

	public addSendPicture(model: SendPicturesModel): void {
		this.db.get(SEND_CACHE_IDENTIFIER).push(model).write();
	}

	public deleteSendPictures(guildId: string) {
		this.db.get(SEND_CACHE_IDENTIFIER)
			.remove(a => a.guildId == guildId)
			.write();
	}

	public alreadySentPictures(guildId: string): SendPicturesModel[] {
		let content = this.db.get(SEND_CACHE_IDENTIFIER).value() ?? [];
		return content.filter(a => a.guildId === guildId);
	}
}

interface Statistics {
	guildStats: CatBotGuildStatistic[],
	overallPicturesViewed: number,
}

class CatStatisticsDbService extends GenericDbService {

	constructor(private db: lowdb.LowdbAsync<DbSchema>) {
		super();
	}

	public incrementGuildCount(guildId: string) {
		const guild = this.db
			.get(CATBOT_STATS_IDENTIFIER)
			.find({guildId: guildId});
		if (guild.isEmpty().value()) {
			this.createGuildInDb(guildId);
		} else {
			guild.update('picturesViewed', count => count + 1).write();
		}
	}

	public createGuildInDb(guildId: string) {
		const newGuildStat = {
			guildId: guildId, 
			picturesViewed: 1,
		} as CatBotGuildStatistic;
		this.db
			.get(CATBOT_STATS_IDENTIFIER)
			.push(newGuildStat)
			.write();
	}

	public incrementOverallCount(): void {
		this.db
			.update(CATBOT_STATS_COUNT, c => c + 1)
			.write()
	}

	public getStatistics(): Statistics {
		const guildStats = this.db.get(CATBOT_STATS_IDENTIFIER).value();
		const overallCount = this.db.get(CATBOT_STATS_COUNT).value();
		return {guildStats: guildStats, overallPicturesViewed: overallCount};
	}
}

export class CatModule extends Module {
	private catDbService: CatDbService;
	private picturePaths: PictureCacheModel[];
	private dir: string;
	private statsDbService: CatStatisticsDbService;

	constructor(private dbs: DbService) {
		super();
		this.picturePaths = [];
		this.dir = "";
		this.catDbService = dbs.getCustomDbService(db => new CatDbService(db)) as CatDbService;
		this.statsDbService = dbs.getCustomDbService(db => new CatStatisticsDbService(db)) as CatStatisticsDbService;
	}
	
	public static async newInstance(picturesPath: string | undefined, dbService: DbService): Promise<CatModule> {
		const catbot = new CatModule(dbService);
		await catbot.initCache(picturesPath);
		return catbot;
	}

	public async initCache(picturesPath: string | undefined){
		if (!picturesPath) {
			console.log("Warning: No PICTURE_DIR_PATH in .env specified. Using ./pictures/")
		}
		this.dir = picturesPath ?? "./pictures/"
		if (this.catDbService.hasPictures()) {
			this.readCache();
		} else {
			await this.fillCache(this.dir);
		}
	}

	public helpPage(): MessageEmbed {
		return new MessageEmbed()
			.setColor('#0099ff')
			.setTitle("Help Page Cat Module")
			.setDescription('Smart module for sending cat pictures')
			.addField(`${PREFIX}leaderboard | ${PREFIX}lb`, "Shows the leaderboard of server which viewed the most cat pictures")
			.addField(`${PREFIX}pic`, "Sends a picture of a cat")
			.addField(`${PREFIX}stats cat`, "Shows some statistics");
	}

	public moduleName(): string {
		return "cat";
	}

	private async fillCache(filePath: string): Promise<void> {
		const pictureModels = await this.readFiles(filePath);
		this.catDbService.refreshPicturePath(pictureModels);
		console.log("Filled cache with " + pictureModels.length + " paths")
		this.picturePaths = pictureModels;
	}

	private readCache(): void {
		this.picturePaths = this.catDbService.loadPictures();
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
			const cmd = super.cmdFilter(msg.content);
			const action = this.actionOnCmd(super.getCmd(msg.content));
			await action.invokeWithAutPermissoins(msg);
		});
	}

	private actionOnCmd(cmd: string): CmdActionAsync  {
		switch (cmd) {
			case "reload": case "r":
				return new CmdActionAsync(message => this.reload(message))
					.setNeededPermission([Perm.BOT_ADMIN]);
			case "reset":
				return new CmdActionAsync(message => new Promise( () => this.resetCache(message.guild?.id ?? "0")))
					.setNeededPermission([Perm.BOT_ADMIN]);
			case "list": case "l":
				return new CmdActionAsync(message => this.list(message))
					.setNeededPermission([Perm.BOT_ADMIN]);
			case "pic": case "p":
				return new CmdActionAsync(message => this.sendPic(message));
			case "leaderboard": case "lb":
				return new CmdActionAsync(message => new Promise(() => this.sendLeaderboard(message)));
			default:
				return new CmdActionAsync(message => new Promise(() => ""));
		}
	}

	private async reload(message: Message): Promise<void> {
		console.log("Reload invoked from " + message.author);
		message.reply("Reload...");
		await this.fillCache(this.dir);
		message.reply("Done. Found " + this.picturePaths.length + " files");
	}

	private async list(message: Message): Promise<void> {
		const exampleEmbed = new MessageEmbed()
			.setColor('#450000')
			.setTitle("Loaded Pictures")
			.setDescription('Loaded cat pictures from filesystem.');
		const paths = this.picturePaths
			.map(p => p.picturePath)
			.join("\n");
		exampleEmbed.addField('All', paths, true);
		message.channel.send(exampleEmbed);
	}

	private async sendPic(message: Message): Promise<void> {
		const guildId = message.guild?.id ?? "0";
		this.statsDbService.incrementGuildCount(guildId);
		this.statsDbService.incrementOverallCount();
		let alreadySentIds = this.catDbService.alreadySentPictures(guildId)
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
			this.catDbService.addSendPicture({guildId: guildId, sendPictureId: randomPicId})
		}
	}

	private resetCache(guildId: string): void {
		console.log("Reset cache for guild: " + guildId)
		this.catDbService.deleteSendPictures(guildId);
	}

	private generateRandomValidPictureId(alreadySentIds: number[]) {
		let items = this.picturePaths
			.map(p => p.id)
			.filter(id => !alreadySentIds.includes(id));
		return items[Math.floor(Math.random() * items.length)];
	}

	public sendStats(message: Message): void {
		const stats = this.statsDbService.getStatistics();
		const guildStats = stats.guildStats.find(e => e.guildId == message.guild?.id ?? false);
		const embed =  new MessageEmbed()
			.setColor('#0099ff')
			.setTitle("Cat module statistics")
			.setDescription(`😻 Total cat pictures send: ${stats.overallPicturesViewed} \n 
				🐈 Cat pictures send on this server: ${guildStats?.picturesViewed}`);
		message.channel.send(embed);
	}

	public sendLeaderboard(message: Message): void {
		const guildService = this.dbs.getCustomDbService(db => new GuildManagementDbService(db)) as GuildManagementDbService;
		const sortedGuildNames = this.statsDbService
			.getStatistics().guildStats
			.sort((a,b) => a.picturesViewed - b.picturesViewed)
			.reverse()
			.map(guild => this.createLeaderboardLine(guild));
		const embed = new MessageEmbed()
			.setColor("#0099ff")
			.setTitle("Cat Pictures - Leaderboard")
			.setDescription(this.createLeaderboardDescription(sortedGuildNames));
		message.channel.send(embed);
	}

	private createLeaderboardDescription(sortedGuildNames: string[]): string {
		const emojis = ["🏆", "🥈", "🥉"];
		let description = "";
		for (let index = 0; index < 3; index++) {
			description += emojis[index] + " " + sortedGuildNames[index] + "\n";
		}
		return description;
	}

	private createLeaderboardLine(guildStat: CatBotGuildStatistic) {
		const guildDbService = this.dbs.getCustomDbService(db => new GuildManagementDbService(db)) as GuildManagementDbService;
		const guild = guildDbService.getGuild(guildStat.guildId);
		return `${guild?.guildName ?? "<UNAVAILABLE>"} | ${guildStat.picturesViewed} Pictures Viewed`;
	}
}