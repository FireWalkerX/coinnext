(function() {
  var JsonRenderer, exports;

  JsonRenderer = {
    user: function(user) {
      return {
        id: user.id,
        email: user.email,
        created: user.created,
        gauth_data: user.gauth_data
      };
    }
  };

  exports = module.exports = JsonRenderer;

}).call(this);