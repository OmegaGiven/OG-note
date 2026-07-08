import type { CrdtDocumentState, CrdtUpdate } from '@og-suite/contracts'
import * as Y from 'yjs'

const textKey = 'content'
const clientSchemaVersion = 2
const legacySnapshotClientId = 1

export type TextDocumentReplica = {
  id: string
  text: string
  version: number
}

export function createDocumentState(id: string, kind: CrdtDocumentState['kind'], text = ''): CrdtDocumentState {
  const doc = createYDoc(text)
  return {
    id,
    kind,
    snapshot: encodeUpdate(Y.encodeStateAsUpdate(doc)),
    updates: [],
    version: 0,
    compactedAt: null,
  }
}

export function applyUpdates(state: CrdtDocumentState): TextDocumentReplica {
  const doc = hydrateYDoc(state)
  return {
    id: state.id,
    text: doc.getText(textKey).toString(),
    version: state.version,
  }
}

export function createTextReplacementUpdate(
  documentId: string,
  clientId: string,
  sequence: number,
  text: string,
  baseState?: CrdtDocumentState | null,
): Omit<CrdtUpdate, 'id' | 'createdAt'> {
  const doc = baseState ? hydrateYDoc(baseState) : createYDoc()
  const stateVector = Y.encodeStateVector(doc)
  replaceTextWithMinimalEdit(doc.getText(textKey), text)
  return {
    documentId,
    clientId,
    sequence,
    payload: encodeUpdate(Y.encodeStateAsUpdate(doc, stateVector)),
    clientSchemaVersion,
  }
}

export function createTextDiffUpdate(
  documentId: string,
  clientId: string,
  sequence: number,
  previousText: string,
  nextText: string,
  baseState?: CrdtDocumentState | null,
): Omit<CrdtUpdate, 'id' | 'createdAt'> {
  const doc = baseState ? hydrateYDoc(baseState) : createYDoc()
  const stateVector = Y.encodeStateVector(doc)
  applyMappedTextDiff(doc.getText(textKey), previousText, nextText)
  return {
    documentId,
    clientId,
    sequence,
    payload: encodeUpdate(Y.encodeStateAsUpdate(doc, stateVector)),
    clientSchemaVersion,
  }
}

function hydrateYDoc(state: CrdtDocumentState): Y.Doc {
  const doc = createYDoc()
  applySnapshot(doc, state.snapshot)
  for (const update of orderedUpdates(state.updates)) applyStoredUpdate(doc, update.payload)
  return doc
}

function createYDoc(text = '') {
  const doc = new Y.Doc()
  if (text) doc.getText(textKey).insert(0, text)
  return doc
}

function orderedUpdates(updates: CrdtUpdate[]) {
  return [...updates].sort((left, right) => {
    if (left.sequence !== right.sequence) return left.sequence - right.sequence
    return left.clientId.localeCompare(right.clientId)
  })
}

function applySnapshot(doc: Y.Doc, payload: string) {
  if (!payload) return
  try {
    Y.applyUpdate(doc, decodeUpdate(payload))
  } catch {
    const text = doc.getText(textKey)
    if (text.length > 0) return
    const clientId = doc.clientID
    doc.clientID = legacySnapshotClientId
    text.insert(0, payload)
    doc.clientID = clientId
  }
}

function applyStoredUpdate(doc: Y.Doc, payload: string) {
  if (!payload) return
  Y.applyUpdate(doc, decodeUpdate(payload))
}

function replaceTextWithMinimalEdit(yText: Y.Text, nextText: string) {
  const currentText = yText.toString()
  if (currentText === nextText) return

  let prefixLength = 0
  const minLength = Math.min(currentText.length, nextText.length)
  while (prefixLength < minLength && currentText[prefixLength] === nextText[prefixLength]) {
    prefixLength += 1
  }

  let suffixLength = 0
  while (
    suffixLength < currentText.length - prefixLength
    && suffixLength < nextText.length - prefixLength
    && currentText[currentText.length - 1 - suffixLength] === nextText[nextText.length - 1 - suffixLength]
  ) {
    suffixLength += 1
  }

  const deleteLength = currentText.length - prefixLength - suffixLength
  const insertText = nextText.slice(prefixLength, nextText.length - suffixLength)
  if (deleteLength > 0) yText.delete(prefixLength, deleteLength)
  if (insertText) yText.insert(prefixLength, insertText)
}

function applyMappedTextDiff(yText: Y.Text, previousText: string, nextText: string) {
  if (previousText === nextText) return
  const currentText = yText.toString()
  const diff = textDiff(previousText, nextText)
  const start = mapTextPosition(previousText, currentText, diff.start)
  const end = mapTextPosition(previousText, currentText, diff.start + diff.deleteLength)
  const deleteLength = Math.max(0, end - start)
  if (deleteLength > 0) yText.delete(start, deleteLength)
  if (diff.insertText) yText.insert(start, diff.insertText)
}

function textDiff(previousText: string, nextText: string) {
  let prefixLength = 0
  const minLength = Math.min(previousText.length, nextText.length)
  while (prefixLength < minLength && previousText[prefixLength] === nextText[prefixLength]) {
    prefixLength += 1
  }

  let suffixLength = 0
  while (
    suffixLength < previousText.length - prefixLength
    && suffixLength < nextText.length - prefixLength
    && previousText[previousText.length - 1 - suffixLength] === nextText[nextText.length - 1 - suffixLength]
  ) {
    suffixLength += 1
  }

  return {
    start: prefixLength,
    deleteLength: previousText.length - prefixLength - suffixLength,
    insertText: nextText.slice(prefixLength, nextText.length - suffixLength),
  }
}

function mapTextPosition(previousText: string, currentText: string, position: number) {
  let prefixLength = 0
  const shortestLength = Math.min(previousText.length, currentText.length)
  while (prefixLength < shortestLength && previousText[prefixLength] === currentText[prefixLength]) prefixLength += 1

  let suffixLength = 0
  while (
    suffixLength < previousText.length - prefixLength
    && suffixLength < currentText.length - prefixLength
    && previousText[previousText.length - 1 - suffixLength] === currentText[currentText.length - 1 - suffixLength]
  ) {
    suffixLength += 1
  }

  const previousChangedEnd = previousText.length - suffixLength
  if (position <= prefixLength) return position
  if (position >= previousChangedEnd) return Math.max(0, position + currentText.length - previousText.length)
  return currentText.length - suffixLength
}

function encodeUpdate(update: Uint8Array) {
  if (typeof Buffer !== 'undefined') return Buffer.from(update).toString('base64')
  let binary = ''
  for (const byte of update) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function decodeUpdate(payload: string) {
  if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(payload, 'base64'))
  const binary = atob(payload)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}
