import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDwXgG11d-FJc1IkRLs9_H7tR6NBIKXDbw",
  authDomain: "tutor-website-c532a.firebaseapp.com",
  projectId: "tutor-website-c532a",
  storageBucket: "tutor-website-c532a.firebasestorage.app",
  messagingSenderId: "925264880105",
  appId: "1:925264880105:web:59a1d97951995179466b78"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrate() {
    console.log("🚀 STARTING DATA MIGRATION TO 'users' COLLECTION...");
    
    // 1. Migrate Tutors
    const tutorSnap = await getDocs(collection(db, 'tutors'));
    console.log(`Found ${tutorSnap.size} tutors to migrate.`);
    for (const d of tutorSnap.docs) {
        const data = d.data();
        const newUser = {
            ...data,
            role: 'tutor',
            status: data.status || 'pending',
            documents: {
                profileImage: data.avatar || null,
                identityProof: data.identityProof || data.identityURL || null,
                degreeCertificate: data.degreeCertificate || data.degreeURL || null,
                experienceCertificate: data.experienceCertificate || data.certURL || null,
                demoVideo: data.demoVideo || data.videoURL || null
            }
        };
        await setDoc(doc(db, 'users', d.id), newUser, { merge: true });
        console.log(` ✅ Migrated Tutor: ${data.email}`);
    }

    // 2. Migrate Rejected
    const rejectSnap = await getDocs(collection(db, 'rejectedProfiles'));
    console.log(`Found ${rejectSnap.size} rejected profiles to migrate.`);
    for (const d of rejectSnap.docs) {
        const data = d.data();
        const newUser = {
            ...data,
            role: 'tutor',
            status: 'rejected',
            documents: {
                profileImage: data.avatar || null,
                identityProof: data.identityProof || data.identityURL || null,
                degreeCertificate: data.degreeCertificate || data.degreeURL || null,
                experienceCertificate: data.experienceCertificate || data.certURL || null,
                demoVideo: data.demoVideo || data.videoURL || null
            }
        };
        await setDoc(doc(db, 'users', d.id), newUser, { merge: true });
        console.log(` ✅ Migrated Rejected Tutor: ${data.email}`);
    }

    console.log("✨ MIGRATION COMPLETE! All data is now in 'users' collection.");
}

migrate();
