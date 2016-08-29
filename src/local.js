import React from 'react';
import invariant from 'invariant';
import * as UIActions from './actions.js';
export default (Config) => (Component) => {
    class UI extends React.Component {
        constructor(props, context) {
            super(props, context);
            this.resetUI = this.resetUI.bind(this);
            this.state = null;
            this.localDispatch = (action) => {
                let wrappedAction = action;
                if (typeof action === 'object') {
                    const actionMeta = Object.assign({}, action.meta, { componentKey: this.key });
                    wrappedAction = Object.assign({}, action, { meta: actionMeta });
                }
                context.store.dispatch(wrappedAction);
            };
            this.updateUI = (data) => this.localDispatch({ type: 'UPDATE_UI', payload: data });
            invariant(Config.key,
                `[redux-fractal] - You must supply a globally unique key to the component either as a function or string`);
            this.key = typeof Config.key === 'function' ?
                Config.key(props, this.context.store.getState()) : Config.key;
            this.unsubscribe = null;
        }
        componentWillMount() {
            const localSubscriber = () => {
                const compState = this.context.store.getState().local.componentsState[this.key];
                if (this.state !== compState && compState) {
                    this.setState(compState);
                }
            };
            localSubscriber.__componentKey__ = this.key;
            this.unsubscribe = this.context.store.subscribe(localSubscriber);
            this.dispatchProps = (Config.mapDispatchToProps && Config.mapDispatchToProps(
                                        this.localDispatch
                                 )) || {};
            this.context.store.dispatch({
                type: UIActions.MOUNT_COMPONENT,
                payload: { config: Config, props: this.props },
                meta: { componentKey: this.key }
            });
        }
        componentWillUnmount() {
            if (this.unsubscribe) {
                this.unsubscribe();
                this.unsubscribe = null;
            }
            this.context.store.dispatch({
                type: UIActions.UNMOUNT_COMPONENT,
                payload: null,
                meta: { componentKey: this.key }
            });
        }
        resetUI() {
            this.context.store.dispatch({
                type: UIActions.RESET_COMPONENT_STATE,
                payload: { config: Config, props: this.props },
                meta: { componentKey: this.key }
            });
        }
        render() {
            return (
                this.state && <Component
                    {...this.props}
                    {...this.dispatchProps}
                    dispatch={this.localDispatch}
                    resetUI={this.resetUI}
                    {...this.state} />
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
