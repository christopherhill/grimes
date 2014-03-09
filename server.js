// syntax has changed for Express 3.x
// http://stackoverflow.com/questions/12764346/socket-io-error-listen-method-expects-an-http-server-instance-after-moving

var   express = require('express'),
      app =     express(),
      http =    require('http'),
      server =  http.createServer(app),
      io =      require('socket.io').listen(server),
      parser =  new require('xml2json'),
      fs =      require('fs'),
      passport= require('passport'),
      path =    require('path');

server.listen(8000);

// serve out the static files
app.use(express.static(path.join(__dirname, 'public')));

var auth = function(req, res, next){ 
    if (!req.isAuthenticated()) 
        res.send(401); 
    else 
        next(); 
}; 
function handler(req, res) {
  fs.readFile('index.html', function(err, data) {
    if (err) {
      console.log(err);
      res.writeHead(500);
      return res.end('Error loading index.html');
    }
    res.writeHead(200);
    res.end(data);
  });
}

app.get('/', handler); 
app.get('/users', auth, function(req, res) {

});
// route to test if the user is logged in or not 
app.get('/loggedin', function(req, res) { 
  res.send(req.isAuthenticated() ? req.user : '0'); 
}); 
// route to log in 
app.post('/login', passport.authenticate('local'), function(req, res) { 
  res.send(req.user);
}); 
// route to log out 
app.post('/logout', function(req, res){ 
  req.logOut(); res.send(200); 
}); 

var libretto = {
  info: {
    title: "Carmen",
    subtitle: "An Opera in Three Acts",
    author: "Henri Meilhac and Ludovic Halévy",
    composer: "Georges Bizet",
    language: "English"
  },
  part: [
  {
    name: "Act I, Scene I",
    lines: [
    { number: 0, person: "Soldiers", line: "On the square everyone comes by, everyone comes and goes; funny sort of people these!" },
    { number: 1, person: "Moralès", line: "At the guard-house door, to kill time, we smoke, gossip and watch the passers-by." },
    { number: 2, person: ["Soldiers", "Moralès"], line: "On the square, etc." },
    { number: 3, person: "Moralès", line: "Now look at this little lass who seems to want to speak to us. Look, she's turning round, she's hesitating." },
    { number: 4, person: "Soldiers", line: "We must go and help her!" }
    ]
  }
  ]
};

// get a line of the libretto
function LibrettoManager(libretto) {

  this.curLine = 0;
  this.totalLines = libretto.part[0].lines.length;
  var self = this;
  this.advLine = function() { self.curLine < (self.totalLines - 1) ? self.curLine += 1 : self.totalLines; }
  this.decLine = function() { self.curLine > 0 ? self.curLine -= 1 : 0; }
  this.getCurLine = function() { 
    if (self.curLine >= 0 && self.curLine < self.totalLines) { 
      return libretto.part[0].lines[self.curLine].line;
    }
  }
  this.getFirstLine = function() {
    return libretto.part[0].lines[0].line;
  }
  this.getInformation = function() {
    return libretto.info;
  }
}

var LM = new LibrettoManager(libretto);
var clients = [];

// creating a new websocket to keep the content updated without any AJAX request
io.sockets.on('connection', function(socket) {

  // saves all connections into an array
  clients.push(socket.id);
  console.log('added client');

  // watching the xml file
 /* fs.watch('/Users/chasematterhorn/Development/openopera/libretti/sample.xml', function(curr, prev) {
    // on file change we can read the new xml
    fs.readFile('/Users/chasematterhorn/Development/openopera/libretti/sample.xml', function(err, data) {
      if (err) throw err;
      // parsing the new xml data and converting them into json file
      var json = parser.toJson(data);
      // adding the time of the last update
      json.time = new Date();
      // send the new data to the client
      socket.volatile.emit('notification', json);
    });
  }); */

  // emit initial line
  socket.emit('initialize', LM.getInformation());
  socket.emit('first-line', LM.getFirstLine());

  // watch for a change in the current line
  socket.on('libretto-next', function() {
    LM.advLine();
    // broadcast to all
    for (var i in clients) {
      io.sockets.socket(clients[i]).emit('libretto-line', LM.getCurLine());
    }
    // socket.emit('libretto-line', LM.getCurLine());
  });

  socket.on('libretto-prev', function() {
    LM.decLine();
    // broadcast to all
    for (var i in clients) {
      io.sockets.socket(clients[i]).emit('libretto-line', LM.getCurLine());
    }
    // socket.emit('libretto-line', LM.getCurLine());
  })

});
