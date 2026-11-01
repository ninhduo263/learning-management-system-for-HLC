import { generateBase } from "./base-generate";
import { RepositoryType } from "./base-generate/type";
import { CliCommand } from "./type";
import { CliError, CliWarning } from "./util";

const [, , command, arg1, arg2] = process.argv;

const cli = function () {
    switch (command as CliCommand) {
        case CliCommand.BASE: {
            generateBase({
                entity: arg1,
                repositoryType: arg2 as RepositoryType,
            });
            break;
        }
        default: {
            const availableCommands = Object.values(CliCommand).join("|");
            if (command) {
                CliError(
                    `Command '${command}' not supported. Available commands: [${availableCommands}]`,
                );
            } else {
                CliWarning(
                    `Empty command. Available command: aisoft [${availableCommands}]`,
                );
            }
        }
    }
    process.exit(0);
};

cli();
