import fs from "fs";
import path from "path";
import protobuf from "protobufjs";

const getConfig = (directory: string) => {
    const _PROTO_PACKAGE = new Set<string>();
    const protoDirectory = path.join(__dirname, "../proto", directory);
    const paths = fs
        .readdirSync(protoDirectory, { withFileTypes: true })
        .filter((file) => {
            return file.isFile() && path.extname(file.name) === ".proto";
        })
        .map((file) => {
            const filePath = path.join(protoDirectory, file.name);
            const proto = protobuf.loadSync(filePath);
            Object.keys(proto.nested).forEach((pkg) => _PROTO_PACKAGE.add(pkg));
            return filePath;
        });

    const packages = [..._PROTO_PACKAGE];
    return { packages, paths };
};

export const getServerGrpcConfig = () => getConfig("server");

export const getClientGrpcConfig = (module: string) =>
    getConfig(`client/${module}`);
