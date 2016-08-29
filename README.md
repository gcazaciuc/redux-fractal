# redux-fractal
Local component state &amp; actions in Redux.

Provides the means to hold up local component state in redux state and to dispatch locally scoped actions.

It's easy to get starte using redux-fractal

1. Add the local reducer to the redux store under the key 'local'
    ```js
        import { localReducer } from 'redux-fractal';
        const store = createStore(combineReducers({
            local: localReducer,
            myotherReducer: myotherReducer
        }))
    ```
2. Decorate the components that hold ui state( transient state, scoped to that very specific component ) with the 'local' higher order component:
    ```js
        import { local, defaultReducer, updateUI } from 'redux-fractal';
        local({
            initialState: {
                filterTerm: '',
                sortOrder: 'asc'
            },
            reducer: defaultReducer,
            mapDispatchToProps: (dispatch) => ({
                onFilter: (term) => dispatch(updateUI({ filterTerm: term })),
                onSort: (order) => dispatch(updateUI({
                    sortOrder: 'desc'
                }))
            })
        })(Table)
    ```

The higher order component 'local' takes in the following params:

# initialState
    Either an object representing the initial state of the component or a function taking props and returning the initial state.
```js
initialState: (props) => ({ filterTerm: props.defaultSearch })
```
    or
```js
    initialState: { filterTerm: 'default search term' }
```
# reducer
    A standard redux reducer function that will determine how the component state transitions. The reducer will take in the current component state and action and will return the next component state
```js
    reducer: (state, action) => {
        switch(action.type) {
            case SET_SEARCH_TERM:
                return Object.assign({}, state, {filterTerm: action.payload });
            default:
                return state;
        }
    }
```
    There is no difference between a global state reducer and a component reducer.
    For your convenience redux-fractal ships with a 'defaultReducer' that reacts to a standard 'UPDATE_UI' action and just merges the payload with the current component state.
# mapDispatchToProps
```js
mapDispatchToProps: (dispatch) => ({
    eventHandler: (data) => dispatch(actionCreator())
})
```

It works very simular to react-redux 'connect' function allowing you to return a list of even handlers that will be injected as prop into the decorated component.
The important differece is in the 'dispatch' function which will tag all actions with the component key of the component invoking it.
