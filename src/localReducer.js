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
        action.meta = Object.assign({}, action.meta, { currentComponentKey: componentKey });
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
    const componentKey = action.meta && action.meta.triggerComponentKey;
    switch (action.type) {
        case UIActions.MOUNT_COMPONENT:
            return initialiseComponentState(
                state,
                action.payload,
                componentKey)
        case UIActions.RESET_COMPONENT_STATE:
            return initialiseComponentState(state, action.payload, componentKey);
        case UIActions.UNMOUNT_COMPONENT:
            if (!action.payload.persist) {
                return destroyComponentState(state, action.payload, componentKey);
            }
            return state;
        default:
            return updateComponentState(state, action, componentKey);
    }
};
