import test from 'ava';
import { mount } from 'enzyme';
import { spy, useFakeTimers } from 'sinon';
import PropTypes from 'prop-types';
import React from 'react';
import local from '../src/local.js';
import { Provider, connect } from 'react-redux';
import { createStore } from 'redux';
import mySaga from './helpers/sagas.js';
import { configureStore } from './helpers/configureStore.js';
import createSagaMiddleware from 'redux-saga';
import { applyMiddleware } from 'redux';
import { destroyAllComponentsState, destroyComponentState } from '../src/index.js';

class DummyComp extends React.Component {
    constructor(props, context) {
        super(props, context);
    }
    render() {
        return (<div></div>);
    }
}
DummyComp.displayName = 'DummyComp';
DummyComp.childContextTypes = {
    color: PropTypes.string
};
DummyComp.staticFn = () => 'query';
DummyComp.staticProp = 'staticProp';

class ContextProviderComp extends React.Component {
    constructor(props) {
        super(props);
    }
    getChildContext() {
        return { sortOrder: "asc", "keepState": true, "id": 'abc' };
    }
    render() {
        return React.Children.only(this.props.children);
    }
}
ContextProviderComp.childContextTypes = {
     sortOrder: PropTypes.string,
     keepState: PropTypes.bool,
     id: PropTypes.string
};
const rootReducer = (state = { filter: null, sort: null, trigger: '', current: '' }, action) => {
     switch(action.type) {
         case 'SET_FILTER':
            return Object.assign({}, state, { filter: action.payload });
         case 'SET_SORT':
            // console.log(action.meta && JSON.stringify(action.meta));
            return Object.assign({}, state,
                { sort: action.payload,
                  trigger: action.meta && action.meta.reduxFractalTriggerComponent,
                  current: action.meta && action.meta.reduxFractalCurrentComponent
                });
         case 'GLOBAL_ACTION':
            return Object.assign({}, state, { filter: 'globalFilter' });
        case 'RESET_DEFAULT':
           return Object.assign({}, state, { sort: state.sort+'_globalSort' });
         default:
            return state;
     }
};

test('Should return the correct initial state for the component', t => {
    const CompToRender = local({
        key: 'myDumbComp',
        filterGlobalActions: (action) => {
            return false;
        },
        createStore: (props) => {
            return createStore(rootReducer, { filter: true, sort: props.sortOrder })
        },
        mapDispatchToProps:(dispatch) => ({
            onFilter: (filter) => dispatch({ type: 'SET_FILTER', payload: filter  }),
            onSort: (sort) => dispatch({ type: 'SET_SORT', payload: sort }),
        })
    })(DummyComp);
    const wrapper = mount(<Provider store={configureStore()}><CompToRender sortOrder='desc' /></Provider>);
    const filterVal = wrapper.find('DummyComp').props().filter;
    const sortVal = wrapper.find('DummyComp').props().sort;
    t.deepEqual(filterVal, true);
    t.deepEqual(sortVal, 'desc');
    wrapper.unmount();
    return new Promise((resolve) => setTimeout(() => resolve(), 10));
});

test(`Should dispatch local actions that update component state. The local actions
      should also hit the global app reducers`, t => {
    const Store = configureStore();
    const CompToRender = local({
        key: 'myDumbComp',
        filterGlobalActions: (action) => {
            return false;
        },
        createStore: (props) => {
            return createStore(rootReducer, { filter: true, sort: props.sortOrder });
        },
        mapDispatchToProps:(dispatch) => ({
            onFilter: (filter) => dispatch({ type: 'SET_FILTER', payload: filter  }),
            onSort: (sort) => dispatch({ type: 'SET_SORT', payload: sort }),
        })
    })(DummyComp);
    const wrapper = mount(
        <Provider store={Store}>
            <CompToRender sortOrder='desc' />
        </Provider>);
    let dumbComp = wrapper.find('DummyComp');
    dumbComp.props().onFilter('my term');
    let filterVal = wrapper.find('DummyComp').props().filter;
    let sortVal = wrapper.find('DummyComp').props().sort;
    t.deepEqual(filterVal, 'my term');
    t.deepEqual(sortVal, 'desc');
    dumbComp = wrapper.find('DummyComp');
    dumbComp.props().onSort('asc');
    filterVal = wrapper.find('DummyComp').props().filter;
    sortVal = wrapper.find('DummyComp').props().sort;
    t.deepEqual(filterVal, 'my term');
    t.deepEqual(sortVal, 'asc');
    // Check that global state is also updated
    t.deepEqual(Store.getState().local,
                {"myDumbComp":{"filter":"my term","sort":"asc", trigger:"myDumbComp", current:"myDumbComp"}});
    wrapper.unmount();
    return new Promise((resolve) => setTimeout(() => resolve(), 10));
});

test(`Should forward global actions to the component as long as they pass
      the global actions filter`, t => {
    const Store = configureStore();
    const CompToRender = local({
        key: 'myDumbComp',
        filterGlobalActions: (action) => {
            return true;
        },
        createStore: (props) => {
            return createStore(rootReducer, { filter: true, sort: props.sortOrder })
        },
        mapDispatchToProps:(dispatch) => ({
            onFilter: (filter) => dispatch({ type: 'SET_FILTER', payload: filter  }),
            onSort: (sort) => dispatch({ type: 'SET_SORT', payload: sort }),
        })
    })(DummyComp);
    const wrapper = mount(<Provider store={Store}><CompToRender sortOrder='desc' /></Provider>);
    let filterVal = wrapper.find('DummyComp').props().filter;
    t.deepEqual(filterVal, true);
    Store.dispatch({ type: 'GLOBAL_ACTION' });
    t.deepEqual(wrapper.find('DummyComp').props().filter, 'globalFilter');
    wrapper.unmount();
    return new Promise((resolve) => setTimeout(() => resolve(), 10));
});

test(`Should NOT forward any global actions if 'filterGlobalActions' function is not defined`, t => {
    const Store = configureStore();
    const CompToRender = local({
        key: 'myDumbComp',
        createStore: (props) => {
            return createStore(rootReducer, { filter: true, sort: props.sortOrder })
        },
        mapDispatchToProps:(dispatch) => ({
            onFilter: (filter) => dispatch({ type: 'SET_FILTER', payload: filter  }),
            onSort: (sort) => dispatch({ type: 'SET_SORT', payload: sort }),
        })
    })(DummyComp);
    const wrapper = mount(
        <Provider store={Store}>
            <CompToRender sortOrder='desc' />
        </Provider>
    );
    let filterVal = wrapper.find('DummyComp').props().filter;
    t.deepEqual(filterVal, true);
    Store.dispatch({ type: 'GLOBAL_ACTION' });
    // State remains unchanged as the action is not forwarded
    t.deepEqual(wrapper.find('DummyComp').props().filter, true);
    wrapper.unmount();
    return new Promise((resolve) => setTimeout(() => resolve(), 10));
});

test(`Should not forward other actions besides those the component is tagged
     on to the component is filterGlobalActions returns false for the action`, t => {
         const Store = configureStore();
         const HOC = local({
             key: (props) => props.id,
             filterGlobalActions: (action) => {
                 const allowedGlobalActions = ['SET_SORT'];
                 return allowedGlobalActions.indexOf(action.type) !== -1;
             },
             createStore: (props) => {
                 return createStore(rootReducer, { filter: true, sort: props.sortOrder })
             },
             mapDispatchToProps:(dispatch) => ({
                 onFilter: (filter) => dispatch({ type: 'SET_FILTER', payload: filter  }),
                 onSort: (sort) => dispatch({ type: 'SET_SORT', payload: sort }),
             })
         });
         const CompToRender = HOC(DummyComp);
         const App = (props) => {
             return(
                 <div>
                 <CompToRender sortOrder='asc' id='comp1' />
                 <CompToRender sortOrder='desc' id='comp2' />
                 </div>
             );
         };
         const wrapper = mount(
         <Provider store={Store}>
             <App />
         </Provider>);
     let sortVal = wrapper.find('DummyComp').at(1).props().sort;
     t.deepEqual(sortVal, 'desc');
    wrapper.find('DummyComp').at(0).props().onSort('asc');
    // Intercepts all SET_SORT actions no matter where are originated
    const props = wrapper.find('DummyComp').at(1).props();
    sortVal = props.sort;
    t.deepEqual(sortVal, 'asc');
    t.deepEqual(props.trigger, 'comp1');
    t.deepEqual(props.current, 'comp2');
    wrapper.unmount();
    return new Promise((resolve) => setTimeout(() => resolve(), 10));
});

test(`Should be able to render multiple components of the same type
    and each should get it's own slice of state and react to it's own
    internal actions`, t => {
    const Store = configureStore();
    const HOC = local({
        key: (props) => props.id,
        filterGlobalActions: (action) => {
            const allowedGlobalActions = ['GLOBAL_ACTION', 'RESET_DEFAULT'];
            return allowedGlobalActions.indexOf(action.type) !== -1;
        },
        createStore: (props) => {
            return createStore(rootReducer, { filter: true, sort: props.sortOrder })
        },
        mapDispatchToProps:(dispatch) => ({
            onFilter: (filter) => dispatch({ type: 'SET_FILTER', payload: filter  }),
            onSort: (sort) => dispatch({ type: 'SET_SORT', payload: sort }),
        })
    });
    const CompToRender = HOC(DummyComp);
    const App = (props) => {
        return(
            <div>
            <CompToRender sortOrder='asc' id='comp1' />
            <CompToRender sortOrder='desc' id='comp2' />
            </div>
        );
    };
    const wrapper = mount(
    <Provider store={Store}>
        <App />
    </Provider>);
    let sortVal1 = wrapper.find('DummyComp').at(0).props().sort;
    let sortVal2 = wrapper.find('DummyComp').at(1).props().sort;
    t.deepEqual(sortVal1, 'asc');
    t.deepEqual(sortVal2, 'desc');
    // Test local dispatches
    wrapper.find('DummyComp').at(0).props().onSort('desc');
    sortVal1 = wrapper.find('DummyComp').at(0).props().sort;
    sortVal2 = wrapper.find('DummyComp').at(1).props().sort;
    t.deepEqual(sortVal1, 'desc');
    t.deepEqual(sortVal2, 'desc');
    wrapper.find('DummyComp').at(1).props().onSort('asc');
    sortVal1 = wrapper.find('DummyComp').at(0).props().sort;
    sortVal2 = wrapper.find('DummyComp').at(1).props().sort;
    t.deepEqual(sortVal1, 'desc');
    t.deepEqual(sortVal2, 'asc');
    // Test that both react in their own way to global actions
    Store.dispatch({ type: 'RESET_DEFAULT' });
    sortVal1 = wrapper.find('DummyComp').at(0).props().sort;
    sortVal2 = wrapper.find('DummyComp').at(1).props().sort;
    t.deepEqual(sortVal1, 'desc_globalSort');
    t.deepEqual(sortVal2, 'asc_globalSort');
    // Verify that the subscribers count is updated properly as components unmount
    t.deepEqual(Store.getState().local, {
        "comp1": {
            "filter": true,
            "sort": "desc_globalSort",
            trigger: 'comp1',
            current: 'comp1'
        },
        "comp2": {
            "filter": true,
            "sort": "asc_globalSort",
            trigger:'comp2',
            current: 'comp2'
        }
    });
    wrapper.unmount();
    setTimeout(() => {
        t.deepEqual(
            Store.getState().local,
            {}
        );
    }, 0);
    return new Promise((resolve) => setTimeout(() => resolve(), 10));
});

test(`Should accept a mapStateToProps and transform the state using it`, t => {
    const Store = configureStore();
    const CompToRender = local({
        key: 'myDumbComp',
        filterGlobalActions: (action) => {
            return true;
        },
        createStore: (props) => {
            return createStore(
                rootReducer,
                { filter: true, sort: props.sortOrder }
            );
        },
        mapStateToProps: (state, ownProps) => ({
            filter: state.filter,
            computedProp: ownProps.a+ownProps.b
        }),
        mapDispatchToProps:(dispatch) => ({
            onFilter: (filter) => dispatch({ type: 'SET_FILTER', payload: filter  }),
            onSort: (sort) => dispatch({ type: 'SET_SORT', payload: sort }),
        })
    })(DummyComp);
    const wrapper = mount(
        <Provider store={Store}>
            <CompToRender sortOrder='desc' a={1} b={2} />
        </Provider>);
    let filterVal = wrapper.find('DummyComp').props().filter;
    t.deepEqual(filterVal, true);
    wrapper.find('DummyComp').props().onFilter('term');
    wrapper.find('DummyComp').props().onSort('asc');
    t.deepEqual(wrapper.find('DummyComp').props().filter, 'term');
    t.deepEqual(wrapper.find('DummyComp').props().sort, undefined);
    t.deepEqual(wrapper.find('DummyComp').props().computedProp, 3);
    wrapper.unmount();
    return new Promise((resolve) => setTimeout(() => resolve(), 10));
});

test(`Should accept a mergeProps transform props using it`, t => {
    const Store = configureStore();
    const CompToRender = local({
        key: 'myDumbComp',
        filterGlobalActions: (action) => {
            return true;
        },
        createStore: (props) => {
            return createStore(
                rootReducer,
                { filter: true, sort: props.sortOrder }
            );
        },
        mapStateToProps: (state, ownProps) => ({
            filter: state.filter,
            computedProp: ownProps.a+ownProps.b
        }),
        mapDispatchToProps:(dispatch) => ({
            onFilter: (filter) => dispatch({ type: 'SET_FILTER', payload: filter  }),
            onSort: (sort) => dispatch({ type: 'SET_SORT', payload: sort }),
        }),
        mergeProps: (state, dispatch, ownProps) => {
            return Object.assign({}, ownProps, state, dispatch, {
                computedProp: state.computedProp + 5
            })
        }
    })(DummyComp);
    const wrapper = mount(
        <Provider store={Store}>
            <CompToRender sortOrder='desc' a={1} b={2} />
        </Provider>);
    let filterVal = wrapper.find('DummyComp').props().filter;
    t.deepEqual(filterVal, true);
    wrapper.find('DummyComp').props().onFilter('term');
    wrapper.find('DummyComp').props().onSort('asc');
    t.deepEqual(wrapper.find('DummyComp').props().filter, 'term');
    t.deepEqual(wrapper.find('DummyComp').props().sort, undefined);
    t.deepEqual(wrapper.find('DummyComp').props().computedProp, 8);
    wrapper.unmount();
    return new Promise((resolve) => setTimeout(() => resolve(), 10));
});

test(`Should keep the state after unmount if persist option is set to true and should
      properly reconnect the state when the component is mounted again`, t => {
    const Store = configureStore();
    const HOC = local({
        key: 'myDumbComp',
        createStore: (props, existingState) => {
            return createStore(
                rootReducer,
                existingState || { filter: true, sort: props.sortOrder }
            );
        },
        persist: true
    });
    const CompToRender = HOC(DummyComp);
    const wrapper = mount(
        <Provider store={Store}>
            <CompToRender sortOrder='desc' a={1} b={2} />
        </Provider>);
    t.deepEqual(Store.getState().local, {'myDumbComp': { filter: true, sort: 'desc' }});
    wrapper.unmount();
    t.deepEqual(Store.getState().local, {'myDumbComp': { filter: true, sort: 'desc' }});
    // Render again the component
    const rerenderedWrapper = mount(
        <Provider store={Store}>
            <CompToRender sortOrder='asc' a={1} b={2} />
        </Provider>);
    const sortVal = rerenderedWrapper.find('DummyComp').props().sort;
    // The component should be connected to existing state existing of replacing it
    t.deepEqual(sortVal, 'desc');
    wrapper.unmount();
    return new Promise((resolve) => setTimeout(() => {
        Store.dispatch(destroyAllComponentsState());
        resolve();
    }, 10));
});

test(`Should be able to control whether the component state is persisted or not
        upon unmount is a function receiving component props`, t => {
    const Store = configureStore();
    const HOC = local({
        key: (props) => props.id,
        createStore: (props, existingState) => {
            return createStore(
                rootReducer,
                existingState || { filter: true, sort: props.sortOrder }
            );
        },
        persist: (props) => props.keepState
    });
    const CompToRender = HOC(DummyComp);
    const wrapper = mount(
        <Provider store={Store}>
            <div>
                <CompToRender sortOrder='desc' id={'a'} keepState={false} />
                <CompToRender sortOrder='asc' id={'b'} keepState={true} />
            </div>
        </Provider>);
    t.deepEqual(Store.getState().local, {'a': { filter: true, sort: 'desc' }, 'b': {filter: true, sort: 'asc'} });
    wrapper.unmount();
    return new Promise((resolve) => setTimeout(() => {
        t.deepEqual(Store.getState().local, {'b': {filter: true, sort: 'asc'}});
        Store.dispatch(destroyAllComponentsState());
        resolve();
    }, 10)); 
});

test(`Should pass the component context as last argument to callback style configs`, t => {
    const Store = configureStore();
    const HOC = local({
        key: (props, context) => context.id,
        createStore: (props, existingState, context) => {
            return createStore(
                rootReducer,
                existingState || { filter: true, sort: context.sortOrder }
            );
        },
        persist: (props, context) => context.keepState
    });
    const CompToRender = HOC(DummyComp);
    CompToRender.contextTypes = Object.assign({}, CompToRender.contextTypes, {
        sortOrder: PropTypes.string,
        keepState: PropTypes.bool,
        id: PropTypes.string
    });
    const wrapper = mount(
        <Provider store={Store}>
            <ContextProviderComp>
            <div>
                <CompToRender sortOrder='none' id={'a'} keepState={false} />
                <CompToRender sortOrder='none' id={'b'} keepState={false} />
            </div>
            </ContextProviderComp>
        </Provider>);
    // There is a single comp state generated because the ids of the components are the same
    t.deepEqual(Store.getState().local, {'abc': { filter: true, sort: 'asc' } });
    wrapper.unmount();
    // State it's still persisted because 'context' said so
    return new Promise((resolve) => setTimeout(() => {
        t.deepEqual(Store.getState().local, {'abc': { filter: true, sort: 'asc' } });
        Store.dispatch(destroyAllComponentsState());
        resolve();
    }, 10));
});

test(`Should re-use the same store if 2 components have the same key`, t => {
    const Store = configureStore();
    const HOC = local({
        key: (props) => props.id,
        createStore: (props, existingState) => {
            return createStore(
                rootReducer,
                existingState || { filter: true, sort: props.sortOrder }
            );
        },
        persist: (props) => props.keepState,
        mapDispatchToProps: (dispatch) => ({
            onFilter: (filter) => dispatch({ type: 'SET_FILTER', payload: filter  }),
            onSort: (sort) => dispatch({ type: 'SET_SORT', payload: sort }),
        })
    });
    const otherHOC = local({
        key: (props) => props.id,
        persist: (props) => props.keepState,
        mapDispatchToProps: (dispatch) => ({
            onFilter: (filter) => dispatch({ type: 'SET_FILTER', payload: filter  }),
            onSort: (sort) => dispatch({ type: 'SET_SORT', payload: sort }),
        })
    });
    const CompToRender = HOC(DummyComp);
    const OtherCompToRender = otherHOC(DummyComp);
    const wrapper = mount(
        <Provider store={Store}>
            <div>
                <CompToRender sortOrder='asc' id={'a'} keepState={true} />
                <OtherCompToRender sortOrder='desc' id={'a'} keepState={false} />
            </div>
        </Provider>);
    // There should be a single state for both components
    t.deepEqual(Store.getState().local, {'a': { filter: true, sort: 'asc' } });
    wrapper.find('DummyComp').at(0).props().onSort('desc');
    t.deepEqual(Store.getState().local, {'a': { filter: true, sort: 'desc', trigger: 'a', current: 'a' } });
    // Components connected to the same store. Dispatching on the other component affects the same store
    wrapper.find('DummyComp').at(1).props().onSort('asc');
    t.deepEqual(Store.getState().local, {'a': { filter: true, sort: 'asc', trigger: 'a', current: 'a' } });
    wrapper.unmount();
    // Should respect the persist the persist setting of the store owner
    return new Promise((resolve) => setTimeout(() => {
        t.deepEqual(Store.getState().local, {'a': { filter: true, sort: 'asc', trigger: 'a', current: 'a' } });
        Store.dispatch(destroyAllComponentsState());
        t.deepEqual(Store.getState().local, {});
        resolve();
    }, 10));
});

test('Should be able to provide locally scoped middleware', t => {
    const Store = configureStore();
    const compReducer = (state = { user: {} }, action) => {
        switch(action.type) {
            case 'USER_FETCH_SUCCEEDED':
                return Object.assign({}, state, { user: action.payload });
            default:
                return state;
        }
    }
    const HOC = local({
        key: (props) => props.id,
        createStore: (props) => {
            const sagaMiddleware = createSagaMiddleware();
            const store = createStore(compReducer,
                { user: {}, sort: props.sortOrder },
                applyMiddleware(sagaMiddleware));
            sagaMiddleware.run(mySaga)
            return { store: store, cleanup: () => true };
        },
        mapDispatchToProps:(dispatch) => ({
            onFetchUser: (userId) => dispatch({ type: 'USER_FETCH_REQUESTED', payload: userId  }),
        })
    });
    const CompToRender = HOC(DummyComp);
    const App = (props) => {
        return(
            <div>
            <CompToRender sortOrder='asc' id='comp1' />
            <CompToRender sortOrder='desc' id='comp2' />
            </div>
        );
    };
    const wrapper = mount(
    <Provider store={Store}>
        <App />
    </Provider>);
    wrapper.find('DummyComp').at(1).props().onFetchUser(1);
    t.deepEqual(wrapper.find('DummyComp').at(1).props().user, { username: 'test', id: 1, sort: 'desc' });
    t.deepEqual(wrapper.find('DummyComp').at(0).props().user, {});
    wrapper.unmount();
    return new Promise((resolve) => setTimeout(() => resolve(), 10));
});

test(`Should blow up a single component state or all of the components state`, t => {
    const Store = configureStore();
    const HOC = local({
        key: (props) => props.id,
        createStore: (props, existingState) => {
            return createStore(
                rootReducer,
                existingState || { filter: true, sort: props.sortOrder }
            );
        },
        persist: (props) => props.keepState
    });
    const CompToRender = HOC(DummyComp);

    const wrapper = mount(
        <Provider store={Store}>
            <div>
                <CompToRender sortOrder='none' id={'a'} keepState={true} />
                <CompToRender sortOrder='none' id={'b'} keepState={true} />
                <CompToRender sortOrder='none' id={'c'} keepState={true} />
            </div>
        </Provider>);
    // There is a single comp state generated because the ids of the components are the same
    t.deepEqual(Store.getState().local, {
        'a': { filter: true, sort: 'none' },
        'b': { filter: true, sort: 'none' },
        'c': { filter: true, sort: 'none' }
    });
    wrapper.unmount();
    // State it's still persisted because 'context' said so
    return new Promise((resolve) => {;
        setTimeout(function assert() {
            t.deepEqual(Store.getState().local, {
                'a': { filter: true, sort: 'none' },
                'b': { filter: true, sort: 'none' },
                'c': { filter: true, sort: 'none' }
            });
            Store.dispatch(destroyComponentState('a'));
            t.deepEqual(Store.getState().local, {
                'b': { filter: true, sort: 'none' },
                'c': { filter: true, sort: 'none' }
            });
            Store.dispatch(destroyAllComponentsState());
            t.deepEqual(Store.getState().local, {});
            resolve();
        }, 10);
    });
});

test(`Should hoist all non-react statics along with wrapped component contextTypes
      into the component returned by local`, t => {
    const Store = configureStore();
    const HOC = local({
        key: (props, context) => context.id,
        createStore: (props, existingState, context) => {
            return createStore(
                rootReducer,
                existingState || { filter: true, sort: context.sortOrder }
            );
        },
        persist: (props, context) => context.keepState
    });
    const CompToRender = HOC(DummyComp);
    t.deepEqual(CompToRender.staticProp, 'staticProp');
    t.deepEqual(typeof CompToRender.staticFn, 'function');
    t.deepEqual(CompToRender.displayName, 'local(DummyComp)');
    return new Promise((resolve) => setTimeout(() => resolve(), 10));
});

test(`Should compose well together with react-redux connect`, t => {
    const Store = configureStore();
    const HOC = local({
        key: (props) => props.id,
        createStore: (props, existingState) => {
            return createStore(
                rootReducer,
                existingState || { filter: true, sort: props.sortOrder }
            );
        },
        persist: (props) => props.keepState
    });
    const mapStateToProps = (state) => ({ isGlobal: state.someGlobalState.isGlobal });
    const CompToRender = HOC(connect(mapStateToProps)(DummyComp));
    const wrapper = mount(
        <Provider store={Store}>
            <div>
                <CompToRender sortOrder='none' id={'a'} keepState={true} />
                <CompToRender sortOrder='none' id={'b'} keepState={true} />
                <CompToRender sortOrder='none' id={'c'} keepState={true} />
            </div>
        </Provider>);
        const isGlobal = wrapper.find('DummyComp').at(0).props().isGlobal;
        t.deepEqual(isGlobal, true);
        wrapper.unmount();
        return new Promise((resolve) => setTimeout(() => {
            Store.dispatch(destroyAllComponentsState());
            resolve();
        }, 10));
});

test(`Should compose well together with other local HOCs`, t => {
    const Store = configureStore();
    const HOC = local({
        key: (props) => props.id,
        createStore: (props, existingState) => {
            return createStore(
                rootReducer,
                existingState || { filter: true, sort: props.sortOrder }
            );
        },
        persist: (props) => props.keepState
    });
    const HOC2 = local({
        key: (props) => props.id2,
        createStore: (props, existingState) => {
            return createStore(
                rootReducer,
                existingState || { hoc2Prop: props.isHoc2 }
            );
        },
        persist: (props) => props.keepState
    });
    const HOC3 = local({
        key: (props) => props.id
    });
    const CompToRender = HOC(HOC2(DummyComp));
    const wrapper = mount(
        <Provider store={Store}>
            <div>
                <CompToRender sortOrder='asc' id={'a'} id2={'aaa'} isHoc2={true} keepState={true} />
                <CompToRender sortOrder='none' id={'b'} id2={'bbb'} keepState={true} />
                <CompToRender sortOrder='none' id={'c'} id2={'ccc'} keepState={true} />
            </div>
        </Provider>);
        const finalProps = wrapper.find('DummyComp').at(0).props();
        t.deepEqual(finalProps.hoc2Prop, true);
        t.deepEqual(finalProps.filter, true);
        t.deepEqual(finalProps.sortOrder, 'asc');
        wrapper.unmount();
        return new Promise((resolve) => setTimeout(() => {
            Store.dispatch(destroyAllComponentsState());
            resolve();
        }, 10));
});

test.skip(`Should not trigger a double dispatch(dispatch while dispatching) when there
are local HOCS nested and one of the child local unmounts as the result of a parent dispatch`, (t) => {
    const Store = configureStore();
    const HOC = local({
        key: (props) => props.id,
        createStore: (props, existingState) => {
            return createStore(
                (state, action) => state,
                existingState || { abc: '1' }
            );
        }
    });
    const HOC2 = local({
        key: (props) => props.id,
        filterGlobalActions: (action) => true,
        createStore: (props, existingState) => {
            return createStore(
                (state, action) => {
                    switch(action.type) {
                        case 'CLOSE':
                            return Object.assign({}, state, { isOpen: false });
                        default:
                            return state;
                    }
                },
                existingState || { isOpen: true }
            );
        },
        mapDispatchToProps: (dispatch) => ({ 
            onClose: () => dispatch({ type: 'CLOSE' }) 
        })
    });
    const SFC = (props) => (
        <button onClick={props.onClose}>Close</button>
    );
    SFC.displayName = 'SFC';
    const FirstComp = HOC(SFC);
    const SecondComp = HOC2(SFC);
    const mapStateToProps = (state) => ({
        isDisplayed: (state.local.b && !state.local.b.isOpen) || true
    });
    const mapDispatchToProps = (dispatch) => ({
        onCloseGlobal: () => dispatch({ type: 'CLOSE' })
    });

    const ParentComp = connect(mapStateToProps, mapDispatchToProps)( (props) => {
        return (
            <div>
                {<FirstComp id={'a'} /> }
                {props.isDisplayed ? <SecondComp id={'b'} /> : <SecondComp id={'c'} /> }
            </div>
        )
    });
    const wrapper = mount(
        <Provider store={Store}>
            <ParentComp id='ParentComp' />
        </Provider>);
    const secondCompProps = wrapper.find('SFC').at(1).props();
    t.deepEqual(wrapper.find('SFC').length, 2);
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            // secondCompProps.onClose();
            wrapper.find('button').at(1).props().onClick();
            // t.deepEqual(wrapper.find('SFC').length, 1);
            setTimeout(() => resolve(), 1000);
        }, 100);
    });
});
