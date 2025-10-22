const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const CreditCard = sequelize.define(
    "CreditCard",
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
      requestId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "credit_requests",
          key: "id",
        },
      },
      cardNumber: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      expiryMonth: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      expiryYear: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      cvv: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      creditLimit: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 50000.0,
      },
      status: {
        type: DataTypes.ENUM("active", "blocked", "compromised"),
        defaultValue: "active",
      },
      leakedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      leakNotes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "credit_cards",
      timestamps: true,
    }
  );

  CreditCard.associate = (models) => {
    CreditCard.belongsTo(models.User, { foreignKey: "userId", as: "user" });
    CreditCard.belongsTo(models.CreditRequest, {
      foreignKey: "requestId",
      as: "request",
    });
    CreditCard.hasMany(models.OtpSession, {
      foreignKey: "cardId",
      as: "otpSessions",
    });
    CreditCard.hasMany(models.FraudTransaction, {
      foreignKey: "cardId",
      as: "fraudTransactions",
    });
  };

  return CreditCard;
};
