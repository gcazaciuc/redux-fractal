import test from 'ava';
import { mergeReducers } from '../src/utils.js';
const EditableReducer = (state = { editState: false }, action) => {
    switch(action.type) {
        case 'EDIT_STARTED':
              return  Object.assign({}, state, { editState: true });
        case 'EDIT_STOPPED':
              return  Object.assign({}, state, { editState: false });
        default:
            return state;
    }
}

const FiltersReducer = (state = { filtersList: [] }, action) => {
    switch(action.type) {
        case 'SET_FILTER':
              const newFilters = state.filtersList.concat(action.payload);
              return Object.assign({}, state, { filtersList: newFilters });
        case 'REMOVE_FILTER':
              return state;
        default:
            return state;
    }
}
test('Should return the correct initial state when reducers are merged', t => {
    const rootReducer = mergeReducers(EditableReducer, FiltersReducer);
    t.deepEqual(rootReducer(undefined, { type: undefined }), { filtersList: [], editState: false });
});

test('Should update the state correctly when reducers are merged', t => {
    const rootReducer = mergeReducers(EditableReducer, FiltersReducer);
    rootReducer(undefined, { type: undefined });
    t.deepEqual(
        rootReducer({ filtersList: [], editState: false }, { type: 'EDIT_STARTED' }),
        { filtersList: [], editState: true });
    t.deepEqual(
        rootReducer({ filtersList: [], editState: true }, { type: 'SET_FILTER', payload: 'test' }),
        { filtersList: ['test'], editState: true });
});
