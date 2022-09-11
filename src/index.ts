
// Seting enviroment variables
process.env['FIRESTORE_EMULATOR_HOST'] = 'localhost:8080';
process.env['FIREBASE_AUTH_EMULATOR_HOST'] = 'localhost:9099';
process.env['FIREBASE_STORAGE_EMULATOR_HOST'] = 'localhost:9199';

// Imports
import * as firebase from 'firebase-admin';
import path from 'path';
import fs from 'fs';
import * as axios from 'axios';

const BASE_URL = 'http://localhost:5001/secondhalf-92707/us-central1/api/';
const AUTH_URL = BASE_URL + 'auth';
const ADDRESS_INFO_URL = BASE_URL + 'auth/address-info';

// Declaring user interface
export interface User {
  userId: string;
  firstName: string;
  dateOfBirth: string;
  lastName: string;
  nickName: string;
  email: string;
  isActive: boolean;
  aboutMySelf: string;
  mainPhotoUrl: string;
  gender: string;
  password: string;
  city: string;
  street: string;
  state: string;
  country: string;
}

 interface UserToCollection extends User {
  createdAt: string;
}

// Initializing firebase
const pathToConfigFile = path.join(__dirname, '..', 'secondhalf-92707-firebase-adminsdk-9zqmi-2680fdc622.json');
const db = firebase.initializeApp({
  credential: firebase.credential.cert(pathToConfigFile),
  storageBucket: "secondhalf-92707.appspot.com"
});
const storage = db.storage().bucket();
const firestore = db.firestore();

const pathToUsersData = path.join(__dirname, '..', 'data', 'users.json');

// Reading users data from disk
const usersData = fs.readFileSync(pathToUsersData, 'utf-8');
const users = JSON.parse(usersData) as User[];

(async () => {

  let index = 0;

  for (const user of users) {

    // Creating user
    const signUpData = {
      email: user.email,
      password: user.password
    };
    const auth = db.auth();
    const userRecord = await auth.createUser(signUpData);

    await auth.setCustomUserClaims(userRecord.uid, {
      member: true,
      moderator: false,
      admin: false,
      CLOUD_VERIFICATION_UUID: '35b19fa8-830e-463e-b9fc-6167a7e18bb9'
    });

    // Uploading picture
    index = index < 50 ? index : 0;

    let indexStr = index.toString();
    if (indexStr.length === 1) {
      indexStr = 0 + indexStr;
    }
    
    const pathToPhotoFile = path.join(__dirname, '..', 'photos', `${user.gender}_${indexStr}.jpg`);
    const uploadPictureResponse = await storage.upload(pathToPhotoFile, {
      destination: `/${userRecord.uid}/images/${user.gender}_${indexStr}.jpg`
    });

    let userData: Omit<UserToCollection, 'password'> = ({} as any);
    for(const prop in user) {
      if (prop === 'password') { continue; }
      (userData as any)[prop] = (user as any)[prop];
    }
    userData.mainPhotoUrl = uploadPictureResponse[0].publicUrl();
    userData.country = 'USA';
    userData.createdAt = new Date().toJSON();
    userData.userId = userRecord.uid;
    await firestore.collection('users').doc(userRecord.uid).set(userData);

    index++;
    await _whaitLitleBit();
  }

  const metaDocRef = firestore.doc('db_info/users_metadata');

  metaDocRef.create({
    count: 100,
    maleCount: 50,
    femaleCount: 50,
    active: 0
  });

})();

function _whaitLitleBit(): Promise<void> {
  return new Promise((res) => {
    setTimeout(() => res(), 1000);
  });
}







