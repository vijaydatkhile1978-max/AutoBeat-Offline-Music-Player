import { del, get, set } from 'idb-keyval';

const MUSIC_FOLDER_HANDLE_KEY = 'musicFolderHandle';

export async function saveFolderHandle(handle: FileSystemDirectoryHandle) {
  await set(MUSIC_FOLDER_HANDLE_KEY, handle);
}

export async function getFolderHandle(): Promise<FileSystemDirectoryHandle | null> {
  return (await get<FileSystemDirectoryHandle>(MUSIC_FOLDER_HANDLE_KEY)) || null;
}

export async function clearFolderHandle() {
  await del(MUSIC_FOLDER_HANDLE_KEY);
}
