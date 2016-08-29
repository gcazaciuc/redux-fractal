import local from './local.js';
import UIReducer, { defaultReducer } from './UIReducer.js';
import {
    MOUNT_COMPONENT, UNMOUNT_COMPONENT, UPDATE_COMPONENT_STATE, RESET_COMPONENT_STATE
} from './actions.js';
export default local;
export const updateUI = (data) => ({ type: UPDATE_COMPONENT_STATE, payload: data });
export { UIReducer, defaultReducer };
export { MOUNT_COMPONENT, UNMOUNT_COMPONENT, UPDATE_COMPONENT_STATE, RESET_COMPONENT_STATE };
