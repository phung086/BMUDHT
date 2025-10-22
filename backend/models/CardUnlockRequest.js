const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const CardUnlockRequest = sequelize.define(
    "CardUnlockRequest",
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
      fullName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      nationalId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      otpCode: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("pending", "verified", "expired", "failed"),
        defaultValue: "pending",
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      verifiedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      attempts: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      tableName: "card_unlock_requests",
      timestamps: true,
    }
  );

  CardUnlockRequest.associate = (models) => {
    CardUnlockRequest.belongsTo(models.User, {
      foreignKey: "userId",
      as: "user",
    });
    CardUnlockRequest.belongsTo(models.CreditCard, {
      foreignKey: "cardId",
      as: "card",
    });
  };

  return CardUnlockRequest;
};
