import type { SharedSlashCommand } from "discord.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExecuteFn = (interaction: any) => Promise<void>;

export abstract class SlashCommand {
  execute: ExecuteFn;
  constructor(execute: ExecuteFn) {
    this.execute = execute;
  }
  abstract cmd(): Promise<SharedSlashCommand>;
  abstract name(): string;
}

export class StaticCommand extends SlashCommand {
  data: SharedSlashCommand;
  constructor(data: SharedSlashCommand, execute: ExecuteFn) {
    super(execute);
    this.data = data;
  }
  async cmd(): Promise<SharedSlashCommand> {
    return this.data;
  }
  name(): string {
    return this.data.name;
  }
}

export class DynamicCommand extends SlashCommand {
  fn: () => Promise<SharedSlashCommand>;
  commandName: string;
  constructor(
    name: string,
    fn: () => Promise<SharedSlashCommand>,
    execute: ExecuteFn,
  ) {
    super(execute);
    this.fn = fn;
    this.commandName = name;
  }
  async cmd(): Promise<SharedSlashCommand> {
    return await this.fn();
  }
  name(): string {
    return this.commandName;
  }
}
