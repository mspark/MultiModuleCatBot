/* eslint-disable import/no-unresolved */
/* eslint-disable import/extensions */
import { Client, Message, MessageEmbed } from "discord.js";

import { CatBotGuildStatistic, PictureCacheModel, NoPicturesLeftError } from "./types";
import { Utils } from "../Utils";
import Module, { PREFIX } from "../core/GenericModule";
import CatDbService from "./CatDbService";
import PicturesFileReader from "./PicturesFileReader";
import DbService from "../database/DbService";
import GuildManagementDbService from "../guildModule/GuildManagementDbService";
import CatStatisticsDbService from "./CatStatisticsDbService";
import CmdActionAsync from "../core/CmdActionAsync";
import { NotACommandError, Perm } from "../core/types";

export default class CatModule extends Module {
  private catDbService: CatDbService;

  private statsDbService: CatStatisticsDbService;

  // eslint-disable-next-line no-unused-vars
  constructor(private dbs: DbService, private picReader: PicturesFileReader) {
    super();
    this.catDbService = dbs.getCustomDbService((db) => new CatDbService(db)) as CatDbService;
    this.statsDbService = dbs.getCustomDbService((db) => new CatStatisticsDbService(db)) as CatStatisticsDbService;
  }

  public static async newInstance(picturesPath: string | undefined, dbService: DbService): Promise<CatModule> {
    const reader = new PicturesFileReader(dbService);
    await reader.initCache(picturesPath);
    const catbot = new CatModule(dbService, reader);
    return catbot;
  }

  // eslint-disable-next-line class-methods-use-this
  public helpPage(): MessageEmbed {
    const P = PREFIX; // just shorter
    return new MessageEmbed()
      .setColor("#0099ff")
      .setTitle("🐈Help Page for Personal Cat Pictures!🐈")
      .setDescription(`Smart module for sending cat pictures. For admin help page call \`${P}help cat admin\``)
      .addField(`${P}cat`,
        `Sends a picture of a cat. You can specify the cat you want to see. \n*Aliases: \` ${P}c | ${P}p \`*`)
      .addField(`${P}cat list`, "List cat names")
      .addField(`${P}leaderboard`,
        `Shows the leaderboard of the three servers which viewed the most cat pictures\n*Aliases: \` ${P}lb \`*`)
      .addField(`${P}stats cat`, "Shows some statistics");
  }

  private static sendAdminHelp(message: Message): Promise<void> {
    const P = PREFIX; // just shorter
    const embed = new MessageEmbed()
      .setColor("#450000")
      .setTitle("Help Page for Personal Cat Pictures!")
      .addField(`${P}reset (all)`, "Resets already send pictures (for this guild)")
      .addField(`${P}reload`, `Renew picture path-cache with data from filesystem\n *Aliases: \` ${P}r \`*`)
      .addField(`${P}list`, "List loaded pictures");
    return new Promise(() => message.channel.send(embed));
  }

  // eslint-disable-next-line class-methods-use-this
  public moduleName(): string {
    return "cat";
  }

  public registerActions(discordClient: Client): void {
    discordClient.on("message", async (msg: Message) => {
      Module.saveRun(async () => {
        const cmd = Module.cmdFilter(msg);
        const action = this.actionOnCmd(cmd);
        await action.invokeWithAutoPermissions(msg);
      });
    });
  }

  private actionOnCmd(cmd: string): CmdActionAsync {
    switch (cmd) {
      case "reload": case "r":
        return new CmdActionAsync((message) => this.reload(message))
          .setNeededPermission([Perm.BOT_ADMIN]);
      case "reset":
        return new CmdActionAsync((message) => new Promise(() => this.resetCache(message.guild?.id ?? "0")))
          .setNeededPermission([Perm.BOT_ADMIN]);
      case "reset all":
        return new CmdActionAsync((message) => this.resetCacheForAll(message))
          .setNeededPermission([Perm.BOT_ADMIN]);
      case "list": case "l":
        return new CmdActionAsync((message) => this.list(message))
          .setNeededPermission([Perm.BOT_ADMIN]);
      case "cat": case "c": case "p":
        return new CmdActionAsync((message) => this.sendPic(message));
      case "leaderboard": case "lb":
        return new CmdActionAsync((message) => new Promise(() => this.sendLeaderboard(message)));
      case "help cat admin":
        return new CmdActionAsync((message) => CatModule.sendAdminHelp(message))
          .setNeededPermission([Perm.BOT_ADMIN]);
      case "cat list":
        return new CmdActionAsync((message) => this.sendCatList(message));
      default:
        return new CmdActionAsync((message) => this.testAndSendPic(message, cmd));
    }
  }

  private async filterCatName(cmd: string): Promise<string | undefined> {
    if (cmd.startsWith("cat") || cmd.startsWith("c") || cmd.startsWith("pic")) {
      const args = cmd.split(" ");
      const catnames = (await this.picReader.getCatNames()).map((cats) => cats.toLowerCase());
      if (catnames.includes(args[1].toLowerCase())) { // ex. input: <cmd> <cat>: ["cat", "Gino"]
        return args[1];
      }
      return undefined; // TODO make this method more fancy!
    } throw new NotACommandError();
  }

  private async testAndSendPic(message: Message, cmd: string): Promise<void> {
    const catname = await this.filterCatName(cmd);
    if (catname) {
      this.sendPic(message, catname);
    } else {
      message.channel.send("Cat not found");
    }
  }

  private async reload(message: Message): Promise<void> {
    console.log(`Reload invoked from ${message.author}`);
    await message.reply("Reload...");
    await this.picReader.fillCache();
    await message.reply(`Done. Found ${this.picReader.getPicturesPath().length} files`);
  }

  private async list(message: Message): Promise<void> {
    const exampleEmbed = new MessageEmbed()
      .setColor("#450000")
      .setTitle("Loaded Pictures")
      .setDescription("Loaded cat pictures from filesystem.");
    const paths = this.picReader
      .getPicturesPath()
      .map((p) => p.picturePath)
      .join("\n") || "Nothing";
    exampleEmbed.addField("All", paths, true);
    message.channel.send(exampleEmbed);
  }

  private async sendPic(message: Message, catname?: string): Promise<void> {
    if (this.picReader.getPicturesPath().length === 0) {
      message.channel.send("No pictures available. Contact bot admin");
      return;
    }
    const guildId = message.guild?.id ?? "0";
    const getRandomPicObj = async (cat?: string) => {
      const alreadySentIds = this.catDbService
        .alreadySentPictures(guildId)
        .map((entry) => entry.sendPictureId);
      const randomPicId = await this.generateRandomValidPictureId(alreadySentIds, cat);
      return this.picReader.getPicturesPath().find((entry) => entry.id === randomPicId);
    };
    let randomPicObj: PictureCacheModel | undefined;
    try {
      randomPicObj = await getRandomPicObj(catname);
    } catch (e) {
      message.channel.send({
        content: "All photos were watched on this server! Starting again!",
      });
      await this.resetCache(guildId);
      randomPicObj = await getRandomPicObj();
    }
    this.sendPictureMessage(message, randomPicObj); // dont wait here
    this.statsDbService.incrementGuildCount(guildId);
    this.statsDbService.incrementOverallCount();
  }

  private async sendPictureMessage(message: Message, pictureSchema: PictureCacheModel | undefined): Promise<void> {
    if (!pictureSchema) {
      console.log("BOT ERROR! Database is corrupt");
      await message.channel.send("Bot error. Pls contact admin");
    } else {
      await message.channel.send({
        content: `A photo of ${pictureSchema.catName ?? "a cat"}`,
        files: [pictureSchema?.picturePath],
      });
      await this.catDbService.addSendPicture({ guildId: message.guild?.id ?? "0", sendPictureId: pictureSchema.id });
    }
  }

  private async generateRandomValidPictureId(alreadySentIds: number[], catname?: string): Promise<number> {
    let items = this.picReader
      .getPicturesPath()
      .filter((p) => !alreadySentIds.includes(p.id));
    if (catname) {
      items = await Utils.asyncFilter(items, (p: PictureCacheModel) => this.picReader.catNameFromFile(p.picturePath));
    }
    if (items.length === 0) {
      if (catname) {
        // retry without specific cat - this avoids reset database when a cat is specified
        return this.generateRandomValidPictureId(alreadySentIds);
      }
      throw new NoPicturesLeftError("No valid pictures left");
    }
    return items[Math.floor(Math.random() * items.length)].id;
  }

  private async resetCache(guildId: string): Promise<void> {
    console.log(`Reset cache for guild: ${guildId}`);
    await this.catDbService.deleteSendPictures(guildId);
  }

  private async resetCacheForAll(msg: Message): Promise<void> {
    console.log("Reset cache for every guild");
    await this.catDbService.deleteSendPictures();
    msg.reply("Done.");
  }

  public sendStats(message: Message): void {
    const stats = this.statsDbService.getStatistics();
    const guildStats = stats.guildStats.find((e) => e.guildId === message.guild?.id ?? false);
    const embed = new MessageEmbed()
      .setColor("#0099ff")
      .setTitle("Cat module statistics")
      .setDescription(`😻 Total cat pictures send: ${stats.overallPicturesViewed} \n`
        + `🐈 Cat pictures send on this server: ${guildStats?.picturesViewed}`);
    message.channel.send(embed);
  }

  public sendLeaderboard(message: Message): void {
    const sortedGuildNames = this.statsDbService
      .getStatistics().guildStats
      .sort((a, b) => a.picturesViewed - b.picturesViewed)
      .reverse()
      .map((guild) => this.createLeaderboardLine(guild));
    const embed = new MessageEmbed()
      .setColor("#0099ff")
      .setTitle("Cat Pictures - Leaderboard")
      .setDescription(CatModule.createLeaderboardDescription(sortedGuildNames));
    message.channel.send(embed);
  }

  private static createLeaderboardDescription(sortedGuildNames: string[]): string {
    const emojis = ["🏆", "🥈", "🥉"];
    let description = "";
    for (let index = 0; index < 3; index += 1) {
      description += `${emojis[index]} ${sortedGuildNames[index]}\n`;
    }
    return description;
  }

  private createLeaderboardLine(guildStat: CatBotGuildStatistic) {
    const guildDbService = this.dbs.getCustomDbService(
      (db) => new GuildManagementDbService(db),
    ) as GuildManagementDbService;
    const guild = guildDbService.getGuild(guildStat.guildId);
    return `${guild?.guildName ?? "<Not a guild>"} | ${guildStat.picturesViewed} Pictures Viewed`;
  }

  private async sendCatList(message: Message): Promise<void> {
    const paths = await this.picReader.getCatNames();
    const embed = new MessageEmbed()
      .setColor("#0099ff")
      .setTitle("A list of cat names")
      .setDescription(paths.join("\n"));
    message.channel.send(embed);
  }
}