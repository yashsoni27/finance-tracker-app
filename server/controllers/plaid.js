import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";

import dotenv from "dotenv";
dotenv.config();

import User from "../models/user.js";
import Account from "../models/account.js";
import Transaction from "../models/transaction.js";

// Plaid common configuration
const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV],
  baseOptions: {
    headers: {
      "PLAID-VERSION": "2020-09-14",
      "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
      "PLAID-SECRET": process.env.PLAID_SECRET,
    },
  },
});
const plaidClient = new PlaidApi(configuration);

// Plaid API starts
// Creating a temporary link token for bank connect
export const createLinkToken = async (request, response) => {
  const { userId } = request.body;
  const user = await User.findOne({ userId });
  const plaidRequest = {
    user: {
      // client_user_id: "user",
      client_user_id: user.userId,
    },
    client_name: "Plaid Test App",
    // products: process.env.PLAID_PRODUCTS.split(","),
    products: ["auth"],
    required_if_supported_products: ["transactions"],
    language: "en",
    // webhook: 'https://webhook.example.com',
    // redirect_uri: 'http://localhost:8081/',
    android_package_name: "com.yashso.fintrack",
    country_codes: process.env.PLAID_COUNTRY_CODES.split(","),
  };
  try {
    const createTokenResponse = await plaidClient.linkTokenCreate(plaidRequest);
    response.json(createTokenResponse.data);
  } catch (error) {
    // console.log(response.json);
    response.status(500).json({ error: error.message });
  }
};

// For exchanging public token with access token
export const exchangePublicToken = async (request, response) => {
  const { userId, public_token, metadata } = request.body;
  // console.log(metadata);
  const user = await User.findOne({ userId });
  console.log(user);
  var accessToken;
  try {
    // Only exchange token if the user doesn't have access token
    if (!user.institutions || user.institutions.length == 0) {
      const plaidResponse = await plaidClient.itemPublicTokenExchange({
        public_token: public_token,
      });

      // const itemID = plaidResponse.data.item_id;
      // console.log("itemId: ", itemID);

      const institution = {
        institutionId: metadata.institution.id,
        name: metadata.institution.name,
        accessToken: plaidResponse.data.access_token,
        plaidCursor: null,
      };

      // Initialize institutions if undefined
      if (!user.institutions) {
        user.institutions = [];
      }

      user.institutions.push(institution);
      user.save();

      accessToken = plaidResponse.data.access_token;
      console.log("user data saved");
    } else {
      accessToken = user.institutions[0].accessToken;
    }

    // getting balance after initial connect
    // const balanceResponse = await plaidClient.accountsBalanceGet({
    //   access_token: accessToken,
    // });

    // for (const accountData in balanceResponse.data.accounts) {
    //   try {
    //     const existingAccount = await Account.findOne({
    //       account_id: accountData.account_id,
    //     });

    //     if (!existingAccount) {
    //       const newAccount = new Account({
    //         account_id: accountData.account_id,
    //         balances: {
    //           available: accountData.balances.available,
    //           current: accountData.balances.current,
    //           iso_currency_code: accountData.balances.iso_currency_code,
    //           limit: accountData.balances.limit,
    //           unofficial_currency_code:
    //             accountData.balances.unofficial_currency_code,
    //         },
    //         mask: accountData.mask,
    //         name: accountData.name,
    //         type: accountData.type,
    //         subType: accountData.subType,
    //         persistent_account_id: accountData.persistent_account_id,
    //         userId: user.userId,
    //       });
    //       await newAccount.save();
    //       console.log("Bank account saved: ", accountData.account_id);
    //     } else {
    //       console.log("Bank account already exists: ", accountData.account_id);
    //     }
    //   } catch (error) {
    //     console.log(error);
    //   }
    // }

    // getting authData from plaid
    // const authData = await auth({userId});
    // console.log("authData", authData);

    const authData = await plaidClient.accountsGet({
      access_token: accessToken,
    });
    // console.log("authResponse: ", authData.data);

    response.json({
      // balance: balanceResponse.data,
      auth: authData.data,
    });
  } catch (error) {
    // handle error
    console.log("ERROR: ", error);
    response.send(error);
  }
};

// Getting balance
export const getBalance = async (request, response) => {
  try {
    const { userId } = request.body;
    const user = await User.findOne({ userId });
    if (!user || !user.institutions || user.institutions.length == 0) {
      throw new error("User not found or access token not set");
    }

    // Grabbing account info and saving to DB
    const res = await plaidClient.accountsBalanceGet({
      access_token: user.institutions[0].accessToken,
    });

    for (const accountData of res.data.accounts) {
      try {
        const existingAccount = await Account.findOne({
          account_id: accountData.account_id,
        });

        if (!existingAccount) {
          const newAccount = new Account({
            account_id: accountData.account_id,
            balances: {
              available: accountData.balances.available,
              current: accountData.balances.current,
              iso_currency_code: accountData.balances.iso_currency_code,
              limit: accountData.balances.limit,
              unofficial_currency_code:
                accountData.balances.unofficial_currency_code,
            },
            mask: accountData.mask,
            name: accountData.name,
            type: accountData.type,
            subType: accountData.subType,
            persistent_account_id: accountData.persistent_account_id,
            userId: userId,
          });
          await newAccount.save();
          console.log("Bank account saved: ", accountData.account_id);
        } else {
          console.log("Bank account updated: ", accountData.account_id);
          existingAccount.balances.available = accountData.balances.available;
          existingAccount.balances.current = accountData.balances.current;
          existingAccount.balances.limit = accountData.balances.limit;
        }
      } catch (error) {
        console.log(error);
      }
    }

    // fetching balances from all connected accounts from DB for single user
    const netBalance = await Account.find({ userId: userId });
    console.log(netBalance);

    response.json({ netBalance: netBalance });
  } catch (e) {
    response.status(500).send(e);
  }
};

// Getting transactions data
export const getTransactions = async (request, response) => {
  try {
    const { userId } = request.body;
    const user = await User.findOne({ userId });
    if (!user || !user.institutions || user.institutions.length == 0) {
      throw new error("User not found or access token not set");
    }

    // const accessToken = user.institutions[0].accessToken;
    const plaidRequest = {
      access_token: user.institutions[0].accessToken,
      start_date: "2024-04-19",
      end_date: "2024-07-19",
    };
    const res = await plaidClient.transactionsGet(plaidRequest);
    // console.log("transactions-  ", res.data);
    response.json(res.data);
    // response.json("testing");
  } catch (e) {
    response.status(500).send(e);
  }
};

// Fetching transactions and updates
export const syncTransactions = async (request, response) => {
  const { userId } = request.body;
  const user = await User.findOne({ userId });
  if (!user || !user.institutions || user.institutions.length == 0) {
    throw new error("User not found or access token not set");
  }

  try {
    let accessToken = user.institutions[0].accessToken;
    let cursor = user.institutions[0].plaidCursor;
    let hasMore = true;
    let addedTransactions = [];
    let modifiedTransactions = [];
    let removedTransactions = [];

    while (hasMore) {
      try {
        const syncResponse = await plaidClient.transactionsSync({
          access_token: accessToken,
          cursor: cursor,
          count: 10,
        });

        addedTransactions = addedTransactions.concat(syncResponse.data.added);
        modifiedTransactions = modifiedTransactions.concat(
          syncResponse.data.modified
        );
        removedTransactions = removedTransactions.concat(
          syncResponse.data.removed
        );

        cursor = syncResponse.data.next_cursor;
        hasMore = syncResponse.data.has_more;
      } catch (e) {
        console.error("Error syncing transactions:", error);
        throw error;
      }
    }
    // Update user's cursor
    user.institutions[0].plaidCursor = cursor;
    user.save();

    // Processing the transactions
    for (const transaction of addedTransactions) {
      await Transaction.create({
        userId: user.userId,
        transactionId: transaction.transaction_id,
        accountId: transaction.account_id,
        amount: transaction.amount,
        date: new Date(transaction.date),
        name: transaction.name,
        merchantName: transaction.merchant_name,
        logoUrl: transaction.logo_url,
        category: transaction.category,
        // description: transaction.description, -- Not for plaid response
      });
    }

    for (const transaction of modifiedTransactions) {
      await Transaction.findOneAndUpdate(
        { transactionId: transaction.transaction_id },
        {
          amount: transaction.amount,
          date: new Date(transaction.date),
          name: transaction.name,
          merchantName: transaction.merchant_name,
          category: transaction.category[0],
        }
      );
    }

    for (const transaction of removedTransactions) {
      await Transaction.deleteOne({
        transactionId: transaction.transaction_id,
      });
    }

    response.json({
      added: addedTransactions.length,
      modified: modifiedTransactions.length,
      removed: removedTransactions.length,
    });
  } catch (e) {
    console.log("Sync transaction error: ", e);
    response.status(500).send("sync error");
  }
};

// Getting proper auth info from plaid with access_token -- PROBABLY NO USE AS OF NOW
export const auth = async (request, response) => {
  try {
    const { userId } = request.body;
    const user = await User.findOne({ userId });
    if (!user || !user.institutions || user.institutions.length == 0) {
      throw new error("User not found or access token not set");
    }
    // const accessToken = user.institutions[0].accessToken;
    const plaidRequest = {
      access_token: user.institutions[0].accessToken,
    };
    const plaidResponse = await plaidClient.authGet(plaidRequest);
    console.log("plaidResponse: ", plaidResponse.data);
    response.json(plaidResponse.data);
  } catch (e) {
    response.status(500).send(e);
  }
};

// Getting the institution logo
export const institutionLogo = async (request, response) => {
  try {
    const { userId } = request.body;
    console.log(userId);
    const user = await User.findOne({ userId });
    if (!user || !user.institutions || user.institutions.length == 0) {
      throw new error("User not found or access token not set");
    }

    const insId = { institution_id: user.institutions[0].institutionId, country_codes: ["GB"] };
    const options = {
      include_optional_metadata: true,
      include_status: true,
    };

    const res = await plaidClient.institutionsGetById(insId, options);

    console.log(res.data);
    response.json(res.data);
  } catch (error) {
    console.log("institutionLogo error: ", error);
    response.status(500).send(error);
  }
};
