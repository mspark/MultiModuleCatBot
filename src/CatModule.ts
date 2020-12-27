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
	catName?: string,
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

class PicturesFileReader {
	private dir: string;
	private picturePaths: PictureCacheModel[];
	private catDbService: CatDbService;

	/**
	 * Consider calling this.initCache afterwards. 
	 * 
	 * @param dbService 
	 */
	constructor(dbService: DbService) {
		this.dir = "";
		this.picturePaths = [];
		this.catDbService = dbService.getCustomDbService(db => new CatDbService(db)) as CatDbService;
	}

	public async initCache(picturesPath: string | undefined){
		if (!picturesPath) {
			console.log("Warning: No PICTURE_DIR_PATH in .env specified. Using ./pictures/")
		}
		this.dir = this.removeTrailingSlash(picturesPath ?? "pictures/");
		if (this.catDbService.hasPictures()) {
			this.readCache();
		} else {
			await this.fillCache();
		}
	}

	private removeTrailingSlash(path: string) {
		if (path.endsWith("/")) {
			return path.slice(0, -1);
		}
		return path;
	}

	public async fillCache(): Promise<void> {
		const pictureModels = await this.readAndParseFiles();
		this.catDbService.refreshPicturePath(pictureModels);
		console.log("Filled cache with " + pictureModels.length + " paths")
		this.picturePaths = pictureModels;
	}

	public readCache(): void {
		this.picturePaths = this.catDbService.loadPictures();
		console.log("Loaded " + this.picturePaths.length + " picture paths from database");
	}

	public async getRealtivePicPaths(): Promise<string[]> {
		return await this.readAllFiles(this.dir);
	}

	public async getSubDirectorys(): Promise<string[]> {
		return await this.readAllDirectory(this.dir);
	}

	public async readAndParseFiles(): Promise<PictureCacheModel[]> {
		const files = await this.getRealtivePicPaths();
		let cacheEntrys: PictureCacheModel[] = [];
		for (let index = 0; index < files.length; index++) {
			const singleFilePath = files[index];
			const catname = await this.catNameFromFile(singleFilePath);
			let pictureCacheEntry: PictureCacheModel = { id: index + 1, picturePath: singleFilePath};
			if (catname) {
				pictureCacheEntry.catName = catname;
			}
			cacheEntrys.push(pictureCacheEntry);
			console.log("Found " + singleFilePath);
		}
		return cacheEntrys;
	}

	private async catNameFromFile(path: string): Promise<string | undefined> {
		console.log(path.substr(this.dir.length, path.length));
		const possibleCatname = 
			path
			.substr(this.dir.length, path.length) // remove path to workdir
			.split("/")[1]; // first element is always empty; the second element could be the file itself or a dir
			let catname: string | undefined = undefined;
			console.log(possibleCatname);
		if (await this.isDirectory(this.dir + "/" + possibleCatname)) {
			catname = possibleCatname;
		}
		return catname;
	}

	private async isDirectory(fullPathFile: string): Promise<boolean> {
		const fileStat = await Filesystem.stat(fullPathFile);
		return fileStat.isDirectory();
	}

	private async readAllDirectory(path: string): Promise<string[]> {
		return await this.getFiles(path, async f => await this.isDirectory(f));
	}

	private async readAllFiles(path: string): Promise<string[]> {
		let dirs: string[] = await this.readAllDirectory(path)
		let files: string[] = await this.getFiles(path, async f => !dirs.includes(f))
		for (let index = dirs.length - 1; index >= 0; index--) {
			const element = dirs[index];
			files = files.concat(await this.readAllFiles(element));
		}
		return files;
	}

	/**
	 * Hacky function to filter async through the listed files.
	 * Lists all files in {@link this.dir} and filters them with the given method.
	 * 
	 * @param filter - The method to be filter all files with
	 */
	private async getFiles(dir: string, filter: (file:string) => Promise<boolean>): Promise<string[]> {
		const files = await Filesystem.readdir(dir);
		const filteredList: string[] = [];
		for (let index = 0; index < files.length; index++) {
			const element = dir + "/" + files[index];
			if (await filter(element)) {
				filteredList.push(element);
			}
		}
		return filteredList;
	}

	public getPicturesPath(): PictureCacheModel[] {
		return this.picturePaths;
	}
}

export class CatModule extends Module {
	private catDbService: CatDbService;
	private statsDbService: CatStatisticsDbService;

	constructor(private dbs: DbService, private picReader: PicturesFileReader) {
		super();
		this.catDbService = dbs.getCustomDbService(db => new CatDbService(db)) as CatDbService;
		this.statsDbService = dbs.getCustomDbService(db => new CatStatisticsDbService(db)) as CatStatisticsDbService;
	}

	public static async newInstance(picturesPath: string | undefined, dbService: DbService): Promise<CatModule> {
		const reader = new PicturesFileReader(dbService);
		await reader.initCache(picturesPath);
		const catbot = new CatModule(dbService, reader);
		return catbot;
	}

	public helpPage(): MessageEmbed {
		const P = PREFIX; // just shorter
		return new MessageEmbed()
			.setColor('#0099ff')
			.setTitle("🐈Help Page for Personal Cat Pictures!🐈")
			.setDescription(`Smart module for sending cat pictures. For admin help page call \`${P}help cat admin\``)
			.addField(`${P}picture`, `Sends a picture of a cat\n*Aliases: \` ${P}pic | ${P}p \`*`)
			.addField(`${P}leaderboard`, `Shows the leaderboard of server which viewed the most cat pictures\n*Aliases: \` ${P}lb \`*`)
			.addField(`${P}stats cat`, "Shows some statistics");
	}

	private sendAdminHelp(message: Message): Promise<void> {
		const P = PREFIX; // just shorter
		const embed= new MessageEmbed()
			.setColor('#450000')
			.setTitle("Help Page for Personal Cat Pictures!")
			.addField(`${P}reset`, `Reset already send pictures cache`)
			.addField(`${P}reload`, `Renew picture path cache with files from filesystem\n *Aliases: \` ${P}r \`*`)
			.addField(`${P}list`, "List loaded pictures");
		return new Promise(() => message.channel.send(embed));
	}

	public moduleName(): string {
		return "cat";
	}

	public registerActions(discordClient: Client) {
		discordClient.on('message', async (msg: Message) => {
			const cmd = super.cmdFilter(msg.content);
			const action = this.actionOnCmd(super.getCmd(msg.content));
			await action.invokeWithAutoPermissions(msg);
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
			case "picture": case "pic": case "p":
				return new CmdActionAsync(message => this.sendPic(message));
			case "leaderboard": case "lb":
				return new CmdActionAsync(message => new Promise(() => this.sendLeaderboard(message)));
			case "help cat admin": 
				return new CmdActionAsync(message => this.sendAdminHelp(message))
					.setNeededPermission([Perm.BOT_ADMIN]);
			default:
				return new CmdActionAsync(message => new Promise(() => ""));
		}
	}

	private async reload(message: Message): Promise<void> {
		console.log("Reload invoked from " + message.author);
		message.reply("Reload...");
		await this.picReader.fillCache();
		message.reply("Done. Found " + this.picReader.getPicturesPath().length + " files");
	}

	private async list(message: Message): Promise<void> {
		const exampleEmbed = new MessageEmbed()
			.setColor('#450000')
			.setTitle("Loaded Pictures")
			.setDescription('Loaded cat pictures from filesystem.');
		const paths = this.picReader
			.getPicturesPath()
			.map(p => p.picturePath)
			.join("\n") || "Nothing";
		exampleEmbed.addField('All', paths, true);
		message.channel.send(exampleEmbed);
	}

	private async sendPic(message: Message): Promise<void> {
		const guildId = message.guild?.id ?? "0";
		this.statsDbService.incrementGuildCount(guildId);
		this.statsDbService.incrementOverallCount();
		let alreadySentIds = this.catDbService
			.alreadySentPictures(guildId)
			.map(entry => entry.sendPictureId);
		const randomPicId = this.generateRandomValidPictureId(alreadySentIds);
		const randomPicObj = this.picReader.getPicturesPath().find(entry => entry.id == randomPicId);
		if(this.picReader.getPicturesPath().length == 0) {
			message.channel.send("No pictures available. Contact bot admin");
		} else if (!randomPicObj) {
			message.channel.send({
				content: "All photos were watched on this server! Starting again!"
			});
			this.resetCache(guildId);
			this.sendPic(message);
		} else {
			message.channel.send({
				content: `A photo of ${randomPicObj.catName ?? "a cat"}`,
				files: [randomPicObj?.picturePath]
			});
			this.catDbService.addSendPicture({guildId: guildId, sendPictureId: randomPicId})
		}
	}

	private resetCache(guildId: string): void {
		console.log("Reset cache for guild: " + guildId)
		this.catDbService.deleteSendPictures(guildId);
	}

	private generateRandomValidPictureId(alreadySentIds: number[]) {
		let items = this.picReader.getPicturesPath()
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
			.setDescription(`😻 Total cat pictures send: ${stats.overallPicturesViewed} \n🐈 Cat pictures send on this server: ${guildStats?.picturesViewed}`);
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