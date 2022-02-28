'use strict';

//const Messageboard = require('../components/messageboard.js');
const mongoose = require("mongoose");
const bcrypt = require('bcrypt');
const saltRounds = 5

mongoose.connect(process.env["MONGO_URI"], {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const { Schema } = mongoose;

const ThreadSchema = new Schema({
  board: String,
  text: String,
  created_on: Date,
  bumped_on: Date,
  reported: Boolean,
  delete_password: String,
  replies: [Object]
});

let Thread = mongoose.model("thread", ThreadSchema);

module.exports = function(app) {



  app.route('/api/threads/:board')

    .get(function(req, res) {
      //You can send a GET request to /api/threads/{board}. Returned will be an array of the most recent 10 bumped threads on the board with only the most recent 3 replies for each. The reported and delete_password fields will not be sent to the client.
      Thread.find({ "board": req.params.board })
        .sort({ "bumped_on": "desc" })
        .limit(10)
        .exec((err, threadFound) => {
          if (err) console.log(err);
          if (!threadFound) {
            res.json[{
              "board": req.params.board,
              "text": "",
              "created_on": "",
              "bumped_on": "",
              "replies": []
            }];
          } else {
            if (!err && threadFound) {
              threadFound.forEach(ele => {
                ele.replies.sort((a, b) => {
                  return b.created_on - a.created_on;
                });
                ele.replies = ele.replies.slice(0, 3);
                ele.replies.forEach(reply => {
                  delete reply["reported"]
                  delete reply["delete_password"]
                })
              })

              let returnObject = []
              threadFound.forEach(ele => {
                returnObject.push({
                  "_id": ele._id,
                  "thread_id": ele._id,
                  "board": req.params.board,
                  "text": ele.text,
                  "created_on": ele.created_on,
                  "bumped_on": ele.bumped_on,
                  "replies": ele.replies
                })
              })
              res.json(returnObject);
            }
          }
        })

    })

    .post(function(req, res) {
      //You can send a POST request to /api/threads/{board} with form data including text and delete_password. The saved database record will have at least the fields _id, text, created_on(date & time), bumped_on(date & time, starts same as created_on), reported (boolean), delete_password, & replies (array)
      let created_bumped_date = new Date(Date.now())
      let password = bcrypt.hashSync(req.body.delete_password, saltRounds)

      let threadObject = {
        "board": req.params.board,
        "text": req.body.text,
        "created_on": created_bumped_date,
        "bumped_on": created_bumped_date,
        "reported": false,
        "delete_password": password,
        "replies": []
      };
      let newThread = new Thread(threadObject);
      newThread.save((err, threadCreated) => {
        if (err) {
          console.log(err);
        }
        res.json(threadCreated)
      });
    })


    .put(function(req, res) {
      //You can send a PUT request to /api/threads/{board} and pass along the thread_id. Returned will be the string reported. The reported value of the thread_id will be changed to true.
      let _id = req.body.report_id

      Thread.findById(_id, function(err, threadFound) {
        if (err) console.log(err);
        if (!threadFound) {
          console.log({ error: "could not find", _id: _id })
          res.send({ error: "could not find", _id: _id });
        } else {
          

          let updateObject = {
            "reported": true
          };

          Thread.findOneAndUpdate({ "_id": _id }, updateObject, {
            new: true
          }, function(err, data) {
            if (err) {
              console.log(err)
              res.send({ error: "could not update", _id: _id });
            } else {
              res.send("reported");
            }
          });
        }
      });
    })

    .delete(function(req, res) {
      //You can send a DELETE request to /api/threads/{board} and pass along the thread_id & delete_password to delete the thread. Returned will be the string incorrect password or success.
      let _id = req.body.thread_id
      let myPlaintextPassword = req.body.delete_password

      Thread.findOne({ "_id": _id },
        function(err, threadFound) {
          if (err) return console.log(err);
          if (!threadFound) {
            res.json({ "error": "could not find", "_id": _id })
          } else {
            if (bcrypt.compareSync(myPlaintextPassword, threadFound.delete_password)) {
              Thread.findByIdAndRemove(_id, (err, issue) => {
                if (err) {
                  res.json({ "error": "could not delete", "_id": _id })
                } else {
                  res.send("success")
                }
              })
            } else {
              res.send("incorrect password")
            }
          }
        })
    })

  app.route('/api/replies/:board')

    .get(function(req, res) {
      //You can send a GET request to /api/replies/{board}?thread_id={thread_id}. Returned will be the entire thread with all its replies, also excluding the same fields from the client as the previous test.
      let board = req.params.board
      let _id = req.query.thread_id

      Thread.findById(_id, function(err, threadFound) {
        if (err) console.log(err);
        if (!threadFound) {
          console.log({ error: "could not find", _id: _id })
          res.send({ error: "could not find", _id: _id });
        } else {
          let responseObject = {
            "_id": _id,
            "thread_id": _id,
            "board": board,
            "text": threadFound.text,
            "created_on": threadFound.created_on,
            "bumped_on": threadFound.bumped_on
          }
          let modifiedReplies = []
          threadFound.replies.forEach(ele => {
            modifiedReplies.push({
              "_id": ele._id,
              "text": ele.text,
              "created_on": ele.created_on
            })
          })
          responseObject.replies = modifiedReplies
          res.json(responseObject)
        }
      })


    })

    .post(function(req, res) {
      //You can send a POST request to /api/replies/{board} with form data including text, delete_password, & thread_id. This will update the bumped_on date to the comment's date. In the thread's replies array, an object will be saved with at least the properties _id, text, created_on, delete_password, & reported.
      let _id = req.body.thread_id

      Thread.findById(_id, function(err, threadFound) {
        if (err) console.log(err);
        if (!threadFound) {
          console.log({ error: "could not find", _id: _id })
          res.send({ error: "could not find", _id: _id });
        } else {
          let recent_date = new Date(Date.now())
          let password = bcrypt.hashSync(req.body.delete_password, saltRounds)
          let reply_id = _id + threadFound.replies.length
          let replyArray = threadFound.replies.concat({
            "_id": reply_id,
            "text": req.body.text,
            "created_on": recent_date,
            "delete_password": password,
            "reported": false
          })
          let updateObject = {
            "bumped_on": recent_date,
            "replies": replyArray
          };
          Thread.findOneAndUpdate({ "_id": _id }, updateObject, {
            new: true
          }, function(err, data) {
            if (err) {
              console.log(err)
              res.send({ error: "could not update", _id: _id });
            } else {
              res.json(data);
            }
          });
        }
      });

    })

    .put(function(req, res) {
      //You can send a PUT request to /api/replies/{board} and pass along the thread_id & reply_id. Returned will be the string reported. The reported value of the reply_id will be changed to true.
      let _id = req.body.thread_id
      let reply_id = req.body.reply_id

      Thread.findById(_id, function(err, threadFound) {
        if (err) console.log(err);
        if (!threadFound) {
          console.log({ error: "could not find", _id: _id })
          res.send({ error: "could not find", _id: _id });
        } else {
          let replyArray = threadFound.replies
          for (let i = 0; i < replyArray.length; i++) {
            if (replyArray[i]._id == reply_id) {
              replyArray[i].reported = true
            }
          }

          let updateObject = {
            "replies": replyArray
          };

          Thread.findOneAndUpdate({ "_id": _id }, updateObject, {
            new: true
          }, function(err, data) {
            if (err) {
              console.log(err)
              res.send({ error: "could not update", _id: _id });
            } else {
              res.send("reported");
            }
          });
        }
      });
    })



    .delete(function(req, res) {
      //You can send a DELETE request to /api/replies/{board} and pass along the thread_id, reply_id, & delete_password. Returned will be the string incorrect password or success. On success, the text of the reply_id will be changed to [deleted].
      let _id = req.body.thread_id
      let reply_id = req.body.reply_id
      let myPlaintextPassword = req.body.delete_password

      Thread.findById(_id, function(err, threadFound) {
        if (err) console.log(err);
        if (!threadFound) {
          console.log({ error: "could not find", _id: _id })
          res.send({ error: "could not find", _id: _id });
        } else {

          let reply_hash = threadFound.replies.find(x => x._id == reply_id)
          if (bcrypt.compareSync(myPlaintextPassword, reply_hash.delete_password)) {

            let replyArray = threadFound.replies

            for (let i = 0; i < replyArray.length; i++) {
              if (replyArray[i]._id == reply_id) {
                replyArray[i].text = "[deleted]"
              }
            }

            let updateObject = {
              "replies": replyArray
            };

            Thread.findOneAndUpdate({ "_id": _id }, updateObject, {
              new: true
            }, function(err, data) {
              if (err) {
                console.log(err)
                res.send({ error: "could not update", _id: _id });
              } else {
                res.send("success");
              }
            });
          } else {
            res.send("incorrect password")
          }
        }
      });
    })
};
