const { DataTypes } = require("sequelize");
const bcrypt = require("bcrypt");

module.exports = (sequelize) => {
  const User = sequelize.define(
    "User",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      balance: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.0,
      },
      role: {
        type: DataTypes.ENUM("user", "admin"),
        defaultValue: "user",
      },
      isLocked: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      failedLoginAttempts: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      lastFailedLogin: {
        type: DataTypes.DATE,
      },
      mfaEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      mfaSecret: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      encryptedData: {
        type: DataTypes.TEXT,
        allowNull: true, // AES encrypted sensitive data
      },
    },
    {
      tableName: "users",
      timestamps: true,
    }
  );

  // Hash password before saving
  User.beforeCreate(async (user) => {
    const saltRounds = 10;
    user.password = await bcrypt.hash(user.password, saltRounds);
  });

  User.beforeUpdate(async (user) => {
    if (user.changed("password")) {
      const saltRounds = 10;
      user.password = await bcrypt.hash(user.password, saltRounds);
    }
  });

  // Instance methods
  User.prototype.checkPassword = async function (password) {
    return await bcrypt.compare(password, this.password);
  };

  User.prototype.encryptSensitiveData = function (data) {
    const { encrypt } = require("../utils/aes");
    this.encryptedData = encrypt(JSON.stringify(data));
  };

  User.prototype.decryptSensitiveData = function () {
    if (!this.encryptedData) return null;
    const { decrypt } = require("../utils/aes");
    const dec = decrypt(this.encryptedData);
    return JSON.parse(dec);
  };
  return User;
};
