var _ = require('underscore'),
    fs = require('fs'),
    Mailgun = require('mailgun'),
    crypto = require('crypto'),
    base58 = require('cloud/bs58.js');

Mailgun.initialize('domain.com','key');

Parse.Cloud.define('passwordless', function(request, response) {
  Parse.Cloud.useMasterKey();
  var Token = Parse.Object.extend("Token");
  if (request.params.email) {
    var query = new Parse.Query(Parse.User);
    query.equalTo("email", request.params.email);
    query.find().then(function(users) {
      if (users.length < 1) return Parse.Promise.error("invalid email address");

      var user = users[0];
      var token = new Token();
      token.set('user', user);
      token.set('used', false);

      // Generate the token
      buf = crypto.randomBytes(16);
      newToken = base58.encode(buf);
      token.set('token', newToken);

      // Set the expiration time
      var tomorrow = new Date(new Date().getTime() + (24 * 60 * 60 * 1000));
      token.set('expires', tomorrow);

      return token.save();
    }).then(function(obj) {
      var token = obj.get('token');
      var content = {
        subject: 'Sign in to Main',
        intro: 'Click the link below to sign in. This link will expire in 24 hours.',
        closer: 'We use this process to avoid creating yet another password for you to remember. Let us know what you think!',
        url: 'http://domain.com/signin?token=' + token
      };
      var actionTemplate = fs.readFileSync('cloud/templates/action.js','utf8');
      var actionTextTemplate = fs.readFileSync('cloud/templates/action-text.js','utf8');
      var action = _.template(actionTemplate);
      var actionText = _.template(actionTextTemplate);
      return Mailgun.sendEmail({
        from: 'info@domain.com',
        to: request.params.email,
        subject: content.subject,
        html: action(content),
        text: actionText(content)
      });
    }).then(function() {
      return response.success('ok');
    }, function(error) {
      return response.error(error.message);
    });
  }
  else if (request.params.token) {
    var query = new Parse.Query(Token);
    query.equalTo('token', request.params.token);
    query.greaterThan('expires', new Date());
    query.equalTo('used', false);
    query.find().then(function(tokens) {
      if (tokens.length < 1) return Parse.Promise.error("invalid token");

      token = tokens[0];
      token.set('used', true);
      return token.save();
    }).then(function (token) {
      userPointer = token.get('user');
      return userPointer.fetch();
    }).then(function(user) {
      return response.success(user.getSessionToken());
    }, function(error) {
      return response.error(error.message);
    });
  }
  else {
    response.error('missing required');
  }
});

Parse.Cloud.beforeSave(Parse.User, function(request, response) {
  if (!request.object.get("email")) {
    response.error("email is required for signup");
  } else {
    response.success();
  }
});
