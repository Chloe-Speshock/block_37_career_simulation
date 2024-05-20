const {
  client,
  createTables,
  createUser,
  createItem,
  createUserReview,
  createUserComment,
  fetchUsers,
  fetchItems,
  fetchSingleItem,
  fetchUserReviews,
  fetchItemReviews,
  fetchUserComments,
  updateUserReview,
  findReviewById,
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
    console.log("Headers:", req.headers);
    console.log("token received:", req.headers.authorization);
    req.headers.authorization = req.headers.authorization.replace(
      "Bearer ",
      ""
    );

    console.log("modified token:", req.headers.authorization);

    req.user = await findUserByToken(req.headers.authorization);
    console.log("User object:", req.user);
    next();
  } catch (error) {
    next(error);
  }
};

app.get("/api/items", async (req, res, next) => {
  try {
    res.send(await fetchItems());
  } catch (error) {
    next(error);
  }
});

app.get("/api/items/:id", async (req, res, next) => {
  try {
    const itemId = req.params.id;
    const item = await fetchSingleItem(itemId);
    if (!item) {
      return res.status(404).json({ message: "item not found" });
    }
    res.json(item);
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/register", async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const newUser = await createUser({ username, password });
    res
      .status(201)
      .json({ message: "user registered successfully", user: newUser });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/login", async (req, res, next) => {
  try {
    res.send(await authenticate(req.body));
  } catch (error) {
    next(error);
  }
});

app.get("/api/auth/me", isLoggedIn, async (req, res, next) => {
  try {
    res.send(req.user);
  } catch (error) {
    next(error);
  }
});

app.get("/api/items/:itemId/reviews", async (req, res, next) => {
  try {
    const itemId = req.params.itemId;
    const reviews = await fetchItemReviews(itemId);
    if (reviews.length === 0) {
      return res.status(404).json({ message: "no reviews for this item" });
    }
    res.json(reviews);
  } catch (error) {
    next(error);
  }
});

app.get("/api/items/:itemId/reviews/:id", async (req, res, next) => {
  try {
    const itemId = req.params.itemId;
    const reviewId = req.params.id;
    const review = await fetchItemReviews(itemId, reviewId);

    if (!review) {
      return res.status(404).json({ message: "review not found" });
    }
    res.json(review);
  } catch (error) {
    next(error);
  }
});

app.post("/api/items/:itemId/reviews", isLoggedIn, async (req, res, next) => {
  try {
    console.log("Request body:", req.body);
    const { text, rating } = req.body;
    const userId = req.user.id;

    const itemId = req.params.itemId;

    const newReview = await createUserReview({
      text,
      rating,
      user_id: userId,
      item_id: itemId,
    });
    console.log("new review:", newReview);

    res
      .status(201)
      .json({ message: "review created successfully", review: newReview });
  } catch (error) {
    next(error);
  }
});

app.get("/api/reviews/me", isLoggedIn, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userReviews = await fetchUserReviews(userId);
    res.json(userReviews);
  } catch (error) {
    next(error);
  }
});

app.put(
  "/api/users/:userId/reviews/:id",
  isLoggedIn,
  async (req, res, next) => {
    try {
      const { id, userId } = req.params;
      const { text, rating } = req.body;

      if (userId !== req.user.id) {
        const error = new Error("Unauthorized");
        error.status = 403;
        throw error;
      }

      const updatedReview = await updateUserReview(id, text, rating);

      res.status(200).json({
        message: "review updated successfully",
        review: updatedReview,
      });
    } catch (error) {
      next(error);
    }
  }
);

app.delete(
  "/api/users/:userId/reviews/:id",
  isLoggedIn,
  async (req, res, next) => {
    try {
      const userId = req.user.id;
      const reviewId = req.params.id;

      const review = await findReviewById(reviewId);
      if (!review) {
        const error = new Error("review not found");
        error.status = 404;
        throw error;
      }

      if (review.user_id !== userId) {
        const error = new Error("Unauthorized");
        error.status = 403;
        throw error;
      }

      await deleteUserReview(reviewId);

      res.status(200).json({ nessage: "Review deleted successfully" });
    } catch (error) {
      next(error);
    }
  }
);

app.post(
  "/api/items/:itemId/reviews/:id/comments",
  isLoggedIn,
  async (req, res, next) => {
    try {
      const { text } = req.body;
      const userId = req.user.id;
      const reviewId = req.params.id;

      const newComment = await createUserComment({
        text,
        user_id: userId,
        review_id: reviewId,
      });
      res
        .status(201)
        .json({ message: "comment added successfully", comment: newComment });
    } catch (error) {
      next(error);
    }
  }
);

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

  const [review1, review2] = await Promise.all([
    createUserReview({
      text: "love this hotdog",
      user_id: kate.id,
      item_id: hotdog.id,
      rating: 4,
    }),
    createUserReview({
      text: "these nachos are gross",
      user_id: kai.id,
      item_id: nachos.id,
      rating: 2,
    }),
  ]);

  const userComments = await Promise.all([
    createUserComment({
      text: "love this review",
      user_id: kelsey.id,
      review_id: review2.id,
    }),
  ]);

  console.log("reviews seeded successfully!");

  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`listening on port ${port}`));
};
init();
