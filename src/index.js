import React, { useState, useMemo, useReducer, useEffect } from 'react'
import ReactDOM from 'react-dom'

/**
 * Open app in two tabs
 * In tab, the caller tab, click "Create offer". Copy the alert message to your clipboard.
 * In the other tab, the callee tab, click "Receive offer", paste the contents, and submit.
 * A new alert on the callee tab will open, copy that message to your clipboard.
 * In the caller tab, click "Receive answer", paste the contents, and submit.
 * In the caller tab, copy the ice candidate.
 * In the callee tab, click "Add ice candidate", paste the contents, and submit.
 * A connection should be established at this point.
 * 
 * To send messages between the tabs, click "Send message", type something, then submit.
 */

function randomString() {
  return Math.random().toString(36).substring(7)
}

function App() {
  const [state, dispatch] = useReducer((state, action) => {
    console.log(action)

    if (action.type === 'SET_CONNECTION_STATE') {
      return { ...state, connectionState: action.value }
    }

    if (action.type === 'SET_SIGNALING_STATE') {
      return { ...state, signalingState: action.value }
    }

    if (action.type === 'ADD_ICE_CANDIDATE') {
      return {
        ...state,
        iceCandidates: [
          ...state.iceCandidates,
          {
          id: randomString(),
          candidate: JSON.parse(JSON.stringify(action.candidate)),
          },
        ],
      }
    }

    if (action.type === 'RECEIVE_MESSAGE') {
      return {
        ...state,
        messages: state.messages.concat({
          id: randomString(),
          from: 'Correspondent',
          message: action.message,
        })
      }
    }

    if (action.type === 'SEND_MESSAGE') {
      return {
        ...state,
        messages: state.messages.concat({
          id: randomString(),
          from: 'Me',
          message: action.message,
        })
      }
    }

    throw new Error(`No handler for action type \`${action.type}\``)
  }, {
    iceCandidates: [],
    messages: [],
  })

  const [dataChannel, setDataChannel] = useState(null)

  const peerConnection = useMemo(() => {
    const connection = new RTCPeerConnection()
    return connection
  }, [])

  function registerDataChannel(channel) {
    setDataChannel(channel)
    channel.onopen = () => console.log(`channel #${channel.id} ${channel.label} opened`)
    channel.onmessage = (e) => {
      console.log(`received "${e.data}" on channel #${channel.id} ${channel.label}`)
      dispatch({ type: 'RECEIVE_MESSAGE', message: e.data })
    }
    channel.onclose = () => console.log(`channel #${channel.id} ${channel.label} closed`)
  }

  useEffect(() => {
    registerDataChannel(peerConnection.createDataChannel('my channel ' + randomString()))
  }, [peerConnection])

  function sendMessage(message) {
    console.log(`sending \`${message}\` on data channel #${dataChannel.id} ${dataChannel.label}`)
    dispatch({ type: 'SEND_MESSAGE', message })
    dataChannel.send(message)
  }

  useEffect(() => {
    peerConnection.onconnectionstatechange = (e) => dispatch({ type: 'SET_CONNECTION_STATE', value: e.target.connectionState })
    peerConnection.onsignalingstatechange = (e) => dispatch({ type: 'SET_SIGNALING_STATE', value: peerConnection.signalingState })
    peerConnection.onicecandidate = (e) => e.candidate && dispatch({ type: 'ADD_ICE_CANDIDATE', candidate: e.candidate })
    peerConnection.ondatachannel = (e) => registerDataChannel(e.channel)
    peerConnection.onnegotiationneeded = () => console.log('negotation needed')
  }, [peerConnection])

  function checkConnection() {
    dispatch({ type: 'SET_SIGNALING_STATE', value: peerConnection.signalingState })
    dispatch({ type: 'SET_CONNECTION_STATE', value: peerConnection.connectionState })
  }

  function createOffer() {
    peerConnection.createOffer().then((offer) => {
      return peerConnection.setLocalDescription(offer)
    }).then(() => {
      alert(JSON.stringify(peerConnection.localDescription))
      // dispatch({ type: 'CREATE_OFFER', value: peerConnection.localDescription })
    })
  }

  function connectTo(remoteDescriptionString) {
    const remoteDescription = new RTCSessionDescription(JSON.parse(remoteDescriptionString))
    peerConnection.setRemoteDescription(remoteDescription)
    peerConnection.createAnswer().then((answer) => {
      return peerConnection.setLocalDescription(answer)
    }).then(() => {
      alert(JSON.stringify(peerConnection.localDescription))
      // dispatch({ type: 'RECEIVE_OFFER', remoteDescription, localDescription: peerConnection.localDescription })
    })
  }

  function receiveRemoteAnswer(remoteDescriptionString) {
    const remoteDescription = new RTCSessionDescription(JSON.parse(remoteDescriptionString))
    peerConnection.setRemoteDescription(remoteDescription)
    // dispatch({ type: 'RECEIVE_REMOTE_ANSWER', value: remoteDescription })
    // todo send something down the line
  }

  function addIceCandidate(candidateString) {
    const candidate = new RTCIceCandidate(JSON.parse(candidateString))
    peerConnection.addIceCandidate(candidate)
  }

  return <div>
    <div style={{ display: 'grid', gridGap: '1em' }}>
      <div>
        <p>signaling state: {state.signalingState}</p>
        <p>connection state: {state.connectionState}</p>
      </div>
      <div>
        <button onClick={() => checkConnection()}>Check connection</button>
      </div>
      <div>
        <button onClick={() => createOffer()}>Create offer</button>
      </div>
      <div>
      <button onClick={() => connectTo(prompt())}>Receive offer</button>
      </div>
      <div>
        <button onClick={() => receiveRemoteAnswer(prompt())}>Receive answer</button>
      </div>
      <div>
        <button onClick={() => addIceCandidate(prompt())}>Add ice candidate</button>
      </div>
      <div>
        <button onClick={() => sendMessage(prompt())}>Send message</button>
      </div>
      <div>
        <div>ice candidates</div>
        <div>
          {state.iceCandidates.map(({ id, candidate }) => {
            return <textarea key={id} defaultValue={JSON.stringify(candidate)} readOnly />
          })}
        </div>
      </div>
      <div>
        {state.messages.map(({ id, from, message }) => {
          return <div key={id}>{from}: {message}</div>
        })}
      </div>
      <div>
        <pre>{JSON.stringify(state, null, 2)}</pre>
      </div>
    </div>
  </div>
}

ReactDOM.render(<App />, document.getElementById('root'))