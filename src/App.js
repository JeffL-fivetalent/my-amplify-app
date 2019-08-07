import React, { useEffect, useReducer } from 'react'
import { Auth } from 'aws-amplify'
import { API, graphqlOperation } from 'aws-amplify'

// import uuid to create a unique client ID
import uuid from 'uuid/v4'

// import the mutation and query
import { createTalk as CreateTalk } from './graphql/mutations'
import { listTalks as ListTalks } from './graphql/queries'

// import the subscription
import { onCreateTalk as OnCreateTalk } from './graphql/subscriptions'

import { withAuthenticator } from 'aws-amplify-react'



const CLIENT_ID = uuid()

// create initial state
const initialState = {
  name: '', description: '', speakerName: '', speakerBio: '', talks: []
}

// update reducer
function reducer(state, action) {
  switch(action.type) {
    case 'SET_TALKS':
      return { ...state, talks: action.talks }
    case 'SET_INPUT':
      return { ...state, [action.key]: action.value }
    case 'CLEAR_INPUT':
      return { ...initialState, talks: state.talks }
    // new 👇
    case 'ADD_TALK':
      return { ...state, talks: [...state.talks, action.talk] }
    default:
      return state
  }
}

function App() {
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    getData()
  }, [])

  // subscribe in useEffect
useEffect(() => {
  const subscription = API.graphql(graphqlOperation(OnCreateTalk)).subscribe({
      next: (eventData) => {
        const talk = eventData.value.data.onCreateTalk
        if (talk.clientId === CLIENT_ID) return
        dispatch({ type: 'ADD_TALK', talk  })
      }
  })
  return () => subscription.unsubscribe()
}, [])

useEffect(() => {
  Auth.currentAuthenticatedUser()
    .then(user => console.log('user info: ', user))
    .catch(err => console.log('error finding user: ', err))
}, [])

  async function getData() {
    try {
      const talkData = await API.graphql(graphqlOperation(ListTalks))
      console.log('data from API: ', talkData)
      dispatch({ type: 'SET_TALKS', talks: talkData.data.listTalks.items})
    } catch (err) {
      console.log('error fetching data..', err)
    }
  }

  async function createTalk() {
    const { name, description, speakerBio, speakerName } = state
    if (name === '' || description === '' ||
    speakerBio === '' || speakerName === '') return

    const talk = { name, description, speakerBio, speakerName, clientId: CLIENT_ID }
    const talks = [...state.talks, talk]
    dispatch({ type: 'SET_TALKS', talks })
    dispatch({ type: 'CLEAR_INPUT' })

    try {
      await API.graphql(graphqlOperation(CreateTalk, { input: talk }))
      console.log('item created!')
    } catch (err) {
      console.log('error creating talk...', err)
    }
  }

  // change state then user types into input
  function onChange(e) {
    dispatch({ type: 'SET_INPUT', key: e.target.name, value: e.target.value })
  }

  // add UI with event handlers to manage user input
  return (
    <div>
      <input
        name='name'
        onChange={onChange}
        value={state.name}
        placeholder='name'
      />
      <input
        name='description'
        onChange={onChange}
        value={state.description}
        placeholder='description'
      />
      <input
        name='speakerName'
        onChange={onChange}
        value={state.speakerName}
        placeholder='speakerName'
      />
      <input
        name='speakerBio'
        onChange={onChange}
        value={state.speakerBio}
        placeholder='speakerBio'
      />
      <button onClick={createTalk}>Create Talk</button>
      <div>
        {
          state.talks.map((talk, index) => (
            <div key={index}>
              <h3>{talk.speakerName}</h3>
              <h5>{talk.name}</h5>
              <p>{talk.description}</p>
            </div>
          ))
        }
      </div>
    </div>
  )
}

export default withAuthenticator(App, { includeGreetings: true })