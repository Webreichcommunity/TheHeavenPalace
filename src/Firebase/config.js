import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'
import { getAuth } from 'firebase/auth'


const firebaseConfig = {
  // apiKey: "AIzaSyAMfI2FDiNPlH9XfBgv5qOovLVn6mV5tKg",
  // authDomain: "salonproject-82217.firebaseapp.com",
  // databaseURL: "https://salonproject-82217-default-rtdb.firebaseio.com",
  // projectId: "salonproject-82217",
  // storageBucket: "salonproject-82217.firebasestorage.app",
  // messagingSenderId: "545354611605",
  // appId: "1:545354611605:web:222c3c8b1d7b0b43d6149c"

  apiKey: "AIzaSyBzBQalOS_LOjbvNsYOO5RmI3cKHJcmpAE",
  authDomain: "dmcdemo-ccfba.firebaseapp.com",
  databaseURL: "https://dmcdemo-ccfba-default-rtdb.firebaseio.com",
  projectId: "dmcdemo-ccfba",
  storageBucket: "dmcdemo-ccfba.firebasestorage.app",
  messagingSenderId: "11141322598",
  appId: "1:11141322598:web:7ec06295a85852d1925aa7",
  // databaseURL: "https://dmcdemo-ccfba-default-rtdb.firebaseio.com/"
};

const app = initializeApp(firebaseConfig)
const database = getDatabase(app)
const auth = getAuth(app)

export { database, auth }