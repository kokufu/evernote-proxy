"use strict";

var express = require("express");
var app = express();
var session = require("express-session");
var fs = require("fs");
var request = require("request");
var url = require("url");
var Evernote = require("evernote").Evernote;

// Load config defaults from JSON file.
// Environment variables override defaults.
var config = function() {
  var configFile;
  try {
    configFile = fs.readFileSync(__dirname + "/config.json", "utf-8");
  } catch(e) {
    // config.json does not exist.
    // For using environment variables, keys must be loaded from config.json.template.
    configFile = fs.readFileSync(__dirname + "/config.json.template", "utf-8");
  }
  var result = JSON.parse(configFile);

  // override from environment variables if exists.
  for (var i in result) {
    result[i] = process.env[i.toUpperCase()] || result[i];
  }

  console.log("Configuration");
  console.log(result);

  return result;
}();

function arrayBufferToBuffer(ab) {
  var buffer = new Buffer(ab.byteLength);
  var view = new Uint8Array(ab);
  for (var i = 0; i < buffer.length; ++i) {
    buffer[i] = view[i];
  }
  return buffer;
}


app.all("*", function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});


app.use(session({
  secret: "Z6DX34Xyut",
  resave: false,
  saveUninitialized: false
}));


app.get("/oauth", function(req, res) {
  if (!req.query.callbackurl) {
    return res.type("text/plain")
    .status(400)
    .send('The query "callbackurl" must be set.');
  }

  // Store callbackurl to the session
  req.session.callbackurl = req.query.callbackurl;

  var client = new Evernote.Client({
    consumerKey: config.API_CONSUMER_KEY,
    consumerSecret: config.API_CONSUMER_SECRET,
    sandbox: config.SANDBOX
  });

  // When authorization sucess, server redirect to this url.
  var oauthVerificationUrl = url.parse("");
  oauthVerificationUrl.protocol = req.protocol;
  oauthVerificationUrl.host = req.get("Host");
  oauthVerificationUrl.pathname = "/oauthVerification";

  client.getRequestToken(url.format(oauthVerificationUrl), function(error, oauthToken, oauthTokenSecret, results){
    if (error) {
      req.session.destroy();

      return res.status(error.statusCode)
      .send(error.data);
    } else {
      // store the tokens in the session
      req.session.oauthToken = oauthToken;
      req.session.oauthTokenSecret = oauthTokenSecret;

      // redirect the user to authorize the token
      res.redirect(client.getAuthorizeUrl(oauthToken));
    }
  });
});


app.get("/oauthVerification", function(req, res) {
  var callbackurl = req.session.callbackurl;
  if (!callbackurl) {
    return res.type("text/plain")
    .status(401)
    .send('The session does not contain "callbackurl".');
  }

  var client = new Evernote.Client({
    consumerKey: config.API_CONSUMER_KEY,
    consumerSecret: config.API_CONSUMER_SECRET,
    sandbox: config.SANDBOX
  });

  var oauthToken = req.session.oauthToken;
  var oauthTokenSecret = req.session.oauthTokenSecret;

  // Unused session should be destroyed ASAP.
  req.session.destroy();

  client.getAccessToken(
    oauthToken,
    oauthTokenSecret,
    req.query.oauth_verifier,
    function(error, oauthAccessToken, oauthAccessTokenSecret, results) {
      if(error) {
        return res.status(error.statusCode)
        .send(error.data);
      } else {
        var redirectUrl = url.parse(callbackurl);
        redirectUrl.query = {
          "oauthAccessToken" : oauthAccessToken
        };
        res.redirect(url.format(redirectUrl));
      }
    });
  });


  app.post("/noteStore", function(req, res) {
    var oauthAccessToken = req.query.oauthAccessToken;
    if (!oauthAccessToken) {
      return res.type("text/plain")
      .status(400)
      .send('The query "oauthAccessToken" must be set.');
    }

    var client = new Evernote.Client({
      token: oauthAccessToken,
      sandbox: config.SANDBOX
    });

    // UserStore for nodejs also has getNoteStoreUrl().
    // However, we use thriftClient here to handle error correctly.
    client.getUserStore().getThriftClient(function(error, thriftClient) {
      thriftClient.getNoteStoreUrl(oauthAccessToken, function(error, noteStoreUrl) {
        if (error) {
          // Error occured.
          // We must send back thrift response
          var trans = thriftClient.input.getTransport();
          for (var h in trans.headers) {
            if (trans.headers.hasOwnProperty(h)) {
              res.setHeader(h, trans.headers[h]);
            }
          }

          return res.send(arrayBufferToBuffer(trans.received));
        }
        // pipe to NoteStoreUrl
        req.pipe(request(noteStoreUrl)).pipe(res);
      });
    });
  });

  var port = config.PORT || 9999;

  app.listen(port, null, function (err) {
    console.log("Server started: http://localhost:" + port);
  });
