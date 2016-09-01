import React from 'react';
import invariant from 'invariant';
import * as UIActions from './actions.js';
import { connect } from 'react-redux';
export default (Config) => (Component) => {
    const defaultMapStateToProps = (state) => state;
    const ConnectComp = connect(
        Config.mapStateToProps || defaultMapStateToProps,
        Config.mapDispatchToProps)(Component);
    class UI extends React.Component {
        constructor(props, context) {
            super(props, context);
            this.resetUI = this.resetUI.bind(this);
            const compKey = typeof Config.key === 'function' ?
                Config.key(props) : Config.key;
            this.getWrappedAction = (action) => {
                let wrappedAction = action;
                if (typeof action === 'object') {
                    const actionMeta = Object.assign({}, action.meta, { triggerComponentKey: compKey });
                    wrappedAction = Object.assign({}, action, { meta: actionMeta });
                }
                return wrappedAction;
            };
            this.localDispatch = (action) => {
                const wrappedAction = this.getWrappedAction(action);
                return context.store.dispatch(wrappedAction);
            };
            this.store = null;
            invariant(Config.key,
                `[redux-fractal] - You must supply a globally unique key to the component either as a function or string`);
            this.key = compKey;
            this.unsubscribe = null;
        }
        componentWillMount() {
            const existingState = this.context.store.getState().local[this.key];
            const storeResult = Config.createStore(this.props, existingState);
            if (storeResult.store) {
                this.store = storeResult.store;
            }
            this.storeCleanup = () => true;
            if (storeResult.cleanup) {
                this.storeCleanup = storeResult.cleanup;
            }
            if (storeResult.dispatch && storeResult.getState) {
                this.store = storeResult;
            }
            this.store.originalDispatch = this.store.dispatch;
            this.store.dispatch = (action) => {
                const actionAlreadyWrapped = action && action.meta && action.meta.triggerComponentKey;
                return this.localDispatch(action);
            };
            this.context.store.dispatch({
                type: UIActions.MOUNT_COMPONENT,
                payload: { config: Config, props: this.props, store: this.store },
                meta: { triggerComponentKey: this.key }
            });
        }
        componentWillUnmount() {
            const persist = typeof Config.persist === 'function' ?
                                Config.persist(this.props) : Config.persist;
            this.context.store.dispatch({
                type: UIActions.UNMOUNT_COMPONENT,
                payload: { persist: persist },
                meta: { triggerComponentKey: this.key }
            });
            if (this.storeCleanup) {
                this.storeCleanup();
            }
            this.store = null;
        }
        resetUI() {
            this.context.store.dispatch({
                type: UIActions.RESET_COMPONENT_STATE,
                payload: { config: Config, props: this.props },
                meta: { triggerComponentKey: this.key }
            });
        }
        render() {
            return (
                this.store && <ConnectComp
                    {...this.props}
                    store={this.store}
                    resetUI={this.resetUI}
                    />
            );
        }
    }
    UI.propTypes = {
        key: React.PropTypes.string
    };
    UI.contextTypes = {
        store: React.PropTypes.shape({
            subscribe: React.PropTypes.func.isRequired,
            dispatch: React.PropTypes.func.isRequired,
            getState: React.PropTypes.func.isRequired
        })
    };
    return UI;
};
