import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCWLVaQiJfbLMJIWahU0Cz0vxfmE5VP6OM",
  authDomain: "campanha-digital-ia.firebaseapp.com",
  projectId: "campanha-digital-ia",
  storageBucket: "campanha-digital-ia.firebasestorage.app",
  messagingSenderId: "715304619534",
  appId: "1:715304619534:web:7efb4885afc86a6e7cb65f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function sanitizeDatabase() {
  console.log('--- Database Brand Sanitization ---');
  
  // 1. Sanitizar Campanhas
  const campaignsSnap = await getDocs(collection(db, 'campaigns'));
  for (const d of campaignsSnap.docs) {
    const data = d.data();
    if (data.name && data.name.toLowerCase().includes('piratini')) {
      const newName = data.name.replace(/Piratini/gi, 'CampanhaDigitalIA');
      console.log(`Updating Campaign ${d.id}: ${data.name} -> ${newName}`);
      await updateDoc(doc(db, 'campaigns', d.id), { name: newName });
    }
  }

  // 2. Sanitizar Organizacoes
  const orgsSnap = await getDocs(collection(db, 'organizations'));
  for (const d of orgsSnap.docs) {
    const data = d.data();
    if (data.name && data.name.toLowerCase().includes('piratini')) {
      const newName = data.name.replace(/Piratini/gi, 'CampanhaDigitalIA');
      console.log(`Updating Organization ${d.id}: ${data.name} -> ${newName}`);
      await updateDoc(doc(db, 'organizations', d.id), { name: newName });
    }
  }

  console.log('--- Sanitization Complete ---');
}

sanitizeDatabase().catch(console.error);
