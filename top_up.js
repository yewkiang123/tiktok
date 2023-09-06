const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const express = require("express");
const app = express();
const dotenv = require("dotenv");
dotenv.config();

// This is your test secret API key.
const stripe = require("stripe")(process.env.STRIPE_KEY);
const serviceAccount = require("./secrets/serviceAccount.json");

//app.listen(4242, () => console.log("Node server listening on port 4242!"));

app.use(express.static("public"));
app.use(express.json());

// Initialize Firebase app and Firestore
const firebaseApp = initializeApp({
  credential: cert(serviceAccount),
});
const db = getFirestore(firebaseApp);

class WalletFunctions {
  static async getWalletData(user_id) {
    try {
      const walletRef = db.collection("wallets").doc(user_id);
      const walletDoc = await walletRef.get();

      if (walletDoc.exists) {
        return walletDoc.data();
      } else {
        console.log("Wallet not found");
        return null;
      }
    } catch (error) {
      console.error("Error fetching wallet:", error);
      return null;
    }
  }

  static async top_up_wallet(user_id, acc_num, amount) {
    try {
      const walletData = await this.getWalletData(user_id);

      if (walletData !== null) {
        const date = new Date();
        const credited_wallet = user_id; // Wallet receiving funds
        const debited_wallet = acc_num; // Bank account to be deducted from
        const newBal = walletData.balance + amount;
        await db.collection("wallets").doc(user_id).update({ balance: newBal });
        const transaction_id = Math.random().toString(36).substring(2, 10);

        await this.create_transaction(
          user_id,
          credited_wallet,
          debited_wallet,
          transaction_id,
          date,
          "Top up",
          amount
        );

        console.log(
          `$${amount} was topped up from bank account ${debited_wallet} to ${credited_wallet} at ${date}`
        );
        console.log("The new balance is", newBal);

        return walletData;
      } else {
        console.log("Unable to top up");
        return null;
      }
    } catch (error) {
      console.error("An error occurred during top-up:", error);
      return null;
    }
  }

  static async withdraw_from_wallet(user_id, acc_num, amount) {
    try {
      const walletData = await this.getWalletData(user_id);
      if (walletData != null) {
        const date = new Date();
        const credited_wallet = acc_num; //Withdraw to bank account
        const debited_wallet = user_id; //withdraw from wallet
        const newBal = walletData.balance - amount;
        await db.collection("wallets").doc(user_id).update({ balance: newBal });
        const transaction_id = Math.random().toString(36).substring(2, 10);

        await this.create_transaction(
          user_id,
          credited_wallet,
          debited_wallet,
          transaction_id,
          date,
          "Withdrawal",
          amount
        );

        console.log(
          `$${amount} was withdrawn from ${debited_wallet} to  bank account ${credited_wallet} at ${date}`
        );
        console.log("The new balance is", newBal);

        return walletData;
      } else {
        console.log("Unable to withdraw");
        return null;
      }
    } catch (error) {
      console.error("Error has occured during withdrawal", error);
      return null;
    }
  }

  static async pay_to_user(sender_id, receiver_id, amount) {
    //user_id sends payment to acc_num
    try {
      const senderData = await this.getWalletData(sender_id);
      const receiverData = await this.getWalletData(receiver_id);
      if (senderData != null && receiverData != null) {
        //check if both accounts are in db
        const date = new Date();
        const credited_wallet = receiver_id;
        const debited_wallet = sender_id;
        const senderBal = senderData.balance - amount; //deduct from sender
        await db
          .collection("wallets")
          .doc(sender_id)
          .update({ balance: senderBal });
        const receiverBal = receiverData.balance + amount; //add to receiver
        await db
          .collection("wallets")
          .doc(receiver_id)
          .update({ balance: receiverBal });
        //create transaction
        const transaction_id = Math.random().toString(36).substring(2, 10);
        await this.create_transaction(
          sender_id,
          credited_wallet,
          debited_wallet,
          transaction_id,
          date,
          "User-to-User Payment",
          amount
        );
        console.log(
          `$${amount} was deducted from ${debited_wallet} to ${credited_wallet} at ${date}`
        );
        console.log(`The new balance is ${senderBal}`); //just display new balance of sender
        console.log(`Receiver balance: ${receiverBal}`); //can delete in future
        return senderData;
      } else {
        //one or more account invalid
        console.log("Unable to make payment");
        return null;
      }
    } catch (error) {
      console.log("Error has occured during payment", error);
      return null;
    }
  }

  static async create_transaction(
    user_id,
    credited_wallet,
    debited_wallet,
    transaction_id,
    date,
    type,
    amount
  ) {
    try {
      const reference_id = Math.random().toString(36).substring(1, 15);
      const transaction = {
        user_id: user_id,
        credited_wallet: credited_wallet,
        debited_wallet: debited_wallet,
        transaction_id: transaction_id,
        reference_id: reference_id,
        date: date,
        type: type,
        amount: amount,
      };
      const transactionRef = db.collection("Transactions").doc(reference_id);
      await transactionRef.set(transaction);
    } catch (error) {
      console.log("Unable to generate transaction");
    }
  }

  static async delete_data(user_id) {
    try {
      const userRef = db.collection("users").doc(user_id);
      const userDoc = await userRef.get(); // Await the result of get()

      if (userDoc.exists) {
        // Document exists, proceed with deletion
        await userRef.delete(); // Await the delete operation
        await db.collection("wallets").doc(user_id).delete(); // Await the delete operation for wallets
        console.log("User data and wallet removed successfully");
      } else {
        console.log("User data does not exist");
      }
    } catch (error) {
      console.error("Unable to delete data:", error);
    }
  }
}

app.post("/create-payment-intent", async (req, res) => {
  const { amount } = req.body;
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount,
    currency: "sgd",
  });
  res.send({
    clientSecret: paymentIntent.client_secret,
  });
});

async function execute_transactions(functions) {
  for (const func of functions) {
    try {
      await func();
    } catch (error) {
      console.error("An error has occured");
    }
  }
}

const functionsToExecute = [
  () => WalletFunctions.top_up_wallet("1693484480174_sn2ful4g", "123", 5),
  () =>
    WalletFunctions.withdraw_from_wallet("1693484480174_sn2ful4g", "123", 5),
  () => WalletFunctions.delete_data("16934812480174_sn2ful4g"),
  () =>
    WalletFunctions.pay_to_user(
      "1693484480174_sn2ful4g",
      "1693928955016_5v87ykew",
      10
    ),
];

execute_transactions(functionsToExecute);
