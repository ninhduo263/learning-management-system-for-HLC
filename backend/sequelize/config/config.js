module.exports = {
    development: {
        username: process.env.SQL_USER,
        password: process.env.SQL_PASSWORD,
        database: process.env.SQL_DB,
        host: process.env.SQL_HOST,
        port: process.env.SQL_PORT,
        dialect: process.env.SQL_TYPE,
        schema: process.env.SQL_SCHEMA,
        seederStorage: "sequelize",
        dialectOptions: {
            bigNumberStrings: true,
        },
    },
    test: {
        username: process.env.SQL_USER,
        password: process.env.SQL_PASSWORD,
        database: process.env.SQL_DB,
        host: process.env.SQL_HOST,
        port: process.env.SQL_PORT,
        dialect: process.env.SQL_TYPE,
        schema: process.env.SQL_SCHEMA,
        seederStorage: "sequelize",
        dialectOptions: {
            bigNumberStrings: true,
        },
    },
    production: {
        username: process.env.SQL_USER,
        password: process.env.SQL_PASSWORD,
        database: process.env.SQL_DB,
        host: process.env.SQL_HOST,
        port: process.env.SQL_PORT,
        dialect: process.env.SQL_TYPE,
        schema: process.env.SQL_SCHEMA,
        seederStorage: "sequelize",
        dialectOptions: {
            bigNumberStrings: true,
        },
    },
};
