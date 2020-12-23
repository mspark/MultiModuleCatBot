import { Client, Message } from "discord.js";

export const PREFIX = "!"
export const STATS_PREFIX = "stats";

export abstract class Module {

	registerBasicCommands(client: Client): void {
		client.on('message', async (msg: Message) => {
			const statsCmd = `${STATS_PREFIX} ${this.moduleName()}`;
			const helpCmd = `help ${this.moduleName()}`
			const cmd = this.cmdFilter(msg.content);
			if (cmd === statsCmd) {
				this.sendStats(msg);
			} else if (cmd === helpCmd) {
				msg.reply(this.helpPage());
			}
		});
	}

	cmdFilter(cmd: string): string | undefined {
		if (this.isCmdAllowed(cmd)) {
			return this.getCmd(cmd);
		} else {
			return undefined;
		}
	}

	isCmdAllowed(cmd: string): boolean {
		return cmd.startsWith(PREFIX);
	}

	getCmd(rawCmd: string): string {
		return rawCmd.substring(PREFIX.length, rawCmd.length);
	}

	abstract moduleName(): string;

	abstract registerActions(client: Client): void;

	abstract helpPage(): string;

	abstract sendStats(message: Message): void;
}
