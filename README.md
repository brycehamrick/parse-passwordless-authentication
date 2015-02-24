# Parse Passwordless Authentication
An example of how to use Parse's Cloud Code to implement Passwordless Authentication

The token generation (including use of base58) was borrowed from [@florianheinemann](https://github.com/florianheinemann) in his [passwordless.net](https://github.com/florianheinemann/passwordless) project.

This project uses Mailgun but could easily be modified to use another transactional email service or even something like Twilio.

## Security
This will require a "Token" class and you'll want to revoke both read and write access from all roles & users. The cloud code method uses the master key and nothing else should have access.

There is some inherent risk in generating the random password on the client. I couldn't find any way around this on a first pass, but it's worth noting that it's possible that the random password could be intercepted in transit or by a malicious script in the client application. That said, this risk is also present during a conventional registration that includes a password.


## Client Implementation

On the client you'll need to sign up users with a random but strong password.

```javascript
function randomString(length) {
  return Math.round((Math.pow(36, length + 1) - Math.random() * Math.pow(36, length))).toString(36).slice(1);
}

var user = new Parse.User();
user.set("username", email);
user.set("password", randomString(48));
user.set("email", email);

user.signUp(null, {
  success: function(user) {
    setCurrentUser(user);
  },
  error: function(user, error) {
    showError(error.message);
  }
});
```

The sign in form should just take an email address.
```javascript
Parse.Cloud.run('passwordless', { email: email }, {
  success: function() {
    showSuccess("Please check your email to continue.");
  },
  error: function(error) {
    $scope.showError(error.message);
  }
});
```

Your token handler (the URL in the email link) needs to validate the token:
```javascript
Parse.Cloud.run('passwordless', { token: token }, {
  success: function(sessionToken) {
    Parse.User.become(sessionToken).then(function (user) {
      setCurrentUser(user);
    }, function (error) {
      showError('Session Token is invalid.');
    });
  },
  error: function(error) {
    $scope.showError('Passwordless token is invalid.');
  }
});
```
