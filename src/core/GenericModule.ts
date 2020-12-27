import { Client, Message, MessageEmbed } from "discord.js";
import { Globals } from "../globals_utils";

export const PREFIX = "!"
export const STATS_PREFIX = "stats";

export class NotACommandError extends Error {}

export abstract class Module {

	public registerBasicCommands(client: Client): void {
		client.on('message', async (msg: Message) => {
			const statsCmd = `${STATS_PREFIX} ${this.moduleName()}`;
			const helpCmd = `help ${this.moduleName()}`
			try {
				const cmd = this.cmdFilter(msg);
				if (cmd === statsCmd.trim()) {
					this.sendStats(msg);
				} else if (cmd === helpCmd.trim()) {
					msg.reply(this.helpPage());
				}
			} catch {}
		});
	}

	protected cmdFilter(message: Message): string {
		if (this.isCmdAllowed(message.content, message)) {
			return this.getCmd(message.content);
		} else {
			/* DO NOT LOG ANYTHING HERE - PRIVACY*/
			throw new NotACommandError();
		}
	}

	protected isCmdAllowed(cmd: string, message: Message): boolean {
		return cmd.startsWith(PREFIX) && message.author.id != Globals.OWN_DC_ID;
	}

	protected getCmd(rawCmd: string): string {
		return rawCmd.substring(PREFIX.length, rawCmd.length);
	}

	abstract moduleName(): string;

	/**
	 * Register own actions. Be aware, the client is not connected here. 
	 * 
	 * @param client Discord client before without a connected state
	 */
	abstract registerActions(client: Client): void;

	abstract helpPage(): MessageEmbed;

	abstract sendStats(message: Message): void;
}
