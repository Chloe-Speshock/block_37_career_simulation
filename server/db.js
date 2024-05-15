require("dotenv").config();
const pg = require("pg");
const client = new pg.Client(
  process.env.DATABASE_URL || "postgres://localhost/block_37_career_simulation"
);
const uuid = require("uuid");
const bcrypt = require("bcrypt");

const jwt = require("jsonwebtoken");

const createTables = async () => {
  const SQL = /*sql*/ `
    DROP TABLE IF EXISTS comments;
    DROP TABLE IF EXISTS reviews;
    DROP TABLE IF EXISTS users;
    DROP TABLE IF EXISTS items;
    CREATE TABLE users(
        id UUID PRIMARY KEY,
        username VARCHAR(20) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL
    );
    CREATE TABLE items(
        id UUID PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE
    );
    CREATE TABLE reviews(
        id UUID PRIMARY KEY,
        user_id UUID REFERENCES users(id) NOT NULL,
        item_id UUID REFERENCES items(id) NOT NULL,
        CONSTRAINT unique_user_id_item_id UNIQUE (user_id, item_id)
    );
    CREATE TABLE comments(
        id UUID PRIMARY KEY,
        user_id UUID REFERENCES users(id) NOT NULL,
        comment_id UUID REFERENCES reviews(id) NOT NULL

    );
    `;
  await client.query(SQL);
};

const createUser = async ({ username, password }) => {
  const SQL = /*sql*/ `
      INSERT INTO users(id, username, password) VALUES($1, $2, $3) RETURNING *
    `;
  const response = await client.query(SQL, [
    uuid.v4(),
    username,
    await bcrypt.hash(password, 5),
  ]);
  return response.rows[0];
};

const createItem = async ({ name }) => {
  const SQL = /*sql*/ `
      INSERT INTO items(id, name) VALUES ($1, $2) RETURNING * 
    `;
  const response = await client.query(SQL, [uuid.v4(), name]);
  return response.rows[0];
};

const authenticate = async ({ username, password }) => {
  const SQL = /*sql*/ `
      SELECT id, password
      FROM users
      WHERE username = $1
    `;
  const response = await client.query(SQL, [username]);
  if (
    !response.rows.length ||
    (await bcrypt.compare(password, response.rows[0].password)) === false
  ) {
    const error = Error("not authorized");
    error.status = 401;
    throw error;
  }
  const token = await jwt.sign({ id: response.rows[0].id }, JWT);
  console.log(token);
  return { token };
};

const createUserReview = async ({ user_id, review_id }) => {
  const SQL = /*sql*/ `
      INSERT INTO reviews(id, user_id, review_id) VALUES ($1, $2, $3) RETURNING * 
    `;
  const response = await client.query(SQL, [uuid.v4(), user_id, review_id]);
  return response.rows[0];
};

const createUserComment = async ({ user_id, comment_id }) => {
  const SQL = /*sql*/ `
        INSERT INTO comments(id, user_id, comment_id) VALUES ($1, $2, $3) RETURNING * 
      `;
  const response = await client.query(SQL, [uuid.v4(), user_id, comment_id]);
  return response.rows[0];
};

const fetchUsers = async () => {
  const SQL = /*sql*/ `
      SELECT id, username 
      FROM users
    `;
  const response = await client.query(SQL);
  return response.rows;
};

const fetchItems = async () => {
  const SQL = /*sql*/ `
      SELECT *
      FROM items
    `;
  const response = await client.query(SQL);
  return response.rows;
};

const fetchUserReviews = async (user_id) => {
  const SQL = /*sql*/ `
      SELECT *
      FROM reviews
      WHERE user_id = $1
    `;
  const response = await client.query(SQL, [user_id]);
  return response.rows;
};

const fetchUserComments = async (user_id) => {
  const SQL = /*sql*/ `
        SELECT *
        FROM comments
        WHERE user_id = $1
      `;
  const response = await client.query(SQL, [user_id]);
  return response.rows;
};

const deleteUserReview = async ({ user_id, id }) => {
  const SQL = /*sql*/ `
      DELETE
      FROM reviews
      WHERE user_id = $1 AND id = $2
    `;
  await client.query(SQL, [user_id, id]);
};

const deleteUserComment = async ({ user_id, id }) => {
  const SQL = /*sql*/ `
      DELETE
      FROM comments
      WHERE user_id = $1 AND id = $2
    `;
  await client.query(SQL, [user_id, id]);
};

const findUserByToken = async (token) => {
  let id;
  try {
    const payload = await jwt.verify(token, JWT);
    id = payload.id;
  } catch (ex) {
    const error = Error("not authorized");
    error.status = 401;
    throw error;
  }
  const SQL = /*sql*/ `
      SELECT id, username
      FROM users
      WHERE id = $1
    `;
  const response = await client.query(SQL, [id]);
  if (!response.rows.length) {
    const error = Error("not authorized");
    error.status = 401;
    throw error;
  }
  return response.rows[0];
};

module.exports = {
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
};
