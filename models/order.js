(function() {
  var Order, OrderSchema, exports, _;

  _ = require("underscore");

  OrderSchema = new Schema({
    user_id: {
      type: String,
      index: true
    },
    type: {
      type: String,
      "enum": ["market", "limit"],
      index: true
    },
    action: {
      type: String,
      "enum": ["buy", "sell"],
      index: true
    },
    buy_currency: {
      type: String,
      index: true
    },
    sell_currency: {
      type: String,
      index: true
    },
    amount: {
      type: Number
    },
    fee: {
      type: Number
    },
    unit_price: {
      type: Number
    },
    status: {
      type: String,
      "enum": ["open", "partial", "completed"],
      "default": "open",
      index: true
    },
    published: {
      type: Boolean,
      "default": false,
      index: true
    },
    created: {
      type: Date,
      "default": Date.now,
      index: true
    }
  });

  OrderSchema.set("autoIndex", false);

  /*
  OrderSchema.path("unit_price").validate ()->
      console.log @
      return false
    , "Invalid unit price"
  */


  OrderSchema.methods.publish = function(callback) {
    var _this = this;
    if (callback == null) {
      callback = function() {};
    }
    return GLOBAL.walletsClient.send("publish_order", [this.id], function(err, res, body) {
      if (err) {
        console.error(err);
        return callback(err, res, body);
      }
      if (body && body.published) {
        return Order.findById(_this.id, callback);
      } else {
        console.error("Could not publish the order - " + (JSON.stringify(body)));
        return callback("Could not publish the order to the network");
      }
    });
  };

  OrderSchema.statics.findByOptions = function(options, callback) {
    var currencies, dbQuery;
    if (options == null) {
      options = {};
    }
    dbQuery = Order.find({
      status: options.status
    });
    if (["buy", "sell"].indexOf(options.action) > -1) {
      dbQuery.where({
        action: options.action
      });
    }
    if (options.user_id) {
      dbQuery.where({
        user_id: options.user_id
      });
    }
    if (options.action === "buy") {
      dbQuery.where({
        buy_currency: options.currency1,
        sell_currency: options.currency2
      });
    } else if (options.action === "sell") {
      dbQuery.where({
        buy_currency: options.currency2,
        sell_currency: options.currency1
      });
    } else if (!options.action) {
      currencies = [];
      if (options.currency1) {
        currencies.push(options.currency1);
      }
      if (options.currency2) {
        currencies.push(options.currency2);
      }
      if (currencies.length > 1) {
        dbQuery.where("buy_currency")["in"](currencies).where("sell_currency")["in"](currencies);
      } else if (currencies.length === 1) {
        dbQuery.or([
          {
            buy_currency: currencies[0]
          }, {
            sell_currency: currencies[0]
          }
        ]);
      }
    } else {
      callback("Wrong action", []);
    }
    return dbQuery.exec(callback);
  };

  OrderSchema.statics.isValidTradeAmount = function(amount) {
    return _.isNumber(amount) && !_.isNaN(amount) && amount > 0;
  };

  OrderSchema.statics.calculateHoldBalance = function(action, amount, unitPrice) {
    var amountToBuy, amountToSell;
    if (action === "buy") {
      amountToBuy = parseFloat(amount) * parseFloat(unitPrice);
      return amountToBuy;
    }
    if (action === "sell") {
      amountToSell = parseFloat(amount);
      return amountToSell;
    }
    return false;
  };

  Order = mongoose.model("Order", OrderSchema);

  exports = module.exports = Order;

}).call(this);
