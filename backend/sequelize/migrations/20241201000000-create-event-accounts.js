"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable("event_accounts", {
            _id: {
                type: Sequelize.STRING,
                primaryKey: true,
                allowNull: false,
            },
            username: {
                type: Sequelize.STRING,
                allowNull: false,
                unique: true,
            },
            password: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            device_id: {
                type: Sequelize.STRING,
                allowNull: true,
            },
            createdAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
            },
            updatedAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
            },
        });

        // Tạo index cho username
        await queryInterface.addIndex("event_accounts", ["username"], {
            unique: true,
            name: "idx_event_accounts_username",
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable("event_accounts");
    },
}; 