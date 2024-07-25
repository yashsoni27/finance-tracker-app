import dotenv from "dotenv";
dotenv.config();

import User from "../models/user.js";
import Account from "../models/account.js";
import Transaction from "../models/transaction.js";

export const getBalanceDb = async (request, response) => {
  try {
    const { userId } = request.body;
    const user = await User.findOne({ userId });
    if (!user || !user.institutions || user.institutions.length == 0) {
      throw new error("User not found or access token not set");
    }

    const netBalance = await Account.find({ userId: userId });
    // console.log(netBalance);

    response.json({ netBalance: netBalance });
  } catch (e) {
    response.status(500).send(e);
  }
};

export const getTransactionsDb = async (request, response) => {
  try {
    console.log("transaction hit");
    const { userId, count } = request.body;
    console.log("userId: ", userId);
    const user = await User.findOne({ userId });
    if (!user || !user.institutions || user.institutions.length == 0) {
      throw new error("User not found or access token not set");
    }
    const transactions = await Transaction.find({ userId: userId })
      .sort({ date: -1 })
      .limit(count);

    // console.log("transactions: ", transactions);
    response.json({transactions: transactions});
    // response.json("testing");
  } catch (error) {
    console.error("Error fetching transactions: ", error);
    response.status(500).send(error);
  }
};
