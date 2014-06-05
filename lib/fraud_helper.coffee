Wallet = GLOBAL.db.Wallet
Transaction = GLOBAL.db.Transaction
Payment = GLOBAL.db.Payment
Order = GLOBAL.db.Order
MarketHelper = require "./market_helper"
async = require "async"
math = require("mathjs")
  number: "bignumber"
  decimals: 8

FraudHelper =

  checkWalletBalance: (walletId, callback)->
    Wallet.findById walletId, (err, wallet)->
      return callback err  if err
      return callback "Wallet not found."  if not wallet
      Transaction.findTotalReceivedByUserAndWallet wallet.user_id, wallet.id, (err, totalReceived)->
        return callback err  if err
        Payment.findTotalPayedByUserAndWallet wallet.user_id, wallet.id, (err, totalPayed)->
          return callback err  if err
          closedOptions =
            status: "completed"
            user_id: wallet.user_id
            currency1: wallet.currency
            include_logs: true
          openOptions =
            status: "open"
            action: "sell"
            user_id: wallet.user_id
            currency1: wallet.currency
            include_logs: true
          Order.findByOptions closedOptions, (err, closedOrders)->
            Order.findByOptions openOptions, (err, openOrders)->
              closedOrdersBalance = 0
              openOrdersBalance = 0
              for closedOrder in closedOrders
                if closedOrder.action is "sell"
                  closedOrdersBalance -= closedOrder.calculateSpentFromLogs()
                else
                  closedOrdersBalance += closedOrder.calculateReceivedFromLogs()
              for openOrder in openOrders
                openOrdersBalance += closedOrder.calculateSpentFromLogs()
              finalBalance = math.select(totalReceived).add(closedOrdersBalance).add(-wallet.hold_balance).add(-totalPayed).done()
              result =
                total_received: MarketHelper.fromBigint totalReceived
                total_payed: MarketHelper.fromBigint totalPayed
                total_closed: MarketHelper.fromBigint closedOrdersBalance
                balance: MarketHelper.fromBigint wallet.balance
                hold_balance: MarketHelper.fromBigint wallet.hold_balance
                final_balance: MarketHelper.fromBigint finalBalance
                valid_final_balance: finalBalance is wallet.balance
              callback err, result

exports = module.exports = FraudHelper