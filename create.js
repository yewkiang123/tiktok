const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp, FieldValue, Filter } = require('firebase-admin/firestore');

const serviceAccount = require('./secrets/serviceAccount.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

// Function to generate a unique user ID 
function generateUniqueUserID() {
  // Logic to generate a unique ID (e.g., timestamp + random characters)
  const timestamp = Date.now();
  const randomChars = Math.random().toString(36).substring(2, 10);
  return `${timestamp}_${randomChars}`;
}

// Function to add a new user account
async function add_new_user_account(accountDetails) {
  try {
    // Generate a unique user_id 
    const user_id = generateUniqueUserID();

    // Create a new user_account object with provided details
    const user_account = {
      user_id: user_id,
      ...accountDetails  //other account details
    };

    // Save the user_account object to the 'users' collection
    const userRef = db.collection('users').doc(user_id);
    await userRef.set(user_account);

    console.log('User account added successfully:', user_account);

    // Call the function to add a new wallet
    await add_new_wallet(user_id);

  } catch (error) {
    console.error('Error adding user account:', error);
    throw error; // Rethrow the error
  }
}

async function add_new_wallet(user_id){
  try{
    const wallet = {
      user_id: user_id,
      balance: 0
    };
      // Save wallet object to 'wallets' collection
      const walletRef = db.collection('wallets').doc(user_id); // Assuming 'wallets' is the collection name
      await walletRef.set(wallet);

      console.log('Wallet added successfully', wallet);
  } catch(error){
      console.error('Error adding wallet:', error);
  }
}

// Taking data from frontend
const accountDetailsFromFrontend = {
  first: 'test',
  last: 'test',
  born: 1815,
  email: 'ada@example.com'// Add more properties as needed
};

// Call the function to add a new user account with the provided details
add_new_user_account(accountDetailsFromFrontend)
