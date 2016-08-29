import * as UIActions from './actions.js';
const reducers = {};
export const defaultReducer = (state = {}, action) => {
    switch (action.type) {
        case 'UPDATE_UI':
            return Object.assign({}, state, action.payload);
        default:
            return state;
    }
};
const initialiseComponentState = (state, payload, componentKey) => {
    const { config, props } = payload;
    reducers[componentKey] = config.reducer || defaultReducer;
    const initialState = typeof config.initialState === 'function' ?
                            config.initialState(props) : config.initialState;
    const componentsState = state.componentsState;
    const newComponentsState = Object.assign({}, componentsState, { [componentKey]: initialState });
    return newComponentsState;
};
const destroyComponentState = (state, payload, componentKey) => {
    const newState = Object.assign({}, state);
    delete newState.componentsState[componentKey];
    delete reducers[componentKey];
    return newState.componentsState;
};
const updateSingleComponent = (oldComponentState, action, componentKey) => {
    const reducer = reducers[componentKey];
    if (reducer) {
        return reducer(oldComponentState, action);
    }
    return oldComponentState;
};

const updateComponentState = (state, action, componentKey) => {
    if (componentKey) {
        const updatedState = updateSingleComponent(state.componentsState[componentKey], action, componentKey);
        const newCompState = Object.assign({}, state.componentsState, { [componentKey]: updatedState });
        return Object.assign({}, state, { componentsState: newCompState });
    } else {
        const newState = Object.keys(state.componentsState).reduce((stateAcc, k) => {
            const updatedState = updateSingleComponent(state.componentsState[k], action, k);
            return Object.assign({}, stateAcc, { [k]: updatedState });
        }, {});
        return Object.assign({}, state, { componentsState: newState });
    }
};

export default (state = { componentsState: {}, subscribersCount: {} }, action) => {
    const componentKey = action.meta && action.meta.componentKey;
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
