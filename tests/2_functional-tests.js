const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);

suite('Functional Tests', function() {
  let thread_id = ""
  let reply_id = ""


  test('Creating a new thread: POST request to /api/threads/{board}', function(done) {
    chai.request(server)
      .post('/api/threads/functest')
      .send({
        "text": "functional test thread",
        "delete_password": "password123"
      })
      .end(function(err, res) {
        assert.equal(res.status, 200)
        assert.equal(res.body.text, 'functional test thread')
        assert.property(res.body, '_id')
        assert.property(res.body, 'text')
        assert.property(res.body, 'created_on')
        assert.property(res.body, 'bumped_on')
        assert.property(res.body, 'replies')
        thread_id = res.body._id


        done()
      })
  });

  test('Viewing the 10 most recent threads with 3 replies each: GET request to /api/threads/{board}', function(done) {
    chai.request(server)
      .get('/api/threads/functest')
      .end(function(err, res) {
        assert.equal(res.status, 200)
        assert.isArray(res.body)
        assert.isAtMost(res.body.length, 10)

        done()
      })
  });

  test('Reporting a thread: PUT request to /api/threads/{board}', function(done) {
    chai.request(server)
      .put('/api/threads/functest')
      .send({
        "report_id": thread_id
      })
      .end(function(err, res) {
        assert.equal(res.status, 200)
        assert.equal(res.text, 'reported')

        done()
      })
  });





  test('Creating a new reply: POST request to /api/replies/{board}', function(done) {
    chai.request(server)
      .post('/api/replies/functest')
      .send({
        "text": "test reply",
        "delete_password": "password123",
        "thread_id": thread_id
      })
      .end(function(err, res) {
        assert.equal(res.status, 200)
        assert.property(res.body, '_id')
        reply_id = res.body.replies[0]._id
        done()
      })
  });

  test('Viewing a single thread with all replies: GET request to /api/replies/{board}', function(done) {
    chai.request(server)
      .get('/api/replies/functest?thread_id=' + thread_id)
      .end(function(err, res) {
        assert.equal(res.status, 200)
        assert.property(res.body, '_id')
        assert.property(res.body, 'replies')

        done()
      })
  });

  test('Reporting a reply: PUT request to /api/replies/{board}', function(done) {
    chai.request(server)
      .put('/api/replies/functest')
      .send({
        "thread_id": thread_id,
        "reply_id": reply_id
      })
      .end(function(err, res) {
        assert.equal(res.status, 200)
        assert.equal(res.text, 'reported')

        done()
      })
  });

  test('Deleting a reply with the incorrect password: DELETE request to /api/replies/{board} with an invalid delete_password', function(done) {
    chai.request(server)
      .delete('/api/replies/functest')
      .send({
        "thread_id": thread_id,
        "reply_id": reply_id,
        "delete_password": "wrongpw"
      })
      .end(function(err, res) {
        assert.equal(res.status, 200)
        assert.equal(res.text, 'incorrect password')

        done()
      })
  });

  test('Deleting a reply with the correct password: DELETE request to /api/replies/{board} with a valid delete_password', function(done) {
    chai.request(server)
      .delete('/api/replies/functest')
      .send({
        "thread_id": thread_id,
        "reply_id": reply_id,
        "delete_password": "password123"
      })
      .end(function(err, res) {
        assert.equal(res.status, 200)
        assert.equal(res.text, 'success')

        done()
      })
  });



  test('Deleting a thread with the incorrect password: DELETE request to /api/threads/{board} with an invalid delete_password', function(done) {
    chai.request(server)
      .delete('/api/threads/functest')
      .send({
        "thread_id": thread_id,
        "delete_password": "wrongpw"
      })
      .end(function(err, res) {
        assert.equal(res.status, 200)
        assert.equal(res.text, 'incorrect password')

        done()
      })
  });

  test('Deleting a thread with the correct password: DELETE request to /api/threads/{board} with a valid delete_password', function(done) {
    chai.request(server)
      .delete('/api/threads/functest')
      .send({
        "thread_id": thread_id,
        "delete_password": "password123"
      })
      .end(function(err, res) {
        assert.equal(res.status, 200)
        assert.equal(res.text, 'success')

        done()
      })
  });

});
