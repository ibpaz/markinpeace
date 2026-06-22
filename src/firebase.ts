import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/database';

const firebaseConfig = {
    apiKey: "AIzaSyDCTa_bpwdcIaHWr15P5rp41HOyaqv2MeA",
    authDomain: "markinpeace-a2f54.firebaseapp.com",
    databaseURL: "https://markinpeace-a2f54-default-rtdb.firebaseio.com",
    projectId: "markinpeace-a2f54",
    storageBucket: "markinpeace-a2f54.firebasestorage.app",
    messagingSenderId: "291627323374",
    appId: "1:291627323374:web:6e7f6291fdcd6aea1288ff"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

export const auth = firebase.auth();
export const db = firebase.database();
export default firebase;