import { openDB } from 'idb';

const DB_NAME = 'civicfix-db';
const STORE = './PendingReports';

export async function open() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
      }
    }
  });
}

export async function addReport(report) {
  const db = await open();
  return db.add(STORE, report);
}

export async function getAllReports() {
  const db = await open();
  return db.getAll(STORE);
}

export async function deleteReport(id) {
  const db = await open();
  return db.delete(STORE, id);
}
