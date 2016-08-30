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
            this.localDispatch = (action) => {
                let wrappedAction = action;
                if (typeof action === 'object') {
                    const actionMeta = Object.assign({}, action.meta, { triggerComponentKey: this.key });
                    wrappedAction = Object.assign({}, action, { meta: actionMeta });
                }
                context.store.dispatch(wrappedAction);
            };
            this.store = null;
            invariant(Config.key,
                `[redux-fractal] - You must supply a globally unique key to the component either as a function or string`);
            this.key = compKey;
            this.unsubscribe = null;
        }
        componentWillMount() {
            this.store = Config.createStore(this.props);
            this.store.originalDispatch = this.store.dispatch;
            this.store.dispatch = (action) => {
                const actionAlreadyWrapped = action && action.meta && action.meta.triggerComponentKey;
                if (!actionAlreadyWrapped) {
                    this.localDispatch(action);
                }
                return this.store.originalDispatch(action);
            };
            this.context.store.dispatch({
                type: UIActions.MOUNT_COMPONENT,
                payload: { config: Config, props: this.props, store: this.store },
                meta: { triggerComponentKey: this.key }
            });
        }
        componentWillUnmount() {
            this.context.store.dispatch({
                type: UIActions.UNMOUNT_COMPONENT,
                payload: null,
                meta: { triggerComponentKey: this.key }
            });
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
