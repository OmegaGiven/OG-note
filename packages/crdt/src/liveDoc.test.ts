import { describe, expect, it } from 'vitest'
import * as Y from 'yjs'
import { createDocumentState } from './index'
import { applyEncodedUpdate, encodeDocUpdateSince, getDocStateVector, getRichFragment, hydrateLiveYDoc, syncLiveDocFromState } from './index'

function xmlFragmentText(fragment: Y.XmlFragment): string {
  let text = ''
  fragment.forEach((node) => {
    if (node instanceof Y.XmlText) text += node.toString()
    else if (node instanceof Y.XmlElement) text += xmlFragmentText(node as unknown as Y.XmlFragment)
  })
  return text
}

function typeInto(fragment: Y.XmlFragment, text: string) {
  const xmlText = new Y.XmlText()
  xmlText.insert(0, text)
  fragment.push([xmlText])
}

describe('live rich-editing primitives', () => {
  it('hydrateLiveYDoc gives a mutable doc whose edits are immediately readable — no diff/save round trip needed', () => {
    const base = createDocumentState('doc-1', 'note', '')
    const doc = hydrateLiveYDoc(base)
    const fragment = getRichFragment(doc)
    expect(fragment.length).toBe(0)

    typeInto(fragment, 'hello')
    expect(xmlFragmentText(fragment)).toBe('hello')
  })

  it('encodeDocUpdateSince returns null for a no-op and a real delta once something changed', () => {
    const doc = hydrateLiveYDoc(createDocumentState('doc-2', 'note', ''))
    const vector = getDocStateVector(doc)
    expect(encodeDocUpdateSince(doc, vector)).toBeNull()

    typeInto(getRichFragment(doc), 'world')
    expect(encodeDocUpdateSince(doc, vector)).not.toBeNull()
  })

  it('applyEncodedUpdate merges a remote delta into a live doc without touching unrelated content', () => {
    const sender = hydrateLiveYDoc(createDocumentState('doc-3', 'note', ''))
    const senderVector = getDocStateVector(sender)
    typeInto(getRichFragment(sender), 'from sender')
    const payload = encodeDocUpdateSince(sender, senderVector)
    expect(payload).not.toBeNull()

    const receiver = hydrateLiveYDoc(createDocumentState('doc-3', 'note', ''))
    typeInto(getRichFragment(receiver), 'from receiver ')
    applyEncodedUpdate(receiver, payload!)

    const text = xmlFragmentText(getRichFragment(receiver))
    expect(text).toContain('from sender')
    expect(text).toContain('from receiver')
  })

  it('two concurrent live docs editing from the same base converge to the same text either order updates are applied', () => {
    const seed = createDocumentState('doc-4', 'note', '')
    const deviceA = hydrateLiveYDoc(seed)
    const deviceB = hydrateLiveYDoc(seed)

    const aVector = getDocStateVector(deviceA)
    typeInto(getRichFragment(deviceA), 'A-edit ')
    const aPayload = encodeDocUpdateSince(deviceA, aVector)!

    const bVector = getDocStateVector(deviceB)
    typeInto(getRichFragment(deviceB), 'B-edit ')
    const bPayload = encodeDocUpdateSince(deviceB, bVector)!

    applyEncodedUpdate(deviceA, bPayload)
    applyEncodedUpdate(deviceB, aPayload)

    const textA = xmlFragmentText(getRichFragment(deviceA))
    const textB = xmlFragmentText(getRichFragment(deviceB))
    expect(textA).toBe(textB)
    expect(textA).toContain('A-edit')
    expect(textA).toContain('B-edit')
  })

  it('syncLiveDocFromState merges server state into a live doc instead of replacing it — regression for the periodic-pull clobbering bug', () => {
    const seed = createDocumentState('doc-5', 'note', '')
    const liveDoc = hydrateLiveYDoc(seed)
    typeInto(getRichFragment(liveDoc), 'unsaved local edit')

    // Simulate the server having a slightly different, older state (as it
    // would if the local edit hasn't been pushed yet) — syncing from it
    // must not wipe out what's already live in the editor.
    const staleServerState = createDocumentState('doc-5', 'note', '')
    syncLiveDocFromState(liveDoc, staleServerState)

    expect(xmlFragmentText(getRichFragment(liveDoc))).toBe('unsaved local edit')
  })

  it('syncLiveDocFromState pulls in changes the live doc is missing', () => {
    const seed = createDocumentState('doc-6', 'note', '')
    const serverDoc = hydrateLiveYDoc(seed)
    typeInto(getRichFragment(serverDoc), 'server-side content')
    const serverState = {
      ...seed,
      updates: [
        {
          id: 'u1',
          documentId: 'doc-6',
          clientId: 'server-writer',
          sequence: 1,
          payload: encodeDocUpdateSince(serverDoc, getDocStateVector(hydrateLiveYDoc(seed)))!,
          createdAt: new Date().toISOString(),
        },
      ],
    }

    const liveDoc = hydrateLiveYDoc(seed)
    expect(xmlFragmentText(getRichFragment(liveDoc))).toBe('')
    syncLiveDocFromState(liveDoc, serverState)
    expect(xmlFragmentText(getRichFragment(liveDoc))).toBe('server-side content')
  })
})
