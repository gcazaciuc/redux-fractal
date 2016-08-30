import local from './local.js';
import localReducer, { defaultReducer } from './localReducer.js';
import {
    MOUNT_COMPONENT, UNMOUNT_COMPONENT, UPDATE_COMPONENT_STATE, RESET_COMPONENT_STATE
} from './actions.js';
export { local };
export const updateUI = (data) => ({ type: UPDATE_COMPONENT_STATE, payload: data });
export { localReducer, defaultReducer };
export { MOUNT_COMPONENT, UNMOUNT_COMPONENT, UPDATE_COMPONENT_STATE, RESET_COMPONENT_STATE };
