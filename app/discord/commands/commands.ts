import { SharedSlashCommand } from 'discord.js'

export abstract class SlashCommand {
  execute: (interaction: any) => Promise<void>
  constructor(execute: (interaction: any) => Promise<void>) {
    this.execute = execute
  }
  abstract cmd(): Promise<SharedSlashCommand>
  abstract name(): string
}

export class StaticCommand extends SlashCommand {
  data: SharedSlashCommand
  constructor(data: SharedSlashCommand, execute: (interaction: any) => Promise<void>) {
    super(execute)
    this.data = data
  }
  async cmd(): Promise<SharedSlashCommand> {
    return this.data
  }
  name(): string {
    return this.data.name
  }
}

export class DynamicCommand extends SlashCommand {
  fn: () => Promise<SharedSlashCommand>
  commandName: string
  constructor(
    name: string,
    fn: () => Promise<SharedSlashCommand>,
    execute: (interaction: any) => Promise<void>
  ) {
    super(execute)
    this.fn = fn
    this.commandName = name
  }
  async cmd(): Promise<SharedSlashCommand> {
    return await this.fn()
  }
  name(): string {
    return this.commandName
  }
}
