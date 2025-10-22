const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const FraudTransaction = sequelize.define(
    "FraudTransaction",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      cardId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "credit_cards",
          key: "id",
        },
      },
      otpSessionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "otp_sessions",
          key: "id",
        },
      },
      amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
      },
      merchant: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("success", "failed"),
        defaultValue: "success",
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      executedAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      tableName: "fraud_transactions",
      timestamps: true,
    }
  );

  FraudTransaction.associate = (models) => {
    FraudTransaction.belongsTo(models.CreditCard, {
      foreignKey: "cardId",
      as: "card",
    });
    FraudTransaction.belongsTo(models.OtpSession, {
      foreignKey: "otpSessionId",
      as: "otpSession",
    });
  };

  return FraudTransaction;
};
