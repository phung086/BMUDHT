const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const PhishingCapture = sequelize.define(
    "PhishingCapture",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      baitDomain: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      landingPath: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      capturedUsername: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      capturedPassword: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      victimUserId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
      },
      victimMatched: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      capturedAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      ipAddress: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      userAgent: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "phishing_captures",
      timestamps: true,
    }
  );

  PhishingCapture.associate = (models) => {
    PhishingCapture.belongsTo(models.User, {
      foreignKey: "victimUserId",
      as: "victim",
    });
  };

  return PhishingCapture;
};
