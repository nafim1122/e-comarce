// User record functions using Firestore
import { db } from "./firebase";
import { collection, addDoc, getDocs, doc, setDoc } from "firebase/firestore";

export async function addUser(user: { uid: string; name: string; email: string }) {
  await setDoc(doc(db, "users", user.uid), user);
}

export async function getUsers() {
  const querySnapshot = await getDocs(collection(db, "users"));
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      uid: data.uid,
      name: data.name,
      email: data.email
    };
  });
}
