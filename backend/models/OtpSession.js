const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const OtpSession = sequelize.define(
    "OtpSession",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
      },
      cardId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "credit_cards",
          key: "id",
        },
      },
      otpCode: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("pending", "shared", "consumed", "expired"),
        defaultValue: "pending",
      },
      attackerNote: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      amountTarget: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
      },
      merchant: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      userSharedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      consumedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "otp_sessions",
      timestamps: true,
    }
  );

  OtpSession.associate = (models) => {
    OtpSession.belongsTo(models.User, { foreignKey: "userId", as: "user" });
    OtpSession.belongsTo(models.CreditCard, {
      foreignKey: "cardId",
      as: "card",
    });
    OtpSession.hasOne(models.FraudTransaction, {
      foreignKey: "otpSessionId",
      as: "fraudTransaction",
    });
  };

  return OtpSession;
};
