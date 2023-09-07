const {
  initializeApp,
  applicationDefault,
  cert,
} = require("firebase-admin/app");
const {
  getFirestore,
  Timestamp,
  FieldValue,
  Filter,
} = require("firebase-admin/firestore");

const serviceAccount = require("./secrets/serviceAccount.json");

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

class CreateItem {

  constructor(db) {
    this.db = db;
  }
  // Function to generate a unique user ID
  static generateUniqueUserID() {
    // Logic to generate a unique ID (e.g., timestamp + random characters)
    const timestamp = Date.now();
    const randomChars = Math.random().toString(36).substring(2, 10);
    return `${timestamp}_${randomChars}`;
  }

  static async isUsernameTaken(username) {
    try {
      const collectionRef = db.collection("users");
      const query = await collectionRef.where('username', '==', username).get(); // Execute the query
      return !query.empty; // Return true if username exists
    } catch (error) {
      console.log("Error checking username availability", error);
    }
  }
  

  // Function to add a new user account
  static async add_new_user_account(accountDetails) {
    try {
      // Generate a unique user_id
      const user_id = this.generateUniqueUserID();

      // Create a new user_account object with provided details
      const user_account = {
        user_id: user_id,
        ...accountDetails, //other account details
      };

      if (await CreateItem.isUsernameTaken(accountDetailsFromFrontend.username)) {
        console.log("Username is already taken");
      } else {
        // Save the user_account object to the 'users' collection
        const userRef = db.collection("users").doc(user_id);
        await userRef.set(user_account);
        await this.add_new_wallet(user_id);
        console.log("User account added successfully:", user_account);
      }
      // Call the function to add a new wallet

    } catch (error) {
      console.error("Error adding user account:", error);
      throw error; // Rethrow the error
    }
  }


  static async add_new_wallet(user_id) {
    try {
      const wallet = {
        user_id: user_id,
        balance: 0,
      };
      // Save wallet object to 'wallets' collection
      const walletRef = db.collection("wallets").doc(user_id); // Assuming 'wallets' is the collection name
      await walletRef.set(wallet);

      console.log("Wallet added successfully", wallet);
    } catch (error) {
      console.error("Error adding wallet:", error);
    }
  }
}
// Taking data from frontend
const accountDetailsFromFrontend = {
  username: "yewkiang1",
  password: "Password123",
  first: "Goh",
  last: "Yew Kiang",
  born: 1815,
  email: "yewkiang123@example.com", // Add more properties as needed
};

// Call the function to add a new user account with the provided details
CreateItem.add_new_user_account(accountDetailsFromFrontend);

module.exports = CreateItem;
