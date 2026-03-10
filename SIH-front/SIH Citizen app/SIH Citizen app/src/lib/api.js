import { db, storage } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

export async function uploadReportToServer(report) {
  // upload photo & audio (dataURL) to storage
  const docRef = await addDoc(collection(db, 'reports'), {
    description: report.description,
    lat: report.lat,
    lng: report.lng,
    status: 'submitted',
    createdAt: new Date().toISOString()
  });
  
  const id = docRef.id;
  if (report.photoDataURL) {
    const pRef = ref(storage, `reports/${id}/images.jpeg`);
    await uploadString(pRef, report.photoDataURL, 'data_url');
    const photoUrl = await getDownloadURL(pRef);
    await addDoc(collection(db, `reports/${id}`), { photoUrl }); // alternatively update doc
  }
  if (report.audioDataURL) {
    const aRef = ref(storage, `reports/${id}/audio.webm`);
    await uploadString(aRef, report.audioDataURL, 'data_url');
  }
  // update status, etc.
  return true;
}
