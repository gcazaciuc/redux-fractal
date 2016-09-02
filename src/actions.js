export const CREATE_COMPONENT_STATE = '@@ui/CREATE_COMPONENT_STATE';
export const DESTROY_COMPONENT_STATE = '@@ui/DESTROY_COMPONENT_STATE';
export const DESTROY_ALL_COMPONENTS_STATE = '@@ui/DESTROY_ALL_COMPONENTS_STATE';

export const destroyComponentState = (componentKey) => ({
     type: DESTROY_COMPONENT_STATE,
     payload: { persist: false, hasStore: true },
     meta: { reduxFractalTriggerComponent: componentKey }
});
export const destroyAllComponentsState = () => ({
     type: DESTROY_ALL_COMPONENTS_STATE,
     payload: null
});
