const { User, sequelize } = require("./models");

(async () => {
  try {
    const users = await User.findAll({
      order: [["createdAt", "DESC"]],
      limit: 5,
    });
    console.log("Latest users:");
    for (const u of users) {
      console.log(u.username, u.email, u.createdAt);
    }
  } catch (err) {
    console.error("error creating user:", err);
  } finally {
    await sequelize.close();
  }
})();
