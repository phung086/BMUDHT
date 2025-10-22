const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const CreditRequest = sequelize.define(
    "CreditRequest",
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
      fullName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      dateOfBirth: {
        type: DataTypes.DATEONLY,
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
      incomeLevel: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM("pending", "approved", "rejected"),
        defaultValue: "pending",
      },
      riskNotes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "credit_requests",
      timestamps: true,
    }
  );

  CreditRequest.associate = (models) => {
    CreditRequest.belongsTo(models.User, { foreignKey: "userId", as: "user" });
    CreditRequest.hasOne(models.CreditCard, {
      foreignKey: "requestId",
      as: "card",
    });
  };

  return CreditRequest;
};
