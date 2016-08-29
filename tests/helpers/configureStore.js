import localReducer from '../../src/localReducer.js';
import { createStore, combineReducers } from 'redux';
export function configureStore() {
    const store = createStore(
            combineReducers({
                local: localReducer
            })
        );
    return store;
}

export const Store = configureStore();
