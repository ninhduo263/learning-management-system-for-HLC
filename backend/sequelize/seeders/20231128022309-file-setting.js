/* eslint-disable @typescript-eslint/no-var-requires */
"use strict";
const { Types } = require("mongoose");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface
            .bulkInsert("Setting", [
                {
                    _id: new Types.ObjectId().toString(),
                    key: "FILE_STORAGE",
                    value: JSON.stringify({
                        type:
                            process.env.SEVER_DEFAULT_FILE_STORAGE ||
                            "Database",
                    }),
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ])
            .catch((err) => {
                console.error("Error migrate File Setting", err);
            });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.bulkDelete("Setting", { key: "FILE_STORAGE" });
    },
};
