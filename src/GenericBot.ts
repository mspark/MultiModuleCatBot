import { Client } from "discord.js";

export const PREFIX = "!"
export abstract class GenericBot {
	abstract registerActions(client: Client): void;

	abstract helpPage(): String;
	
	abstract statisticName(): String;

	public isCmdAllowed(cmd: string): boolean {
		return cmd.startsWith(PREFIX);
	}

	public getCmd(rawCmd: string): string {
		return rawCmd.substring(PREFIX.length, rawCmd.length);
	}
}
