const express = require("express");
const app = express();
const body_parser = require("body-parser");
app.use(body_parser.urlencoded({ extended: false }));
app.use(body_parser.json());
const fs = require("fs");
const uuid = require("uuid");
const cors = require("cors");
const json = require("body-parser/lib/types/json");

app.use(cors());


const db = {
  create: function (newUser) {
    const users = this.read();

    newUser.id = uuid.v1();

    users.push(newUser);

    fs.writeFileSync(`./data_base.json`, JSON.stringify(users));

    return newUser;
  },
  read: function () {
    return JSON.parse(
      Buffer.from(fs.readFileSync("./data_base.json").toString("utf-8"))
    );
  },
  update: function (id, data) {
    const users = this.read();
    let update_user = [];
    let no_update_keys = ["id", "password"];
    let exist_ids = [];

    for (let i = 0; i < users.length; i++) {
      exist_ids.push(users[i].id)
      if (id === users[i].id) {
        for (let [key, value] of Object.entries(data)) {
          if (no_update_keys.includes(key)) {
            return {
              message: `${key} - not allowed to change`,
              status: "Error",
              payload: data,
            };
          } else if (!Object.keys(users[i]).includes(key)) {
            return {
              message: `${key} - Fields does not exists`,
              status: "Error",
              payload: data,
            };
          }
          users[i][key] = value;
          update_user.push(users[i]);
        }
        fs.writeFileSync(`./data_base.json`, JSON.stringify(users));
        return update_user;
      }
    }
    if(!exist_ids.includes(id)){
      return {
        message: `${id} - Does not exist`,
        status: "Error",
        payload: id,
      };
    }
  },

  delete: function (idsAll) {
    const users = this.read();

    let deleted_user = [];

    for (let i = 0; i < users.length; i++) {
      if (idsAll === users[i].id) {
        deleted_user.push(users[i]);
        users.splice(i, 1);
        i--;
      }
    }

    fs.writeFileSync(`./data_base.json`, JSON.stringify(users));
    return deleted_user;
  },

  change_password: function (id, password, new_password) {
    const users = this.read();
    let exist_ids = [];
    let change_password = [];

    for (let i = 0; i < users.length; i++) {
      exist_ids.push(users[i].id)
      if ((id === users[i].id) & (password === users[i].password)) {
        users[i]["password"] = new_password;
        change_password.push(users[i]);
        fs.writeFileSync(`./data_base.json`, JSON.stringify(users));
        return change_password;
      } else if ((id === users[i].id) & (password !== users[i].password)) {
        return {
          message: `Password ${password} - Does not match`,
          status: "Error",
          payload: password,
        };
      }
    }
    if(!exist_ids.includes(id)){
      return {
        message: `${id} - Does not exist`,
        status: "Error",
        payload: id,
      };
    }
  },
};

const registration_handler = function (req, res) {
  const body = req.body;

  let { login, password, try_password } = body;

  const users = db.read();

  for (const user of users)
    if (user.login === login)
      return res.json({
        message: "Username Already in Use",
        status: "Error",
        payload: body,
      });

  if (login.length < 5 || login.length > 30)
    return res.json({
      message: "The length of the username must be exceed 5 characters",
      status: "Error",
      payload: body,
    });

  if (password.length < 8 || password.length > 256)
    return res.json({
      message: "message: 'The length of the password must be exceed 8 characters",
      status: "Error",
      payload: body,
    });

  if (password !== try_password)
    return res.json({
      message: "Password does not match",
      status: "Error",
      payload: body,
    });

  const new_user = db.create({ login, password });

  return res.json({
    message: "User added successfully",
    status: "ok",
    payload: new_user,
  });
};

const authorization_handler = function (req, res) {
  const body = req.body;

  let { login, password } = body;

  const users = db.read();

  for (const user of users) {
    if (user.login === login && user.password === password) {
      return res.json({
        message: "Successfully logged in",
        status: "ok",
        payload: { user, is_auth: true },
      });
    }
  }
  return res.json({
    message: "This user does not exist",
    status: "error",
    payload: { is_auth: false },
  });
};

const get_users_handler = function (req, res) {
  const users = db.read();

  return res.json({
    message: "All Users",
    status: "ok",
    payload: users,
  });
};

const get_user_by_id_handler = function (req, res) {
  const { id } = req.params;

  if (!id)
    return res.json({
      message: "Incorrect user ID",
      status: "error",
      payload: { id },
    });

  console.log(id);

  const users = db.read();

  for (const user of users)
    if (user.id == id)
      return res.json({
        message: `User login:${user.login}`,
        status: "ok",
        payload: user,
      });

  return res.json({
    message: "There is no such user",
    status: "error",
    payload: { id },
  });
};

const delete_user_handler = function (req, res) {
  const { id } = req.params;

  if (id.length !== 36)
    return res.json({
      message: "Incorrect UUID length",
      status: "error",
      payload: { id },
    });

  const deleted_user = db.delete(id);

  return res.json({
    message: "User deleted",
    status: "ok",
    payload: deleted_user,
  });
};

const update_user_handler = function (req, res) {
  const { id } = req.params;
  const body = req.body;

  if (id.length !== 36)
    return res.json({
      message: "Incorrect UUID length",
      status: "error",
      payload: { id },
    });

  const update_user = db.update(id, body);

  if (update_user.status === "Error") {
    return res.json(update_user);
  }
  return res.json({
    message: "User data changed",
    status: "ok",
    payload: update_user,
  });
};

const change_user_password_handler = function (req, res) {
  const { id } = req.params;
  const { password, new_password } = req.body;

  if (password === undefined || new_password === undefined) {
    return res.json({
      message: `Oops!Please inter password and new password`,
      status: "Error",
    });
  }
  const change_password = db.change_password(id, password, new_password);

  if (change_password.status === "Error") {
    return res.json(change_password);
  }
  return res.json({
    message: "Password changed",
    status: "ok",
    payload: change_password,
  });
};

app.post("/registration", registration_handler);

app.post("/authorization", authorization_handler);

app.get("/users", get_users_handler);

app.get("/user/:id", get_user_by_id_handler);

app.delete("/delete/:id", delete_user_handler);

app.put("/update/:id", update_user_handler);

app.put("/users/change_password/:id", change_user_password_handler);

app.listen(3000);



