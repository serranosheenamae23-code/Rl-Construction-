/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';

export interface RecycleBinItem {
  id: string;
  timestamp: string;
  type: 'delete' | 'edit';
  collectionName: string;
  originalId: string;
  data: any;
  previousData?: any;
  newData?: any;
  userEmail?: string;
  userName?: string;
  description: string;
}

// Clean any undefined fields from values as Firestore doesn't accept them
const sanitizeForFirestore = (val: any): any => {
  if (val === undefined) return null;
  if (val === null) return null;
  if (Array.isArray(val)) {
    return val.map(sanitizeForFirestore);
  }
  if (typeof val === 'object') {
    const cleaned: any = {};
    for (const key of Object.keys(val)) {
      cleaned[key] = sanitizeForFirestore(val[key]);
    }
    return cleaned;
  }
  return val;
};

/**
 * Logs a document deletion to the recycle bin before it is permanently removed
 */
export async function logDeletion(
  collectionName: string,
  originalId: string,
  data: any,
  userEmail: string = 'serranosheenamae23@gmail.com',
  userName: string = 'Manager/Admin',
  description: string = 'Deleted data record'
) {
  const id = `bin-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const binItem: RecycleBinItem = {
    id,
    timestamp: new Date().toISOString(),
    type: 'delete',
    collectionName,
    originalId,
    data: sanitizeForFirestore(data || {}),
    userEmail,
    userName,
    description
  };
  try {
    await setDoc(doc(db, 'recycle_bin', id), binItem);
  } catch (err) {
    console.error('Failed to log deletion to recovery bin:', err);
  }
}

/**
 * Logs granular state changes/modifications of key fields in system entities
 */
export async function logModification(
  collectionName: string,
  originalId: string,
  previousData: any,
  newData: any,
  userEmail: string = 'serranosheenamae23@gmail.com',
  userName: string = 'Manager/Admin',
  description: string = 'Modified data entry'
) {
  const id = `bin-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const binItem: RecycleBinItem = {
    id,
    timestamp: new Date().toISOString(),
    type: 'edit',
    collectionName,
    originalId,
    data: sanitizeForFirestore(previousData || {}),
    previousData: sanitizeForFirestore(previousData || {}),
    newData: sanitizeForFirestore(newData || {}),
    userEmail,
    userName,
    description
  };
  try {
    await setDoc(doc(db, 'recycle_bin', id), binItem);
  } catch (err) {
    console.error('Failed to log modification to recovery bin:', err);
  }
}

/**
 * Restores a deleted record from the recycle bin back to its original collection
 */
export async function restoreDeletedItem(item: RecycleBinItem) {
  try {
    // 1. Re-insert data back into the original collection under the original ID
    await setDoc(doc(db, item.collectionName, item.originalId), item.data);
    // 2. Remove the recycle bin item so it's gone from the bin list
    await deleteDoc(doc(db, 'recycle_bin', item.id));
    return true;
  } catch (e) {
    console.error('Failed to restore deleted item:', e);
    throw e;
  }
}

/**
 * Reverts a modified record back to its previous historical state
 */
export async function revertModifiedItem(item: RecycleBinItem) {
  try {
    // 1. Re-insert the historical previousData back into the active record
    await setDoc(doc(db, item.collectionName, item.originalId), item.previousData);
    // 2. Remove the audit entry or keep it ? Better delete from the bin to signify reverted state
    await deleteDoc(doc(db, 'recycle_bin', item.id));
    return true;
  } catch (e) {
    console.error('Failed to revert modified item:', e);
    throw e;
  }
}

/**
 * Permanently deletes an entry from the recovery bin (emptying the trash)
 */
export async function permanentlyPurgeBinItem(itemId: string) {
  try {
    await deleteDoc(doc(db, 'recycle_bin', itemId));
    return true;
  } catch (e) {
    console.error('Failed to purge recycle bin entry:', e);
    throw e;
  }
}
