import localReducer from '../../src/localReducer.js';
import { createStore, combineReducers } from 'redux';
export function configureStore() {
    const store = createStore(
            combineReducers({
                local: localReducer,
                someGlobalState: (state = { isGlobal: true }, action) => {
                    switch (action.type) {
                        case 'SET_GLOBAL':
                            return Object.assign({}, state, { isGlobal: action.payload });
                        default:
                            return state;
                    }
                }
            })
        );
    return store;
}

export const Store = configureStore();
