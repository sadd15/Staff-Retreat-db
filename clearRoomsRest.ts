import fetch from 'node-fetch';

const PROJECT_ID = 'custom-legend-g6rpq';
const DATABASE_ID = 'ai-studio-companytriproomb-efbe3bf0-0cdd-443e-829d-dee922c50820';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents`;

async function clearRooms() {
  try {
    const res = await fetch(`${BASE_URL}/rooms`);
    const data = await res.json();
    
    if (data.documents) {
      for (const doc of data.documents) {
        console.log(`Deleting ${doc.name}...`);
        await fetch(`https://firestore.googleapis.com/v1/${doc.name}`, {
          method: 'DELETE'
        });
      }
      console.log('All rooms deleted!');
    } else {
      console.log('No rooms found.');
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

clearRooms();
