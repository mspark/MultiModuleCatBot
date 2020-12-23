import { Client, Message } from "discord.js";
import { isElementAccessChain } from "typescript";
import { getBotList } from "./BotList";
import { CatBot } from "./CatBot";
import { DbService } from "./dbservice";
import { GenericBot, PREFIX } from "./GenericBot";
require('dotenv').config();

class BotDirector extends GenericBot {

	constructor(private allBots: GenericBot[]) {
		super();
	}
	
	helpPage(): String {
		return "";
		this.allBots.forEach(element => {
			element.helpPage();
		});
	
	}
	statisticName(): String {
		return this.allBots.map(e => e.statisticName()).join(", ");
	}
	
	registerActions(client: Client): void {
		client.on('message', async (msg: Message) => {
			const cmd = super.getCmd(msg.content);
			if (super.isCmdAllowed(msg.content)) {
				if (cmd === "stats") {
					msg.reply("Pls specify the status you want. Available: " + this.statisticName());
				}
				if (cmd === "help") {
					this.helpPage();
				}
			}
		});
	}
}
async function run() {
	const applicationBots = await getBotList();
	applicationBots.push(new BotDirector(applicationBots.slice()));

	const client: Client = new Client();
	client.on('ready', () => {
		console.log(`Logged in as ${client.user!.tag}!`);
	});

	applicationBots.forEach(app => {
		app.registerActions(client);
	});
	client.login(process.env.API_TOKEN);
}
run();