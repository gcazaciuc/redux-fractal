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
    const newComponentsState = Object.assign({}, state.componentsState, { [componentKey]: initialState });
    return newComponentsState;
};
const destroyComponentState = (state, payload, componentKey) => {
    const newState = Object.assign({}, state);
    delete newState.componentsState[componentKey];
    delete stores[componentKey];
    return newState.componentsState;
};
const updateSingleComponent = (oldComponentState, action, componentKey) => {
    const store = stores[componentKey];
    if (store) {
        action.meta = Object.assign({}, action.meta, { currentComponentKey: componentKey });
        store.originalDispatch(action);
        // console.log('Updated '+componentKey+' for action'+action.type+' to state'+JSON.stringify(store.getState()));
        return store.getState();
    }
    return oldComponentState;
};

const updateComponentState = (state, action, componentKey) => {
    const newState = Object.keys(state.componentsState).reduce((stateAcc, k) => {
        const shouldUpdate = componentKey == k || (typeof globalActions[k] === 'function' && globalActions[k](action));
        let updatedState = state.componentsState[k];
        if (shouldUpdate) {
            updatedState = updateSingleComponent(state.componentsState[k], action, k);
        }
        return Object.assign({}, stateAcc, { [k]: updatedState });
    }, {});
    return Object.assign({}, state, { componentsState: newState });
};

export default (state = { componentsState: {}, subscribersCount: {} }, action) => {
    const componentKey = action.meta && action.meta.triggerComponentKey;
    let subscribersCount = 0;
    let newSubscribers = {};
    switch (action.type) {
        case UIActions.MOUNT_COMPONENT:
            subscribersCount = state.subscribersCount[componentKey] || 0;
            subscribersCount++;
            newSubscribers = Object.assign({},
                state.subscribersCount,
                { [componentKey]: subscribersCount }
            );
            if (subscribersCount === 1) {
                // First time
                return ({
                    subscribersCount: newSubscribers,
                    componentsState: initialiseComponentState(state,
                        action.payload,
                        componentKey)
                });
            }
            return Object.assign({}, state, { subscribersCount: newSubscribers });
        case UIActions.RESET_COMPONENT_STATE:
            return initialiseComponentState(state, action.payload, componentKey);
        case UIActions.UNMOUNT_COMPONENT:
            subscribersCount = state.subscribersCount[componentKey] || 1;
            subscribersCount--;
            newSubscribers = Object.assign({},
                state.subscribersCount,
                { [componentKey]: subscribersCount }
            );
            if (subscribersCount === 0) {
                delete newSubscribers[componentKey];
                return ({
                    subscribersCount: newSubscribers,
                    componentsState: destroyComponentState(state, action.payload, componentKey)
                });
            }
            return Object.assign({}, state, { subscribersCount: newSubscribers });
        default:
            return updateComponentState(state, action, componentKey);
    }
};
