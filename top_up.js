const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const express = require("express");
const app = express();
// This is your test secret API key.
const stripe = require("stripe")('sk_test_51NlgQ0Isn5ijZV1GE7N2HDn4vtGzNq70oBGaMHCJFMAzPjz7Ca63Cne8lYJH3qF1Kp1vMYn1E7pdFv5Q9SjXChRX00Gu22HlVR')
const serviceAccount = require('./secrets/serviceAccount.json');

//app.listen(4242, () => console.log("Node server listening on port 4242!"));

app.use(express.static("public"));
app.use(express.json());    

// Initialize Firebase app and Firestore
const firebaseApp = initializeApp({
  credential: cert(serviceAccount)
});
const db = getFirestore(firebaseApp);


async function getWalletData(user_id) {
  try {
    const walletRef = db.collection('wallets').doc(user_id);
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

async function top_up_wallet(user_id, acc_num, amount) {
  try {
    const walletData = await getWalletData(user_id);

    if (walletData !== null) {
      const date = new Date();
      const credited_wallet = user_id; // Wallet receiving funds
      const debited_wallet = acc_num; // Bank account to be deducted from
      const newBal = walletData.balance + amount;
      await db.collection('wallets').doc(user_id).update({ balance: newBal });
      const transaction_id = Math.random().toString(36).substring(2, 10);
    
      await create_transaction(user_id, credited_wallet, debited_wallet, transaction_id, date, 'Top up', amount)

      console.log(`$${amount} was topped up from bank account ${debited_wallet} to ${credited_wallet} at ${date}`);
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

async function withdraw_from_wallet(user_id, acc_num, amount){
  try {
    const walletData = await getWalletData(user_id);
    if(walletData != null){
      const date = new Date();
      const credited_wallet = acc_num; //Withdraw to bank account
      const debited_wallet = user_id; //withdraw from wallet
      const newBal = walletData.balance - amount;
      await db.collection('wallets').doc(user_id).update({ balance: newBal});
      const transaction_id = Math.random().toString(36).substring(2, 10);

      await create_transaction(user_id, credited_wallet, debited_wallet, transaction_id, date, 'Withdrawal', amount)

      console.log(`$${amount} was withdrawn from ${debited_wallet} to  bank account ${credited_wallet} at ${date}`);
      console.log("The new balance is", newBal);

      return walletData;
    }else{
      console.log("Unable to withdraw");
      return null;
    }
  } catch (error) {
    console.error("Error has occured during withdrawal", error);
    return null;
  }
}

async function create_transaction(user_id, credited_wallet, debited_wallet, transaction_id, date, type, amount){
  try {
    const reference_id = Math.random().toString(36).substring(1,15)
    const transaction = {
      user_id: user_id,
      credited_wallet: credited_wallet,
      debited_wallet: debited_wallet,
      transaction_id: transaction_id,
      reference_id: reference_id,
      date: date,
      type: type,
      amount: amount
    }
    const transactionRef = db.collection('Transactions').doc(reference_id)
    await transactionRef.set(transaction)
  } catch (error) {
    console.log("Unable to generate transaction")
  }
}

async function delete_data(user_id){
  try {
    const userRef = db.collection("users").doc(user_id)
    if(userRef.exists){
      await db.collection("users").doc(user_id).delete();
      await db.collection("wallets").doc(user_id).delete();
      console.log("User accout and wallet deleted successfully")
    }else{
      console.log("Wallet does not exist")
    }
  } catch (error) {
    console.log("Error deleting data")
  }
}


async function execute_transactions(functions){
  for (const func of functions){
    try{
      await func();
    } catch(error){
      console.error("An error has occured");
    }
  }
}

const functionsToExecute = [
  () => top_up_wallet("1693484480174_sn2ful4g", "123", 5),
  () => withdraw_from_wallet("1693484480174_sn2ful4g", "123", 5)
];

delete_data("1693981635547_mdzco73h");
//execute_transactions(functionsToExecute);

