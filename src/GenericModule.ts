import { Client, Message } from "discord.js";

export const PREFIX = "!"
export const STATS_PREFIX = "stats";

export abstract class Module {

	registerBasicCommands(client: Client): void {
		client.on('message', async (msg: Message) => {
			const cmd = this.getCmd(msg.content);
			if (this.isCmdAllowed(msg.content)) {
				if (cmd === STATS_PREFIX + this.moduleName()) {
					this.sendStats(msg);
				} else if (cmd === "help" + this.moduleName()) {
					msg.reply(this.helpPage());
				}
			}
		});
	}

	public isCmdAllowed(cmd: string): boolean {
		return cmd.startsWith(PREFIX);
	}

	public getCmd(rawCmd: string): string {
		return rawCmd.substring(PREFIX.length, rawCmd.length);
	}

	abstract moduleName(): string;

	abstract registerActions(client: Client): void;

	abstract helpPage(): string;

	abstract sendStats(message: Message): void;
}
