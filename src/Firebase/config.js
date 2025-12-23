import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'
import { getAuth } from 'firebase/auth'


const firebaseConfig = {
  apiKey: "AIzaSyAMfI2FDiNPlH9XfBgv5qOovLVn6mV5tKg",
  authDomain: "salonproject-82217.firebaseapp.com",
  databaseURL: "https://salonproject-82217-default-rtdb.firebaseio.com",
  projectId: "salonproject-82217",
  storageBucket: "salonproject-82217.firebasestorage.app",
  messagingSenderId: "545354611605",
  appId: "1:545354611605:web:222c3c8b1d7b0b43d6149c"
};

const app = initializeApp(firebaseConfig)
const database = getDatabase(app)
const auth = getAuth(app)

export { database, auth }