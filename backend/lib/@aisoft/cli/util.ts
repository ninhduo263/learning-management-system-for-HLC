import chalk from "chalk";
import { CliLogLevel } from "./type";

const CliLogLevelColor: Record<CliLogLevel, string> = {
    log: "cyan",
    warning: "yellow",
    error: "red",
    debug: "magenta",
};

export const createCliLog = (options: {
    level: CliLogLevel;
    important?: boolean;
}) => {
    const { level, important } = options || {};
    let write = chalk;
    if (important) {
        write = write.bold;
    }
    return function (...args: unknown[]) {
        console.log(...args.map((arg) => write[CliLogLevelColor[level]](arg)));
    };
};

export const CliLog = createCliLog({ level: "log" });
export const CliImportantLog = createCliLog({ level: "log", important: true });
export const CliWarning = createCliLog({ level: "warning" });
export const CliImportanWarning = createCliLog({
    level: "warning",
    important: true,
});
export const CliError = createCliLog({ level: "error" });
export const CliImportantError = createCliLog({
    level: "error",
    important: true,
});
export const CliDebug = createCliLog({ level: "debug" });
export const CliImportantDebug = createCliLog({
    level: "debug",
    important: true,
});
