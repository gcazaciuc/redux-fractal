import test from 'ava';
import { mount } from 'enzyme';
import React from 'react';
import local from '../src/local.js';
import { Provider } from 'react-redux';
import { Store } from './helpers/configureStore.js';

const DummyComp = (props) => {
    return (<div></div>);
}
DummyComp.displayName = 'DummyComp';

test('Should return the correct initial state for the component', t => {
    const CompToRender = local({
        key: 'myDumbComp',
        state: {
            testVar1: 'x'
        }
    })(DummyComp);
    const wrapper = mount(<Provider store={Store}><CompToRender /></Provider>);
    const propVal = wrapper.find('DummyComp').props().testVar1;
    t.deepEqual(propVal, 'x');
});
