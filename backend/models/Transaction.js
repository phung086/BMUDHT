const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Transaction = sequelize.define('Transaction', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    fromUserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    toUserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('transfer', 'deposit', 'withdraw'),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('pending', 'completed', 'failed'),
      defaultValue: 'pending',
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    encryptedDetails: {
      type: DataTypes.TEXT,
      allowNull: true, // AES encrypted transaction details
    },
  }, {
    tableName: 'transactions',
    timestamps: true,
  });

  // Associations
  Transaction.associate = (models) => {
    Transaction.belongsTo(models.User, { foreignKey: 'fromUserId', as: 'fromUser' });
    Transaction.belongsTo(models.User, { foreignKey: 'toUserId', as: 'toUser' });
  };

  return Transaction;
};
