import test from 'ava';
import localReducer from '../src/localReducer.js';

test('Should return the correct initial state for the component', t => {
    t.deepEqual(localReducer(undefined, {type: undefined, meta: {}}), {
        componentsState: {}, subscribersCount: {}
    });
});
