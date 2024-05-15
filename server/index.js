const {
  client,
  createTables,
  createUser,
  createItem,
  createUserReview,
  createUserComment,
  fetchUsers,
  fetchItems,
  fetchUserReviews,
  fetchUserComments,
  deleteUserReview,
  deleteUserComment,
  authenticate,
  findUserByToken,
} = require("./db");

const express = require("express");
const app = express();
app.use(express.json());

const isLoggedIn = async (req, res, next) => {
  try {
    req.user = await findUserByToken(req.headers.authorization);
    next();
  } catch (error) {
    next(error);
  }
};

const init = async () => {
  await client.connect();
  console.log("connected to database");
  await createTables();
  console.log("tables created");
  const [kate, kai, kelsey, frank, pretzel, hotdog, nachos, icecream] =
    await Promise.all([
      createUser({ username: "kate", password: "kate_rocks" }),
      createUser({ username: "kai", password: "kai_rocks!" }),
      createUser({ username: "kelsey", password: "go_dogs!" }),
      createUser({ username: "frank", password: "I'm_a_man" }),
      createItem({ name: "pretzel" }),
      createItem({ name: "hotdog" }),
      createItem({ name: "nachos" }),
      createItem({ name: "icecream" }),
    ]);

  //   const userReviews = await Promise.all([
  //     createUserReview({ user_id: kate.id, item_id: hotdog.id }),
  //   ]);

  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`listening on port ${port}`));
};
init();
