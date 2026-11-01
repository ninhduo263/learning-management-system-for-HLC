"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        try {
            await queryInterface.addColumn("Setting", "order", {
                type: Sequelize.INTEGER,
                autoIncrementIdentity: true,
            });
            const settingList = await queryInterface.sequelize.query(
                `select * from "Setting" order by key ASC`,
                {
                    type: Sequelize.QueryTypes.SELECT,
                },
            );
            let order = 0;
            for (const setting of settingList) {
                await queryInterface.bulkUpdate(
                    "Setting",
                    { order: ++order },
                    { _id: setting._id },
                );
            }
        } catch (err) {
            console.error(err);
        }
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn("Setting", "order").catch(() => {});
    },
};
