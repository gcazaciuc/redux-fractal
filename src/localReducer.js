import * as UIActions from './actions.js';
const stores = {};
const globalActions = {};

export const defaultReducer = (state = {}, action) => {
    switch (action.type) {
        case 'UPDATE_UI':
            return Object.assign({}, state, action.payload);
        default:
            return state;
    }
};
const initialiseComponentState = (state, payload, componentKey) => {
    const { config, props, store } = payload;
    stores[componentKey] = store;
    const defaultGlobalFilter = () => false;
    globalActions[componentKey] = config.filterGlobalActions || defaultGlobalFilter;
    const initialState = stores[componentKey].getState();
    const newComponentsState = Object.assign({}, state, { [componentKey]: initialState });
    return newComponentsState;
};
const destroyComponentState = (state, payload, componentKey) => {
    const newState = Object.assign({}, state);
    delete newState[componentKey];
    delete stores[componentKey];
    return newState;
};
const updateSingleComponent = (oldComponentState, action, componentKey) => {
    const store = stores[componentKey];
    if (store) {
        action.meta = Object.assign({}, action.meta, { reduxFractalCurrentComponent: componentKey });
        store.originalDispatch(action);
        return store.getState();
    }
    return oldComponentState;
};

const updateComponentState = (state, action, componentKey) => {
    const newState = Object.keys(state).reduce((stateAcc, k) => {
        const shouldUpdate = componentKey == k || (typeof globalActions[k] === 'function' && globalActions[k](action));
        let updatedState = state[k];
        if (shouldUpdate) {
            updatedState = updateSingleComponent(state[k], action, k);
        }
        return Object.assign({}, stateAcc, { [k]: updatedState });
    }, {});
    return Object.assign({}, state, newState);
};

export default (state = {}, action) => {
    const componentKey = action.meta && action.meta.reduxFractalTriggerComponent;
    switch (action.type) {
        case UIActions.CREATE_COMPONENT_STATE:
            return initialiseComponentState(
                state,
                action.payload,
                componentKey);
        case UIActions.DESTROY_COMPONENT_STATE:
            if (!action.payload.persist && stores[componentKey] && action.payload.hasStore) {
                return destroyComponentState(state, action.payload, componentKey);
            }
            return state;
        case UIActions.DESTROY_ALL_COMPONENTS_STATE:
            let nextState = state;
            Object.keys(state).forEach((k) => {
                nextState = destroyComponentState(nextState, {}, k);
            });
            return nextState;
        default:
            return updateComponentState(state, action, componentKey);
    }
};



export const createStore = (createStoreFn, props, componentKey, existingState, context) => {
    if (!stores[componentKey]) {
        const getWrappedAction = (action) => {
            let wrappedAction = action;
            if (typeof action === 'object') {
                const actionMeta = Object.assign({}, action.meta, { reduxFractalTriggerComponent: componentKey });
                wrappedAction = Object.assign({}, action, { meta: actionMeta });
            }
            return wrappedAction;
        };
        const localDispatch = (action) => {
            const wrappedAction = getWrappedAction(action);
            return context.store.dispatch(wrappedAction);
        };
        const storeResult = createStoreFn(props, existingState, context);
        let storeCleanup = () => true;
        if (storeResult.store) {
            stores[componentKey] = storeResult.store;
        }
        if (storeResult.cleanup) {
            storeCleanup = storeResult.cleanup;
        }
        if (storeResult.dispatch && storeResult.getState) {
            stores[componentKey] = storeResult;
        }
        stores[componentKey].originalDispatch = stores[componentKey].dispatch;
        stores[componentKey].dispatch = (action) => {
            const actionAlreadyWrapped = action && action.meta && action.meta.reduxFractalTriggerComponent;
            return localDispatch(action);
        };
        return { store: stores[componentKey], cleanup: storeCleanup };
    }
    return { store: stores[componentKey] };
}
